
/**
 * Extends qUnit functionality to allow running of one module as well as just one test
 */
(function($) {
   //todo make this work with headless browsers (node exports, et al)

   var currentModule, moduleSet = {};

   // create the select menu
   var $select = $('<select><option value="">All Test Modules</option></select>');

   // determine the current filter
   var fullFilterText = decodeURIComponent((window.location.href.match(/\?filter=(.+)/) || [])[1]);
   var selectedModule = ((fullFilterText||'').match(/^(.+?)(?:%3A|:)/) || [])[1];
   var selectedTest   = ((fullFilterText||'').match(/^(.+?)(?:%3A|:) +(.+)/) || [])[2];

   (function() {
      // track which modules get loaded
      var _origModule = window.module;
      window.module = function(moduleName) {
         currentModule = moduleSet[moduleName] = [];
         var $opt = $('<option value="'+moduleName+'">'+moduleName+'</option>'), v = $select.val();
         $select.append($opt);
         var opts = $select.find('option').sort(function(a, b){
            return ( $(a).text() > $(b).text() );
         });
         $select.empty().append(opts);
         //if( v ) { $select.val(v); } // records added after dom ready might disrupt selection
         _origModule.apply(null, arguments);
      };
   })();


   (function() {
      // track which tests get loaded into each module
      var _origTestMethod = window.test;
      window.test = function(testName, fx) {
         var key = buildTestName(testName);
         _.indexOf(currentModule, key) < 0 && currentModule.push(key);
         _origTestMethod.apply(null, arguments);
      };

      // track which tests get loaded into each module
      var _origAsyncMethod = window.asyncTest;
      window.asyncTest = function(testName, fx) {
         var key = buildTestName(testName);
         _.indexOf(currentModule, key) < 0 && currentModule.push(key);
         _origAsyncMethod.apply(null, arguments);
      };

      // copied from SyncController's "Rerun" link so they will be consistent
      function buildTestName(testName) {
         return testName.replace( /\([^)]+\)$/, "" ).replace( /(^\s*|\s*$)/g, "" );
      }
   })();

   $(function() { // on dom ready
      _.sortBy(moduleSet, function(v, k) { return k.toLowerCase(); });

      // activate the select list
      if( selectedModule ) { $select.val(selectedModule); }
      else { $select.val($select.children('option').first().attr('value')); }
      $select.on('change', function() {
         var opt = $(this).find('option:selected').val();
         if( opt ) {
            opt = '?filter='+encodeURIComponent(opt+':');
         }
         else { opt = ''; }
         window.location = window.location.href.replace(/\?.*/, '')+opt;
      });

      // create a button to rerun module
      var $button = $('<button accesskey="a"><u>a</u>gain</button>').on('click', function() {
         $select.change();
      });

      // create a button to run the next module
      var $next = $('<button accesskey="m">next <u>m</u>odule</button>').on('click', function() {
         var $n = $select.find('option:selected').next('option'), v = $select.find('option').eq(0).attr('value');
         if( $n.length ) {
            v = $n.attr('value');
         }
         $select.val(v).change();
      });

      // create a button to run the next test
      var $nextTest = $('<button accesskey="t">next <u>t</u>est</button>').on('click', function() {
         var idx;
         if( !selectedModule || !(selectedModule in moduleSet) ) {
            selectedModule = $select.children('option').eq(1).attr('value');
         }
         if( !selectedTest || _.indexOf(moduleSet[selectedModule], selectedTest) < 0 ) {
            idx = 0;
         }
         else {
            idx  = _.indexOf(moduleSet[selectedModule], selectedTest) + 1;
            if( idx === moduleSet[selectedModule].length ) {
               alert('That was the last test');
               return false;
            }
         }
         var nextTest = moduleSet[selectedModule][ idx ];
         window.location = window.location.href.replace(/\?.*/, '')+'?filter='+encodeURIComponent(selectedModule+': '+nextTest);
      });

      // wrap all of it in a tidy container
      var $div = $('<div class="qunit-toolbar" style="float: left" />').append('&nbsp;&nbsp;').append($select).append($button).append('&nbsp;&nbsp;').append($next).append($nextTest).append('&nbsp;&nbsp;');

      $('#qunit-testrunner-toolbar').prepend($div);
   });

})(jQuery);
