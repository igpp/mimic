#!/usr/bin/env node
"use strict";
/**
 * Use and manage bundles of Mimic  collection.
 * 
 * @author Todd King
 *
 * Provided under the Apache License 2.0
 */
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

// Mimic modules
const config = require('./lib/config.js');
const bundle = require('./lib/bundle.js');
const mimic = require('./lib/mimic.js');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Manage bundles of Mimic collection.')
	.usage('mimic-bundle [args] files')
	.example('mimic-bundle -a example', 'add the collection "example" to the bundle')
	.epilog("Development funded by NASA's VMO and PDS projects at UCLA\nand provided under the Apache License 2.0.")
	.showHelpOnFail(false, "Specify --help for available options")
	.help('h')
	
	// version
	.options({
		// help text
		'h' : {
			alias : 'help',
			description: 'Show information about the app.'
		},
		
		// Verbose flag
		'v' : {
			alias: 'verbose',
			describe : 'Show information while processing request.',
			type: 'boolean',
			default: false
		},

		// Add
		'a' : {
			alias: 'add',
			describe : 'Add a collection to a the bundle. Use "+" to add all folders in current folder.',
			type: 'string',
			default: null
		},

		// Remove
		'r' : {
			alias: 'remove',
			describe : 'Remove a collection from a the bundle.',
			type: 'string',
			default: null
		},

		// List
		'l' : {
			alias: 'list',
			describe : 'List the collections in the bundle.',
			type: 'boolean',
			default: false
		},

		// Task
		'p' : {
			alias: 'perform',
			describe : 'Perform a task on all collections in the bundle.',
			type: 'string',
			choices: ['refresh', 'pull', 'add', 'clone'],
		},
	
		// Test run
		't' : {
			alias: 'test',
			describe : 'Run in test mode, do not update any files.',
			type: 'boolean',
			default: false
		},

		// Quick
		'q' : {
			alias: 'quick',
			describe : 'Check file presence, size and timestamp only. Do not recalculate checksum.',
			type: 'boolean',
			default: false
		},

				// Tag
		't' : {
			alias: 'tag',
			describe : 'Name tag for the action.',
			type: 'string'
		},
		
		// URI
		'i' : {
			alias: 'uri',
			describe : 'URI for the destination host. Include protocol, host and path.',
			type: 'string'
		},
		
		// Username
		'u' : {
			alias: 'username',
			describe : 'The username of the account to use at the destination host.',
			type: 'string',
			default: 'anonymous'
		},
		
		// Username
		'k' : {
			alias: 'keyfile',
			describe : 'The name of the file containing the SSH private key.',
			type: 'string'
		},

		// Exclude
		'x' : {
			alias: 'exclude',
			describe : 'A comma separated list of the prefix of files or folder names to exclude from checksum generation or testing.',
			type: 'string',
			default: config.MimicFolder
		},
	})
	.argv
	;

var args = options._;	// None option command line arguments

