/**
 * Add new files, remove missing files and update entries for changed files in the Mimic managed collection.
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
	.usage('Add new files, remove missing files and update entries for changed files in the Mimic managed collection.')
	.usage('$0 [args] files')
	.example('$0 .', 'update the inventory of mangaged files in the current (.) folder.')
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

		// Recursively scan for files
		'r' : {
			alias: 'recurse',
			describe : 'Recursively process all files starting at path.',
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

		// Quick
		'q' : {
			alias: 'quick',
			describe : 'Check file presence, size and timestamp only. Do not recalculate checksum.',
			type: 'boolean',
			default: false
		},

		// File
		'f' : {
			alias: 'file',
			describe : 'Refresh the entry for the given file. Path is relative to the root Mimic folder.',
			type: 'boolean',
			default: false
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

var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}
	
	// Process source argument 
	while((arg = args.shift()) != null) {
		if(options.verbose) { console.log("Refreshing files in: " + arg); }
		mimic.refresh(arg, options.quick, options.recurse, options.verbose, options.test);
	}
	
}

main(args);