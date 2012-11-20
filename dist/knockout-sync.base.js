/*! Knockout Sync - v0.1.0 - 2012-11-20
* https://github.com/katowulf/knockout-sync
* Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL */



/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
   var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
   // The base Class implementation (does nothing)
   this.Class = function(){};

   // Create a new Class that inherits from this class
   Class.extend = function(prop) {
      var _super = this.prototype;

      // Instantiate a base class (but only create the instance,
      // don't run the init constructor)
      initializing = true;
      var prototype = new this();
      initializing = false;

      // Copy the properties over onto the new prototype
      for (var name in prop) {
         // Check if we're overwriting an existing function
         prototype[name] = typeof prop[name] == "function" &&
            typeof _super[name] == "function" && fnTest.test(prop[name]) ?
            (function(name, fn){
               return function() {
                  var tmp = this._super;

                  // Add a new ._super() method that is the same method
                  // but on the super-class
                  this._super = _super[name];

                  // The method only need to be bound temporarily, so we
                  // remove it when we're done executing
                  var ret = fn.apply(this, arguments);
                  this._super = tmp;

                  return ret;
               };
            })(name, prop[name]) :
            prop[name];
      }

      // The dummy class constructor
      function Class() {
         // All construction is actually done in the init method
         if ( !initializing && this.init )
            this.init.apply(this, arguments);
      }

      // Populate our constructed prototype object
      Class.prototype = prototype;

      // Enforce the constructor to be what we expect
      Class.prototype.constructor = Class;

      // And make this class extendable
      Class.extend = arguments.callee;

      return Class;
   };
})();



(function(console) {
   /*********************************************************************************************
    * Make sure console exists because IE blows up if it's not open and you attempt to access it
    * Create some dummy functions if we need to, so we don't have to if/else everything
    *********************************************************************************************/
   console||(console = window.console = {
      // all this "a, b, c, d, e" garbage is to make the IDEs happy, since they can't do variable argument lists
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      log: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      info: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      warn: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      error: function(a, b, c, d, e) {}
   });

   // le sigh, IE, oh IE, how we fight... fix Function.prototype.bind as needed
   if (!Function.prototype.bind) {
      Function.prototype.bind = function (oThis) {
         if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
         }

         var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {},
            fBound = function () {
               return fToBind.apply(this instanceof fNOP
                  ? this
                  : oThis || window,
                  aArgs.concat(Array.prototype.slice.call(arguments)));
            };

         fNOP.prototype = this.prototype;
         fBound.prototype = new fNOP();

         return fBound;
      };
   }

   // IE 9 won't allow us to call console.log.apply (WTF IE!) It also reports typeof(console.log) as 'object' (UNH!)
   // but together, those two errors can be useful in allowing us to fix stuff so it works right
   if( typeof(console.log) === 'object' ) {
      // Array.forEach doesn't work in IE 8 so don't try that :(
      console.log = Function.prototype.call.bind(console.log, console);
      console.info = Function.prototype.call.bind(console.info, console);
      console.warn = Function.prototype.call.bind(console.warn, console);
      console.error = Function.prototype.call.bind(console.error, console);
   }

   /**
    * Support group and groupEnd functions
    */
   ('group' in console) ||
   (console.group = function(msg) {
      console.info("\n------------\n"+msg+"\n------------");
   });
   ('groupEnd' in console) ||
   (console.groupEnd = function() {
      //console.log("\n\n");
   });

   /**
    * Support time and timeEnd functions
    */
   ('time' in console) ||
   (function() {
      var trackedTimes = {};
      console.time = function(msg) {
         trackedTimes[msg] = new Date().getTime();
      };
      console.timeEnd = function(msg) {
         var end = new Date().getTime(), time = (msg in trackedTimes)? end - trackedTimes[msg] : 0;
         console.info(msg+': '+time+'ms')
      }
   }());

})(window.console);


