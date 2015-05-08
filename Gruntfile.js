var path = require('path');

module.exports = function (grunt) {

  function cssJsBanner() {
    var d = new Date(),
      local = d.toLocaleDateString();

    return ('/* \n' +
        ' * Frame Game \n \n' +
        ' * Author: http://vincentorback.se \n' +
        ' * https://github.com/vincentorback/frame-game \n' +
        ' * \n' +
        ' * Latest build: ' + local + '\n' +
        '*/ ');
  }

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        mangle: false,
        banner: cssJsBanner()
      },
      dist: {
        files: {
          'public/js/main-min.js': [
            'public/js/vendor/jquery-2.1.3.js',
            'public/js/vendor/underscore.js',
            'public/js/resources.js',
            'public/js/input.js',
            'public/js/sprite.js',
            'public/js/client.js'
          ]
        }
      }
    }

  });

  require('load-grunt-tasks')(grunt);

  grunt.registerTask('default', ['uglify']);

};