
(function() {
   _.mixin({

      /**
       * Find the index of a value in an array. If the value is an object, use _.isEqual or the object's .equals
       * method instead of simply ==.
       *
       * @param {Array} list
       * @param obj a potential object
       * @return {int} -1 if not found
       */
      findIndex: function(list, obj) {
         if( !_.isObject(obj) ) {
            return _.indexOf(list, obj);
         }
         else {
            var v, res = -1, hasEquals = typeof(obj.equals) === 'function';
            // fetch the exact object because it will be compared using == in indexOf
            for(var i= 0, len = list.length; i < len; i++) {
               v = list[i];
               if(_.isObject(v)) {
                  if(hasEquals) {
                     if( obj.equals(v) ) {
                        res = i;
                        break;
                     }
                  }
                  else if( typeof(v.equals) === 'function' ) {
                     if( v.equals(obj) ) {
                        res = i;
                        break;
                     }
                  }
                  else {
                     if( _.isEqual(obj, v) ) {
                        res = i;
                        break;
                     }
                  }
               }
            }
            return res;
         }
      },

      move: function(list, old_index, new_index) {
         if( old_index === new_index ) { return; }
         list.splice(new_index, 0, list.splice(old_index, 1)[0]);
      },

      remove: function(list, value) {
         var i = _.findIndex(list, value);
         if( i > -1 ) {
            list.splice(i, 1);
         }
         return list;
      },

      deepRemove: function(obj, valueOrKey, keys) {
         var base = _.deepFind(_, [obj].concat(_.toArray(arguments).splice(2)));
         if( base ) {
            if(_.isArray(base)) {
               _.remove(base, valueOrKey);
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
         keys = _makeKeys(_.toArray(arguments).slice(1));
         if( !_.isObject(obj) ) {
            return null;
         }
         var k, j, i = -1, len = keys.length, res = obj;
         while(++i < len) {
            k = keys[i];
            if( !_.has(res, k) ) {
               break;
            }
            res = res[k];
         }
         return i === len? res : null;
      },

      isObjectLiteral: function(obj) {
         // credits: http://stackoverflow.com/questions/1173549/how-to-determine-if-an-object-is-an-object-literal-in-javascript
         var test  = obj;
         return (  typeof obj !== 'object' || obj === null ?
               false :
               ((function () {
                  while (true) {
                     if (  Object.getPrototypeOf( test = Object.getPrototypeOf(test)  ) === null) {
                        break;
                     }
                  }
                  return Object.getPrototypeOf(obj) === test;
               })())
         )
      },

      /**
       * Assumptions:
       *   - fields in b not in a are changed
       *   - fields in a not in b are ignored
       *   - object literals are compared recursively
       *   - fields with a .equals method are compared accordingly
       *   - other fields are compared with ===
       *
       * @param {object} a the original
       * @param {object} b the possible updates
       * @return {object}
       */
      changes: function(a, b) {
         var out = {};
         if( b ) {
            if( a ) {
               _.each(b, function(v,k) {
                  if(_.isObject(v) && typeof(v.equals) === 'function') {
                     if( !v.equals(a[k]) ) {
                        out[k] = v;
                     }
                  }
                  else if( _.isObjectLiteral(v) ) {
                     var diff = _.isObjectLiteral(a[k])? _.changes(v, a[k]) : v;
                     if( diff === v || _.size(diff) ) {
                        out[k] = diff;
                     }
                  }
                  else if( v !== a[k] ) {
                     out[k] = v;
                  }
               })
            }
            else {
               _.extend(out, b);
            }
         }
         return out;
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

