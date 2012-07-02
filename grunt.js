
/*global module:false*/
module.exports = function(grunt) {

   // Project configuration.
   grunt.initConfig({
      pkg: '<json:grunt.json>',
      meta: {
         banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
            '<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
            '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
            ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
      },
      concat: {
         dist: {
            src: ['<banner:meta.banner>',
                  'src/jquery.sequence.js',
                  '<file_strip_banner:src/<%= pkg.name %>.js>',
                  'src/Model.js'
            ],
            dest: 'dist/<%= pkg.name %>.js'
         },
         all: {
            src: ['<banner:meta.banner>',
               'lib/jquery.sequence.js',
               '<file_strip_banner:src/<%= pkg.name %>.js>',
               'src/Model.js',
               'src/Validator.js',
               'src/stores/*.js'
            ],
            dest: 'dist/<%= pkg.name %>.all.js'
         }
      },
      min: {
         dist: {
            src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
            dest: 'dist/<%= pkg.name %>.min.js'
         },
         all: {
            src: ['<banner:meta.banner>', '<config:concat.all.dest>'],
            dest: 'dist/<%= pkg.name %>.all.min.js'
         }
      },
      qunit: {
         files: ['test/**/*.html']
      },
      lint: {
         files: ['grunt.js', 'src/**/*.js', 'test/**/*.js']
      },
      watch: {
         files: '<config:lint.files>',
         tasks: 'lint qunit'
      },
      mocha: {
         index: 'test/index.html'
      },
      jshint: {
         options: {
            curly: true,
            eqeqeq: true,
            immed: true,
            latedef: true,
            newcap: true,
            noarg: true,
            sub: true,
            undef: true,
            boss: true,
            eqnull: true,
            browser: true
         },
         globals: {
            jQuery: true
         }
      },
      uglify: {}
   });

   // Default task.
   grunt.registerTask('default', 'lint qunit');
   grunt.registerTask('make', 'concat min');
//   grunt.registerTask('default', 'concat min');

   grunt.loadNpmTasks('grunt-mocha');

};


