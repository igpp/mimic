/**
 * Calculate, check and manage sha1 checksums on files.
 *
 * @author Todd King
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const readlines = require('n-readlines');

const mOverview = "Methods to calculate, check and manage sha1 checksums on files.";
const mAcknowledge = "Development funded by NASA's PDS project at UCLA.";

//Public interface
module.exports = {
	// Constants
    DirDigest: "0000000000000000000000000000000000000000",

	/**
	 * Perform a sort of objects based on key value.
	 **/
	sort: function(list, reverse) {
		var ordered = [];
		keys = Object.keys(list);
		if(reverse) { keys.reverse(); }
		else { keys.sort(); }
		for(var i = 0; i < keys.length; i++) {
			ordered.push(list[keys[i]]);
		}
		return ordered;
	},
	
	isDir : function(checksum) {
		return checksum === this.DirDigest;
	},
	
   /**
    * Calculate checksum for file
	**/
    getChecksumSync : function(pathname) {
	    var buffer = new Uint8Array(4096);
		var hash = crypto.createHash('sha1');
	    var fd = fs.openSync(pathname, 'r');
		var n = 0;

	    while( (n = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {			
			hash.update(buffer.slice(0, n));
		}
		fs.closeSync(fd);
		
		return hash.digest('hex');
    },

   /**
    * Calculate checksum for file
	**/
   getChecksum : function(pathname) {
		return new Promise((resolve, reject) => {
			var hash = crypto.createHash('sha1');
			fs.ReadStream(pathname)
				.on('data', function(d) {
					hash.update(d);
				})
				.on('end', function() {
					var digest = hash.digest('hex');
					resolve(digest);
				})
				.on('error', reject)
			;
		});		
    },
 
   /** 
    * Create a checksum record from passed values.
	**/
    createChecksumRecord : function(fileLength, lastModified, digest, pathname) {
	   return { length: fileLength, modified: lastModified, checksum: digest, path: pathname };
	},
	
	/**
	* Parse a line and create a checksum
	*
	* @return	a checksum object or undefined is parsing fails.
	**/
	parseChecksumRecord : function(record) {
		record = record.trim();
		if(record.length == 0) return undefined;	// Empty line
		if(record[0] == "#")	return undefined;	// Comment
		var part = record.split(',');	// Parse
		if(part.length != 4) return undefined;	// Wrong number of parts
		
		return { length: parseInt(part[0]), modified: parseInt(part[1]), checksum: part[2], path: part[3] };
	},
 
   /** 
    * Output a checksum record.
    *
    * Write a checksum record in the standard format. 
    * This format is a comma separated list of file size, last modified, sha1 checksum and file path.
    *
    * @param out  the {@link PrintStream} to write the output record.
    * @param fileLength   The length of the file in bytes.
	* @param lastModified The last modified time in milliseconds from POSIX Epoch
    * @param digest   The checksum (digest) of the file.
    * @param pathname   The pathname of the file.
    */
    writeChecksumRecord : function(out, fileLength, lastModified, digest, pathname) {
	   out.write(fileLength + "," + lastModified + "," + digest + "," + pathname + "\n");
	},

	/** 
    * Output a checksum record.
    *
    * Write a checksum record in the standard format. 
    * This format is a comma separated list of file size, last modified, sha1 checksum and file path.
    *
    * @param out  the {@link PrintStream} to write the output record.
    * @param fileLength   The length of the file in bytes.
	* @param lastModified The last modified time in milliseconds from POSIX Epoch
    * @param digest   The checksum (digest) of the file.
    * @param pathname   The pathname of the file.
    */
    writeFileChecksum : function(out, fileLength, lastModified, pathname) {
	   var hash = crypto.createHash('sha1');
	   fs.ReadStream(pathname)
		.on('data', function(d) {
			hash.update(d);
		})
		.on('end', function() {
			var d = hash.digest('hex');
			module.exports.writeChecksumRecord(out, fileLength, lastModified, d, pathname);
		})
		;	
	},

   /** 
    * Output a checksum record.
    *
    * Write a checksum record in the standard format. 
    * This format is a comma separated list of file size, last modified, sha1 checksum and file path.
    *
    * @param out  the {@link PrintStream} to write the output record.
    * @param pathname   The pathname of the file to determine the checksum and write in the record.
    */
    writeChecksum : function(out, pathname) {
	   var hash = crypto.createHash('sha1');
	   fs.ReadStream(pathname)
		.on('data', function(d) {
			hash.update(d);
		})
		.on('end', function() {
			var d = hash.digest('hex');
			var s = fs.statSync(pathname);
			module.exports.writeChecksumRecord(out, s.size, s.mtimeMs, d, pathname);
		})
		;	
    },
   
    /** 
    * Determine if two records are the same
	*/
    isEqual : function(record1, record2) {
		if( ! record1) return false;
		if( ! record2) return false;
		
		if(record1.length != record2.length) return false;
		if(record1.modified != record2.modified) return false;
		if(record1.checksum != record2.checksum) return false;
		if(record1.path != record2.path) return false;	// Should always be equal - key is also path
		
		return true;
    },
   
	/**
	 * Scan a Mimic checksum file and load contents into a HashMap. 
	 * 
	 * @param path the file system path to scan for files.
	 * 
	 * @return HashMap<String, igpp.mimic.CheckumRecord> containing information from the checksum file.
	 */
	load : function(filepath) {
		var cnt = 0;
		var rootPath = config.findRoot(filepath);
		var localMap = [];
		
		if (rootPath === undefined) {
			console.log("   Error: Folder does not appear to be a Mimic managed archive. [" + rootPath + "]" );
			return localMap;
		}
	
		var truePath = path.normalize(path.join(rootPath, config.ChecksumFile));

		if( ! fs.existsSync(truePath)) {	// Create checksum file
			var fd = fs.openSync(truePath, "w");
			if(fd != -1) fs.closeSync(fd);
		}
				
		return this.loadFrom(truePath);
	},

	/**
	 * Scan a Mimic checksum file and load contents into a HashMap. 
	 * 
	 * @param path the file system path to scan for files.
	 * 
	 * @return HashMap<String, igpp.mimic.CheckumRecord> containing information from the checksum file.
	 */
	loadFrom : function(pathname) {
		var cnt = 0;
		var localMap = [];

		var truePath = path.normalize(pathname);
		
		var reader = new readlines(truePath);

		while (line = reader.next()) {
			line = line.toString('utf8');
			line = line.trim();
			if(line.length == 0) continue;	// Empty line
			if(line[0] == "#")	continue;	// Comment
			var part = line.split(',');	// Parse
			if(part.length != 4) return;	// Wrong number of parts - should throw error

			localMap[part[3]] = { length: parseInt(part[0]), modified: parseInt(part[1]), checksum: part[2], path: part[3] };
		}
		
		return localMap;
	},

	/**
	 * Scan a Mimic package file and load directives into an object. 
	 * 
	 * @param pathname the file system path to scan for files.
	 * 
	 * @return array containing information from the checksum file.
	 */
	loadDirectivesFrom : function(pathname) {
		var header = "";

		var truePath = path.normalize(pathname);
		
		var reader = new readlines(truePath);

		while (line = reader.next()) {
			line = line.toString('utf8');
			line = line.trim();
			if(line.length == 0) return;	// Empty line
			if(line[0] == "#")	{
				header += line.substring(1).trim();
			} else {	// End of header
				// reader.close() is not working - do it as it is in the module.
				fs.closeSync(reader.fd);
				reader.fd = null;
				break;
			}
		}
		
		return JSON.parse(header);
	},
	
	
   /**
    * Store in-memory configuration sections in the configuration file.
    */
	store : function(pathname, info) {
		var rootPath = config.findRoot(pathname);
		
		if (rootPath === undefined) {
			console.log("   Error: Folder does not appear to be a Mimic managed archive. [" + rootPath + "]" );
			return;
		}
	
		var truePath = path.normalize(path.join(rootPath, config.ChecksumFile));
		
		var fd = fs.openSync(truePath, "w");

		for(index in info) {
			var rec = info[index];
			fs.writeSync(fd, rec.length + "," + rec.modified + "," + rec.checksum + "," + rec.path + "\n");
		}
	
		fs.closeSync(fd);
	}
	
}