var main = async function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}

	var filePath = args[0];
	
	// Check options
	var good = true;
	if(options.perform) {
		if(options.perform == 'clone') {	// Check options
			if( ! options.username ) { console.log("Missing username (-u). Required"); good = false; }
			if( ! options.uri ) { console.log("Missing URI (-i). Required"); good = false; }
		}
		
	}

	// Only direction support (Pull)
	var direction = "Pull";
	
	if( ! good ) return;

	// Do clone (if requested)
	// This is handled with promises because so much is going on.
	if(options.perform) {
		if(options.perform == 'clone') {	// Check options
			// Initialize folder
			mimic.init(filePath);
			
			// Write configuration information
			var info = {};
			
			info[direction] = {};

			if( options.tag ) {  info[direction]['tag'] = options.tag;  }
			if( options.username ) {  info[direction]['username'] = options.username;  }
			if( options.uri ) { info[direction]['uri'] = options.uri;  }
			if( options.cipher ) { info[direction]['withCipher'] = options.cipher;  }
			if( options.key ) { info[direction]['keyFile'] = options.key;  }
			
			config.store(filePath, info);
			
			// Create clone
			try {
				mimic.pull(filePath, options.uri, options.username, options.keyfile, options.verbose) 
				.then(async function(result) {
					// Prepare for general processing
					var root = mimic.findRoot(filePath);
					if(options.verbose) { console.log("   Load: " + root); }
					
					// Test if under mimic management
					if(root === undefined || root === null) {	// Not initialized
						return;
					}

				// Load bundle list	
					var bundleList = bundle.load(root);
					
					// Make an array from the bundle list
					var bundleArray = new Array();
					var keys = Object.keys(bundleList);
					for(var i = 0; i < keys.length; i++) {
						var rec = bundleList[keys[i]];
						bundleArray.push(rec);
					}
					
					// Use for() on keys to do task in series.
					for(var i = 0; i < bundleArray.length; i++) {
						var rec = bundleArray[i];
						if(options.verbose) { console.log('  Clone: ' + rec.path); }
						var collectionPath = path.join(filePath, rec.path);

						// Initialize folder
						if(options.verbose) { console.log("   Init: " + collectionPath); }
						if( ! mimic.init(collectionPath) ) continue;	// Already initialize
							
						// Write configuration information
						var uri = options.uri + "/" + rec.path;
						var info = {};
							
						info["Pull"] = {};

						if( options.tag ) {  info[direction]['tag'] = options.tag;  }
						if( options.username ) {  info[direction]['username'] = options.username;  }
						if( options.uri ) { info[direction]['uri'] = uri;  }
						if( options.cipher ) { info[direction]['withCipher'] = options.cipher;  }
						if( options.key ) { info[direction]['keyFile'] = options.key;  }
							
						config.store(collectionPath, info);
							
						// Create clone
						await mimic.pull(collectionPath, uri, options.username, options.keyfile, options.verbose);
					}
				}
				);
			} catch(reason) {
				console.log(reason.message);
				if(options.verbose) { console.log(reason); }
			}
			return;
		}
	}

	// Now do any other tasks or actions
	
	// Prepare for general processing
	var root = mimic.findRoot(filePath);
	
	// Test if under mimic management
	if(root === undefined || root === null) {	// Not initialized
		return;
	}

	var changed = false;
	
// Load bundle list	
	var bundleList = bundle.load(root);
		
	if(options.add) {
		if(options.add === '+') {	// All folders
			var files = fs.readdirSync('.');
			for(let i = 0; i < files.length; i++) {
				if(files[i].startsWith('.')) continue;	// Don't include hidden files
				var stat = fs.statSync(files[i]);
				if(stat.isDirectory()) { 
					if(options.verbose) console.log('   Adding: ' + files[i]);
					bundleList.push(bundle.createRecord(files[i]));
					changed = true;
				}
			}
		} else {	// One folder
			if(options.verbose) console.log('   Adding: ' + options.add);
			bundleList.push(bundle.createRecord(options.add));			
			changed = true;
		}
	}
	if(options.remove) {
		if(options.verbose) console.log(' Removing: ' + options.remove);
		delete bundleList[options.remove];		
		changed = true;
	}
	if(options.list) { 
		console.log("");
		console.log("* Bundled Collections *");
		var n = 0;
		for(key in bundleList) {
			var rec = bundleList[key];
			console.log("   " + rec.path);
			n++;
		}
		console.log("");
		console.log("Collections: " + n);
	}
	
	if(changed) {	// Write bundle information
		if( ! options.test ) bundle.store(filePath, bundleList);
	}
	
	// Perform tasks
	if(options.perform) {		
		if(options.perform == 'refresh') {
			for(var key in bundleList) {
				var rec = bundleList[key];
				if(options.verbose) { console.log('Refresh: ' + rec.path); }
				if(mimic.getRoot(key) != null) {	// Folder is root for a mimic collection
					mimic.refresh(key, options.quick, true, options.verbose, options.test)
				}
			}
		}
		
		if(options.perform == 'pull') {
			for(var key in bundleList) {
				var rec = bundleList[key];
				if(options.verbose) { console.log('   Pull: ' + rec.path); }
				if(mimic.getRoot(key) != null) {	// Folder is root for a mimic collection
					mimic.syncPull(key, options.verbose);
				}
			}
		}
		
		if(options.perform == 'add') {
			for(var key in bundleList) {
				var rec = bundleList[key];
				if(options.verbose) { console.log('    Add: ' + rec.path); }
				if(mimic.getRoot(key) != null) {	// Folder is root for a mimic collection
					mimic.add(key, true, options.verbose, options.test);
				}
			}
		}
	}
	if(options.test) { console.log("Test mode: No changes have been made."); }
}

main(args);