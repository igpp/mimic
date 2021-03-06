#!/usr/bin/env node
"use strict";
/**
 * Check the status of mimic managed collection.
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
	.usage('Check the status of Mimic managed collection.')
	.usage('mimic-status [args] files')
	.example('mimic-status .', 'check the inventory of mangaged files in the current (.) folder.')
	.example("Provided under the Apache License 2.0")
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

		// Quick
		'q' : {
			alias: 'quick',
			describe : 'Check file presence, size and timestamp only. Do not recalculate checksum.',
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
		
	// Process source argument 
	var filePath = args[0];
	
	mimic.refresh(filePath, options.quick, true, options.verbose, 2);
	
}

main(args);