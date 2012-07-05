
/**
 * Extends qUnit functionality to allow running of one module as well as just one test
 */
(function($) {

   var _origModule = module, modules = [];
   module = function() {
      modules.push(arguments[0]);
       _origModule.apply(null, arguments);
   };

   jQuery(function($) { // on dom ready
      var i = -1, len = modules.sort().length, $select = $('<select><option value="">All Test Modules</option></select>');
      while(++i < len) {
         $select.append('<option value="'+modules[i]+'">'+modules[i]+'</option>');
      }
      $select.on('change', function() {
          var opt = $(this).find('option:selected').val();
          if( opt ) {
             opt = '?filter='+encodeURIComponent(opt+':');
          }
          else { opt = ''; }
          window.location = window.location.href.replace(/\?.*/, '')+opt;
      });

      function setSelection($select) {
         var m = (window.location.href.match(/\?filter=(.+)(?:%3A|:)/) || [])[1];
         if( m ) {
            $select.val(decodeURIComponent(m));
         }
      }
      setSelection($select);

      $('#qunit-testrunner-toolbar').prepend('&nbsp;&nbsp;').prepend($select);

   });

})(jQuery);
