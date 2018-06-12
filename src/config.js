#!/usr/bin/env node
"use strict";
/**
 * Constants for managing configuration collections and defining settings for 
 * synchronization with remote hosts.
 * 
 * @author Todd King
 *
 */

const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const config = require('./lib/config.js');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Configure synchronization with Mimic collections on a remote hosts.')
	.usage('mimic-config [args] <files...>')
	.example('mimic-config -l .', 'list configuration in the current folder')
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
		
		// List flag
		'l' : {
			alias: 'list',
			describe : 'Display configuration information.',
			type: 'boolean',
			default: false
		},
				
		// Direction
		'd' : {
			alias: 'direction',
			describe : 'Direction to synchronize files [Push | Pull].',
			type: 'string',
			choices: ['push', 'pull'],
			default: 'pull'
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
		
		// Cypher
		'c' : {
			alias: 'cipher',
			describe : 'Keep cipher (encryption) active for data transfers.',
			type: 'boolean',
			default: false
		},
		
		// Username
		'k' : {
			alias: 'keyfile',
			describe : 'The name of the file containing the SSH private key.',
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
		return found;
	}
	
	var info = config.load(filePath);
	
	if(options.list) {
		console.log(JSON.stringify(info, null, 3));
		return;
	}
	
	// Check options
	var good = true;
	
	if( ! options.direction ) { console.log("Missing direction (-d). Required"); good = false;}
	if( ! options.username ) { console.log("Missing username (-u). Required"); good = false; }
	if( ! options.uri ) { console.log("Missing URI (-i). Required"); good = false; }

	if( options.direction == "push") { console.log("Push for direction is not yet implemented."); good = false;}
	
	if( ! good) return;
	
	// Define tag
	var direction = options.direction;
	// Make propercase
	direction = direction.charAt(0).toUpperCase() + direction.slice(1); 
	
	if( ! info[direction] ) { info[direction] = {}; }
	
	if( options.tag ) {  info[direction]['tag'] = options.tag;  }
	if( options.username ) {  info[direction]['username'] = options.username;  }
	if( options.uri ) { info[direction]['uri'] = options.uri;  }
	if( options.cipher ) { info[direction]['withCipher'] = options.cipher;  }
	if( options.key ) { info[direction]['keyFile'] = options.key;  }
	
	config.store(filePath, info);
}

main(args);