//     Underscore.js 1.4.2
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

   // Baseline setup
   // --------------

   // Establish the root object, `window` in the browser, or `global` on the server.
   var root = this;

   // Save the previous value of the `_` variable.
   var previousUnderscore = root._;

   // Establish the object that gets returned to break out of a loop iteration.
   var breaker = {};

   // Save bytes in the minified (but not gzipped) version:
   var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

   // Create quick reference variables for speed access to core prototypes.
   var push             = ArrayProto.push,
         slice            = ArrayProto.slice,
         concat           = ArrayProto.concat,
         unshift          = ArrayProto.unshift,
         toString         = ObjProto.toString,
         hasOwnProperty   = ObjProto.hasOwnProperty;

   // All **ECMAScript 5** native function implementations that we hope to use
   // are declared here.
   var
         nativeForEach      = ArrayProto.forEach,
         nativeMap          = ArrayProto.map,
         nativeReduce       = ArrayProto.reduce,
         nativeReduceRight  = ArrayProto.reduceRight,
         nativeFilter       = ArrayProto.filter,
         nativeEvery        = ArrayProto.every,
         nativeSome         = ArrayProto.some,
         nativeIndexOf      = ArrayProto.indexOf,
         nativeLastIndexOf  = ArrayProto.lastIndexOf,
         nativeIsArray      = Array.isArray,
         nativeKeys         = Object.keys,
         nativeBind         = FuncProto.bind;

   // Create a safe reference to the Underscore object for use below.
   var _ = function(obj) {
      if (obj instanceof _) return obj;
      if (!(this instanceof _)) return new _(obj);
      this._wrapped = obj;
   };

   // Export the Underscore object for **Node.js**, with
   // backwards-compatibility for the old `require()` API. If we're in
   // the browser, add `_` as a global object via a string identifier,
   // for Closure Compiler "advanced" mode.
   if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
         exports = module.exports = _;
      }
      exports._ = _;
   } else {
      root['_'] = _;
   }

   // Current version.
   _.VERSION = '1.4.2';

   // Collection Functions
   // --------------------

   // The cornerstone, an `each` implementation, aka `forEach`.
   // Handles objects with the built-in `forEach`, arrays, and raw objects.
   // Delegates to **ECMAScript 5**'s native `forEach` if available.
   var each = _.each = _.forEach = function(obj, iterator, context) {
      if (obj == null) return;
      if (nativeForEach && obj.forEach === nativeForEach) {
         obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
         for (var i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === breaker) return;
         }
      } else {
         for (var key in obj) {
            if (_.has(obj, key)) {
               if (iterator.call(context, obj[key], key, obj) === breaker) return;
            }
         }
      }
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

   // **Reduce** builds up a single result from a list of values, aka `inject`,
   // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
   _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
      var initial = arguments.length > 2;
      if (obj == null) obj = [];
      if (nativeReduce && obj.reduce === nativeReduce) {
         if (context) iterator = _.bind(iterator, context);
         return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
      }
      each(obj, function(value, index, list) {
         if (!initial) {
            memo = value;
            initial = true;
         } else {
            memo = iterator.call(context, memo, value, index, list);
         }
      });
      if (!initial) throw new TypeError('Reduce of empty array with no initial value');
      return memo;
   };

   // The right-associative version of reduce, also known as `foldr`.
   // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
   _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
      var initial = arguments.length > 2;
      if (obj == null) obj = [];
      if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
         if (context) iterator = _.bind(iterator, context);
         return arguments.length > 2 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
      }
      var length = obj.length;
      if (length !== +length) {
         var keys = _.keys(obj);
         length = keys.length;
      }
      each(obj, function(value, index, list) {
         index = keys ? keys[--length] : --length;
         if (!initial) {
            memo = obj[index];
            initial = true;
         } else {
            memo = iterator.call(context, memo, obj[index], index, list);
         }
      });
      if (!initial) throw new TypeError('Reduce of empty array with no initial value');
      return memo;
   };

   // Return the first value which passes a truth test. Aliased as `detect`.
   _.find = _.detect = function(obj, iterator, context) {
      var result;
      any(obj, function(value, index, list) {
         if (iterator.call(context, value, index, list)) {
            result = value;
            return true;
         }
      });
      return result;
   };

   // Return all the elements that pass a truth test.
   // Delegates to **ECMAScript 5**'s native `filter` if available.
   // Aliased as `select`.
   _.filter = _.select = function(obj, iterator, context) {
      var results = [];
      if (obj == null) return results;
      if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
      each(obj, function(value, index, list) {
         if (iterator.call(context, value, index, list)) results[results.length] = value;
      });
      return results;
   };

   // Return all the elements for which a truth test fails.
   _.reject = function(obj, iterator, context) {
      var results = [];
      if (obj == null) return results;
      each(obj, function(value, index, list) {
         if (!iterator.call(context, value, index, list)) results[results.length] = value;
      });
      return results;
   };

   // Determine whether all of the elements match a truth test.
   // Delegates to **ECMAScript 5**'s native `every` if available.
   // Aliased as `all`.
   _.every = _.all = function(obj, iterator, context) {
      iterator || (iterator = _.identity);
      var result = true;
      if (obj == null) return result;
      if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
      each(obj, function(value, index, list) {
         if (!(result = result && iterator.call(context, value, index, list))) return breaker;
      });
      return !!result;
   };

   // Determine if at least one element in the object matches a truth test.
   // Delegates to **ECMAScript 5**'s native `some` if available.
   // Aliased as `any`.
   var any = _.some = _.any = function(obj, iterator, context) {
      iterator || (iterator = _.identity);
      var result = false;
      if (obj == null) return result;
      if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
      each(obj, function(value, index, list) {
         if (result || (result = iterator.call(context, value, index, list))) return breaker;
      });
      return !!result;
   };

   // Determine if the array or object contains a given value (using `===`).
   // Aliased as `include`.
   _.contains = _.include = function(obj, target) {
      var found = false;
      if (obj == null) return found;
      if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
      found = any(obj, function(value) {
         return value === target;
      });
      return found;
   };

   // Invoke a method (with arguments) on every item in a collection.
   _.invoke = function(obj, method) {
      var args = slice.call(arguments, 2);
      return _.map(obj, function(value) {
         return (_.isFunction(method) ? method : value[method]).apply(value, args);
      });
   };

   // Convenience version of a common use case of `map`: fetching a property.
   _.pluck = function(obj, key) {
      return _.map(obj, function(value){ return value[key]; });
   };

   // Convenience version of a common use case of `filter`: selecting only objects
   // with specific `key:value` pairs.
   _.where = function(obj, attrs) {
      if (_.isEmpty(attrs)) return [];
      return _.filter(obj, function(value) {
         for (var key in attrs) {
            if (attrs[key] !== value[key]) return false;
         }
         return true;
      });
   };

   // Return the maximum element or (element-based computation).
   // Can't optimize arrays of integers longer than 65,535 elements.
   // See: https://bugs.webkit.org/show_bug.cgi?id=80797
   _.max = function(obj, iterator, context) {
      if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
         return Math.max.apply(Math, obj);
      }
      if (!iterator && _.isEmpty(obj)) return -Infinity;
      var result = {computed : -Infinity};
      each(obj, function(value, index, list) {
         var computed = iterator ? iterator.call(context, value, index, list) : value;
         computed >= result.computed && (result = {value : value, computed : computed});
      });
      return result.value;
   };

   // Return the minimum element (or element-based computation).
   _.min = function(obj, iterator, context) {
      if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
         return Math.min.apply(Math, obj);
      }
      if (!iterator && _.isEmpty(obj)) return Infinity;
      var result = {computed : Infinity};
      each(obj, function(value, index, list) {
         var computed = iterator ? iterator.call(context, value, index, list) : value;
         computed < result.computed && (result = {value : value, computed : computed});
      });
      return result.value;
   };

   // Shuffle an array.
   _.shuffle = function(obj) {
      var rand;
      var index = 0;
      var shuffled = [];
      each(obj, function(value) {
         rand = _.random(index++);
         shuffled[index - 1] = shuffled[rand];
         shuffled[rand] = value;
      });
      return shuffled;
   };

   // An internal function to generate lookup iterators.
   var lookupIterator = function(value) {
      return _.isFunction(value) ? value : function(obj){ return obj[value]; };
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

   // An internal function used for aggregate "group by" operations.
   var group = function(obj, value, context, behavior) {
      var result = {};
      var iterator = lookupIterator(value);
      each(obj, function(value, index) {
         var key = iterator.call(context, value, index, obj);
         behavior(result, key, value);
      });
      return result;
   };

   // Groups the object's values by a criterion. Pass either a string attribute
   // to group by, or a function that returns the criterion.
   _.groupBy = function(obj, value, context) {
      return group(obj, value, context, function(result, key, value) {
         (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
      });
   };

   // Counts instances of an object that group by a certain criterion. Pass
   // either a string attribute to count by, or a function that returns the
   // criterion.
   _.countBy = function(obj, value, context) {
      return group(obj, value, context, function(result, key, value) {
         if (!_.has(result, key)) result[key] = 0;
         result[key]++;
      });
   };

   // Use a comparator function to figure out the smallest index at which
   // an object should be inserted so as to maintain order. Uses binary search.
   _.sortedIndex = function(array, obj, iterator, context) {
      iterator = iterator == null ? _.identity : lookupIterator(iterator);
      var value = iterator.call(context, obj);
      var low = 0, high = array.length;
      while (low < high) {
         var mid = (low + high) >>> 1;
         iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
      }
      return low;
   };

   // Safely convert anything iterable into a real, live array.
   _.toArray = function(obj) {
      if (!obj) return [];
      if (obj.length === +obj.length) return slice.call(obj);
      return _.values(obj);
   };

   // Return the number of elements in an object.
   _.size = function(obj) {
      return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
   };

   // Array Functions
   // ---------------

   // Get the first element of an array. Passing **n** will return the first N
   // values in the array. Aliased as `head` and `take`. The **guard** check
   // allows it to work with `_.map`.
   _.first = _.head = _.take = function(array, n, guard) {
      return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
   };

   // Returns everything but the last entry of the array. Especially useful on
   // the arguments object. Passing **n** will return all the values in
   // the array, excluding the last N. The **guard** check allows it to work with
   // `_.map`.
   _.initial = function(array, n, guard) {
      return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
   };

   // Get the last element of an array. Passing **n** will return the last N
   // values in the array. The **guard** check allows it to work with `_.map`.
   _.last = function(array, n, guard) {
      if ((n != null) && !guard) {
         return slice.call(array, Math.max(array.length - n, 0));
      } else {
         return array[array.length - 1];
      }
   };

   // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
   // Especially useful on the arguments object. Passing an **n** will return
   // the rest N values in the array. The **guard**
   // check allows it to work with `_.map`.
   _.rest = _.tail = _.drop = function(array, n, guard) {
      return slice.call(array, (n == null) || guard ? 1 : n);
   };

   // Trim out all falsy values from an array.
   _.compact = function(array) {
      return _.filter(array, function(value){ return !!value; });
   };

   // Internal implementation of a recursive `flatten` function.
   var flatten = function(input, shallow, output) {
      each(input, function(value) {
         if (_.isArray(value)) {
            shallow ? push.apply(output, value) : flatten(value, shallow, output);
         } else {
            output.push(value);
         }
      });
      return output;
   };

   // Return a completely flattened version of an array.
   _.flatten = function(array, shallow) {
      return flatten(array, shallow, []);
   };

   // Return a version of the array that does not contain the specified value(s).
   _.without = function(array) {
      return _.difference(array, slice.call(arguments, 1));
   };

   // Produce a duplicate-free version of the array. If the array has already
   // been sorted, you have the option of using a faster algorithm.
   // Aliased as `unique`.
   _.uniq = _.unique = function(array, isSorted, iterator, context) {
      var initial = iterator ? _.map(array, iterator, context) : array;
      var results = [];
      var seen = [];
      each(initial, function(value, index) {
         if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
            seen.push(value);
            results.push(array[index]);
         }
      });
      return results;
   };

   // Produce an array that contains the union: each distinct element from all of
   // the passed-in arrays.
   _.union = function() {
      return _.uniq(concat.apply(ArrayProto, arguments));
   };

   // Produce an array that contains every item shared between all the
   // passed-in arrays.
   _.intersection = function(array) {
      var rest = slice.call(arguments, 1);
      return _.filter(_.uniq(array), function(item) {
         return _.every(rest, function(other) {
            return _.indexOf(other, item) >= 0;
         });
      });
   };

   // Take the difference between one array and a number of other arrays.
   // Only the elements present in just the first array will remain.
   _.difference = function(array) {
      var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
      return _.filter(array, function(value){ return !_.contains(rest, value); });
   };

   // Zip together multiple lists into a single array -- elements that share
   // an index go together.
   _.zip = function() {
      var args = slice.call(arguments);
      var length = _.max(_.pluck(args, 'length'));
      var results = new Array(length);
      for (var i = 0; i < length; i++) {
         results[i] = _.pluck(args, "" + i);
      }
      return results;
   };

   // Converts lists into objects. Pass either a single array of `[key, value]`
   // pairs, or two parallel arrays of the same length -- one of keys, and one of
   // the corresponding values.
   _.object = function(list, values) {
      var result = {};
      for (var i = 0, l = list.length; i < l; i++) {
         if (values) {
            result[list[i]] = values[i];
         } else {
            result[list[i][0]] = list[i][1];
         }
      }
      return result;
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

   // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
   _.lastIndexOf = function(array, item, from) {
      if (array == null) return -1;
      var hasIndex = from != null;
      if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
         return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
      }
      var i = (hasIndex ? from : array.length);
      while (i--) if (array[i] === item) return i;
      return -1;
   };

   // Generate an integer Array containing an arithmetic progression. A port of
   // the native Python `range()` function. See
   // [the Python documentation](http://docs.python.org/library/functions.html#range).
   _.range = function(start, stop, step) {
      if (arguments.length <= 1) {
         stop = start || 0;
         start = 0;
      }
      step = arguments[2] || 1;

      var len = Math.max(Math.ceil((stop - start) / step), 0);
      var idx = 0;
      var range = new Array(len);

      while(idx < len) {
         range[idx++] = start;
         start += step;
      }

      return range;
   };

   // Function (ahem) Functions
   // ------------------

   // Reusable constructor function for prototype setting.
   var ctor = function(){};

   // Create a function bound to a given object (assigning `this`, and arguments,
   // optionally). Binding with arguments is also known as `curry`.
   // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
   // We check for `func.bind` first, to fail fast when `func` is undefined.
   _.bind = function bind(func, context) {
      var bound, args;
      if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
      if (!_.isFunction(func)) throw new TypeError;
      args = slice.call(arguments, 2);
      return bound = function() {
         if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
         ctor.prototype = func.prototype;
         var self = new ctor;
         var result = func.apply(self, args.concat(slice.call(arguments)));
         if (Object(result) === result) return result;
         return self;
      };
   };

   // Bind all of an object's methods to that object. Useful for ensuring that
   // all callbacks defined on an object belong to it.
   _.bindAll = function(obj) {
      var funcs = slice.call(arguments, 1);
      if (funcs.length == 0) funcs = _.functions(obj);
      each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
      return obj;
   };

   // Memoize an expensive function by storing its results.
   _.memoize = function(func, hasher) {
      var memo = {};
      hasher || (hasher = _.identity);
      return function() {
         var key = hasher.apply(this, arguments);
         return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
      };
   };

   // Delays a function for the given number of milliseconds, and then calls
   // it with the arguments supplied.
   _.delay = function(func, wait) {
      var args = slice.call(arguments, 2);
      return setTimeout(function(){ return func.apply(null, args); }, wait);
   };

   // Defers a function, scheduling it to run after the current call stack has
   // cleared.
   _.defer = function(func) {
      return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
   };

   // Returns a function, that, when invoked, will only be triggered at most once
   // during a given window of time.
   _.throttle = function(func, wait) {
      var context, args, timeout, throttling, more, result;
      var whenDone = _.debounce(function(){ more = throttling = false; }, wait);
      return function() {
         context = this; args = arguments;
         var later = function() {
            timeout = null;
            if (more) {
               result = func.apply(context, args);
            }
            whenDone();
         };
         if (!timeout) timeout = setTimeout(later, wait);
         if (throttling) {
            more = true;
         } else {
            throttling = true;
            result = func.apply(context, args);
         }
         whenDone();
         return result;
      };
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

   // Returns a function that will be executed at most one time, no matter how
   // often you call it. Useful for lazy initialization.
   _.once = function(func) {
      var ran = false, memo;
      return function() {
         if (ran) return memo;
         ran = true;
         memo = func.apply(this, arguments);
         func = null;
         return memo;
      };
   };

   // Returns the first function passed as an argument to the second,
   // allowing you to adjust arguments, run code before and after, and
   // conditionally execute the original function.
   _.wrap = function(func, wrapper) {
      return function() {
         var args = [func];
         push.apply(args, arguments);
         return wrapper.apply(this, args);
      };
   };

   // Returns a function that is the composition of a list of functions, each
   // consuming the return value of the function that follows.
   _.compose = function() {
      var funcs = arguments;
      return function() {
         var args = arguments;
         for (var i = funcs.length - 1; i >= 0; i--) {
            args = [funcs[i].apply(this, args)];
         }
         return args[0];
      };
   };

   // Returns a function that will only be executed after being called N times.
   _.after = function(times, func) {
      if (times <= 0) return func();
      return function() {
         if (--times < 1) {
            return func.apply(this, arguments);
         }
      };
   };

   // Object Functions
   // ----------------

   // Retrieve the names of an object's properties.
   // Delegates to **ECMAScript 5**'s native `Object.keys`
   _.keys = nativeKeys || function(obj) {
      if (obj !== Object(obj)) throw new TypeError('Invalid object');
      var keys = [];
      for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
      return keys;
   };

   // Retrieve the values of an object's properties.
   _.values = function(obj) {
      var values = [];
      for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
      return values;
   };

   // Convert an object into a list of `[key, value]` pairs.
   _.pairs = function(obj) {
      var pairs = [];
      for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
      return pairs;
   };

   // Invert the keys and values of an object. The values must be serializable.
   _.invert = function(obj) {
      var result = {};
      for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
      return result;
   };

   // Return a sorted list of the function names available on the object.
   // Aliased as `methods`
   _.functions = _.methods = function(obj) {
      var names = [];
      for (var key in obj) {
         if (_.isFunction(obj[key])) names.push(key);
      }
      return names.sort();
   };

   // Extend a given object with all the properties in passed-in object(s).
   _.extend = function(obj) {
      each(slice.call(arguments, 1), function(source) {
         for (var prop in source) {
            obj[prop] = source[prop];
         }
      });
      return obj;
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

   // Return a copy of the object without the blacklisted properties.
   _.omit = function(obj) {
      var copy = {};
      var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
      for (var key in obj) {
         if (!_.contains(keys, key)) copy[key] = obj[key];
      }
      return copy;
   };

   // Fill in a given object with default properties.
   _.defaults = function(obj) {
      each(slice.call(arguments, 1), function(source) {
         for (var prop in source) {
            if (obj[prop] == null) obj[prop] = source[prop];
         }
      });
      return obj;
   };

   // Create a (shallow-cloned) duplicate of an object.
   _.clone = function(obj) {
      if (!_.isObject(obj)) return obj;
      return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
   };

   // Invokes interceptor with the obj, and then returns obj.
   // The primary purpose of this method is to "tap into" a method chain, in
   // order to perform operations on intermediate results within the chain.
   _.tap = function(obj, interceptor) {
      interceptor(obj);
      return obj;
   };

   // Internal recursive comparison function for `isEqual`.
   var eq = function(a, b, aStack, bStack) {
      // Identical objects are equal. `0 === -0`, but they aren't identical.
      // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
      if (a === b) return a !== 0 || 1 / a == 1 / b;
      // A strict comparison is necessary because `null == undefined`.
      if (a == null || b == null) return a === b;
      // Unwrap any wrapped objects.
      if (a instanceof _) a = a._wrapped;
      if (b instanceof _) b = b._wrapped;
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

   // Is a given value a DOM element?
   _.isElement = function(obj) {
      return !!(obj && obj.nodeType === 1);
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
      return _.isNumber(obj) && isFinite(obj);
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

   // Utility Functions
   // -----------------

   // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
   // previous owner. Returns a reference to the Underscore object.
   _.noConflict = function() {
      root._ = previousUnderscore;
      return this;
   };

   // Keep the identity function around for default iterators.
   _.identity = function(value) {
      return value;
   };

   // Run a function **n** times.
   _.times = function(n, iterator, context) {
      for (var i = 0; i < n; i++) iterator.call(context, i);
   };

   // Return a random integer between min and max (inclusive).
   _.random = function(min, max) {
      if (max == null) {
         max = min;
         min = 0;
      }
      return min + (0 | Math.random() * (max - min + 1));
   };

   // List of HTML entities for escaping.
   var entityMap = {
      escape: {
         '&': '&amp;',
         '<': '&lt;',
         '>': '&gt;',
         '"': '&quot;',
         "'": '&#x27;',
         '/': '&#x2F;'
      }
   };
   entityMap.unescape = _.invert(entityMap.escape);

   // Regexes containing the keys and values listed immediately above.
   var entityRegexes = {
      escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
      unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
   };

   // Functions for escaping and unescaping strings to/from HTML interpolation.
   _.each(['escape', 'unescape'], function(method) {
      _[method] = function(string) {
         if (string == null) return '';
         return ('' + string).replace(entityRegexes[method], function(match) {
            return entityMap[method][match];
         });
      };
   });

   // If the value of the named property is a function then invoke it;
   // otherwise, return it.
   _.result = function(object, property) {
      if (object == null) return null;
      var value = object[property];
      return _.isFunction(value) ? value.call(object) : value;
   };

   // Add your own custom functions to the Underscore object.
   _.mixin = function(obj) {
      each(_.functions(obj), function(name){
         var func = _[name] = obj[name];
         _.prototype[name] = function() {
            var args = [this._wrapped];
            push.apply(args, arguments);
            return result.call(this, func.apply(_, args));
         };
      });
   };

   // Generate a unique integer id (unique within the entire client session).
   // Useful for temporary DOM ids.
   var idCounter = 0;
   _.uniqueId = function(prefix) {
      var id = idCounter++;
      return prefix ? prefix + id : id;
   };

   // By default, Underscore uses ERB-style template delimiters, change the
   // following template settings to use alternative delimiters.
   _.templateSettings = {
      evaluate    : /<%([\s\S]+?)%>/g,
      interpolate : /<%=([\s\S]+?)%>/g,
      escape      : /<%-([\s\S]+?)%>/g
   };

   // When customizing `templateSettings`, if you don't want to define an
   // interpolation, evaluation or escaping regex, we need one that is
   // guaranteed not to match.
   var noMatch = /(.)^/;

   // Certain characters need to be escaped so that they can be put into a
   // string literal.
   var escapes = {
      "'":      "'",
      '\\':     '\\',
      '\r':     'r',
      '\n':     'n',
      '\t':     't',
      '\u2028': 'u2028',
      '\u2029': 'u2029'
   };

   var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

   // JavaScript micro-templating, similar to John Resig's implementation.
   // Underscore templating handles arbitrary delimiters, preserves whitespace,
   // and correctly escapes quotes within interpolated code.
   _.template = function(text, data, settings) {
      settings = _.defaults({}, settings, _.templateSettings);

      // Combine delimiters into one regular expression via alternation.
      var matcher = new RegExp([
         (settings.escape || noMatch).source,
         (settings.interpolate || noMatch).source,
         (settings.evaluate || noMatch).source
      ].join('|') + '|$', 'g');

      // Compile the template source, escaping string literals appropriately.
      var index = 0;
      var source = "__p+='";
      text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
         source += text.slice(index, offset)
               .replace(escaper, function(match) { return '\\' + escapes[match]; });
         source +=
               escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
                     interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
                           evaluate ? "';\n" + evaluate + "\n__p+='" : '';
         index = offset + match.length;
      });
      source += "';\n";

      // If a variable is not specified, place data values in local scope.
      if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

      source = "var __t,__p='',__j=Array.prototype.join," +
            "print=function(){__p+=__j.call(arguments,'');};\n" +
            source + "return __p;\n";

      try {
         var render = new Function(settings.variable || 'obj', '_', source);
      } catch (e) {
         e.source = source;
         throw e;
      }

      if (data) return render(data, _);
      var template = function(data) {
         return render.call(this, data, _);
      };

      // Provide the compiled function source as a convenience for precompilation.
      template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

      return template;
   };

   // Add a "chain" function, which will delegate to the wrapper.
   _.chain = function(obj) {
      return _(obj).chain();
   };

   // OOP
   // ---------------
   // If Underscore is called as a function, it returns a wrapped object that
   // can be used OO-style. This wrapper holds altered versions of all the
   // underscore functions. Wrapped objects may be chained.

   // Helper function to continue chaining intermediate results.
   var result = function(obj) {
      return this._chain ? _(obj).chain() : obj;
   };

   // Add all of the Underscore functions to the wrapper object.
   _.mixin(_);

   // Add all mutator Array functions to the wrapper.
   each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
      var method = ArrayProto[name];
      _.prototype[name] = function() {
         var obj = this._wrapped;
         method.apply(obj, arguments);
         if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
         return result.call(this, obj);
      };
   });

   // Add all accessor Array functions to the wrapper.
   each(['concat', 'join', 'slice'], function(name) {
      var method = ArrayProto[name];
      _.prototype[name] = function() {
         return result.call(this, method.apply(this._wrapped, arguments));
      };
   });

   _.extend(_.prototype, {

      // Start chaining a wrapped Underscore object.
      chain: function() {
         this._chain = true;
         return this;
      },

      // Extracts the result from a wrapped and chained object.
      value: function() {
         return this._wrapped;
      }

   });

}).call(this);

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
      }
   });
})();


