#!/usr/bin/env node
"use strict";
/**
 * Add new files to the Mimic managed collection.
 * 
 * @author Todd King
 *
 */
const yargs = require('yargs');

// Mimic modules
const config = require('./lib/config.js');
const bundle = require('./lib/bundle.js');
const mimic = require('./lib/mimic.js');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Manage bundles of Mimic managed collection.')
	.usage('mimic-add [args] files')
	.example('mimic-bundle -a example', 'add the collection "example" to the bundle')
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

		// Add
		'a' : {
			alias: 'add',
			describe : 'Add a collection to a the bundle.',
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
			choices: ['refresh', 'pull', 'add'],
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

	var filePath = args[0];
	
	var root = mimic.findRoot(filePath);
	
	// Test if under mimic management
	if(root === undefined || root === null) {	// Not initialized
		return;
	}

	var bundleList = bundle.load(root);
	
	var changed = false;
	
	// Process requests
	if(options.add) {
		if(options.verbose) console.log('   Adding: ' + options.add);
		bundleList.push(bundle.createRecord(options.add));
		changed = true;
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
				mimic.refresh(key, options.quick, true, options.verbose, options.test)
			}
		}
		if(options.perform == 'pull') {
			for(var key in bundleList) {
				var rec = bundleList[key];
				if(options.verbose) { console.log('   Pull: ' + rec.path); }
				mimic.syncPull(key, options.verbose);
			}
		}
		if(options.perform == 'add') {
			for(var key in bundleList) {
				var rec = bundleList[key];
				if(options.verbose) { console.log('    Add: ' + rec.path); }
				mimic.add(key, true, options.verbose, options.test);
			}
		}
	}
	if(options.test) { console.log("Test mode: No changes have been made."); }
}

main(args);