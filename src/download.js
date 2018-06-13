#!/usr/bin/env node
"use strict";
/**
 * Download files using Mimic technology.
 * 
 * @author Todd King
 *
 * Provided under the Apache License 2.0
 */

const yargs = require('yargs');
const fs = require('fs');

// Mimic modules
const mimic = require('./lib/mimic.js');
const checksum = require('./lib/checksum.js');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Download files listing in an inventory (package) using Mimic.')
	.usage('mimic-download [args] <files...>')
	.example('mimic-download -p pack.mimic .', 'download the files listed in "pack.mimic"')
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
		
		'p' : {
			alias : 'pack',
			description : 'Download package information file.',
			type: 'string' 
		},
		
		// Username
		'u' : {
			alias: 'username',
			describe : 'The username of the account to use at the destination host.',
			type: 'string'
		},

		// Keyfile
		'k' : {
			alias: 'keyfile',
			describe : 'The name of the file containing the SSH private key.',
			type: 'string'
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

var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}
	
	var good = true;
	if( ! options.pack ) { console.log("Missing package (-p) name. Required."); good = false; }

	if( ! good ) return;
	
	// Read package
	if( ! fs.existsSync(options.pack)) { 
		console.log('Package file does not exist.');
		console.log('Looking for: ' + options.pack);
		return;
	}	
	
	var pack = checksum.loadDirectivesFrom(options.pack);
	
	var inventory = checksum.loadFrom(options.pack);
	
	// Create destination folder
	var home = args[0];
	if( ! fs.existsSync(home)) {
		try {
			fs.mkdirSync(home);
		} catch(e) {
			console.log("Unable to create destination folder.");
			console.log("Reason:");
			console.log(e);
			return;
		}
	}
	
	// Do the download
	mimic.download(home, pack.uri, inventory, options.username, options.keyfile, options.verbose);
}

main(args);