/*******************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/katowulf/knockout-sync
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function(ko) {
   "use strict";

   /**
    * @param {Object|ko.observable|ko.observableArray} target
    * @param {ko.sync.Model} model
    * @param {Object|String} [criteria]
    */
   ko.extenders.crud = function(target, model, criteria) {
      model.sync(target, criteria);
   };

   //todo-feature: ko.sync.remote to perform operations remotely without having to download records first? example: ko.sync.remote.delete( model, 'recordXYZ' );

   ko.sync || (ko.sync = {});
   ko.sync.stores || (ko.sync.stores = []);
   ko.sync.validators || (ko.sync.validators = []);

   ko.sync.isObservableArray = function(o) {
      console.log(ko.isObservable);
      return typeof(o) === 'function' && ko.isObservable(o) && _.isArray(o());
   };

   // the fromat of this value is coupled with RecordId's privade _isTempId() method :(
   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);

(function(ko) {
   "use strict";

   /**
    * @param {Object}        target   an object or view containing the record data
    * @param {ko.sync.Model} model
    * @constructor
    */
   ko.sync.Crud = function(target, model) {
      this.parent = target;
      this.def = $.Deferred().resolve().promise();
      this.record = model.newRecord(target);
      this.controller = new ko.sync.SyncController(model, target, this.record);
   };

   var Crud = ko.sync.Crud;

   /**
    * @param {boolean} [b] set the isDirty value (use this with care!)
    * @return {boolean}
    */
   Crud.prototype.isDirty = function(b) {
      return this.record.isDirty(b);
   };

   /**
    * Save a new record to the data layer
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.create = function() {
      this.def = this.def.pipe(function() {

         //todo
         //todo
         //todo

      }.bind(this));
      return this;
   };

   /**
    * Load a record from the data layer into the local copy
    * @param {ko.sync.RecordId|string} recordId
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.read = function( recordId ) {
      this.def = this.def.pipe(function() {

         //todo
         //todo
         //todo

      }.bind(this));
      return this;
   };

   /**
    * Push updates to the data layer
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.update = function() {
      this.def = this.def.pipe(function() {
         if( this.record.isDirty() ) {
            return this.controller.pushUpdates(this.record, 'updated');
         }
         return this;
      }.bind(this));
      return this;
   };

   /**
    * Delete record locally and from the data layer service
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.delete = function() {
      //todo

      return this;
   };

   /**
    * Alias to the `update` method.
    * @return {ko.sync.Crud}
    */
   Crud.prototype.save = function() {
      return this.update();
   };

   /**
    * Alias to the `read` method.
    * @return {ko.sync.Crud}
    */
   Crud.prototype.load = function() {
      return this.read.apply(this, _.toArray(arguments));
   };

   /**
    * @return {jQuery.Deferred} promise
    */
   Crud.prototype.promise = function() {
      return this.def.promise();
   };

})(ko);


(function($) {

   /**
    * @param {ko.observable} target
    * @param {ko.sync.Model} model
    * @param {object} [criteria]
    * @constructor
    */
   ko.sync.CrudArray = function(target, model, criteria) {
      //todo what do we do with lists that are already populated? SyncController will expect the sync op to populate data
      this.list = model.newList(target());
      this.parent = target;
      this.def = $.Deferred().resolve().promise();
      this.controller = new ko.sync.SyncController(model, target, this.list, criteria);
   };

   var CrudArray = ko.sync.CrudArray;

   /**
    * @param {boolean} [b] set the isDirty value (use with care!)
    * @return {boolean}
    */
   CrudArray.prototype.isDirty = function(b) {
      return this.list.isDirty(b); //todo this boolean does nothing for RecordList
   };

   /**
    * Add a new record to the local list and sync it to the data layer (during the next call
    * to `update()` if auto-update is false)
    *
    * @param {ko.sync.Record|Object} recordOrData
    * @param {ko.sync.Record|ko.sync.RecordId|String} [afterRecordId]
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.create = function( recordOrData, afterRecordId ) {
      this.def = this.def.pipe(_.bind(function() {
         var rec = (recordOrData instanceof ko.sync.Record)? recordOrData : this.model.newRecord(recordOrData);
         this.list.add(rec, afterRecordId);
         return this;
      }, this));
      return this;
   };

   /**
    * Load a list of records from data layer into the local copy (replaces local list)
    *
    * @param {object|function} criteria
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.read = function( criteria ) {
      this.def = this.def.pipe(_.bind(function() {

         //todo
         //todo
         //todo

      }, this));
      return this;
   };

   /**
    * Save any unsynced changes to the local list.
    *
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.update = function(changes) {
      applyChanges(this, changes);

      this.def.pipe(function() {
         return this.controller.pushUpdates();
      }.bind(this));

      return this;
   };

   /**
    * Delete a record from the local list and also from the data layer (if auto-update is false, the remote delete
    * is triggered during the next `update()` operation)
    *
    * @param {ko.sync.RecordId|ko.sync.Record|string} hashKey
    * @return {ko.sync.CrudArray} this
    */
   CrudArray.prototype.delete = function( hashKey ) {
      this.def = this.def.pipe(_.bind(function() {
         this.list.remove(hashKey);
         return this;
      }, this));
      return this;
   };

   /**
    * Alias to the `update` method.
    * @return {ko.sync.CrudArray}
    */
   CrudArray.prototype.save = function() {
      return this.update();
   };

   /**
    * Alias to the `read` method.
    * @return {ko.sync.CrudArray}
    */
   CrudArray.prototype.load = function() {
      return this.read.apply(this, _.toArray(arguments));
   };


   /**
    * @return {jQuery.Deferred} promise
    */
   CrudArray.prototype.promise = function() {
      return this.def.promise();
   };

   function applyChanges(crud, changes) {
      //todo apply changes
      //todo
      //todo
      //todo
      //todo
      //todo
      //todo

//      var list = this.list;
//      var RecordId = ko.sync.RecordId;
//      _.each(changes, function(action, listOfDataObjects) {
//         switch(action) {
//            case 'create':
//               list.add(_.map(listOfDataObjects, function(data) {
//                  return model.newRecord(data);
//               }));
//               break;
//            case 'move':
//               _.each(listOfDataObjects, function(v) {
//                  var afterKey;
//                  if(_.isArray(v)) {
//                     afterKey = v[1];
//                     v = v[0];
//                  }
//                  list.move(RecordId.for(model, v), afterKey);
//               });
//               break;
//            case 'update':
//               _.each(listOfDataObjects, function(v) {
//                  var rec = list.find(RecordId.for(v));
//                  rec && rec.updateAll(v);
//               });
//               break;
//            case 'delete':
//
//               break;
//            default:
//               throw new Error('invalid update action: '+action);
//         }
//         list[action](listOfDataObjects);
//      });
   }

})(jQuery);


