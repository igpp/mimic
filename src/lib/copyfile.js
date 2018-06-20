/**
 * Copy files uses different protocols.
 * 
 * @author Todd King
 *
 * Provided under the Apache License 2.0
 */
 
// const fs = require('fs');
const fs = require('graceful-fs');	// Manages fs read/write queues and avoids too many opened files.
const path = require('path');
const https = require('https');
const ftp = require('ftp');
const scp2 = require('scp2');
const url = require('url');

// const keepAliveAgent = new HttpsAgent();

const keepAliveAgent = new https.Agent({
  keepAlive: true, 
  keepAliveMsecs: 10000, // free socket keepalive for 10 seconds
  maxSockets: 256,
  maxFreeSockets: 256
});


// Mimic configuration information
const config = require('./config.js');

//Public interface
module.exports = {
	joinURL : function(front, back) {
		if(back.startsWith('./')) back = back.slice(2);
		if(back.startsWith('/')) back = back.slice(1);
		
		if( ! front.endsWith('/')) front += '/';
		
		return front + back;	
	},

	pullScp : function(root, pathname, hostfile, host, hostpath, username, key, modified, callback) {
		var outFile = path.normalize(path.join(root, pathname));
		var outFolder = "./" + path.dirname(outFile) + '/';

		outFile = this.joinURL(root, pathname);
		
		var client = new scp2.Client({
				host: host,
				username: username,
				privateKey: key
		});
		client.download(this.joinURL(hostpath, pathname), outFile, callback(outFile, 0, modified));
		
		/*
		scp2.scp({
				host: host,
				username: username,
				// 'password': 'something',
				privateKey: key,
				path: this.joinURL(hostpath, pathname)
			}, outFolder, function(err) {
				callback(outFile, 0);
			}
		)
		;
		*/
	},

	pullHttps : function(root, pathname, hostfile, uri, modified, callback) {
		var outFile = path.normalize(path.join(root, pathname));
		var urlParsed = url.parse(this.joinURL(uri, hostfile));
		
		// Construct options so we can pass "agent:false" to disable connection pooling
		if(urlParsed.port == null) { urlParsed.port = 80; if(urlParsed.protocol == "https:") { urlParsed.port = 443; } }
		
		var options = { 
			agent: keepAliveAgent, 
			method: 'GET', 
			protocol: 'https:',
			// port: urlParsed.port, 
			hostname: urlParsed.hostname, 
			path: urlParsed.pathname
			};

		https.get(options, (response) => {
			// console.log('statusCode:', res.statusCode);
			// console.log('headers:', res.headers);

			if(response.statusCode != 200) {
				/*
				console.log('Unable to pull "' + hostfile + '".');
				console.log('Reason: ' + res.statusMessage);
				console.log('url: ' + this.joinURL(uri, hostfile));
				*/
				callback(pathname, 0, 0);
			}
			
			// Create output stream
			var outStream = fs.createWriteStream(outFile)
				.on('finish', function() {
					callback(pathname, parseInt(response.headers['content-length']), modified);
				});
			
			// Process response from HTTPS request
			response
			.on('data', (d) => {
				outStream.write(d);
			})
			.on('end', function () {
				outStream.end();				
			})
			;
		}).on('error', (e) => {
			console.log("   Error: " + e.message);
			callback(pathname, 0, 0);
			// throw e;
		});

	},

	pullFtp : function(root, pathname, hostfile, host, hostpath, modified, callback) {
		var outFile = path.normalize(path.join(root, pathname));
		
		var c = new ftp();
		c.on('ready', function() {
			c.get(this.joinURL(hostpath, hostfile), function(err, stream) {
				if (err) { console.error(err); callback(pathname, 0, 0); }
				stream.once('close', function() { c.end(); callback(pathname, 0, modified)});
				stream.pipe(fs.createWriteStream(outFile));
			});
		});
		
		// connect to localhost:21 (ftp port) as anonymous
		c.connect();
	},

	pull : function(root, pathname, hostfile, uri, username, keyfile, modified, callback) {
		var parts = url.parse(uri);
		
		if(parts.protocol == 'http:' || parts.protocol == 'https:') { 
			this.pullHttps(root, pathname, hostfile, uri, modified, callback); 
		}
		if(parts.protocol == 'scp:') { 
			var urlRec = url.parse(uri);

			if( keyfile ) {	// Replace "~" with home
				keyfile = keyfile.replace("~", os.homedir());
			} else {
				keyfile = path.normalize(path.join(os.homedir(), ".ssh/id_rsa"));
			}
			var key = fs.readFileSync(keyfile);
			
			this.pullScp(root, pathname, hostfile, urlRec.host, urlRec.path, username, key, modified, callback);
		}
		if(parts.protocol == 'ftp:') { 
			var urlRec = url.parse(uri);

			this.pullFtp(root, pathname, hostfile, urlRec.host, urlRec.path, username, modified, callback);
		}
	}
}