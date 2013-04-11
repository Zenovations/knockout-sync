
(function(root) {

   root._.mixin({
      move: function(list, old_index, new_index) {
         if( old_index === new_index ) { return; }
         list.splice(new_index, 0, list.splice(old_index, 1)[0]);
      },

      // inspired by @InfinitiesLoop comment here:
      // http://stackoverflow.com/questions/5573165/raising-jquery-deferred-then-once-all-deferred-objects-have-been-resolved
      /**
       * @return {_.Deferred}
       */
      whenAll: function() {
         return whenAllFx(0, _.toArray(arguments));
      },

      /**
       * @param {int} expires
       * @return {_.Deferred}
       */
      whenAllExpires: function(expires) {
         return whenAllFx(expires, _.toArray(arguments).slice(1));
      }
   });

   /**
    * @param {int} expires
    * @param {Array} args
    * @return {_.Deferred}
    */
   function whenAllFx(expires, args) {
      var def = _.Deferred();
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
            _.each(args, function(o, i) {
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
         _.each(args, function(arg, i) {
            setTimeout(function() {
               _.when(arg).then(
                  function() {
                     isExpired || next(i, 'resolved', _.toArray(arguments));
                  },
                  function() {
                     isExpired || next(i, 'rejected', _.toArray(arguments));
                  }
               );
            }, 0);
         });
      }

      return def.promise();
   }

})(window);