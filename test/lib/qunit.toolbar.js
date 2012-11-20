
/**
 * Extends qUnit functionality to allow running of one module as well as just one test
 */
(function($) {

   //todo make this work with headless browsers (node exports, et al)
   var m = decodeURIComponent((window.location.href.match(/\?filter=(.+?)(?:%3A|:)/) || [])[1]);
   var _origModule = window.module, $select = $('<select><option value="">All Test Modules</option></select>');
   window.module = function() {
      var $opt = $('<option value="'+arguments[0]+'">'+arguments[0]+'</option>'), v = $select.val();
      $select.append($opt);
      var opts = $select.find('option').sort(function(a, b){
         return ( $(a).text() > $(b).text() );
      });
      $select.empty().append(opts);
      if( v ) { $select.val(v); } // records added after dom ready might disrupt selection
       _origModule.apply(null, arguments);
   };

   $(function() { // on dom ready
      if( m ) { $select.val(m); }
      $select.on('change', function() {
         var opt = $(this).find('option:selected').val();
         if( opt ) {
            opt = '?filter='+encodeURIComponent(opt+':');
         }
         else { opt = ''; }
         window.location = window.location.href.replace(/\?.*/, '')+opt;
      });

      var $button = $('<button accesskey="a"><u>a</u>gain</button>').on('click', function() {
         $select.change();
      });

      var $next = $('<button accesskey="n"><u>n</u>ext</button>').on('click', function() {
         var $n = $select.find('option:selected').next('option'), v = $select.find('option').eq(0).attr('value');
         if( $n.length ) {
            v = $n.attr('value');
         }
         $select.val(v).change();
      });

      $('#qunit-testrunner-toolbar').prepend('&nbsp;&nbsp;').prepend($next).prepend($button).prepend($select).prepend('&nbsp;&nbsp;');
   });

})(jQuery);
