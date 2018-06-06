#!/usr/bin/env node
"use strict";
/**
 * Synchronize a Mimic managed collection.
 * 
 * @author Todd King
 *
 */

const yargs = require('yargs');

// Mimic modules
const config = require('./lib/config.js');
const mimic = require('./lib/mimic.js');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Synchronize the local copy of a Mimic collection with the source collection.')
	.usage('mimic-pull [args] <files...>')
	.example('mimic-pull .', 'synchonize the local file collection with the original source.')
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
		
		// Tag
		't' : {
			alias: 'tag',
			describe : 'Name tag for the action.',
			type: 'string'
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

	var filePath = args[0];

	var root = config.findRoot(filePath);
	
	// Test if under mimic management
	if(root === undefined || root === null) {	// Not initialized
		console.log("The folder '" + filepath + "' is not under Mimic management.");
		console.log("To place it under Mimic management issue the command mimic-init");
		console.log("in the folder or one of the parent folders.");
		return;
	}

	if(options.verbose) console.log('mimic base at: ' + root);

	var settings = config.load(filePath);
	var pullSettings = settings["Pull"];
	if( ! pullSettings ) {
		console.log("No 'pull' source is defined. Mimic collection is not configured to pull.");
		return;
	}

	mimic.syncWithPull(root, pullSettings.uri, pullSettings.username, pullSettings.keyfile, options.verbose);	
}

main(args);
