
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
         all: {
            src: [
               'lib/*.js',
               'lib/deps/*.js',
               'src/*.js',
               'src/classes/*.js',
               'stores/*.js'
            ],
            dest: 'dist/<%= pkg.name %>.dev.js'
         }
      },
      min: {
         all: {
            src: ['<banner:meta.banner>', '<config:concat.all.dest>'],
            dest: 'dist/<%= pkg.name %>.js'
         }
      },
      watch: {
         files: ['grunt.js*', 'src/**/*.js', 'lib/**/*.js', 'stores/**/*.js'],
         tasks: 'make'
      },
//      mocha: {
//         index: 'test/index.html'
//      },
      uglify: {}
   });

   // Default task.
   grunt.registerTask('default', 'make watch');
   grunt.registerTask('make',    'concat min');
//   grunt.registerTask('test', 'mocha');

};


