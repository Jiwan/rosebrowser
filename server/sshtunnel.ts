/// <reference path="./definitions/node.d.ts"/>

var Connection = require('ssh2');
import net = require('net');

export class SSHTunnel {
    private _verbose: boolean = false;

    private _config: any = null;

    private _server: any = null;

    private _connection: any = null;

    constructor(config: any, callback?: Function) {
        this._verbose = config.verbose || false;
        this._config  = config;

        if (callback) {
            this.connect(callback);
        }
    }

    private log(...values: any[]): void {
        if (this._verbose) {
            console.log.apply(null, arguments);
        }
    }

    public close(callback?: Function): void {
        this._server.close((error): void => {
            this._connection.end();

            if (callback) {
              callback(error);
            }
        });
    }

    public connect(callback: any): void {
        var disabled: boolean  = this._config.disabled;
        var remoteHost: string = this._config.remoteHost || '127.0.0.1';
        var remotePort: number = this._config.remotePort;
        var localPort: number  = this._config.localPort;

        if (disabled) {
            if (callback) {
                callback(null);
            }

            return;
        }

        this._connection = new Connection();

        this._connection.on('ready', () => {

            this._server = net.createServer((connection: any): void => {
                var buffers = [];

                var addBuffer: any = (data: any) => {
                  buffers.push(data);
                }

                connection.on('data', addBuffer);

                this._connection.forwardOut('', 0, remoteHost, remotePort, (error, ssh) => {
                    while (buffers.length) {
                      ssh.write(buffers.shift());
                    }
                    connection.removeListener('data', addBuffer);

                    ssh.on('data', (buf) => {
                      connection.write(buf);
                    });

                    connection.on('data', (buf) => {
                      ssh.write(buf);
                    });

                    connection.on('end', () => {
                      this.log('connection::end');
                      ssh.removeAllListeners();
                      ssh.end();
                    });

                    ssh.on('end', () => {
                      this.log('ssh::end');
                      connection.removeAllListeners();
                      connection.end();
                    });
                });
            });
            this._server.listen(localPort, callback);
        });

        this._connection.on('error', (err) => {
          this.log('ssh2::error:: ' + err);
        });

        this._connection.on('end', () => {
          this.log('ssh2::end');
        });
        
        this._connection.on('close', (err) => {
          this.log('ssh2::close');
        });

        this._connection.connect(this._config.sshConfig);
    }
}