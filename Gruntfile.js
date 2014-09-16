module.exports = function (grunt) {
  
  grunt.initConfig({
  	pkg: grunt.file.readJSON('package.json'),
    ts: {
      server: {
        src: ['server/*.ts'],
        options: {
      	  target: 'es5',
      	  module: 'commonjs',
      	  sourceMap: false
      	}
      },
      client: {
        src: ['client/*.ts'],
        out: 'client/js/client.js',
        options: {
      	  target: 'es5',
      	  module: 'commonjs',
      	  sourceMap: true
      	}
      },
      tools: {
        src: ['tools/*.ts'],
        options: {
          target: 'es5',
          module: 'commonjs',
          sourceMap: false
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-ts');
  
  grunt.registerTask('default', ['ts:server', 'ts:client', 'ts:tools']);
};