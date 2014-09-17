module RoseBrowser.Util {
    // http://stackoverflow.com/questions/17382143/how-to-create-a-new-object-from-type-parameter-in-generic-class-in-typescript

    export class Singleton {
        private static _instances: { [item: string]: any };

        public static getInstance<T>(cstr: { new(...args: any[]): T; }, ...args: any[]): T {
            if (!Singleton._instances[cstr.toString()]) {
                Singleton._instances[cstr.toString()] = new cstr(args);
            }

            return Singleton._instances[cstr.toString()];
        }
    }
}