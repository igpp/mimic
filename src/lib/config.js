/**
 * Constants for managing configuration collections and defining settings for 
 * synchronization with remote hosts.
 * 
 * @author Todd King
 *
 */

const fs = require('fs');
const path = require('path');

var MimicFolder = ".mimic";

// Public interface
module.exports = {
	/* Public Variables */
	DigestFormat : "SHA1",
	MimicFolder : MimicFolder,
	ChecksumFile : MimicFolder + "/checksum.mimic",
	ConfigFile : MimicFolder + "/config",
	BundleFile : MimicFolder + "/bundle",
	
	/**
	 * Determine if a folder contains Mimic information and return the normalized path.
	 * 
	 * @return	normalized path to the folder if configured for Mimic, null if not.
	 */
	getRoot : function(basePath) {
		var normPath = path.normalize(basePath);
		if(normPath === ".") normPath = process.cwd();
		if(normPath.substring(0, 2) === "..") normPath = path.normalize(Path.join(process.cwd(), normPath));
		
		if(fs.existsSync(path.join(normPath, this.MimicFolder))) { return basePath; }
			
		var testPath = path.normalize(path.join(normPath, this.MimicFolder));
		
		if(fs.existsSync(testPath)) return normPath;
		
		return null;	// Not using mimic
	},

	/**
	 * Search for the root folder of a Mimic managed collection starting with the given folder.
	 * 
	 * The given directory will be searched for a Mimic folder. If one is not found, then the parent
	 * folder will be searched. This will be repeated until reaching the root of the file system.
	 * 
	 * @return	path to the root folder or null of one not found.
	 */
	findRoot : function(basePath) {
		var normPath = path.normalize(basePath);
		if(normPath === ".") normPath = process.cwd();
		if(normPath.substring(0, 2) === "..") normPath = path.normalize(Path.join(process.cwd(), normPath));
		
		if(fs.existsSync(path.join(normPath, this.MimicFolder))) { return basePath; }
			
		var testPath = path.normalize(path.join(normPath, this.MimicFolder));
		
		if(fs.existsSync(testPath)) return normPath;
		
		// Step up on level
		var newPath = path.resolve(path.join(basePath, ".."));
		if(normPath === newPath) return null;	// Reached top

		return this.findRoot(path.resolve(path.join(basePath, ".."))); // Look in parent folder
	},

	/**
	 * Make a path follow the POSIX convention for path segement separator.
	 *
	 * Replaces all '\' with '/'.
	 **/
	canonicalPath : function(path) {
		return path.replace(/\\/g, '/');
	},
	
	/**
	 * Set what messages to output based on character codes.
	 * 
	 * Supported flags character codes are:
	 *   <dt>o: Matching items, status of "OK". Checksums match.</dt>
	 *   <dt>f: Failed. Checksums do not match.</dt>
	 *   <dt>m: Missing. File is not present.</dt>
	 *   <dt>e: Errors. Read or calculation errors.</dt>
	 *
	 * @param flags    sequence of flag character codes.
	 */
	setMessage : function(flags) {
	   	this.ShowMatch = false;
	   	this.ShowFailed = false;
	   	this.ShowMissing = false;
	   	this.ShowErrors = false;
	   	
	   	for(var i = 0; i < flags.length(); i++) {
	   		if(flags[i] == 'o') this.ShowMatch = true;
	   		if(flags[i] == 'f') this.ShowFailed = true;
	   		if(flags[i] == 'm') this.ShowMissing = true;
	   		if(flags[i] == 'e') this.ShowErrors = true;
	   	}
	},

	/**
	 * Display the in-memory sections to an opened {@link PrintStream}.
	 * 
	 * @param out	an opened {@link PrintStream}
	 */
	dump : function() {
		var s;
		while((s = mSection.shift()) != null) {
			console.log("[" + s.getName() + "]");
			s.dump();
			console.log("");
		}
	},

	/**
	 * Initialize a collection for management with Mimic. 
	 * 
	 * @throws IOException	if unable to create new configuration file.
	 */
	init : function(pathname) {
		if( ! fs.existsSync(pathname)) {	// Try to create empty file
			if(mVerbose) System.out.println("Creating configuration file: " + pathname);
			var fd = null;
			if( ! (fd = fs.openSync(pathname, "w"))) {
				console.log("Unable to create Mimic configuration file.");
			} else {
				fd.close();
			}
			
		}
	},

	/**
	 * Load a configuration file into memory. 
	 * 
	 * @throws IOException	if unable to create new configuration file.
	 */
	load : function(pathname) {
		var rootPath = this.findRoot(pathname);
		
		if (rootPath === undefined) {
			console.log("   Error: Folder does not appear to be a Mimic managed archive. [" + rootPath + "]" );
			return {};
		}
	
		var truePath = path.normalize(path.join(rootPath, this.ConfigFile));
		
		if( ! fs.existsSync(truePath)) {
			console.log("   Error: Configuration file is missing. [" + truePath + "]");
			return {};
		}

		var buffer = fs.readFileSync(truePath);
		
		return JSON.parse(buffer);
	},

   /**
    * Store in-memory configuration sections in the configuration file.
    */
	store : function(pathname, info) {
		var rootPath = this.findRoot(pathname);
		var localMap = [];
		var section = null;
		
		if (rootPath === undefined) {
			console.log("   Error: Folder does not appear to be a Mimic managed archive. [" + rootPath + "]" );
			return localMap;
		}
	
		var truePath = path.normalize(path.join(rootPath, this.ConfigFile));
		
		var fd = fs.openSync(truePath, "w");
		
		fs.writeSync(fd, JSON.stringify(info, null, 3));
	
		fs.closeSync(fd);
	}


}