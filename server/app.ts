/// <reference path="./definitions/express.d.ts"/>
/// <reference path="./definitions/mkdirp.d.ts"/>
/// <reference path="./definitions/node.d.ts"/>
/// <reference path="./definitions/socket.io.d.ts"/>

/// <reference path="./sshtunnel.ts"/>

import http = require('http');
import path = require('path');
import net = require('net');
import stream = require('stream');
import fs = require('fs');
import mkdirp = require('mkdirp')
import express = require('express');
import socketio = require('socket.io');
var YamlConfig = require('node-yaml-config');
import SshTunnel = require('./sshtunnel');

var config = YamlConfig.load(__dirname + '/config.yml');

if (!config.data || !(config.data.local || config.data.remote)) {
    console.log('You need a proper config!');
    process.exit(0);
}

function streamToBuffer(sourceStream, callback) {
    var bufs = [];
    sourceStream.on('data', function(d){ bufs.push(d); });
    sourceStream.on('end', function() {
        callback(null, Buffer.concat(bufs));
    });
}

class Cacher {
    private _path: string = "";

    constructor(private _source: string)
    {
        this._path = __dirname + '/cache';
    }

    private getSourceStream(filePath: string, callback: Function): void {
        http.request(this._source + filePath, (lRes: any) => {
            callback(null, lRes);
        }).end();
    }

    public getStream(filePath: string, callback: Function): void {
        var cacheFile: string = this._path + filePath;
        var cacheDir: string  = path.dirname(cacheFile);

        fs.exists(cacheFile, (fileExists) => {
            fileExists = false; // TODO: remove this !
            if (fileExists) {
                var rs = fs.createReadStream(cacheFile);
                callback(null, rs)
            } else {
                mkdirp(cacheDir, () => {
                    var ws = fs.createWriteStream(cacheFile);
                    this.getSourceStream(filePath, (err, stream: stream.Stream) => {
                        stream.pipe(ws, {end: true});
                        callback(err, stream);
                    });
                });
            }
        });
    }
}

var app = express();

// Static Client Data
app.use(express.static(path.normalize(__dirname + '/../client')));

if (config.data.local) {
    console.log('Serving data from local source:', config.data.local);
    app.use('/data', express.static(config.data.local));
} else {
    console.log('Serving data from remote source:', config.data.remote);
    var cache = new Cacher(config.data.remote);
    app.use('/data/*', (req, res) => {
        cache.getStream(req.baseUrl.substr(6), (err, sourceStream) => {
            sourceStream.pipe(res, {end: true});
        });
    });
}


var server = app.listen(4040, () => {
    console.log('Listening on port %d', server.address().port);
});

var io = socketio.listen(server);
io.on('connection', (socket) => {
    var sockets = [];
    socket.on('disconnect', () => {
        console.log('td');
        for (var i = 0; i < sockets.length; ++i) {
            if (sockets[i]) {
                sockets[i].end();
            }
        }
    });
    socket.on('fr', (reqIdx, path) => {
        cache.getStream(path, (err, sourceStream) => {
            streamToBuffer(sourceStream, (err, sourceBuf) => {
                socket.emit('fr', reqIdx, sourceBuf);
            });
        });
    });
    socket.on('tc', (sockIdx, host, port) => {
        console.log('tc', sockIdx, host, port);

        function doRealConnect(tHost, tPort) {
            var outSock = net.connect(tPort, tHost);
            sockets[sockIdx] = outSock;

            outSock.on('connect', () => {
                console.log('Got connection for', sockIdx);
                socket.emit('tc', sockIdx);
            });
            outSock.on('error', (e) => {
                console.log('Got error from', sockIdx);
                socket.emit('te', sockIdx, e);
            });
            outSock.on('end', () => {
                console.log('Got end from', sockIdx);
                socket.emit('tx', sockIdx);
                sockets[sockIdx] = null;
            });
            outSock.on('data', (data) => {
                console.log('Got data from', sockIdx, data);
                socket.emit('tp', sockIdx, data);
            });

            return outSock;
        }

        if (!config.sshtunnel) {
            doRealConnect(host, port);
        } else {
            var myRandomPort = 10000 + Math.floor(Math.random() * 5000);
            var tunnelConfig = {
                remoteHost: host,
                remotePort: port,
                localPort: myRandomPort,
                sshConfig: config.sshtunnel
            };
            console.log('Opening SSH Tunnel', host, port, myRandomPort);
            var tunnel = new SshTunnel.SSHTunnel(<any>tunnelConfig);
            
            tunnel.connect(() => {
                console.log('New SSH Tunnel Active');
                var sock = doRealConnect('localhost', myRandomPort);
                sock.on('end', () => {
                    tunnel.close();
                });
            });
        }
    });
    socket.on('tx', (sockIdx) => {
        var outSock = sockets[sockIdx];
        if (outSock) {
            outSock.end();
        }
    });
    socket.on('tp', (sockIdx, data) => {
        var outSock = sockets[sockIdx];
        if (!Buffer.isBuffer(data)) {
            throw new Error('data was not a buffer!');
        }
        console.log('Sending to', sockIdx, data);
        if (outSock) {
            outSock.write(data);
            console.log('written...');
        }
    });
});
