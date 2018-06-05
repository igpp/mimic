#!/usr/bin/env node
"use strict";
/**
 * Clone (copy) a Mimic managed collection.
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
	.usage('Clone (copy) a Mimic managed collection.')
	.usage('$0 [args] <files...>')
	.example('$0 -i somehwere -u me .', 'create a copy of the collection at "somewhere" as user "me"')
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
			type: 'string'
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

	// Check options
	var good = true;
	
	if( ! options.direction ) { console.log("Missing direction (-d). Required"); good = false;}
	if( ! options.username ) { console.log("Missing username (-u). Required"); good = false; }
	if( ! options.uri ) { console.log("Missing URI (-i). Required"); good = false; }
		
	if( ! good) return;

	if( ! mimic.init(args[0]) ) return;	// Already git managed
	
	// Define tag
	var direction = options.direction;
	// Make propercase
	direction = direction.charAt(0).toUpperCase() + direction.slice(1); 
	
	var info = {};
	
	info[direction] = {};

	if( options.tag ) {  info[direction]['tag'] = options.tag;  }
	if( options.username ) {  info[direction]['username'] = options.username;  }
	if( options.uri ) { info[direction]['uri'] = options.uri;  }
	if( options.cipher ) { info[direction]['withCipher'] = options.cipher;  }
	if( options.key ) { info[direction]['keyFile'] = options.key;  }
	
	// Create clone
	var filePath = args[0];
	
	config.store(filePath, info);

	var root = config.findRoot(filePath);
	
	// Test if under mimic management
	if(root === undefined || root === null) {	// Not initialized
		console.log("The folder '" + filePath + "' is not under Mimic management.");
		console.log("To place it under Mimic management issue the command mimic-init");
		console.log("in the folder or one of the parent folders.");
		return;
	}

	mimic.pull(root, options.uri, options.username, options.keyfile, options.verbose);
}

main(args);
