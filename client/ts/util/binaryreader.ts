/// <reference path="../definitions/three.d.ts"/>

/// <reference path="../loaders/ptl.d.ts"/>

// module RoseBrowser.Util {
    // export class BinaryReader {
    class BinaryReader {
        private _buffer: Uint8Array;
        private _view: DataView;
        private _pos: number;

        constructor(arrayBuffer: ArrayBuffer) {
            this._buffer = new Uint8Array(arrayBuffer);
            this._view   = new DataView(arrayBuffer);
            this._pos    = 0;
        }

        public readFloat(): number {
            var res = this._view.getFloat32(this._pos, true);
            this._pos += 4;
            return res;
        }

        public readUint8(): number {
            return this._buffer[this._pos++];
        }

        public readUint16(): number {
            var res = this._buffer[this._pos+1] << 8 |
                      this._buffer[this._pos+0];
            this._pos += 2;
            return res;
        }

        public readUint24(): number {
            var res = this._buffer[this._pos+2] << 16 |
                      this._buffer[this._pos+1] << 8  |
                      this._buffer[this._pos+0];
            this._pos += 3;
            return res;
        }

        public readUint32(): number {
            var res = (this._buffer[this._pos+3] << 24 |
                       this._buffer[this._pos+2] << 16 |
                       this._buffer[this._pos+1] << 8  |
                       this._buffer[this._pos+0]) >>> 0;
            this._pos += 4;
            return res;
        }

        public readInt8(): number {
            var res = this._view.getInt8(this._pos);
            this._pos += 1;
            return res;
        }

        public readInt16(): number {
            var res = this._view.getInt16(this._pos, true);
            this._pos += 2;
            return res;
        }

        public readInt32(): number {
            var res = this._view.getInt32(this._pos, true);
            this._pos += 4;
            return res;
        }

        public readStr(): string {
            var startPos = this._pos;
            while (this._buffer[this._pos++]);
            var strArray = this._buffer.subarray(startPos, this._pos - 1);
            return String.fromCharCode.apply(null, strArray);
        }

        public readStrLen(len): string {
            var strArray = this._buffer.subarray(this._pos, this._pos + len);
            this._pos += len;
            return String.fromCharCode.apply(null, strArray);
        }

        public readBytes(len): Uint8Array {
            var array = this._buffer.subarray(this._pos, this._pos + len);
            this._pos += len;
            return array;
        }

        public readByteArray(len): Uint8Array {
            return this.readBytes(len);
        }

        public readUint16Array(len): Uint16Array {
            var array = new Uint16Array(this._buffer.buffer, this._pos, len);
            this._pos += len * 2;
            return array;
        }

        public readFloatArray(len): Float32Array {
            var array = new Float32Array(this._buffer.buffer, this._pos, len);
            this._pos += len * 4;
            return array;
        }

        public readUint8Str(): string {
            return this.readStrLen(this.readUint8());
        }

        public readUint16Str(): string {
            return this.readStrLen(this.readUint16());
        }

        public readUint32Str(): string {
            return this.readStrLen(this.readUint32());
        }

        public tell(): number {
            return this._pos;
        }

        public seek(pos): void {
            this._pos = pos;
        }

        public skip(num): void {
            this._pos += num;
        }

        public readIntVector2(): THREE.Vector2 {
            var x = this.readInt32();
            var y = this.readInt32();
            return new THREE.Vector2(x, y);
        }

        public readVector2(): THREE.Vector2 {
            var x = this.readFloat();
            var y = this.readFloat();
            return new THREE.Vector2(x, y);
        }

        public readVector3(): THREE.Vector3 {
            var x = this.readFloat();
            var y = this.readFloat();
            var z = this.readFloat();
            return new THREE.Vector3(x, y, z);
        }

        public readColour(): THREE.Color {
            var r = this.readFloat();
            var g = this.readFloat();
            var b = this.readFloat();
            return new THREE.Color(r, g, b);
        }

        // TODO: type this ptl Color4 !
        // TODO: change the name !
        public readColour4(): Colour4 {
            var r = this.readFloat();
            var g = this.readFloat();
            var b = this.readFloat();
            var a = this.readFloat();
            return new Colour4(r, g, b, a);
        }

        public readQuat(): THREE.Quaternion {
            var x = this.readFloat();
            var y = this.readFloat();
            var z = this.readFloat();
            var w = this.readFloat();
            return new THREE.Quaternion(x, y, z, w);
        }

        public readBadQuat(): THREE.Quaternion {
            var w = this.readFloat();
            var x = this.readFloat();
            var y = this.readFloat();
            var z = this.readFloat();
            return new THREE.Quaternion(x, y, z, w);
        }
    }
//}