/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var modelInst = 1; // just a counter to make models unique


   ko.sync.Model = Class.extend({
      /**
       * @param {object} props
       * @constructor
       */
      init: function(props) {
         var defaults    = ko.utils.extend(ko.sync.Model.FIELD_DEFAULTS, props.defaults);
         /** @var {ko.sync.Store} */
         this.store      = props.store;
         this.table      = props.table;
         this.key        = props.key;
         this.sort       = props.sort;
         this.validator  = props.validator;
         this.auto       = props.auto;
         this.inst       = modelInst++;
         this.fields     = _processFields(defaults, props.fields);
         this.factory    = props.recordFactory || new RecordFactory(this);
      },

      /**
       * @param {ko.observableArray|object} target an observable array we'll store a list of records in or an object to sync to a single record
       * @param {object} [criteria] only used for observableArray to tell it which table records to monitor/sync
       * @return {ko.sync.Model} this
       */
      sync: function(target, criteria) {
         var isObservable = ko.isObservable(target);
         if( ko.sync.isObservableArray(target) ) {
            target.crud = new ko.sync.CrudArray(target, this, criteria);
         }
         else {
            var data;
            if( !isObservable ) { target.data = data = target.data||{}; }
            else { data = target; }
            target.crud = new ko.sync.Crud(data, this);
         }
         return this;
      },

      /**
       * @param {object} [data]
       * @return {Record}
       */
      newRecord: function(data) {
         return this.factory.create(data);
      },

      /**
       * @param {object} data
       * @return {*}
       */
      newList: function( data ) {
         return new ko.sync.RecordList(this, data);
      },

      toString: function() {
         return this.table+'['+this.inst+']';
      },

      equal: function(o) {
         return o instanceof ko.sync.Model && this.inst == o.inst;
      }

   });
   ko.sync.Model.FIELD_DEFAULTS = {
      //todo make update_counter work?
      //todo add read-only property?
      type:      'string',
      required:  false,
      observe:   true,
      minLength: 0,
      maxLength: 0,
      sort:      null, //todo unused?
      valid:     null, //todo tie this to this.validator?
      updateCounter: 'update_counter',
      auto:  false,
      format:    function(v) { return v; } //todo
   };

   function _processFields(defaults, fields) {
      var out = {}, o, k;
      _.keys(fields).forEach(function(k) {
         o = ko.utils.extend({}, defaults);
         o = ko.utils.extend(o, fields[k]);
         _applyDefault(o);
         out[k] = o;
      });
      return out;
   }

   function _applyDefault(o) {
      if( !o.hasOwnProperty('default') || !_.has(o, 'default') ) {
         switch(o.type) {
            case 'boolean':
               o.default = false;
               break;
            case 'int':
            case 'float':
               o.default = 0;
               break;
            case 'date':
            case 'string':
            case 'email':
            default:
               o.default = null;
         }
      }
   }

   function RecordFactory(model) {
      this.model = model;
   }
   RecordFactory.prototype.create = function(data) {
      data = ko.utils.unwrapObservable(data);
      data instanceof ko.sync.Record && (data = data.getData());
      return new ko.sync.Record(this.model, data);
   };


//   function _makeList(model, dataOrList) {
//      if( dataOrList instanceof ko.sync.RecordList ) {
//         return dataOrList;
//      }
//      else {
//         return model.newList(dataOrList);
//      }
//   }
//
//   function _makeRecord(model, dataOrRecord) {
//      if( dataOrRecord instanceof ko.sync.Record ) {
//         return dataOrRecord;
//      }
//      else {
//         return model.newRecord(dataOrRecord);
//      }
//   }

})(ko);
/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var undef;

   ko.sync.Record = Class.extend({
      /**
       * @param {ko.sync.Model}  model
       * @param {object} [data]
       * @constructor
       */
      init:            function(model, data) {
         data || (data = {});
         this.data      = _setFields(model.fields, data);
         this.observed  = _observed(model.fields);
         this.fields    = _.keys(this.data);
         this.id        = new ko.sync.RecordId(model.key, data);
         this.sort      = model.sort;
         this.changed   = false;
         this.type      = model.table;
         this.validator = model.validator;
         this.listeners = [];
         _watchObservables(this);
      },
      getRecordId:     function() {
         return this.id;
      },
      getSortPriority: function() {
         return this.sort? this.get(this.sort) : false;
      },
      hasKey:          function() {
         return this.getKey().isSet();
      },
      getKey:          function() {
         return this.id;
      },
      hashKey:         function() {
         return this.getKey().hashKey();
      },
      /**
       * Updating the key is intended to be used after a create operation during which the database sets the ID.
       * Thus, it does not mark the record dirty or send out notifications.
       *
       * This method will ignore any set requests if an ID already exists on the record
       * @param {string|object} hashKey
       */
      updateHashKey: function( hashKey ) {
         if( !this.hasKey() ) {
            this.id.update(hashKey);
            applyUpdates(this, this.id.parse(hashKey));
         }
         return this;
      },
      /**
       * This physically changes the record ID. This does update fields on the record and can result in notifications
       * being sent and database transactions. The old record is not deleted by this change (it's just forgotten).
       * @param {ko.sync.RecordId} newKey
       */
      setKey: function( newKey ) {
         this.id = newKey;
         newKey.isSet() && this.updateAll(newKey.parse());
      },
      getData:         function() {
         return _unwrapAll(this.observed, this.data);
      },
      get:             function(field) {
         if(_.isArray(field)) {
            return _unwrapAll(this.observed, _.pick(field));
         }
         else {
            return field in this.observed? this.data[field]() : this.data[field];
         }
      },
      set:             function(field, val) {
         if( setWithoutNotice(this, field, val) ) {
            this.changed = true;

            // only non-observables generate notifications here; the _watchObservables method handles the remainder
            // somewhat invisibly but quite effectively
            _updateListeners(this.listeners, this, field);
         }
         return this.changed;
      },
      isDirty:         function(newVal) {
         if( typeof(newVal) === 'boolean' ) {
            this.changed = newVal;
         }
         return this.changed;
      },
      clearDirty:      function() {
         this.isDirty(false);
         return this;
      },
      isValid:         function() {
         return !this.validator || this.validator.validate(this);
      },
      /**
       * @param {ko.sync.Record|object} newVals
       */
      updateAll: function(newVals) {
         var changed = applyUpdates(this, newVals);
         if( changed.length ) {
            this.changed = true;
            // send a single notification for all the field changes
            _updateListeners(this.listeners,  this, changed);
         }
         return this;
      },
      /**
       * Invokes `callback` with this record object whenever a change occurs to the data
       */
      subscribe: function(callback) {
         var listeners = this.listeners;
         listeners.push(callback);
         return {
            dispose: function() {
               var idx = _.indexOf(listeners, callback);
               if( idx > -1 ) { listeners.splice(idx, 1); }
            }
         };
      }
   });

   function _setFields(fields, data) {
      //todo validate the data before applying it
      var k, out = {}, keys = _.keys(fields), i = keys.length;
      while(i--) {
         k = keys[i];
         out[k] = _value(k, fields, data);
      }
      return out;
   }

   function _value(k, fields, data) {
      var field = fields[k];
      if( data.hasOwnProperty(k) && exists(data[k]) ) {
         var v = ko.utils.unwrapObservable(data[k]);
         switch(field.type) {
            case 'date':
               v = moment(v).utc().toDate();
               break;
            case 'int':
               v = ~~v;
               break;
            case 'float':
               v = parseFloat(v);
               if( isNaN(v) ) { v = field.default; }
               break;
            default:
               // nothing to do
         }
     }
     else {
        v = field.default;
     }
     return field.observe? ko.observable(v) : v;
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

   /**
    * Sends notices to all callbacks listening for events on this Record
    * @param {Array}  callbacks
    * @param {Record} record
    * @param {string|Array} fieldChanged
    * @private
    */
   function _updateListeners(callbacks, record, fieldChanged) {
      var i = -1, len = callbacks.length;
      while(++i < len) {
         callbacks[i](record, fieldChanged);
      }
   }

   /**
    * Determines which fields are being observed and creates a state context object for each.
    *
    * @param {object} fields
    * @return {Object}
    * @private
    */
   function _observed(fields) {
      var out = {};
      for (var key in fields) {
         if (fields.hasOwnProperty(key) && fields[key].observe ) {
            // the object stored here is utilized as a history and state context for staging notifications
            // and synchronization between this Record and the observable fields it manages.
            out[key] = {};
         }
      }
      return out;
   }

   /**
    * Creates a copy of the record data with all observables unwrapped to their value
    */
   function _unwrapAll(observed, data) {
      var out = {};
      for (var key in data) {
         if (data.hasOwnProperty(key)) {
            out[key] = (key in observed)? data[key]() : data[key];
         }
      }
      return out;
   }

   /**
    * Watch observables for changes and create notifications to our subscribers when they do change. This is necessary
    * to provide an abstracted way to monitor all the observable and non-observable values.
    *
    * The conundrum with observables, and the reason we need this and we can't just trigger the notifications from
    * Record.prototype.set, is that we are using them as the values. When knockout bindings fire, an update to the
    * observable is like hacking a private variable in a javascript object and skipping the setter method
    * (i.e. we don't know an updated occurred)
    *
    * So naturally we subscribe to the observable and monitor it for changes. However, determining which
    * changes are ours vs somebody else's from inside the observable is a challenging prospect which
    * generates some amount of coupling, so instead of trying this, or instead of trying to trigger some updates
    * from the setter method and others from the subscription of the observable, we just do all the observable
    * notifications right from here
    */
   function _watchObservables(record) {
      var observed = record.observed;
      _.each(observed, function(v, k) {
         _sync(record, k, record.data[k], v);
      });
   }

   function _sync(record, field, observable, observedProps) {
      observable.subscribe(function(newValue) {
         if( newValue !== observedProps.last ) {
            observedProps.last = newValue;
            _updateListeners(record.listeners, record, field);
         }
      });
   }

   function applyUpdates(rec, newVals) {
      var changed = [];

      var data = (newVals instanceof ko.sync.Record)? newVals.getData() : newVals;
      _.each(rec.data, function(v,k) {
         if( data.hasOwnProperty(k) ) {
            var newVal = data[k];
            if( setWithoutNotice(rec, k, newVal) ) {
               changed.push(k);
            }
         }
      });

      // changes may affect the record id
      rec.id.update(rec.get(rec.id.fields));

      return changed;
   }

   /**
    *
    * @param rec
    * @param field
    * @param newVal
    * @return {Boolean}
    */
   function setWithoutNotice(rec, field, newVal) {
      var res = false;
      //todo-sort update sort stuff (move? notify of move?) when sort fields update
      if( field in rec.data && rec.get(field) !== newVal ) {
         //todo-validate !
         var observed = rec.observed;
         if( field in observed ) {
            // prevents observables from triggering this record's update notifications
            observed[field].last = newVal;

            // sets the observable value
            rec.data[field](newVal);
         }
         else {
            rec.data[field] = newVal;
         }
         res = true;
      }
      else if( !field in rec.data ) {
         console.warn('field '+field+' does not exist for record type '+rec.type);
      }
      return res;
   }

})(ko);

