#!/usr/bin/env node
"use strict";
/**
 * Initialize a Mimic managed collection.
 * 
 * Creates a Mimic folder in the current folder and places an empty checksum file in the mimic folder.
 * 
 * @author Todd King
 *
 * Provided under the Apache License 2.0
 */
const yargs = require('yargs');

// Mimic modules
const mimic = require('./lib/mimic.js');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Initialize a Mimic managed collection.')
	.usage('mimic-init [args]')
	.example('mimic-init .', 'initialize the current folder')
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
	})
	.argv
	;

var args = options._;	// None option command line arguments

// Global variables

/*
function init(pathname) {
	if(options.verbose) {
		console.log("__dirname: " + __dirname);
		console.log("mimic folder: " + config.MimicFolder);
	}
	
	var mimicPath = path.normalize(path.join(pathname, config.MimicFolder))
	
	// Create hidden ".mimic" folder if one does not exist.
	if( ! fs.existsSync(mimicPath)) {
		fs.mkdirSync(mimicPath);
	} else {
		console.log('Folder already initialized for use with mimic.');
	}

	var checksumPath = path.normalize(path.join(pathname, config.ChecksumFile))
	
	// Create empty checksum file.
	if( ! fs.existsSync(checksumPath)) {
		var fd = fs.openSync(checksumPath, "w");
		if(fd != -1) fs.closeSync(fd);
	}	
}
*/

var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}

	mimic.init(args[0]);
}

main(args);	

