#!/usr/bin/env node
"use strict";
/**
 * Display information about a Mimic managed collection.
 * 
 * @author Todd King
 *
 */
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const readlines = require('n-readlines');
const convert = require('convert-units');
const commaNumber = require('comma-number');

// Mimic modules
const config = require('./lib/config.js');

var mExclude = [config.MimicFolder];

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Display information about a Mimic managed collection.')
	.usage('mimic-info [args]')
	.example('mimic-info .', 'display Mimic information about the current folder.')
	.epilog("Development funded by NASA's VMO and PDS project at UCLA.")
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

	})
	.argv
	;

var args = options._;	// None option command line arguments

// Global Variables
var fileCnt = 0;

var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}
	
	var found = 0;
	var filePath = args[0];
	
	var root = config.findRoot(filePath);
	
	// Test if under mimic management
	if(root === undefined || root === null) {	// Not initialized
		console.log("The folder '" + filepath + "' is not under Mimic management.");
		console.log("To place it under Mimic management issue the command mimic-init");
		console.log("in the folder or one of the parent folders.");
		return;
	}

	console.log('mimic base at: ' + root);
		
	// Check configuration
	var checksumPath = path.normalize(path.join(root, config.ChecksumFile));
	if( ! fs.existsSync(checksumPath)) {	// Checksum file
		console.log('Checksum file is missing.');
		return;
	}

	// Scan checksum file - gount files and sum size
	var fileCnt = 0;
	var totalSize = 0;
	
	if(options.verbose) { console.log("Opening: " + checksumPath); }
	
	var info = config.load(filePath);

	console.log("");
	console.log("* Connections *");
	console.log("");
	console.log(JSON.stringify(info, null, 3));
	console.log("");

	console.log("* Inventory Summary *");
	console.log("");

	var reader = new readlines(checksumPath);

	while (line = reader.next()) {
		line = line.toString('utf8');
		line = line.trim();
		if(line.length == 0) return;	// Empty line
		if(line[0] == "#")	return;	// Comment
		var part = line.split(',');	// Parse
		if(part.length != 4) return;	// Wrong number of parts

		fileCnt++;
		totalSize +=  parseInt(part[0]);
	}
	
	// Show summary
	console.log("  Files: " + commaNumber(fileCnt));
	var c = convert(totalSize).from('b').toBest();
	console.log("  Bytes: " + commaNumber(+(Math.round(c.val + "e+2")  + "e-2")) + " " +  c.unit);
	console.log("");
}

main(args);