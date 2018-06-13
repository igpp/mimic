#!/usr/bin/env node
"use strict";
/**
 * Prune (remove) enties from a Mimic managed collection that begin with a given path.
 * 
 * @author Todd King
 *
 * Provided under the Apache License 2.0
 */
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');

// Mimic modules
const config = require('./lib/config.js');
const checksum = require('./lib/checksum.js');

var mExclude = [config.MimicFolder];

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Prune (remove) enties from a Mimic managed collection that begin with a given path.')
	.usage('mimic-prune [args] path')
	.example('mimic-prune data/example', 'remove entries that begin with "data/example" from the Mimic inventory')
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
	
		// Test run
		't' : {
			alias: 'test',
			describe : 'Run in test mode, do not update any files.',
			type: 'boolean',
			default: false
		},

		// Prefix
		'p' : {
			alias: 'prefix',
			describe : 'Prefix of items to remove from the inventory.',
			type: 'string'
		},
	})
	.demandOption(['p'])
	.argv
	;

var args = options._;	// None option command line arguments

// Global Variables
var removeCnt = 0;

/** 
 * Prune (remove) enties from a Mimic managed collection that begin with a given path. 
 *
 * @param filepath   the pathname of the file containing the checksum records.
 * 
 * @return true of new files were found, false otherwise.
 */
function pruneFiles(filepath, prefix) {
	var changed = false;
	
	var root = config.findRoot(filepath);
	
	// Test if under mimic management
	if(root === undefined || root === null) {	// Not initialized
		console.log("The folder '" + filepath + "' is not under Mimic management.");
		console.log("To place it under Mimic management issue the command mimic-init");
		console.log("in the folder or one of the parent folders.");
		return;
	}

	// Load current list of files
	var localMap = checksum.load(filepath);

	for(var key in localMap) {
		if(key.startsWith(prefix)) {
			removeCnt++;
			if( ! options.test) {
				if(options.verbose) { console.log(" Remove: " + key); }
				delete localMap[key];
				changed = true;
			}
		}
	}

	if(changed) { checksum.store(filepath, checksum.sort(localMap)); }
	
	// Provide summary
	console.log(" Summary: ");
	console.log("  Removed: " + removeCnt + " files(s)");
	if(options.test) console.log("Test only. No changes were made.");
}

var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}
	
	// Process source argument
	var arg = ".";
	while((arg = args.shift()) != null) {
		if(options.verbose) { console.log("Pruning in: " + arg); }
		pruneFiles(arg, options.prefix);
	}
	
}

main(args);