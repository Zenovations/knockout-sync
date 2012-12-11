/**
 * jQuery.whenall
 * https://github.com/Zenovations/jQuery-whenAll
 * MIT License: http://opensource.org/licenses/MIT
 */
(function($) {
   "use strict";

   // inspired by @InfinitiesLoop comment here:
   // http://stackoverflow.com/questions/5573165/raising-jquery-deferred-then-once-all-deferred-objects-have-been-resolved
   $.extend({
      /**
       * @return {jQuery.Deferred}
       */
      whenAll: function() {
         return whenAllFx(0, $.makeArray(arguments));
      },

      /**
       * @param {int} expires
       * @return {jQuery.Deferred}
       */
      whenAllExpires: function(expires) {
         return whenAllFx(expires, $.makeArray(arguments).slice(1));
      }
   });

   /**
    * @param {int} expires
    * @param {Array} args
    * @return {jQuery.Deferred}
    */
   function whenAllFx(expires, args) {
      var def = $.Deferred();
      var numberCompleted = 0;
      var totalExpected = args.length;
      var isExpired = false;
      var results = [];
      var numberFailed = 0;
      var to;

      if (expires) {
         to = setTimeout(function() {
            isExpired = true;
            // find any pending promises and mark them expired
            $.each(args, function(i, o) {
               if( o && typeof(o) === 'object' && o.promise && o.state ) {
                  if( o.state() === 'pending' ) {
                     next(i, 'expired');
                  }
               }
            })
         }, expires);
      }

      function next(pos, status, values) {
         var res = [pos, status];
         if( values ) { Array.prototype.push.apply(res, values); }
         numberCompleted++;
         if( status !== 'resolved' ) { numberFailed++; }
         def.notify.apply(def, res);
         results[pos] = res.slice(1);
         if( numberCompleted === totalExpected ) {
            // all promises resolved or rejected
            to && clearTimeout(to);
            if( numberFailed ) {
               def.reject(results);
            }
            else {
               def.resolve(results);
            }
         }
      }

      if( !totalExpected ) {
         // deal with empty args objects
         def.resolve(results);
      }
      else {
         // iterate the objects and wait for them to fulfill
         // these may get called after we expire the data, so make sure
         // than anything after that point doesn't result in a change to the data
         $.each(args, function(i, arg) {
            setTimeout(function() {
               $.when(arg).then(
                     function() {
                        isExpired || next(i, 'resolved', $.makeArray(arguments));
                     },
                     function() {
                        isExpired || next(i, 'rejected', $.makeArray(arguments));
                     }
               );
            }, 0);
         });
      }

      return def.promise();
   }

})(jQuery);