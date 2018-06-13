/**
 * Copy files uses different protocols.
 * 
 * @author Todd King
 *
 */
 
const fs = require('fs');
const path = require('path');
const https = require('https');
const ftp = require('ftp');
const scp2 = require('scp2');
const url = require('url');

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
		var outFile = path.normalize(path.join(root, pathname))

		https.get(this.joinURL(uri, hostfile), (res) => {
			// console.log('statusCode:', res.statusCode);
			// console.log('headers:', res.headers);

			if(res.statusCode != 200) {
				console.log('Unable to complete pull of "' + hostfile + '".');
				console.log('Reason: ' + res.statusMessage);
				console.log('url: ' + this.joinURL(uri, hostfile));
				return;
			}
			var outStream = fs.createWriteStream(outFile)
			.on('finish', function() {
				callback(pathname, parseInt(res.headers['content-length']), modified);
			});
			res
			.on('data', (d) => {
				outStream.write(d);
			})
			.on('end', function () {
				outStream.end();
				// callback(pathname, res.headers['content-length']);
			})
			;
		}).on('error', (e) => {
			console.error(e);
		});

	},

	pullFtp : function(root, pathname, hostfile, host, hostpath, modified, callback) {
		var outFile = path.normalize(path.join(root, pathname));
		
		var c = new ftp();
		c.on('ready', function() {
			c.get(this.joinURL(hostpath, hostfile), function(err, stream) {
				if (err) { console.error(e); callback(pathname, 0); }
				stream.once('close', function() { c.end(); callback(pathname, 0, modified)});
				stream.pipe(fs.createWriteStream(outFile));
			});
		});
		
		// connect to localhost:21 as anonymous
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