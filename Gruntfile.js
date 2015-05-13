var path = require('path');

module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    uglify: {
      options: {
        mangle: true,
        screwIE8: true
      },
      dist: {
        files: {
          'public/js/main-min.js': [
            'public/js/vendor/modernizr-custom.js',
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