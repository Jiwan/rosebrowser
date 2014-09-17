/// <reference path="../definitions/socket.io-client.d.ts"/>
/// <reference path="../util/eventemitter.ts"/>

import io = require('socket.io-client');

module RoseBrowser.Net {
    export var iop = io.connect('');
    export var socketList: RSocket[] = [];

    iop.on('tc', function(sockIdx) {
        socketList[sockIdx].emit('connect');
    });
    iop.on('tp', function(sockIdx, data) {
        socketList[sockIdx].emit('data', new Uint8Array(data));
    });
    iop.on('tx', function(sockIdx) {
        socketList[sockIdx].emit('end');
    });

    export class RSocket extends Util.EventEmitter {
        private _index: number;

        constructor() {
            super();

            this._index = socketList.length;
            socketList.push(this);
            this._eventHandlers = {};
        }

        public connect(host: string, port: number): void {
            iop.emit('tc', this._index, host, port);
        }

        public send(data: any): void {
            iop.emit('tp', this._index, data);
        }

        public end(): void {
            iop.emit('tx', this._index);
        }
    }
}