/*******************************************
 * RecordId class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

//   ko.sync || (ko.sync = {});

   var RecordId = ko.sync.RecordId = Class.extend({
      /**
       * @param {Array|string} fields
       * @param {object} [data]
       * @param {string} [separator]
       * @constructor
       */
      init: function(fields, data, separator) {
         _.isArray(fields) || (fields = fields? [fields] : []);
         this.separator = separator || RecordId.DEFAULT_SEPARATOR;
         this.multi = fields.length > 1;
         this.fields = fields;
         this.hash = _createHash(this.separator, fields, data);
         this.tmpId = _isTempId(this.hash);
      },
      isSet:              function() { return !this.tmpId; },
      isComposite:        function() { return this.multi; },
      hashKey:            function() { return this.hash; },
      toString:           function() { return this.hashKey(); },
      getCompositeFields: function() { return this.fields; },

      /**
       * @param {String|Object} hashOrData
       */
      update: function(hashOrData) {
         var h = typeof(hashOrData)==='string'? hashOrData : _createHash(this.separator, this.fields, hashOrData);
         if( !_isTempId(h) ) {
            this.hash = h;
            this.tmpId = false;
         }
         else {
            console.warn('tried to update ID with a temp id; ignored');
         }
         return this;
      },

      /**
       * @return {object} the field/value pairs used to create this key.
       */
      parse: function() {
         return RecordId.parse(this.hash, this.fields, this.separator);
      },

      equals:             function(o) {
         // it is possible to match a RecordId even if it has no key, because you can check the Record's ID
         // against this one to see if they are actually the same instance this has some limitations but it
         // can work as long as one is careful to always use the ID off the record and never grow new ones
         if( !this.isSet() ) { return o === this; }
         // assuming they are not the same instance, it's easiest to check the valueOf() attribute
         return (o instanceof RecordId && o.hashKey() === this.hashKey())
               || (typeof(o) === 'string' && o === this.hashKey());
      }
   });
   RecordId.DEFAULT_SEPARATOR = '|||';

   /**
    * @param {Model} model
    * @param {Record|Object} record
    * @return {RecordId}
    */
   RecordId.for = function(model, record) {
      var data = record instanceof RecordId? record.getData() : record;
      return new RecordId(model.key, data);
   };
   RecordId.parse = function(hashKey, fields, separator) {
      var out = {}, vals;
      if( !_isTempId(hashKey) ) {
         if( fields.length > 1 ) {
            separator || (separator = RecordId.DEFAULT_SEPARATOR);
            vals = hashKey.split(separator);
            _.each(fields, function(k, i) {
               out[k] = vals[i];
            });
         }
         else {
            out[fields[0]] = hashKey;
         }
      }
      return out;
   };

   function _isTempId(hash) {
      // the parts of a temporary id are "tmp" followed by the ko.sync.instanceId (a timestamp, a colon,
      // and a random number), and a uuid all joined by "."
      return (hash && hash.match(/^tmp[.][0-9]+:[0-9]+[.]/))? true : false;
   }

   function _createTempHash() {
      return _.uniqueId('tmp.'+ko.sync.instanceId+'.');
   }

   function _createHash(separator, fields, data) {
      if( typeof(data) === 'object' && !_.isEmpty(data) ) {
         var s = '', f, i = -1, len = fields.length;
         while(++i < len) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return _createTempHash();
            }
            if( i > 0 ) { s += separator; }
            s += data[f];
         }
         return s;
      }
      else {
         return _createTempHash();
      }
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(ko);


/*******************************************
 * RecordList class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   var undef, RecordId = ko.sync.RecordId;

   //var ko = this.ko;
   //var _ = this._;

   /**
    * @param {ko.sync.Model} model
    * @param {Array} [records] ko.sync.RecordList or key/value objects to initialize the list
    * @constuctor
    */
   ko.sync.RecordList = function(model, records) {
      this.model     = model;
      this.byKey     = {};   // a list of all keys in this list for quick reference, deleted records are included here until checkpoint() is called
      this.cache     = {};   // a partial list of keys to indices to speed up retrieval
      this.listeners = [];   // a list of subscribers to events in this list
      this.subs      = [];   // a list of records to which this list has subscribed
      this.delayed   = {};
      this.records   = {};   // where we store the Record objects
      this.obsSub    = null; // a subscription to the observableArray (added by _sync, used by ko.sync.RecordList::dispose)
      this.sorted    = [];
      this.checkpoint();     // refresh our changelists (added/changed/moved/deleted records)
      // create an observableArray and load our records into it
      if( records ) {
         this.load(ko.utils.unwrapObservable(records));
      }

      // we sync last as this simplifies the process of notifications
      // (we haven't subscribed yet and don't get a feedback loop from the observableArray)
      //_sync(this);
   };

   /**
    * Clear any current change lists (added/updated/moved/deleted records) and begin tracking fresh from this point.
    * @param {boolean} [purge] when set to true, the observed list is emptied of all values (no updates are sent and no events generated)
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.checkpoint = function(purge) {
      this.changed = {};
      this.added   = {};
      this.deleted = {};
      this.moved   = {};
      this.numChanges = 0;
      if( purge ) {
         this.dispose();
         this.byKey = {};
         //_sync(this);
      }
      return this;
   };

   /**
    * @return {ko.sync.RecordList.Iterator}
    */
   ko.sync.RecordList.prototype.iterator = function() {
      return new ko.sync.RecordList.Iterator(this);
   };

   /**
    * True if any records in this list have been marked added/deleted/updated/moved.
    *
    * @return {boolean}
    */
   ko.sync.RecordList.prototype.isDirty = function() {
      return this.numChanges > 0;
   };

   /**
    * Add a new record to our observable array and record it as newly added.
    *
    * If afterRecordId is a string, then it represents the hashKey of the record that will be immediately before our
    * insert position. If that record doesn't exist, then we append to the end.
    *
    * If afterRecordId is null or undefined, then we append to the end.
    *
    * If afterRecordId is a positive integer, then it is the exact position at which to insert our record. Thus,
    * 0 means insert it at position 0 (shift all records to the right 1), 1 means insert it immediately after record
    * 0, and so on.
    *
    * If afterRecordId is a negative integer, it is relative to the end position. Thus, -1 means just before
    * the last record, -2 means insert it before the last 2 records, etc.
    *
    * @param {ko.sync.Record} record
    * @param {RecordId|ko.sync.Record|String|int} [afterRecordId] see description
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.add = function(record, afterRecordId) {
      if( _.isArray(record) ) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.add(record[i], afterRecordId);
            afterRecordId = record[i].getKey();
         }
      }
      else {
         var key = record.hashKey();
         if( !(key in this.byKey) ) {
            record.isDirty(true);
            this.added[key] = record;
            this.numChanges++;
            this.load(record, afterRecordId, true);
         }
      }
      return this;
   };

   /**
    * Repositions the record within the observable array.
    *
    * If afterRecordId is a string, then it represents the hashKey of the record that will be immediately before our
    * insert position. If that record doesn't exist, then we append to the end.
    *
    * If afterRecordId is null or undefined, then we append to the end.
    *
    * If afterRecordId is a positive integer, then it is the exact position at which to insert our record. Thus,
    * 0 means insert it at position 0 (shift all records to the right 1), 1 means insert it immediately after record
    * 0, and so on.
    *
    * If afterRecordId is a negative integer, it is relative to the end position. Thus, -1 means just before
    * the last record, -2 means insert it before the last 2 records, etc.
    *
    * @param {ko.sync.Record|ko.sync.RecordId|String} recordOrId
    * @param {RecordId|ko.sync.Record|String|int} [afterRecordIdOrIndex] see description
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.move = function(recordOrId, afterRecordIdOrIndex) {
      var key = getHashKey(recordOrId);
      var record = _findRecord(this, key, true);
      if( key in this.byKey && !(key in this.deleted) ) {
         var newLoc = _findInsertPosition(this, record, afterRecordIdOrIndex); // the exact index this element should be placed at
         var currentLoc = _recordIndex(this, record);
         if( currentLoc !== newLoc ) { // if these are equal, we've already recorded the move or it's superfluous
            // store in changelist
            if( !(key in this.added) && !(key in this.changed) ) {
               this.moved[key] = record;
            }
            this.numChanges++;

            var sortedVals = this.sorted;

            // now we move it, we use the underlying element so this doesn't generate
            // two updates (a delete event followed by an add event)
            _.move(sortedVals, currentLoc, newLoc);

            // determine what record we have moved it after
            var afterRecord;
            if( newLoc >= sortedVals.length ) {
               newLoc--;
            }
            if( newLoc > 0 ) {
               // find the record before the new slot
               afterRecord = sortedVals[newLoc-1];
            }

            // now we shoot off the correct notification
            _updateListeners(this.listeners, 'moved', record, afterRecord);
         }
      }
      else {
         console.warn('attempted to move a record which doesn\'t exist; probably just a concurrent edit');
      }
      return this;
   };

   /**
    * Quickly located a record which exists in the observable array.
    *
    * Records which have been deleted will not be returned by this method (it only returns records in obsArray) even
    * though they are still tracked as deleted.
    *
    * @param recordId
    * @return {ko.sync.Record|null}
    */
   ko.sync.RecordList.prototype.find = function(recordId) {
      return _findRecord(this, recordId, true);
   };

   /**
    * Pushes a record into the observableArray; does not store anything in the added/updated/moved/deleted lists.
    *
    * If afterRecordId is a string, then it represents the hashKey of the record that will be immediately before our
    * insert position. If that record doesn't exist, then we append to the end.
    *
    * If afterRecordId is null or undefined, then we append to the end.
    *
    * If afterRecordId is a positive integer, then it is the exact position at which to insert our record. Thus,
    * 0 means insert it at position 0 (shift all records to the right 1), 1 means insert it immediately after record
    * 0, and so on.
    *
    * If afterRecordId is a negative integer, it is relative to the end position. Thus, -1 means just before
    * the last record, -2 means insert it before the last 2 records, etc.
    *
    * @param {ko.sync.Record} record
    * @param {RecordId|ko.sync.Record|int|String} [afterRecordId] see description
    * @param {boolean} [sendNotification] if true an added notification is sent
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.load = function(record, afterRecordId, sendNotification) {
      if(_.isArray(record)) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.load(record[i], afterRecordId, sendNotification);
            afterRecordId = afterRecordId? record[i].getKey() : undef;
         }
      }
      else if( !(record instanceof ko.sync.Record) ) {
         this.load(this.model.newRecord(record), afterRecordId, sendNotification);
      }
      else if( !(record.hashKey() in this.byKey) ) {
         var loc = putIn(this, record, afterRecordId, sendNotification);
         //todo-sort
      }
      return this;
   };

   /**
    *
    * @param {RecordId|ko.sync.Record|String} recordOrIdOrHash
    * @return {ko.sync.RecordList} this
    */
   ko.sync.RecordList.prototype.remove = function(recordOrIdOrHash) {
      if(_.isArray(recordOrIdOrHash) ) {
         var i = -1, len = recordOrIdOrHash.length;
         while(++i < len) {
            this.remove(recordOrIdOrHash[i]);
         }
      }
      else {
         var record = _findRecord(this, recordOrIdOrHash);
         if( record ) {
            var key = record.hashKey();

            if( !(key in this.deleted) && !(key in this.delayed) ) {
               // remove the record locally and mark it in our changelists
               takeOut(this, record);
            }
            else {
               console.debug('record already deleted', key);
            }
         }
         else {
            console.debug('record not in this list', recordOrIdOrHash);
         }
      }
      return this;
   };

   /**
    * @param {ko.sync.Record} record
    * @param {string} [field]
    */
   ko.sync.RecordList.prototype.updated = function(record, field) {
      if( record.isDirty() ) {
         var hashKey = record.hashKey();
         if( _recordIndex(this, hashKey) >= 0 ) { //todo-perf we could skip this check and just assume; do the checking at save time
            if( !(hashKey in this.added) ) {
               // if the record is already marked as newly added, don't mark it as updated and lose that status
               this.changed[hashKey] = record;
               delete this.moved[hashKey];
               this.numChanges++;
            }
            //todo differentiate between moves and updates?
            _updateListeners(this.listeners, 'updated', record, field);
         }
         else {
            console.warn("Record "+hashKey+' not found (concurrent changes perhaps? otherwise it\'s probably a bad ID)');
         }
      }
      return this;
   };

   ko.sync.RecordList.prototype.clearEvent = function(action, hashKey) {
      if( action in {added: 1, deleted: 1, moved: 1, changed: 1} && hashKey in this[action] ) {
         delete this[action][hashKey];
         this.numChanges--;
      }
      return this;
   };

   /**
    * Callbacks receive the following:
    *
    *
    * @param callback
    * @return {*}
    */
   ko.sync.RecordList.prototype.subscribe = function(callback) {
      this.listeners.push(callback);
      return this;
   };

   ko.sync.RecordList.prototype.dispose = function() {
      var i = this.subs.length;
      while(i--) {
         this.subs[i].dispose();
      }
      this.obsSub && this.obsSub.dispose();
      this.subs = [];
      this.obsSub = null;
      return this;
   };

   ko.sync.RecordList.prototype.changeList = function() {
      var out = [];
      _.each(['added', 'moved', 'updated', 'deleted'], function(action) {
         var key = action === 'updated'? 'changed' : action;
         _.each(this[key], function(rec) {
            out.push([action, rec]);
         });
      }.bind(this));
      return out;
   };

   /**
    * A debug method used to obtain the ordered hash key ids for each record
    * @param {ko.sync.RecordList} recordList
    * @return {Array} of string hashKeys
    */
   ko.sync.RecordList.ids = function(recordList) {
      return recordList.sorted.slice(0);
   };

   ko.sync.RecordList.atPos = function(list, i) {
      return list.find(list.sorted[i]);
   };


   ko.sync.RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.keys = ko.sync.RecordList.ids(list);
      this.recs = list.byKey; //todo does this also need to be snapshotted?
      this.len  = this.keys.length;
   };

   ko.sync.RecordList.Iterator.prototype.size    = function() { return this.len; };
   ko.sync.RecordList.Iterator.prototype.reset   = function(i) { this.curr = typeof(i) === 'number'? i : -1; };
   ko.sync.RecordList.Iterator.prototype.next    = function() { return this.hasNext()? this.recs[this.keys[++this.curr]] : null; };
   ko.sync.RecordList.Iterator.prototype.prev    = function() { return this.hasPrev()? this.recs[this.keys[--this.curr]] : null; };
   ko.sync.RecordList.Iterator.prototype.hasPrev = function() { return this.len && this.curr > 0; };
   ko.sync.RecordList.Iterator.prototype.hasNext = function() { return this.len && this.curr < this.len-1; };
   ko.sync.RecordList.Iterator.prototype.hash    = function() { return this.keys[this.curr]; };

   function takeOut(recList, record) {
      var key = record.hashKey();

      // mark dirty
      record.isDirty(true);

      // mark it deleted
      recList.deleted[key] = record;
      recList.numChanges++;

      // if rec is removed, that supersedes added/updated/moved status
      delete recList.added[key];
      delete recList.changed[key];
      delete recList.moved[key];

      //delete recList.byKey[key]; (deleted after checkpoint is called)

      // cancel subscription
      recList.subs[key].dispose();
      delete recList.subs[key];
      recList.sorted = _.without(recList.sorted, key);

      // send out notifications
      _updateListeners(recList.listeners, 'deleted', record);
   }

   function putIn(recList, record, afterRecordId, sendNotification) {
      var loc = _findInsertPosition(recList, record, afterRecordId);
      var key = record.hashKey();
      recList.byKey[key] = record;
      if( loc < recList.length && loc > 0 ) {
         recList.sorted.splice(loc, 0, record);
      }
      else {
         recList.sorted.push(key);
      }
      recList.subs[key] = record.subscribe(function(record, fieldChanged) {
         //todo differentiate between move events and actual updates
         recList.updated(record, fieldChanged);
      });
      if( sendNotification ) {
         var after = loc > 0? ko.sync.RecordList.atPos(recList, loc-1).hashKey() : undef;
         _updateListeners(recList.listeners, 'added', record, after);
      }
      return loc;
   }

   /**
    * @param {ko.sync.Record|RecordId} recOrId
    * @return {RecordId}
    */
   function keyFor(recOrId) {
      if( typeof(recOrId) !== 'object' || !recOrId ) {
         return null;
      }
      else if( _.isFunction(recOrId['getKey']) ) {
         return recOrId.getKey();
      }
      else {
         return recOrId;
      }
   }

   /**
    * @param {ko.sync.Record|RecordId|String} recOrIdOrHash
    * @return {RecordId}
    */
   function getHashKey(recOrIdOrHash) {
      if( typeof(recOrIdOrHash) === 'string' ) {
         return recOrIdOrHash;
      }
      else {
         var key = keyFor(recOrIdOrHash);
         return key? key.hashKey() : null;
      }
   }

   /**
    * Locate a record's position in the observable array. If it isn't found, return -1
    *
    * This keeps a partial/temporary cache of indices so that lookup speed can be improved.
    *
    * @param {ko.sync.RecordList} list
    * @param {ko.sync.Record|RecordId|String} recOrIdOrHash
    * @return {int}
    * @private
    */
   function _recordIndex(list, recOrIdOrHash) {
      //todo optimize for mapped arrays
      var hashKey = getHashKey(recOrIdOrHash);
      return _.indexOf(list.sorted, hashKey);
   }

   /**
    * Determine the position where a record should be inserted.
    *
    * If afterRecordId is a string, then it represents the hashKey of the record that will be immediately before our
    * insert position. If that record doesn't exist, then we append to the end.
    *
    * If afterRecordId is null or undefined, then we append to the end.
    *
    * If afterRecordId is a positive integer, then it is the exact position at which to insert our record. Thus,
    * 0 means insert it at position 0 (shift all records to the right 1), 1 means insert it immediately after record
    * 0, and so on.
    *
    * If afterRecordId is a negative integer, it is relative to the end position. Thus, -1 means just before
    * the last record, -2 means insert it before the last 2 records, etc.
    *
    * In the case the `record` exists in the list, this method will also adjust for cases where slicing the element
    * out of the list would affect the index of the insert position.
    *
    * @param {RecordList} recList
    * @param {Record}     record    the record to move
    * @param {String|int|null} [afterRecordIdOrIndex] see description
    * @return {Number}
    * @private
    */
   function _findInsertPosition(recList, record, afterRecordIdOrIndex) {
      var numRecs = recList.sorted.length, loc = numRecs, currLoc;
      // a null or undefined is interpreted as append to end of records
      if( afterRecordIdOrIndex !== undef && afterRecordIdOrIndex !== null ) {
         if( typeof(afterRecordIdOrIndex) === 'number' ) {
            // a number represents the exact position of the insert
            // a negative number is relative to the end
            loc = afterRecordIdOrIndex < 0? Math.max(numRecs - 1 + afterRecordIdOrIndex, 0) : Math.min(afterRecordIdOrIndex, numRecs);
         }
         else {
            loc = _recordIndex(recList, afterRecordIdOrIndex);
            currLoc = _recordIndex(recList, record);
            if( loc === -1 ) {
               // if the record wasn't found, we append
               loc = numRecs;
            }
            else if( currLoc === -1 || currLoc > loc ) {
               // when the element currently exists in the list and is positioned before the index we want to move it to,
               // it will effectively drop all the indices one place because we remove it and re-insert
               // which is the reason for the currLoc > loc check
               // when it's greater or not in the list, we need to add one to get the appropriate slot
               // (i.e. it goes after the record)
               loc++;
            }
            // this invisibly handles the case where currLoc === loc, meaning we aren't really moving
            // it at all, because it simply falls through, returning `loc` which will be equal to currLoc
            // which will be checked for by move ops (who don't want to dirty data that hasn't changed)
         }
      }
      else {
         loc = numRecs;
      }
      return loc;
   }

   function _findRecord(list, recOrIdOrHash, withholdDeleted) {
      var hashKey = getHashKey(recOrIdOrHash);
      if( hashKey in list.byKey && (!withholdDeleted || !(hashKey in list.deleted)) ) { return list.byKey[hashKey]; }
      return null;
   }

   /**
    * @param callbacks
    * @param action
    * @param record
    * @param [meta] either a {string} field or {array} fields or {string} recordId
    * @private
    */
   function _updateListeners(callbacks, action, record, meta) {
      var i = -1, len = callbacks.length, args = $.makeArray(arguments).slice(1);
//      console.info(action, record.hashKey(), field, callbacks);
      while(++i < len) {
         callbacks[i].apply(null, args);
      }
   }

})(ko);


