/*! underscore_minimal.js
 *
 * If underscore doesn't already exist, include a minimal set of functions for manipulating
 * objects and arrays.
 *************************************/
(function (root) {
   "use strict";
   if( !root._ ) {
      var ArrayProto = Array.prototype;

      var breaker = {},
         slice          = ArrayProto.slice,
         push           = ArrayProto.push,
         hasOwnProperty = Object.prototype.hasOwnProperty,
         nativeForEach  = ArrayProto.forEach,
         nativeIsArray  = Array.isArray,
         toString       = Object.prototype.toString,
         nativeMap      = ArrayProto.map,
         concat         = ArrayProto.concat,
         nativeIndexOf  = ArrayProto.indexOf;

      var _ = root._ = {};

      // The cornerstone, an `each` implementation, aka `forEach`.
      // Handles objects with the built-in `forEach`, arrays, and raw objects.
      // Delegates to **ECMAScript 5**'s native `forEach` if available.
      var each = _.each = function(obj, iterator, context) {
         if (obj == null) return;
         if (nativeForEach && obj.forEach === nativeForEach) {
            obj.forEach(iterator, context);
         } else if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
               if (iterator.call(context, obj[i], i, obj) === breaker) return;
            }
         } else {
            for (var key in obj) {
               if (obj.hasOwnProperty(key)) {
                  if (iterator.call(context, obj[key], key, obj) === breaker) return;
               }
            }
         }
      };

      // Internal recursive comparison function for `isEqual`.
      var eq = function(a, b, aStack, bStack) {
         // Identical objects are equal. `0 === -0`, but they aren't identical.
         // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
         if (a === b) return a !== 0 || 1 / a == 1 / b;
         // A strict comparison is necessary because `null == undefined`.
         if (a == null || b == null) return a === b;
         // Unwrap any wrapped objects.
         // Compare `[[Class]]` names.
         var className = toString.call(a);
         if (className != toString.call(b)) return false;
         switch (className) {
            // Strings, numbers, dates, and booleans are compared by value.
            case '[object String]':
               // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
               // equivalent to `new String("5")`.
               return a == String(b);
            case '[object Number]':
               // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
               // other numeric values.
               return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
            case '[object Date]':
            case '[object Boolean]':
               // Coerce dates and booleans to numeric primitive values. Dates are compared by their
               // millisecond representations. Note that invalid dates with millisecond representations
               // of `NaN` are not equivalent.
               return +a == +b;
            // RegExps are compared by their source patterns and flags.
            case '[object RegExp]':
               return a.source == b.source &&
                  a.global == b.global &&
                  a.multiline == b.multiline &&
                  a.ignoreCase == b.ignoreCase;
         }
         if (typeof a != 'object' || typeof b != 'object') return false;
         // Assume equality for cyclic structures. The algorithm for detecting cyclic
         // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
         var length = aStack.length;
         while (length--) {
            // Linear search. Performance is inversely proportional to the number of
            // unique nested structures.
            if (aStack[length] == a) return bStack[length] == b;
         }
         // Add the first object to the stack of traversed objects.
         aStack.push(a);
         bStack.push(b);
         var size = 0, result = true;
         // Recursively compare objects and arrays.
         if (className == '[object Array]') {
            // Compare array lengths to determine if a deep comparison is necessary.
            size = a.length;
            result = size == b.length;
            if (result) {
               // Deep compare the contents, ignoring non-numeric properties.
               while (size--) {
                  if (!(result = eq(a[size], b[size], aStack, bStack))) break;
               }
            }
         } else {
            // Objects with different constructors are not equivalent, but `Object`s
            // from different frames are.
            var aCtor = a.constructor, bCtor = b.constructor;
            if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
               return false;
            }
            // Deep compare objects.
            for (var key in a) {
               if (_.has(a, key)) {
                  // Count the expected number of properties.
                  size++;
                  // Deep compare each member.
                  if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
               }
            }
            // Ensure that both objects contain the same number of properties.
            if (result) {
               for (key in b) {
                  if (_.has(b, key) && !(size--)) break;
               }
               result = !size;
            }
         }
         // Remove the first object from the stack of traversed objects.
         aStack.pop();
         bStack.pop();
         return result;
      };

      // Perform a deep comparison to check if two objects are equal.
      _.isEqual = function(a, b) {
         return eq(a, b, [], []);
      };

      // Is a given array, string, or object empty?
      // An "empty" object has no enumerable own-properties.
      _.isEmpty = function(obj) {
         if (obj == null) return true;
         if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
         for (var key in obj) if (_.has(obj, key)) return false;
         return true;
      };

      // Is a given value an array?
      // Delegates to ECMA5's native Array.isArray
      _.isArray = nativeIsArray || function(obj) {
         return toString.call(obj) == '[object Array]';
      };

      // Is a given variable an object?
      _.isObject = function(obj) {
         return obj === Object(obj);
      };

      // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
      each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
         _['is' + name] = function(obj) {
            return toString.call(obj) == '[object ' + name + ']';
         };
      });

      // Define a fallback version of the method in browsers (ahem, IE), where
      // there isn't any inspectable "Arguments" type.
      if (!_.isArguments(arguments)) {
         _.isArguments = function(obj) {
            return !!(obj && _.has(obj, 'callee'));
         };
      }

      // Optimize `isFunction` if appropriate.
      if (typeof (/./) !== 'function') {
         _.isFunction = function(obj) {
            return typeof obj === 'function';
         };
      }

      // Is a given object a finite number?
      _.isFinite = function(obj) {
         return isFinite(obj) && !isNaN(parseFloat(obj));
      };

      // Is the given value `NaN`? (NaN is the only number which does not equal itself).
      _.isNaN = function(obj) {
         return _.isNumber(obj) && obj != +obj;
      };

      // Is a given value a boolean?
      _.isBoolean = function(obj) {
         return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
      };

      // Is a given value equal to null?
      _.isNull = function(obj) {
         return obj === null;
      };

      // Is a given variable undefined?
      _.isUndefined = function(obj) {
         return obj === void 0;
      };

      // Shortcut function for checking if an object has a given property directly
      // on itself (in other words, not on a prototype).
      _.has = function(obj, key) {
         return hasOwnProperty.call(obj, key);
      };

      // Add your own custom functions to the Underscore object.
      _.mixin = function(obj) {
         each(obj, function(func, name){
            _[name] = func;
         });
      };

      // Safely convert anything iterable into a real, live array.
      _.toArray = function(obj) {
         if (!obj) return [];
         if (_.isArray(obj)) return slice.call(obj);
         if (obj.length === +obj.length) return _.map(obj, _.identity);
         return _.values(obj);
      };

      // Return the results of applying the iterator to each element.
      // Delegates to **ECMAScript 5**'s native `map` if available.
      _.map = _.collect = function(obj, iterator, context) {
         var results = [];
         if (obj == null) return results;
         if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
         each(obj, function(value, index, list) {
            results[results.length] = iterator.call(context, value, index, list);
         });
         return results;
      };

      // Return a copy of the object only containing the whitelisted properties.
      _.pick = function(obj) {
         var copy = {};
         var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
         each(keys, function(key) {
            if (key in obj) copy[key] = obj[key];
         });
         return copy;
      };

      // Returns a function, that, as long as it continues to be invoked, will not
      // be triggered. The function will be called after it stops being called for
      // N milliseconds. If `immediate` is passed, trigger the function on the
      // leading edge, instead of the trailing.
      _.debounce = function(func, wait, immediate) {
         var timeout, result;
         return function() {
            var context = this, args = arguments;
            var later = function() {
               timeout = null;
               if (!immediate) result = func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) result = func.apply(context, args);
            return result;
         };
      };

      // Extend a given object with all the properties in passed-in object(s).
      _.extend = function(obj) {
         each(slice.call(arguments, 1), function(source) {
            if (source) {
               for (var prop in source) {
                  obj[prop] = source[prop];
               }
            }
         });
         return obj;
      };


      // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
      // we need this function. Return the position of the first occurrence of an
      // item in an array, or -1 if the item is not included in the array.
      // Delegates to **ECMAScript 5**'s native `indexOf` if available.
      // If the array is large and already in sort order, pass `true`
      // for **isSorted** to use binary search.
      _.indexOf = function(array, item, isSorted) {
         if (array == null) return -1;
         var i = 0, l = array.length;
         if (isSorted) {
            if (typeof isSorted == 'number') {
               i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
            } else {
               i = _.sortedIndex(array, item);
               return array[i] === item ? i : -1;
            }
         }
         if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
         for (; i < l; i++) if (array[i] === item) return i;
         return -1;
      };

      // Sort the object's values by a criterion produced by an iterator.
      _.sortBy = function(obj, value, context) {
         var iterator = lookupIterator(value);
         return _.pluck(_.map(obj, function(value, index, list) {
            return {
               value : value,
               index : index,
               criteria : iterator.call(context, value, index, list)
            };
         }).sort(function(left, right) {
               var a = left.criteria;
               var b = right.criteria;
               if (a !== b) {
                  if (a > b || a === void 0) return 1;
                  if (a < b || b === void 0) return -1;
               }
               return left.index < right.index ? -1 : 1;
            }), 'value');
      };

      // An internal function to generate lookup iterators.
      var lookupIterator = function(value) {
         return _.isFunction(value) ? value : function(obj){ return obj[value]; };
      };

      // Return the results of applying the iterator to each element.
      // Delegates to **ECMAScript 5**'s native `map` if available.
      _.map = _.collect = function(obj, iterator, context) {
         var results = [];
         if (obj == null) return results;
         if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
         each(obj, function(value, index, list) {
            results[results.length] = iterator.call(context, value, index, list);
         });
         return results;
      };

      // Convenience version of a common use case of `map`: fetching a property.
      _.pluck = function(obj, key) {
         return _.map(obj, function(value){ return value[key]; });
      };

   }
})(window);