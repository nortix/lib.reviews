'use strict';

const saveLicense = require('uglify-save-license');

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      main: {
        expand: true,
        flatten: true,
        src: [
          'node_modules/jquery/dist/jquery.js',
          'node_modules/sisyphus.js/sisyphus.js',
          'node_modules/remote-ac/ac.js',
          'node_modules/jquery-powertip/dist/jquery.powertip.js'
        ],
        dest: 'static/js/'
      },
      editorStyles: {
        expand: true,
        flatten: true,
        src: [
          'node_modules/prosemirror-view/style/prosemirror.css',
          'node_modules/prosemirror-menu/style/menu.css'
        ],
        dest: 'static/css/editor/'
      }
    },
    browserify: {
      editor: {
        src: 'frontend/editor.js',
        dest: 'build/editor-es6-bundle.js'
      },
      review: {
        src: 'frontend/review.js',
        dest: 'build/review-es6-bundle.js'
      }
    },
    babel: {
      tests: {
        options: {
          sourceMap: true,
          plugins: ['transform-runtime'],
          presets: ['es2015', 'stage-2']
        },
        files: {
          'tests/helpers/model-helpers-es5.js': 'tests/helpers/model-helpers.js',
          'tests/helpers/integration-helpers-es5.js': 'tests/helpers/integration-helpers.js',
          'tests/helpers/content-helpers-es5.js': 'tests/helpers/content-helpers.js',
          'tests/helpers/test-helpers-es5.js': 'tests/helpers/test-helpers.js',
          'tests/fixtures/db-fixture-es5.js': 'tests/fixtures/db-fixture.js'
        }
      },
      mainJS: {
        options: {
          sourceMap: true,
          presets: ['es2015']
        },
        files: {
          'static/js/libreviews.js': 'frontend/libreviews.js',
          'static/js/register.js': 'frontend/register.js',
          'static/js/review.js': 'build/review-es6-bundle.js',
          'static/js/upload.js': 'frontend/upload.js',
          'static/js/user.js': 'frontend/user.js',
          'static/js/editor.js': 'build/editor-es6-bundle.js'
        }
      }
    },
    concat: {
      libJS: {
        src: [
          'static/js/jquery.js',
          'static/js/jquery.powertip.js',
          'static/js/sisyphus.js',
          'static/js/ac.js',
          'static/js/libreviews.js'
        ],
        dest: 'static/js/lib.js'
      },
    },
    uglify: {
      options: {
        preserveComments: saveLicense
      },
      mainJS: {
        files: {
          'static/js/lib.min.js': ['static/js/lib.js'],
          'static/js/editor.min.js': ['static/js/editor.js']
        }
      },
    }
  });

  grunt.registerTask('default', ['copy', 'browserify', 'babel', 'concat', 'uglify']);

};
