
/*global module:false*/
module.exports = function(grunt) {

//   grunt.loadNpmTasks('grunt-mocha');

   // Project configuration.
   grunt.initConfig({
      pkg: '<json:grunt.json>',
      meta: {
         banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n\n'
      },
      concat: {
         base: {
            src: [
               '<banner:meta.banner>',
               'lib/*.js',
               'lib/deplibs/*.js',
               'src/*.js',
               'src/classes/*.js'
            ],
            dest: 'dist/<%= pkg.name %>.base.js'
         },
         all: {
            src: [
               '<banner:meta.banner>',
               'lib/*.js',
               'lib/deplibs/*.js',
               'src/*.js',
               'src/classes/*.js',
               'src/validators/*.js',
               'src/stores/*.js'
            ],
            dest: 'dist/<%= pkg.name %>.js'
         }
      },
      min: {
         base: {
            src: ['<banner:meta.banner>', '<config:concat.base.dest>'],
            dest: 'dist/<%= pkg.name %>.base.min.js'
         },
         all: {
            src: ['<banner:meta.banner>', '<config:concat.all.dest>'],
            dest: 'dist/<%= pkg.name %>.min.js'
         }
      },
//      qunit: {
//         files: ['test/**/*.html']
//      },
//      lint: {
//         files: ['grunt.js', 'src/**/*.js', 'test/**/*.js', 'lib/**/*.js']
//      },
      watch: {
         files: ['grunt.js*', 'src/**/*.js', 'lib/**/*.js'],
         tasks: 'make'
      },
//      mocha: {
//         index: 'test/index.html'
//      },
//      jshint: {
//         options: {
//            curly: true,
//            eqeqeq: true,
//            immed: true,
//            latedef: true,
//            newcap: true,
//            noarg: true,
//            sub: true,
//            undef: true,
//            boss: true,
//            eqnull: true,
//            browser: true
//         },
//         globals: {
//            jQuery: true
//         }
//      },
      uglify: {}
   });

   // Default task.
   grunt.registerTask('default', 'watch');
   grunt.registerTask('make',    'concat min');
//   grunt.registerTask('test', 'mocha');
//   grunt.registerTask('default', 'concat min');

};


