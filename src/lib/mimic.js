/**
 * Copy files uses different protocols.
 * 
 * @author Todd King
 *
 */
 
const fs = require('fs');
const path = require('path');
const https = require('https');
const ftp = require('ftp');
const scp2 = require('scp2');
const url = require('url');
const os = require('os');
const walk = require('walk-folder-tree');
const convert = require('convert-units');
const commaNumber = require('comma-number');

// Mimic configuration information
const config = require('./config.js');
const checksum = require('./checksum.js');
const copyfile = require('./copyfile.js');

// Global Variables
var Home = ".";
var	Key = null;
var	Baseurl = null;
var	Verbose = false;
var	Username = "";
var	FileCnt = 0;
var	TotalSize = 0;
var RemovedCnt = 0;

//Public interface
module.exports = {	
	init : function(pathname) {
		var mimicPath = path.normalize(path.join(pathname, config.MimicFolder))
		
		// Create destination folder - if it doesn't exist
		if( pathname != path.normalize(path.basename(pathname))) {
			console.log("Destination must a folder name and cannot include a path.");
			return;
		}
		
		if( ! fs.existsSync(pathname)) {
			fs.mkdirSync(pathname);
		}
		
		// Create hidden ".mimic" folder if one does not exist.
		if( ! fs.existsSync(mimicPath)) {
			fs.mkdirSync(mimicPath);
		} else {
			console.log('Folder already initialized for use with mimic.');
			return false;
		}

		var checksumPath = path.normalize(path.join(pathname, config.ChecksumFile))
		
		// Create empty checksum file.
		if( ! fs.existsSync(checksumPath)) {
			var fd = fs.openSync(checksumPath, "w");
			if(fd != -1) fs.closeSync(fd);
		}
		
		return true;
	},

	joinURL : function(front, back) {
		if(back.startsWith('./')) back = back.slice(2);
		if(back.startsWith('/')) back = back.slice(1);
		
		if( ! front.endsWith('/')) front += '/';
		
		return front + back;	
	},

	findRoot : function(filePath) {
		var root = config.findRoot(filePath);
		
		// Test if under mimic management
		if(root === undefined || root === null) {	// Not initialized
			console.log("The folder '" + filePath + "' is not under Mimic management.");
			console.log("To place it under Mimic management issue the command mimic-init");
			console.log("in the folder or one of the parent folders.");
			return null;
		}
		
		return root;
	},
	
	summary : function(copied, size, removed)
	{
		console.log("");
		console.log("Summary");
		if(typeof removed != 'undefined') console.log(" Removed: " + commaNumber(removed));
		console.log("  Copied: " + commaNumber(copied));
		var c = convert(size).from('b').toBest();
		console.log("   Bytes: " + commaNumber(+(Math.round(c.val + "e+2")  + "e-2")) + " " +  c.unit);
		console.log("");
	},
	
	/** Set the timestamp on a folder
	 **/
	stamp : function(checksumRec) {
		return new Promise(function(resolve, reject) {
			if( checksum.isDir(checksumRec.checksum) ) {
				var dirPath = path.normalize( path.join(Home, checksumRec.path) );
				var timestamp = new Date(checksumRec.modified);
				fs.utimes( dirPath, timestamp, timestamp, (err) => { if(err) console.log(err); } ); 
				resolve(checksumRec.path);
			}
		}
		);
	},

	/** Load a security key (cert)
	 **/
	loadKey : function(username, keyfile) {
		if( username ) {
			if( username == "." || username == "anonymous" ) return null;	// No key
			
			if( keyfile ) {	// Replace "~" with home
				keyfile = keyfile.replace("~", os.homedir());
			} else {	// Use common (default) location
				keyfile = path.normalize(path.join(os.homedir(), ".ssh/id_rsa"));
			}
			return fs.readFileSync(keyfile);
		}
		return null;	// No key
	},
	
	// Create a folder
	createFolder : function(checksumRec) {
		return new Promise(function(resolve, reject) {
			if( checksum.isDir(checksumRec.checksum) ) {
				var dirPath = path.normalize( path.join(Home, checksumRec.path) );
				var timestamp = new Date(checksumRec.modified);
				if( ! fs.existsSync(dirPath)) { 
					fs.mkdirSync( dirPath ); 
					fs.utimes( dirPath, timestamp, timestamp, (err) => { if(err) console.log(err); } ); 
					if(Verbose) { console.log('Created: ' + dirPath); }
				}	// Needs to happen now
				resolve(checksumRec.path);
			}
		}
		);
	},

	/** 
	Remove file associated with a checksum record.
	 **/
	deleteRec : function(checksumRec) {
		return new Promise(function(resolve, reject) {
			var dirPath = path.normalize( path.join(Home, checksumRec.path) );
			RemovedCnt++;
			try {
				if( checksum.isDir(checksumRec.checksum) ) { // if no checksum is a blind (invisible) copy
					fs.rmdir(dirPath, (err) => { resolve(checksumRec.path); } );
				} else {
					fs.unlink(dirPath, (err) => { resolve(checksumRec.path); } );
				}
			} catch(e) {
				// Not important
			}
			if(Verbose) {
				console.log('Removed: ' + checksumRec.path);
			}		
		}
		);
	},

	pullFromScp : function(checksumRec, outPathname) {
		return new Promise(function(resolve, reject) {
			if( checksum.isDir(checksumRec.checksum) ) { resolve(checksumRec.path); }
			if( typeof outPathname != 'string' ) { outPathname = checksumRec.path; }
			// Pull file
			copyfile.pullScp(Home, outPathname, checksumRec.path, Baseurl.host, Baseurl.path, Username, Key, checksum.modified, (pathname, length, modified) => 
				{ 
					if(Verbose && checksumRec.checksum) { // if no checksum is a blind (invisible) copy
						var c = convert(length).from('b').toBest();
						var bytes = commaNumber(+(Math.round(c.val + "e+2")  + "e-2")) + " " +  c.unit;
						if(Verbose) console.log('Copied: ' + pathname + ' (' + bytes + ')'); 
					}
					if(modified) { 
						var timestamp = new Date(modified);
						fs.utimes( path.normalize( path.join(Home, pathname) ), timestamp, timestamp, (err) => { if(err) console.log(err); } );
					}
					if(checksumRec.checksum) {	// Count it - otherwise a blind (invisible) copy
						FileCnt++; 
						TotalSize += length; 
					}
					resolve(pathname);
				}
			);
		});
	},

	pullFromHttps : function(checksumRec, outPathname) {
		// Copy checksum file
		return new Promise(function(resolve, reject) {
			if( checksum.isDir(checksumRec.checksum) ) { resolve(checksumRec.path); }
			if( typeof outPathname != 'string' ) { outPathname = checksumRec.path; }
			// Pull file
			copyfile.pullHttps(Home, outPathname, checksumRec.path, Baseurl.href, checksumRec.modified, (pathname, length, modified) => 
				{ 
					if(Verbose && checksumRec.checksum) {  // if no checksum is a blind (invisible) copy
						var c = convert(length).from('b').toBest();
						var bytes = commaNumber(+(Math.round(c.val + "e+2")  + "e-2")) + " " +  c.unit;
						if(Verbose) console.log('Copied: ' + pathname + ' (' + bytes + ')'); 
					}
					if(modified) { 
						var timestamp = new Date(modified);
						fs.utimes( path.normalize( path.join(Home, pathname) ), timestamp, timestamp, (err) => { if(err) console.log(err); } ); 
					}
					if(checksumRec.checksum) {	// Count it - otherwise a blind (invisible) copy
						FileCnt++; 
						TotalSize += length; 
					}
					resolve(pathname);
				}
			);
		});
	},

	pullFromFtp : function (checksumRec, outPathname) {
		return new Promise(function(resolve, reject) {
			if( checksum.isDir(checksumRec.checksum) ) { resolve(checksumRec.path); }
			if( typeof outPathname != 'string' ) { outPathname = checksumRec.path; }

			// Pull file
			copyfile.pullFtp(Home, outPathname, checksumRec.path, Baseurl.host, Baseurl.path, checksumRec.modified, (pathname, length, modified) => 
				{ 
					if(Verbose && checksumRec.checksum) {
						var c = convert(length).from('b').toBest();
						var bytes = commaNumber(+(Math.round(c.val + "e+2")  + "e-2")) + " " +  c.unit;
						if(Verbose) console.log('Copied: ' + pathname + ' (' + bytes + ')'); 
					}
					if(modified) { 
						var timestamp = new Date(modified);
						fs.utimes( path.normalize( path.join(Home, pathname) ), timestamp, timestamp, (err) => { if(err) console.log(err); } );
					}
					if(checksumRec.checksum) {	// Count it - otherwise a blind (invisible) copy
						FileCnt++; 
						TotalSize += length; 
					}
					resolve(pathname);
				}
			);
		});
	},
	
	pullFrom : function(checksumRec, outPathame) {
		var self = this;

		if(Baseurl.protocol == 'http:' || Baseurl.protocol == 'https:') { 
			return self.pullFromHttps(checksumRec, outPathame); 
		}
		if(Baseurl.protocol == 'scp:') { 
			return self.pullFromScp(checksumRec, outPathame);
		}
		if(Baseurl.protocol == 'ftp:') {
			return self.pullFromFtp(checksumRec, outPahtname);
		}
		
	},

	pull : async function(home, uri, username, keyfile, verbose) {
		var self = this;
		
		Home = home;
		Baseurl = url.parse(uri);
		Username = username;
		Verbose = verbose;

		try {
			// Load SSH keyfile (cert)
			self.Key = self.loadKey(username, keyfile);
		
			// Create a temporary record to pull checksum file
			var checksumRec = checksum.createChecksumRecord(0, 0, 0, config.ChecksumFile);
			await this.pullFrom(checksumRec);
			
			// Load checksum
			var checksumFile = path.normalize(path.join(Home, config.ChecksumFile))
			var inventory = checksum.loadFrom(checksumFile);

			// Separate files and folders
			var fileList = new Array();
			var folderList = new Array();
			var keys = Object.keys(inventory);
			keys.sort();
			for(var i = 0; i < keys.length; i++) {
				var rec = inventory[keys[i]];
				if( checksum.isDir(rec.checksum) ) { folderList.push(rec); }
				else { fileList.push(rec); }
			}
		
			// Create folders then copy files
			// Create file tree
			Promise.all(folderList.map(self.createFolder))
				.then(function() {	// Copy files
					var action = null;
					if(Baseurl.protocol == 'http:' || Baseurl.protocol == 'https:') { 
						action = self.pullFromHttps;
					}
					if(Baseurl.protocol == 'scp:') { 
						action = self.pullFromScp;
					}
					if(Baseurl.protocol == 'ftp:') {
						action = self.pullFromFtp;
					}

					Promise.all(fileList.map(action))
					.then(function() {
						// Fix timestamps on folders
						Promise.all(folderList.map(self.stamp))
						.then(function() { self.summary(FileCnt, TotalSize); })
						;
					});
				})
				.catch(reason => { console.log(reason.message); if(Verbose) { console.log(reason) } })
				;
		} catch(reason) {
			console.log(reason.message);
			if(Verbose) { console.log(reason) }
		}
	},
	
	syncPull : async function(home, verbose) {
		var root = this.findRoot(home);
	
		// Test if under mimic management
		if(root === undefined || root === null) {	// Not initialized
			return;
		}

		var settings = config.load(home);
		var pullSettings = settings["Pull"];
		if( ! pullSettings ) {
			console.log("No 'pull' source is defined. Mimic collection is not configured to pull.");
			return;
		}

		this.syncWithPull(home, pullSettings.uri, pullSettings.username, pullSettings.keyfile, verbose);		
	},
	
	syncWithPull : async function(home, uri, username, keyfile, verbose) {
		var self = this;
		
		Home = home;
		Baseurl = url.parse(uri);
		Username = username;
		Verbose = verbose;

		var copyList = [];	// Entries to copy from remote
		var deleteList = [];	// Entries to delete locally

		try {
			// Load SSH keyfile (cert)
			self.Key = self.loadKey(username, keyfile);
			
			// Create a temporary record to pull checksum file - store in temporary file
			var verbose = self.Verbose;
			var checksumRec = checksum.createChecksumRecord(0, 0, 0, config.ChecksumFile);
			var checksumTemp = path.normalize(path.join(home, config.ChecksumFile + ".tmp"));

			await this.pullFrom(checksumRec, config.ChecksumFile + ".tmp");
			var remoteInventory = checksum.loadFrom(checksumTemp);
			
			// Load checksum
			var checksumFile = path.normalize(path.join(home, config.ChecksumFile))
			var localInventory = checksum.loadFrom(checksumFile);

			// Generate lists for copy and delete
			var keys = Object.keys(remoteInventory);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				if( ! checksum.isEqual(remoteInventory[key], localInventory[key]) ) {
					copyList[key] = remoteInventory[key];
				}
			}

			// Determine files to remove
			keys = Object.keys(localInventory);
			for(var i = 0; i < keys.length; i++) {
				var key = keys[i];
				if( ! checksum.isEqual(localInventory[key], remoteInventory[key]) ) {
					deleteList[key] = localInventory[key];
				}
			}

			// Organize action to delete files.
			var deleteAction = new Array();
			keys = Object.keys(deleteList);
			keys.reverse();	// Longest first means files first
			for(var i = 0; i < keys.length; i++) {
				deleteAction.push(deleteList[keys[i]]);
			}
	
			// Separate files and folders to copy
			var fileList = new Array();
			var folderList = new Array();
			var keys = Object.keys(copyList);
			keys.sort();
			for(var i = 0; i < keys.length; i++) {
				var rec = copyList[keys[i]];
				if( checksum.isDir(rec.checksum) ) { folderList.push(rec); }
				else { fileList.push(rec); }
			}
		
			// Remove files, create folders then copy files
			Promise.all(deleteAction.map(self.deleteRec))
				.then(function() {	// Create folders
					Promise.all(folderList.map(self.createFolder))
						.then(function() {	// Copy files
							var action = null;
							if(Baseurl.protocol == 'http:' || Baseurl.protocol == 'https:') { 
								action = self.pullFromHttps;
							}
							if(Baseurl.protocol == 'scp:') { 
								action = self.pullFromScp;
							}
							if(Baseurl.protocol == 'ftp:') {
								action = self.pullFromFtp;
							}

							Promise.all(fileList.map(action))
								.then(function() { // Fix timestamps on folders
									Promise.all(folderList.map(self.stamp))
									.then(function() { 
										checksum.store(home, remoteInventory);
										fs.unlinkSync(checksumTemp);	// Remove temp file
										self.summary(FileCnt, TotalSize, RemovedCnt); 
									})
									;
								}
							)
						}
					)
				})
				.catch(reason => { console.log(reason.message); if(Verbose) { console.log(reason); } })
				;
		} catch(reason) {
			console.log(reason.message);
			if(Verbose) { console.log(reason); }
		}
	},

	/** 
	 * Scan a path and provide a list of modified or new items. 
	 *
	 * If any checksum does not match then update the checksum value with the new calculated value. 
	 * If an item is missing then remove it from the list. If an item is new, add an entry.
	 *
	 * @param path   the pathname of the file containing the checksum records.
	 * 
	 * @return true of new files were found, false otherwise.
	 * 
	 * @throws Exception	if any error occurs.
	 */
	add : function(filepath, recurse, verbose, testMode) {
		// Global Variables
		var folderCnt = 0;
		var fileCnt = 0;

		var changed = false;
		
		var root = config.findRoot(filepath);
		
		// Test if under mimic management
		if(root === undefined || root === null) {	// Not initialized
			console.log("The folder '" + filepath + "' is not under Mimic management.");
			console.log("To place it under Mimic management issue the command mimic-init");
			console.log("in the folder or one of the parent folders.");
			return found;
		}

		// Load current list of files
		var localMap = checksum.load(filepath);

		// var out = fs.createWriteStream(checksumPath, {flags: "a"});
		
		if(verbose) { console.log('Start scan'); }
		// found = scan(out, root, localMap, filepath);
		// var regex = new RegExp('/' + options.ext + '$/');	// Ends with extension
		
		var includeFolders = /(^[.]$|^[^.])/; //  ignore folders starting with ., except for '.' (current directory)
		var includeFiles = /^.*$/;	// Everything

		try {
			var stat = fs.statSync(filepath);
			if(stat.isDirectory()) {	// Walk the tree		
				walk(root, { filterFolders: includeFolders, filterFiles: includeFiles, recurse: recurse }, function(params, cb) {
					var resourcePath = "./" + path.relative(root, path.join(filepath, params.path));	// Make relative to base
					resourcePath = config.canonicalPath(resourcePath);
					if(typeof localMap[resourcePath] === 'undefined') {	// new add to list
						if(params.directory) {	// Folder
							folderCnt++;
							if(verbose) console.log("     New: " + resourcePath);
							if( ! testMode) {
								// checksum.writeChecksumRecord(out, 0, params.stat.mtimeMs, checksum.DirDigest, resourcePath);
								localMap[resourcePath] = checksum.createChecksumRecord(0, params.stat.mtimeMs, 
									checksum.DirDigest, resourcePath);
								changed = true;
							}
						} else {	// File
							fileCnt++;
							if(verbose) console.log("     New: " + resourcePath);
							if( ! testMode) {
								// checksum.writeFileChecksum(out, params.stat.size, params.stat.mtimeMs, resourcePath);
								localMap[resourcePath] = checksum.createChecksumRecord(params.stat.size, params.stat.mtimeMs, 
									checksum.getChecksumSync(resourcePath), resourcePath);
								changed = true;
							}
						}
					}				
					cb();
				}).then(function() {
					if(changed && ! testMode) { checksum.store(filepath, checksum.sort(localMap)); }
					console.log("");
					console.log("Summary");
					console.log(" Folders: " + folderCnt);
					console.log("   Files: " + fileCnt);
					if(testMode) console.log("Test only. No changes were made.");
				});
			} else {	// Single file
				if(localMap[filepath] === undefined) {
					fileCnt++;
					if(verbose) console.log("     New: " + resourcePath);
					if( ! testMode) {
						localMap[resourcePath] = checksum.createChecksumRecord(stat.size, stat.mtimeMs, 
							checksum.getChecksumSync(resourcePath), resourcePath);
						changed = true;
					}
				}
				if(changed && ! testMode) { checksum.store(filepath, checksum.sort(localMap)); }
				console.log("");
				console.log("Summary");
				console.log(" Folders: " + folderCnt);
				console.log("   Files: " + fileCnt);
				if(testMode) console.log("Test only. No changes were made.");
			}
		} catch(reason) {
			console.log(reason.message);
			if(Verbose) { console.log(reason); }
		}
	},
	
	/** 
	 * Scan a path and provide a list of modified or new items. 
	 *
	 * If any checksum does not match then update the checksum value with the new calculated value. 
	 * If an item is missing then remove it from the list. If an item is new, add an entry.
	 *
	 * @param path   the pathname of the file containing the checksum records.
	 * 
	 * @return true of new files were found, false otherwise.
	 * 
	 * @throws Exception	if any error occurs.
	 */
	refresh : function(filepath, quick, recurse, verbose, testMode) {
		var self = this;
		
		// Global Variables
		var folderCnt = 0;
		var fileCnt = 0;
		var addFolderCnt = 0;
		var addFileCnt = 0;
		var removeFolderCnt = 0;
		var removeFileCnt = 0;
		var updateFolderCnt = 0;
		var updateFileCnt = 0;	
		
		var changed = false;
		
		var root = self.findRoot(filepath);
		
		// Test if under mimic management
		if(root === undefined || root === null) {	// Not initialized
			return;
		}
		
		if(verbose && ( ! quick)) {
			console.log("Inspecting checksums can take a while.");
			console.log("Consider using the quick (-q) option for faster processing.");
		}
	
		// Load current list of files
		var localMap = checksum.load(filepath);
		if(verbose) { var keys = Object.keys(localMap); console.log("Checking: " + commaNumber(keys.length) + "file(s)"); }

		var freshMap = [];
		
		var includeFolders = /(^[.]$|^[^.])/; //  ignore folders starting with ., except for '.' (current directory)
		var includeFiles = /^.*$/;	// Everything

		try {
			if(fs.statSync(filepath).isDirectory()) {	// Walk the tree		
				walk(root, { filterFolders: includeFolders, filterFiles: includeFiles, recurse: recurse }, function(params, cb) {
					var resourcePath = "./" + path.relative(root, path.join(filepath, params.path));	// Make relative to base
					resourcePath = config.canonicalPath(resourcePath);
					var resourceInfo = localMap[resourcePath];
					
					if(params.directory) { folderCnt++; } else { fileCnt++; }

					if(typeof resourceInfo === 'undefined') {	// new - add to list
						if(params.directory) {
							addFolderCnt++;
							if(verbose || testMode) console.log("     New: " + resourcePath);
							if( ! testMode) {	// Do it
								freshMap[resourcePath] = checksum.createChecksumRecord(0, params.stat.mtimeMs, checksum.DirDigest, resourcePath);
							}
						} else {
							addFileCnt++;
							if(verbose || testMode) console.log("     New: " + resourcePath);
							if( ! testMode) {	// Do it
								freshMap[resourcePath] = checksum.createChecksumRecord(params.stat.size, params.stat.mtimeMs, 
									checksum.getChecksumSync(resourcePath), resourcePath);
							}
						}
						changed = true;
					} else {	// Existing - check profile
						var ok = true;
						var realPath = path.join(filepath, resourcePath);
						var stat = fs.statSync(realPath);
						
						// Fix up state values
						if(params.directory) { stat.size = 0; }	// Folders do have a size, but we make it 0 for the inventory
						var statMod = Math.floor(stat.mtimeMs); // stat.mtimeMs includes fractional ms
						
						if(resourceInfo.modified != statMod || resourceInfo.length != stat.size) {
							if(params.directory) {
								updateFolderCnt++;
							} else {
								updateFileCnt++;
							}
							if(verbose) {
								if(verbose || testMode) console.log("   Update: " + resourcePath);
							}
							if( ! testMode) { // Update info
								resourceInfo.modified = stat.mtimeMs;
								resourceInfo.length = stat.size;
							}	
							changed = true;	ok = false;					
						}
						if( ! quick ) {	// Check checksum
							if( ! params.directory) {	// Only do files
								var hash = checksum.getChecksumSync(realPath);
								if(resourceInfo.checksum !== hash) {
									updateFileCnt++;
									if(verbose) {
										console.log("   Update: " + resourcePath);
									}
									if( ! testMode) { // Do it
										resourceInfo.checksum = hash;
									}
									changed = true; ok = false;
								}
							}
						}
						freshMap[resourcePath] = resourceInfo;
						if(verbose && ok && testMode == 2) { // Status reporting
							console.log("       OK: " + resourcePath);
						}
					}			
					cb();
				}).then(function() {	// Determine which files were removed
					var keys = Object.keys(localMap);
					for(var i = 0; i < keys.length; i++) {
						var resourcePath = keys[i];
						if(typeof freshMap[resourcePath] === 'undefined') {	// removed
							if(verbose || testMode) { console.log("   Remove: " + resourcePath); }
							if( checksum.isDir(localMap[resourcePath].checksum) ) { removeFolderCnt++; }
							else { removeFileCnt++; }
							changed = true;
						}
					}
				}).then(function() {	// Finalize changes
					if(changed && ! testMode) { checksum.store(root, checksum.sort(freshMap)); }
					console.log("");
					console.log("Summary");
					console.log(" Scanned: " + folderCnt + " folder(s); " + fileCnt + " files(s)");
					console.log("     Add: " + addFolderCnt + " folder(s); " + addFileCnt + " files(s)");
					console.log("  Remove: " + removeFolderCnt + " folder(s); " + removeFileCnt + " files(s)");
					console.log("  Update: " + updateFolderCnt + " folder(s); " + updateFileCnt + " files(s)");
					if(testMode) {
						if(testMode != 2) { console.log("Test only. No changes were made."); }
					}
				});
			} else {	// Single file
				console.log('Only mimic collections can be refreshed.');
			}
		} catch(reason) {
			console.log(reason.message);
			if(Verbose) { console.log(reason); }
		}
	},	

	download : async function(home, uri, inventory, username, keyfile, verbose) {
		var self = this;
		
		Home = home;
		Baseurl = url.parse(uri);
		Username = username;
		Verbose = verbose;

		try {
			// Load SSH keyfile (cert)
			self.Key = self.loadKey(username, keyfile);
			
			// Separate files and folders
			var fileList = new Array();
			var folderList = new Array();
			var keys = Object.keys(inventory);
			keys.sort();
			for(var i = 0; i < keys.length; i++) {
				var rec = inventory[keys[i]];
				if( checksum.isDir(rec.checksum) ) { folderList.push(rec); }
				else { fileList.push(rec); }
			}
		
			// Create folders then copy files
			// Create file tree
			Promise.all(folderList.map(self.createFolder))
				.then(function() {	// Copy files
					var action = null;
					if(Baseurl.protocol == 'http:' || Baseurl.protocol == 'https:') { 
						action = self.pullFromHttps;
					}
					if(Baseurl.protocol == 'scp:') { 
						action = self.pullFromScp;
					}
					if(Baseurl.protocol == 'ftp:') {
						action = self.pullFromFtp;
					}

					Promise.all(fileList.map(action))
					.then(function() {
						// Fix timestamps on folders
						Promise.all(folderList.map(self.stamp))
						.then(function() { self.summary(FileCnt, TotalSize); })
						;
					});
				})
				.catch(reason => { console.log(reason.message); if(Verbose) { console.log(reason); } })
				;
		} catch(reason) {
			console.log(reason);
			if(Verbose) { console.log(reason); }
		}
	}
}