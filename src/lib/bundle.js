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

const mOverview = "Methods to manage bundle information.";
const mAcknowledge = "Development funded by NASA's PDS project at UCLA.";

//Public interface
module.exports = {
   /** 
    * Create a checksum record from passed values.
	**/
    createBundleRecord : function(lastModified, pathname) {
	   return { modified: lastModified, path: pathname };
	},
	
	createRecord : function(pathname) {
		var stat = fs.statSync(pathname);
		var statMod = Math.floor(stat.mtimeMs);	// Because mtimeMs cal contain fractional part
		return { modified: statMod, path: pathname };
	},
	
	/**
	* Parse a line and create a checksum
	*
	* @return	a checksum object or undefined is parsing fails.
	**/
	parseBundleRecord : function(record) {
		record = record.trim();
		if(record.length == 0) return undefined;	// Empty line
		if(record[0] == "#")	return undefined;	// Comment
		var part = record.split(',');	// Parse
		if(part.length != 2) return undefined;	// Wrong number of parts
		
		return { modified: parseInt(part[0]), path: part[1] };
	},
 
   /** 
    * Output a checksum record.
    *
    * Write a checksum record in the standard format. 
    * This format is a comma separated list of file size, last modified, sha1 checksum and file path.
    *
    * @param out  the {@link PrintStream} to write the output record.
	* @param modified The last modified time in milliseconds from POSIX Epoch
    * @param pathname   The pathname of the file.
    */
    writeBundleRecord : function(out, modified, pathname) {
	   out.write( modified + "," + pathname + "\n" );
	},
   
    /** 
    * Determine if two records are the same
	*/
    isEqual : function(record1, record2) {
		if( ! record1) return false;
		if( ! record2) return false;
		
		if(record1.modified != record2.modified) return false;
		if(record1.path != record2.path) return false;	// Should always be equal - key is also path
		
		return true;
    },
   
	/**
	 * Parse a Mimic bundle file and load into memory. 
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
	
		var truePath = path.normalize(path.join(rootPath, config.BundleFile));

		if( ! fs.existsSync(truePath)) { return []; }
		
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
			if(part.length != 2) return;	// Wrong number of parts - should throw error

			localMap[part[1]] = { modified: parseInt(part[0]), path: part[1] };
		}
		
		return localMap;
	},

	
   /**
    * Store in-memory bundle information into file.
    */
	store : function(pathname, info) {
		var rootPath = config.findRoot(pathname);
		
		if (rootPath === undefined) {
			console.log("   Error: Folder does not appear to be a Mimic managed archive. [" + rootPath + "]" );
			return;
		}
	
		var truePath = path.normalize(path.join(rootPath, config.BundleFile));
		
		var fd = fs.openSync(truePath, "w");

		for(var index in info) {
			var rec = info[index];
			fs.writeSync(fd, rec.modified + "," + rec.path + "\n");
		}
	
		fs.closeSync(fd);
	}
	
}
