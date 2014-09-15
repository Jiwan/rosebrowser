/// <reference path="./definitions/node.d.ts"/>

var exec = require('child_process').exec;

var buildSteps: { message: string; command: string }[] = [
    {
        message: 'Compiling the server...', 
        command: 'node ./node_modules/typescript/bin/tsc server/app.ts \
                  --out server/app.js \
                  --target ES5 --module commonjs'
    },
    /*
    {
        message: 'Compiling the client...', 
        command: 'node ./node_modules/typescript/bin/tsc client/mycalendar.ts \
                  --out client/static/js/mycalendar.js \
                  --target ES5 --sourcemap'
    }
    */
];


function build(steps: { message: string; command: string }[]) {
    if (steps.length == 0) {
        console.log('Build finished!');
        return;
    }

    console.log(steps[0].message);
    exec(steps[0].command, (err: any, stdout: any, stderr: any) => {
        if (err) {
            console.log(err);
            console.log(stdout);
            console.log(stderr);
        }

        steps.shift();
        build(steps);
    });
}

console.log('Starting build...');
build(buildSteps);