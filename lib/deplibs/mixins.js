
(function() {
   // add a function to underscore.js to handle moving elements within an array
   _.mixin({
      move: function(list, old_index, new_index) {
//         if (new_index >= list.length) {
//            var k = new_index - list.length;
//            while ((k--) + 1) {
//               list.push(undefined);
//            }
//         }
         if( old_index === new_index ) { return; }
//         else if( old_index < new_index ) { new_index--; }
         list.splice(new_index, 0, list.splice(old_index, 1)[0]);
      },

      inArray: function(list, key) {
         return this.indexOf(list, key) > -1;
      },

      deepPush: function(obj, value, keys) {
         _.findOrCreate.apply(_, [obj, []].concat(_.toArray(arguments).splice(2))).push(value);
      },

      deepRemove: function(obj, valueOrKey, keys) {
         var base = _.deepFind(_, [obj].concat(_.toArray(arguments).splice(2)));
         if( base ) {
            if(_.isArray(base)) {
               var idx = _.indexOf(base, valueOrKey);
               idx > -1 && base.splice(idx, 1);
            }
            else {
               delete base[valueOrKey];
            }
         }
      },

      findOrCreate: function(obj, defaultVal, childKeys) {
         var k, i = -1, keys = _makeKeys(_.toArray(arguments).slice(2)), len = keys.length;
         while(++i < len) {
            k = keys[i];
            if( !_.has(obj, k) ) {
               obj[k] = i < len-1? {} : defaultVal;
            }
            obj = obj[k];
         }
         return obj;
      },

      deepFind: function(obj, keys) {
         if( !_.isObject(obj) ) {
            return null;
         }
         if( !_.isArray(keys) ) {
            keys = [keys];
         }
         var k, i = -1, len = keys.length, res = null;
         while(++i < len) {
            k = keys[i];
            if( !_.has(obj, k) ) {
               break;
            }
            res = obj[k];
         }
         return res;
      }
   });

   function _makeKeys(args) {
      var keys = [];
      _.each(args, function(key) {
         if(_.isArray(key)) {
            keys = keys.concat(key);
         }
         else {
            keys.push(key);
         }
      });
      return keys;
   }
})();

