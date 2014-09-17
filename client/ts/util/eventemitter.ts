module RoseBrowser.Util {
    export class EventEmitter {
        private _eventHandlers: { [item: string]: Array<Function>; };

        constructor() {
            this._eventHandlers = {};
        }

        public emit(event: string, ...args: any[]): void {
            if (!this._eventHandlers[event]) {
                return;
            }

            for (var j = 0; j < this._eventHandlers[event].length; ++j) {
                // this.eventHandlers[event][j].apply(this, args);
                this._eventHandlers[event][j](args);
            }
        }

        public addEventListener(event: string, handler: Function): void {
            if (!this._eventHandlers[event]) {
                this._eventHandlers[event] = [];
            }
            this._eventHandlers[event].push(handler);
        }

        public on(event: string, handler: Function): void {
            this.addEventListener(event, handler);
        }

        public removeEventListener(event: string, handler: Function): boolean {
            if (!this._eventHandlers[event]) {
                return false;
            }
            var handlerIdx = this._eventHandlers[event].indexOf(handler);
            
            if (handlerIdx !== -1) {
                this._eventHandlers[event].splice(handlerIdx, 1);
                return true;
            }
            return false;
        }
    }
}