/*******************************************
 * Store interface for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   //ko.sync || (ko.sync = {});

   /**
    * Store interface describing how Store implementations should work and providing instanceof and extensibility
    *
    * @interface
    */
   ko.sync.Store = Class.extend({
      init: function(properties) { throw new Error('Interface not implemented'); },

      /**
       * Create a record in the database.
       *
       * The store guarantees that values will be converted to valid entries. For instance, the model stores dates as
       * a JavaScript Date object, but each Store will convert these to an appropriate storage type (e.g. ISO 8601 string,
       * unix timestamp, etc).
       *
       * No guarantees are made that existing records will not be overwritten, although some stores may enforce this and
       * return an error if the record is found.
       *
       * @param {ko.sync.Model} model
       * @param {ko.sync.Record} record
       * @return {Promise} resolves to the new record's ID or rejects if it could not be created
       */
      create: function(model, record) { throw new Error('Interface not implemented'); },

      /**
       * Retrieves a record from the database by its unique ID. If a record does not exist, all Stores should return
       * a null value (not an error).
       *
       * Temporary connectivity or database errors should be handled internally by the Store and the queries retried until
       * they are successful.
       *
       * Rejecting the promise should be reserved for non-recoverable errors and permanent connectivity issues.
       *
       * @param {ko.sync.Model}     model
       * @param {ko.sync.RecordId}  recordId
       * @return {Promise}  resolves to the Record object or null if it is not found
       */
      read: function(model, recordId) { throw new Error('Interface not implemented'); },

      /**
       * Given a record id, update that record in the database. If the record does not exist, the promise is rejected.
       *
       * @param {ko.sync.Model}  model
       * @param {ko.sync.Record} rec
       * @return {Promise} resolves to callback({string}id, {boolean}changed) where changed is false if data was not dirty, rejected if record does not exist
       */
      update: function(model, rec) { throw new Error('Interface not implemented'); },

      /**
       * Delete a record from the database. If the record does not exist, then it is considered already deleted (no
       * error is generated)
       *
       * @param {ko.sync.Model}           model
       * @param {ko.sync.Record|ko.sync.RecordId} recOrId
       * @return {Promise} resolves with record's {string}id
       */
      delete: function(model, recOrId) { throw new Error('Interface not implemented'); },

      /**
       * Perform a query against the database. The `filterCriteria` options are fairly limited:
       *
       * - limit:   {int=100}         number of records to return, use 0 for all
       * - offset:  {int=0}           exclusive starting point in records, e.g.: {limit: 100, offset: 100} would return records 101-200 (the first record is 1 not 0)
       * - start:   {int=0}           using the sort's integer values, this will start us at record matching this sort value
       * - end:     {int=-1}          using the sort's integer values, this will end us at record matching this sort value
       * - where:   {function|object} filter rows using this function or value map
       * - sort:    {array|string}    Sort returned results by this field or fields. Each field specified in sort
       *                              array could also be an object in format {field: 'field_name', desc: true} to obtain
       *                              reversed sort order
       *
       * Start/end are more useful with sorted records (and faster). Limit/offset are slower but can be used with
       * unsorted records. Additionally, limit/offset will work with where conditions. Obviously, `start`/`end` are hard
       * limits and only records within this range, matching `where`, up to a maximum of `limit` could be returned.
       *
       * USE OF WHERE
       * -------------
       * If `where` is a function, it is always applied after the results are returned. Thus, when used in conjunction
       * with `limit`, the server may still need to retrieve all records before applying limit.
       *
       * If `where` is a hash (key/value pairs), the application of the parameters is left up to the discretion of
       * the store. For SQL-like databases, it may be part of the query. For data stores like Firebase, or
       * other No-SQL types, it could require fetching all results from the table and filtering them on return. So
       * use this with discretion.
       *
       * THE ITERATOR
       * ---------------------
       * Each record received is handled by `iterator`. If iterator returns true, then the iteration is stopped. The
       * iterator should be in the format `function(data, id, index)` where data is the record and index is the count
       * of the record starting from 0
       *
       * In the case of a failure, the fail() method on the promise will always be notified immediately,
       * and the load operation will end immediately.
       *
       * PERFORMANCE
       * -----------
       * There are no guarantees on how a store will optimize a query. It may apply the constraints before or after
       * retrieving data, depending on the capabilities and structure of the data layer. To ensure high performance
       * for very large data sets, and maintain store-agnostic design, implementations should use some sort of
       * pre-built query data in an index instead of directly querying records (think NoSQL databases like
       * DynamoDB and Firebase, not MySQL queries)
       *
       * Alternately, very sophisticated queries could be done external to the knockout-sync module and then
       * injected into the synced data after.
       *
       * @param {Function} iterator
       * @param {ko.sync.Model}  model
       * @param {object} [filterCriteria]
       * @return {Promise}
       */
      query: function(model, iterator, filterCriteria) { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, get a count of all records in the database matching
       * the parms provided. The `filterCriteria` object is the same as query() method, in the format `function(data, id, index)`.
       *
       * This could be a very high-cost operation depending on the data size and the data source (it could require
       * iterating every record in the table) for some data layers.
       *
       * @param {ko.sync.Model} model
       * @param {object}        [filterCriteria]
       * @return {Promise} promise resolving to total number of records matched
       */
      count: function(model, filterCriteria) { throw new Error('Interface not implemented'); },

      /**
       * True if this data layer provides push updates that can be monitored by the client.
       * @return {boolean}
       */
      hasTwoWaySync: function() { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, notify `callback` any time any record is added, updated, deleted, or moved
       * ON THE SERVER. Calling the create/update/read/delete methods locally will not trigger any notifications.
       *
       * The signature of the callback is as follows:
       *     added:    callback( 'added',   record_id, record_data, prevRecordId )
       *     updated:  callback( 'updated', record_id, record_data  )
       *     deleted:  callback( 'deleted', record_id, record_data  )
       *     moved:    callback( 'moved',   record_id, prevRecordId )
       *
       * When prevRecordId is null (for applicable calls), this means it is inserted at the first record in the list
       *
       * The return value is an Object which contains a dispose() method to stop observing the data layer's
       * changes.
       *
       * @param  {ko.sync.Model} model
       * @param  {Function}     callback
       * @param  {object}       [filterCriteria]
       * @return {Object}
       */
      watch: function(model, callback, filterCriteria) { throw new Error('Interface not implemented'); },

      /**
       * Given a particular record, invoke `callback` any time the data record changes ON THE SERVER. This does not
       * get invoked for local create/read/update/delete events.
       *
       * The signature of the callback is as follows: callback( record_id, data_object, sort_priority )
       *
       * The return value is an Object which contains a dispose() method to stop observing the data layer's
       * changes.
       *
       * @param {ko.sync.Model}  model
       * @param {ko.sync.RecordId|ko.sync.Record} recordId
       * @param  {Function}      callback
       * @return {Object}
       */
      watchRecord: function(model, recordId, callback) { throw new Error('Interface not implemented'); }

   });

})(ko);
/***********************************************
 * SyncController connects RecordList to a Store
 **********************************************/
