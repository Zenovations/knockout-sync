
/**
 * Extends qUnit functionality to allow running of one module as well as just one test
 */
(function($) {

   //todo make this work with headless browsers (node exports, et al)

   function setSelection($select) {
      var m = (window.location.href.match(/\?filter=(.+)(?:%3A|:)/) || [])[1];
      if( m ) {
         $select.val(decodeURIComponent(m));
      }
   }

   var _origModule = window.module, $select = $('<select><option value="">All Test Modules</option></select>');
   window.module = function() {
      $select.append('<option value="'+arguments[0]+'">'+arguments[0]+'</option>');
      var opts = $select.find('option').sort(function(a, b){
         return ( $(a).text() > $(b).text() );
      });
      $select.empty().append(opts);
      setSelection($select);
       _origModule.apply(null, arguments);
   };

   $(function() { // on dom ready
      $select.on('change', function() {
         var opt = $(this).find('option:selected').val();
         if( opt ) {
            opt = '?filter='+encodeURIComponent(opt+':');
         }
         else { opt = ''; }
         window.location = window.location.href.replace(/\?.*/, '')+opt;
      });

      $('#qunit-testrunner-toolbar').prepend('&nbsp;&nbsp;').prepend($select);
   });

})(jQuery);
