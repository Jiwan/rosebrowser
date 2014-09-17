/// <reference path="../util/binaryreader.ts"/>
/// <reference path="../util/singleton.ts"/>
/// <reference path="../net/socket.ts"/>

module RoseBrowser.Loaders {
    export class _ROSELoader {
        // var ROSE_DATA_PATH: string = config.dataPath ? config.dataPath : '/data/';
        public ROSE_DATA_PATH: string = '/data/';
        public ZZ_SCALE_IN: number  = 0.01;
        public ZZ_SCALE_OUT: number = 100;

        private iopReqIdx = 1;
        private iopReqHandlers = {};

        constructor(private _experimental: boolean = false) {
            if (_experimental) {      
                this.registerSocketIOCallback();
            }
        }

        public load(path: string, callback: (rh: BinaryReader) => void): void {
            if (this._experimental) {
                this.sendSocketIORequest(path, callback);
            }  else {
                this.sendXHRRequest(path, callback);
            }  
        }

        private registerSocketIOCallback() {
            Net.iop.on('fr', (reqIdx, data) => {
                var callback = this.iopReqHandlers[reqIdx];
                if (callback) {
                    callback(new BinaryReader(data));
                    delete this.iopReqHandlers[reqIdx];
                }
            });
        }

        private sendSocketIORequest(path: string, callback: (rh: BinaryReader) => void): void {
            var thisReqIdx = iopReqIdx++;
            this.iopReqHandlers[thisReqIdx] = callback;
            Net.iop.emit('fr', thisReqIdx, path);
        }

        private sendXHRRequest(path: string, callback: (rh: BinaryReader) => void): void {
            var loader = new THREE.XHRLoader();
            loader.setResponseType('arraybuffer');

            loader.load(this.ROSE_DATA_PATH + path, (buffer) => {
                callback(new BinaryReader(<ArrayBuffer><any>buffer));
            });
        }
    }

    export var ROSELoader = Util.Singleton.getInstance(_ROSELoader);
}