(function($) {
   "use strict";
   var undef;

   /**
    * Establish and handle updates between a Store and a RecordList. If the model/store only supports
    * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
    * is true. When auto-sync is false, then updates are pushed by calling pushUpdates().
    *
    * It is expected that by the time this class is called, that the data has been loaded and the object is ready
    * to be placed into a two-way sync state. Any time a record is reloaded or a list is reloaded with new data or
    * criteria, this object should probably be disposed and replaced.
    *
    * Additionally, changes to the story are not detected and a new SyncController must be established. For example:
    * if the model.store property is changed this will not be updated and a new SyncController is needed; if the
    * model.auto property is toggled then a new SyncController will be needed.
    */
   ko.sync.SyncControllerOld = Class.extend({

      /**
       * Establish and handle client-to-server and server-to-client updates. If the model/store only supports
       * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
       * is true.
       *
       * @param {ko.sync.Model} model
       * @param {Object|ko.observable|ko.observableArray} target if listOrRecord is a RecordList this must be an observableArray
       * @param {ko.sync.RecordList|ko.sync.Record} listOrRecord
       * @param {object} [criteria] used with lists to specify the filter parameters used by server and to load initial data
       * @constructor
       */
      init: function(model, target, listOrRecord, criteria) {
         this.model = model;
         this.subs = [];
         var next = $.Deferred(function(def) { def.resolve(); });
         syncData(model, target, listOrRecord, this.subs);
         syncPush(model, listOrRecord, this.subs, next);
         syncPull(model, listOrRecord, this.subs, next, criteria);
      },

      /**
       * @return {ko.sync.SyncController} this
       */
      dispose: function() {
         var i = this.subs.length;
         while (i--) {
            this.subs[i].dispose();
         }
         this.subs = [];
         return this;
      },

      /**
       * Force updates (for use when auto-sync is off). It is safe to call this on unchanged records or empty lists
       *
       * @param {Array|ko.sync.Record} listOrRecord
       * @param {string} [action]  added, updated, moved, or deleted
       * @return {Promise} fulfilled when all updates are marked completed by the server
       */
      pushUpdates: function(listOrRecord, action) {
         //todo make this work if a RecordList is passed in
         //todo this method signature is wrong; we should be checking the list/record we received in init rather
         //todo than operating on any list we see come through
         //todo if this is an observableArray, then call checkpoint()!
         if(_.isArray(listOrRecord) ) {
            var promises = [];
            _.each(listOrRecord, function(v) {
               promises.push(this.pushUpdates(v, action));
            }, this);
            return $.when(promises);
         }
         else if( listOrRecord.isDirty() ) {
            return pushUpdate(_updateAction(listOrRecord, action), this.model, listOrRecord);
         }
         else {
            return $.Deferred().resolve(false);
         }
      }
   });

   function syncPush(model, listOrRecord, subs, next) {
      if (model.auto) {
         // sync client to server (push) updates
         if (listOrRecord instanceof ko.sync.RecordList) {
            subs.push(syncListPush(model, listOrRecord));
         }
         else {
            //todo this is not enough; existence of a key doesn't ensure record exists on the server
            if (!listOrRecord.hasKey()) {
               next.pipe(function () {
                  // record is new, must be created on server
                  return model.store.create(model, listOrRecord).then(function (id) {
                     listOrRecord.updateHashKey(id);
                     //todo target
                  }).then(thenClearDirty(listOrRecord));
               });
            }
            next.then(function () {
               subs.push(syncRecordPush(model, listOrRecord));
            });
         }
      }
   }

   function syncPull(model, listOrRecord, subs, next, criteria) {
      if( model.store.hasTwoWaySync(model) ) {
         // sync server to client (pull) updates
         // monitor the client (using the libs)
         if( listOrRecord instanceof ko.sync.RecordList ) {
            subs.push(syncListPull(model, listOrRecord, criteria));
         }
         else {
            //todo this is not enough, existence of a key doesn't ensure the record exists on the server
            if( listOrRecord.hasKey() ) {
               subs.push(syncRecordPull(model, listOrRecord));
            }
            else {
               next.then(function() {
                  // if the record must be created, wait before trying to sync for updates
                  subs.push(syncRecordPush(model, listOrRecord));
               });
            }
         }
      }
   }

   function syncListPush(model, list) {
      list.subscribe(function(action, record, field) {
         return pushUpdate(action, list.model, record);
      });
   }

   function syncListPull(model, list, criteria) {
      model.store.watch(model, function(action, name, value, prevSibling) {
         var rec = list.find(name) || model.newRecord(value);
         switch(action) {
            case 'added':
               list.add(rec, prevSibling || 0);
               break;
            case 'deleted':
               var key = rec.hasKey() && rec.hashKey();
               key && !(key in list.deleted) && !(key in list.delayed) && list.remove(rec);
               break;
            case 'updated':
               //todo this doesn't deal with conflicts (update on server and client at same time)
               rec.updateAll(value);
               break;
            case 'moved':
               list.move(rec, prevSibling || 0);
               break;
            default:
               typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
         }
         rec.isDirty(false); // record now matches server
      }, criteria);
   }

   function syncRecordPush(model, rec) {
      var store = model.store;
      return rec.subscribe(function(record, fieldChanged) {
         store.update(model, record).then(thenClearDirty(record));
      });
   }

   function pushUpdate(action, model, rec) {
      var def, store = model.store;
      //todo pull updates from the observable before taking an action? make sure our data is synced?
      switch(action) {
         case 'added':
            def = store.create(model, rec).then(function(id) {
               rec.updateHashKey(id);
            });
            break;
         case 'updated':
            def = store.update(model, rec);
            break;
         case 'deleted':
            def = store.delete(model, rec);
            break;
         case 'moved':
            //todo-sort does this work? how do we get "moved" notifications?
            def = store.update(model, rec);
            break;
         default:
            def = $.Deferred().reject('invalid action: '+action);
            typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
      }
      return def.then(thenClearDirty(rec));
   }

   function syncRecordPull(model, rec) {
      return model.store.watchRecord(model, rec, function(id, val, sortPriority) {
         //todo this doesn't deal with conflicts (update on server and client at same time)
         //todo-sort this ignores sortPriority, which is presably in the data, but should we rely on that?
         rec.updateAll(val);
         rec.isDirty(false); // record now matches server
      });
   }

   function thenClearDirty(rec) {
      return function(success) {
         success !== false && rec.isDirty(false);
      }
   }

   function _updateAction(rec, action) {
      if( action ) { return action; }
      else if( rec.hasKey() ) {
         return 'updated';
      }
      else {
         return 'created';
      }
   }

   function syncData(model, target, listOrRecord, subs, next) {
      if( listOrRecord instanceof ko.sync.RecordList && !ko.sync.isObservableArray(target) ) {
         throw new Error('RecordList only works with ko.observableArray instances '+target+', '+listOrRecord);
      }
      else {
         subs.push(new DataSync(target, listOrRecord));
      }
   }

   function DataSync(target, listOrRec) {
      this.isList        = listOrRec instanceof ko.sync.RecordList;
      this.observed      = ko.isObservable(target);
      this.target        = target;
      this.subs          = [];
      this.sharedContext = { delayed: {}, pushing: {}, pulling: {} };

      //todo we need a way to detect changes in observable[Array] element's fields which are not themselves observable
      //todo some way to check for updates to make sure everything is synced before we send data to server
      //todo or do we? maybe that's the implementation's job; if they don't bother to make them observable then it's
      //todo their job to let us know when they change?

      if( this.isList ) {
         target.removeAll();
         var it = listOrRec.iterator();
         while(it.hasNext()) {
            var rec = it.next();
            target.push(rec.getData());
         }
         this.subs.push(_watchObsArray(listOrRec, target, this.sharedContext));
         this.subs.push(_watchRecList(listOrRec, target, this.sharedContext));
      }
      else if( this.observed ) {
         //todo
         //todo
         //todo
      }
      else {
         target.data = target.data || {};
         //todo
         //todo
         //todo
      }
   }

   DataSync.prototype.dispose = function() {
      _.each(this.subs, function(sub) { sub.dispose(); });
      this.subs   = [];
      this.target = null;
   };

   function _watchRecList(recList, obsArray, sharedContext) {
      return recList.subscribe(function(action, record, meta) {
         switch(action) {
            case 'added':
               //todo
               //todo
               //todo
               break;
            case 'updated':
               //todo
               //todo
               //todo
               break;
            case 'moved':
               //todo
               //todo
               //todo
               break;
            case 'deleted':
               //todo
               //todo
               //todo
               break;
            default:
               throw new Error('unrecognized notification type: '+action);
         }
      });
   }

   function _watchObsArray(recList, obsArray, sharedContext) {
      return obsArray.subscribe(function(obsValue) {
         // diff the last version with this one and see what changed; we only have to look for deletions and additions
         // since all of our local changes will change byKey before modifying the observable array, feedback loops
         // are prevented here because anything already marked as added/deleted can be considered a prior change
         var existingRecords = recList.byKey;
         var alreadyDeleted  = recList.deleted;
         var currentData     = buildKeysForDataList(obsValue);

         // look for added keys
         _.each(currentData, function(key, i) {
            var v, prevId = _findPrevId(existingRecords, alreadyDeleted, currentData.keys, i);
            if( !_.has(existingRecords, key) ) {
               //todo create in recList
               //todo
               //todo
               //todo
            }
            else if(_.has(recList.delayed, key)) {
               //todo move in recList
               //todo clear delays
               //todo should this just be an add and let recList take care of the move/timeout etc?
               //todo should recList.delayed be moved here? probably
            }
         });

         // look for deleted keys by seeing what our existing keys are are not already deleted and
         // do not appear in the new keyedValues list
         _.chain(existingRecords).keys().difference(_.keys(alreadyDeleted)).difference(currentData.keys).each(function(key) {
            recList.delayed[key] = setTimeout(function() {
               // it's in the old values and not marked as deleted, and not in the new values
               //todo remove from recList
               //todo
               //todo
               //todo
            }, 0);
         });
      });
   }

   /**
    * Only intended for use in _sync()
    * @private
    */
   function _findPrevId(existingRecords, deletedKeys, newKeys, idx) {
      if( idx === 0 ) { return 0; }
      else if( idx < newKeys.length - 1 ) {
         var i = idx, key;
         while(i--) {
            key = newKeys[i];
            if( key in existingRecords && !key in deletedKeys ) {
               return key;
            }
         }
         return undef;
      }
      else {
         return undef;
      }
   }

   /**
    * Only intended for use in _sync
    */
   function buildKeysForDataList(model, obsValues) {
      var keys = [], data = {};
      _.each(obsValues, function(data) {
         var key = ko.sync.RecordId.for(model, data).hashKey();
         keys.push(key);
         data[key] = data;
      });
      return { keys: keys, data: data };
   }

})(jQuery);




/***********************************************
 * SyncController connects RecordList to a Store
 **********************************************/
(function($) {
   "use strict";
   var undef;

   /**
    * Establish and handle updates between a Store and a RecordList. If the model/store only supports
    * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
    * is true. When auto-sync is false, then updates are pushed by calling pushUpdates().
    *
    * It is expected that by the time this class is called, that the data has been loaded and the object is ready
    * to be placed into a two-way sync state. Any time a record is reloaded or a list is reloaded with new data or
    * criteria, this object should probably be disposed and replaced.
    *
    * Additionally, changes to the story are not detected and a new SyncController must be established. For example:
    * if the model.store property is changed this will not be updated and a new SyncController is needed; if the
    * model.auto property is toggled then a new SyncController will be needed.
    */
   ko.sync.SyncController = Class.extend({

      /**
       * Establish and handle client-to-server and server-to-client updates. If the model/store only supports
       * one-way updates, then we use those. This will also trigger automatic pushes to the server when auto-sync
       * is true.
       *
       * @param {ko.sync.Model} model
       * @param {Object|ko.observable|ko.observableArray} target if listOrRecord is a RecordList this must be an observableArray
       * @param {ko.sync.RecordList|ko.sync.Record} listOrRecord
       * @param {object} [criteria] used with lists to specify the filter parameters used by server and to load initial data
       * @constructor
       */
      init: function(model, target, listOrRecord, criteria) {
         reset(this);
         this.model     = model;
         this.isList    = listOrRecord instanceof ko.sync.RecordList;
         this.observed  = ko.isObservable(target);
         this.twoway    = model.store.hasTwoWaySync();

         if( this.isList && !ko.sync.isObservableArray(target) ) {
            throw new Error('When syncing a RecordList, the target must be a ko.observableArray');
         }

         !this.observed && !target.data && (target.data = {});

         if( this.isList ) {
            this.list = listOrRecord;
            this.twoway && this.subs.push(_watchStoreList(this, listOrRecord, target, criteria));
            this.subs.push(_watchRecordList(this, listOrRecord, target));
            this.subs.push(_watchObsArray(this, target, listOrRecord));
         }
         else {
            console.log('with rec', listOrRecord);//debug
            this.rec = listOrRecord;
            this.twoway && this.subs.push(_watchStoreRecord(this, listOrRecord, target));
            this.subs.push(_watchRecord(this, listOrRecord, target));
            this.subs.push(_watchObs(this, target, listOrRecord));
         }
      },

      /**
       * @return {ko.sync.SyncController} this
       */
      dispose: function() {
         reset(this);
         return this;
      },

      /**
       * Force updates (for use when auto-sync is off). It is safe to call this on unchanged records or empty lists
       * @return {Promise} fulfilled when all updates are marked completed by the server
       */
      pushUpdates: function() {
         if( this.isList ) {
            var list = this.list;
            return pushAll(list, this.model, this.sharedContext).then(function() { list.checkpoint(); });
         }
         else {
            this.rec.isDirty() && pushNextUpdate(this.model, this.sharedContext, this.rec);
         }
      }
   });

   function _watchStoreList(c, list, target, criteria) {
      var model = c.model, ctx = c.sharedContext;
      return model.store.watch(model, nextEventHandler(ctx, 'pull', idCallback(1),
         function(action, name, value, prevSibling) {
            var rec = list.find(name) || model.newRecord(value);
            switch(action) {
               case 'added':
                  list.add(rec, prevSibling || 0);
                  break;
               case 'deleted':
                  var key = rec.hasKey() && rec.hashKey();
                  key && !(key in list.deleted) && !(key in list.delayed) && list.remove(rec);
                  break;
               case 'updated':
                  rec.updateAll(value);
                  break;
               case 'moved':
                  list.move(rec, prevSibling || 0);
                  break;
               default:
                  typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
            }
            rec.isDirty(false); // record now matches server
         }), criteria);
   }

   function _watchStoreRecord(c, rec, target) {
      var model = c.model, ctx = c.sharedContext;
      return model.store.watchRecord(model, rec, nextEventHandler(ctx, 'push', idCallback(0), function(id, val, sortPriority) {
         //todo this doesn't deal with conflicts (update on server and client at same time)
         //todo-sort this ignores sortPriority, which is presumably in the data, but should we rely on that?
         rec.updateAll(val);
         rec.isDirty(false); // record now matches server
      }));
   }

   function _watchRecordList(c, list, target) {
      return list.subscribe(function(action, rec, meta) {
         var ctx = c.sharedContext;
         var id = rec.hashKey();
         switch(ctx.status[id]) {
            case 'push':
               // a push is in progress, send to server
               if( c.model.auto ) { c.pushUpdates().always(thenClearStatus(ctx, id)); }
               break;
            case 'pull':
               // a pull is in progress, send to data
               syncToData(c, target, action, rec, meta);
               break;
            default:
               // rec/list modified externally (goes both ways)
               nextEvent(ctx, 'pull', id, function() { // apply it to the data
                  syncToData(c, target, action, rec, meta);
               });
               c.model.auto && nextEvent(ctx, 'push', id, function() { // apply it to the server
                  return c.pushUpdates();
               });
         }
      });
   }

   function _watchRecord(c, rec, target) {
      return rec.subscribe(function(record, fieldsChanged) {
         var model = c.model;
         var id = record.hashKey();
         var ctx = c.sharedContext;

         !_.isArray(fieldsChanged) && (fieldsChanged = [fieldsChanged]);

         switch(ctx.status[id]) {
            case 'push':
               model.auto && pushUpdate(model, 'updated', record);
               break;
            case 'pull':
               syncToData(ctx, target, 'updated', record, fieldsChanged);
               break;
            default:
               model.auto && pushNextUpdate(model, ctx, record);
               nextEvent(ctx, 'pull', id, function() { syncToData(ctx, target, 'updated', record, fieldsChanged) });
               break;
         }
      });
   }

   function _watchObsArray(c, obs, list) {
      //todo use ko.utils.compareArrays
      //todo http://stackoverflow.com/questions/12166982/determine-which-element-was-added-or-removed-with-a-knockoutjs-observablearray
      //todo http://jsfiddle.net/mbest/Jq3ru/
      //todo
      //todo
      //todo
      //todo update c.sharedContext.cachedKeys
   }

   function _watchObs(c, obs, rec) {
      //todo
      //todo
      //todo
      //todo
      //todo
   }

   function pushUpdate(model, action, rec) {
      var def, store = model.store;
      switch(action) {
         case 'added':
            def = store.create(model, rec).then(function(id) {
               rec.updateHashKey(id);
            });
            break;
         case 'updated':
            def = store.update(model, rec);
            break;
         case 'deleted':
            def = store.delete(model, rec);
            break;
         case 'moved':
            //todo-sort does this work? how do we get "moved" notifications?
            def = store.update(model, rec);
            break;
         default:
            def = $.Deferred().reject('invalid action: '+action);
            typeof(console) === 'object' && console.error && console.error('invalid action', _.toArray(arguments));
      }
      return def.then(thenClearDirty(rec));
   }

   function syncToData(c, target, action, rec, meta) {
      var model = c.model;
      var id    = rec.hashKey();
      switch(action) {
         case 'added':
            //todo
            //todo
            //todo
            //todo
            break;
         case 'updated':
            var fields = _.isArray(meta)? meta : (meta? [meta] : []);
            var data = getDataFromObsArray(c.sharedContext, target, model, id);
            data && fields.length && _.each(_.pick(rec.getData(), fields), function(v, k) {
               ko.isObservable(data[k])? data[k]( rec.get(k) ) : data[k] = rec.get(k);
            });
            break;
         case 'deleted':
            //todo
            //todo
            //todo
            break;
         case 'moved':
            //todo-sort does this work? how do we get "moved" notifications?
            //todo
            //todo
            //todo
            break;
         default:
            throw new Error('invalid action: '+action);
      }
   }

   function pushNextUpdate(model, ctx, rec, action) {
      return nextEvent(ctx, 'push', rec.hashKey(), function() {
         return pushUpdate(model, action||'updated', rec);
      }.bind(this));
   }

   function nextEventHandler(ctx, pushOrPull, idAccessor, fx) {
      return function() {
         var args = _.toArray(arguments);
         console.log('nextEventHandler', args);//debug
         var id   = unwrapId(idAccessor, args);

         if( !(id in ctx.status) ) { // avoid feedback loops by making sure an event isn't in progress
            return nextEvent.apply(null, [ctx, pushOrPull, id, fx].concat(args));
         }
         else { console.debug('_watchStoreList', 'ignored '+ args.join(',')); } //debug
      }
   }

   function nextEvent(ctx, status, id, fx) {
      var args      = _.toArray(arguments).slice(4);
      var wrappedFx = function() {
         ctx.status[id] = status;                                // mark this rec as actively pushing/pulling to prevent feedback loops
         return $.when(fx.apply(null, args)).always(thenClearStatus(ctx, id));
      };
      if( id in ctx.defer ) {
         ctx.defer[id].pipe(wrappedFx);
      }
      else {
         ctx.defer[id] = wrappedFx();
      }
      return ctx.defer[id];
   }

   function reset(sc) {
      if( sc.subs ) {
         var i = sc.subs.length;
         while (i--) {
            sc.subs[i].dispose();
         }
      }
      sc.subs          = [];
      sc.sharedContext = {
         delayed:    {}, //todo used by move ops?
         defer:      {}, // only perform one update on a record at a time, defer additional updates
         status:     {}, // set during operations to prevent feedback loops
         cachedKeys: {}  // the indices for records in observableArray
      };
      sc.model         = null;
      sc.list          = null;
      sc.rec           = null;
   }

   function thenClearDirty(rec) {
      return function(success) {
         success !== false && rec.isDirty(false);
      }
   }

   function unwrapId(id, args) {
      if( typeof(id) === 'function' ) {
         return id.apply(null, args);
      }
      else {
         return id;
      }
   }

   function idCallback(pos) {
      return function() {
         return arguments.length > pos? arguments[pos] : null;
      };
   }

   function getDataFromObsArray(ctx, obsArray, model, id) {
      if( !ctx.cachedKeys[id] ) {
         cacheKeysForObsArray(ctx, obsArray, model);
      }
      return obsArray()[ctx.cachedKeys[id]];
   }

   function cacheKeysForObsArray(ctx, obsArray, model) {
      var RecordId = ko.sync.RecordId, cache = ctx.cachedKeys = {};
      _.each(ko.utils.unwrapObservable(obsArray), function(v, i) {
         cache[ RecordId.for(model, v) ] = i;
      });
   }

   function makeKeysForData(model, listOfData) {
      var RecordId = ko.sync.RecordId;
      return _.map(listOfData, function(v) {
         return RecordId.for(model, v);
      })
   }

   var pushAll = _.throttle(function(recList, model, ctx) {
      //todo create a way to mass update with several records at once!
      var promises = [];
      console.log(recList.changeList());
      _.each(recList.changeList(), function(v) {
         var action = v[0];
         var rec    = v[1];
         var def = nextEvent(ctx, 'push', rec.hashKey(), function() {
            return pushUpdate(model, action, rec).then(function() {
               recList.clearEvent(action, rec.hashKey());
            });
         });
         promises.push(def);
      });
      return $.when(promises);
   }, 50);

   function thenClearStatus(ctx, id) {
      return function() {
         delete ctx.status[id];
      }
   }

})(jQuery);

