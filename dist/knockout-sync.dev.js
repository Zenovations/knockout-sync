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
      //credits: taken from bind_even_never in this discussion: https://prototype.lighthouseapp.com/projects/8886/tickets/215-optimize-bind-bindaseventlistener#ticket-215-9
      Function.prototype.bind = function(context) {
         var fn = this, args = Array.prototype.slice.call(arguments, 1);
         return function(){
            return fn.apply(context, Array.prototype.concat.apply(args, arguments));
         };
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
(function(root){

   // Let's borrow a couple of things from Underscore that we'll need

   // _.each
   var breaker = {},
      AP = Array.prototype,
      OP = Object.prototype,

      hasOwn = OP.hasOwnProperty,
      toString = OP.toString,
      forEach = AP.forEach,
      indexOf = AP.indexOf,
      slice = AP.slice;

   var _each = function( obj, iterator, context ) {
      var key, i, l;

      if ( !obj ) {
         return;
      }
      if ( forEach && obj.forEach === forEach ) {
         obj.forEach( iterator, context );
      } else if ( obj.length === +obj.length ) {
         for ( i = 0, l = obj.length; i < l; i++ ) {
            if ( i in obj && iterator.call( context, obj[i], i, obj ) === breaker ) {
               return;
            }
         }
      } else {
         for ( key in obj ) {
            if ( hasOwn.call( obj, key ) ) {
               if ( iterator.call( context, obj[key], key, obj) === breaker ) {
                  return;
               }
            }
         }
      }
   };

   // _.isFunction
   var _isFunction = function( obj ) {
      return !!(obj && obj.constructor && obj.call && obj.apply);
   };

   // _.extend
   var _extend = function( obj ) {

      _each( slice.call( arguments, 1), function( source ) {
         var prop;

         for ( prop in source ) {
            if ( source[prop] !== void 0 ) {
               obj[ prop ] = source[ prop ];
            }
         }
      });
      return obj;
   };

   // $.inArray
   var _inArray = function( elem, arr, i ) {
      var len;

      if ( arr ) {
         if ( indexOf ) {
            return indexOf.call( arr, elem, i );
         }

         len = arr.length;
         i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

         for ( ; i < len; i++ ) {
            // Skip accessing in sparse arrays
            if ( i in arr && arr[ i ] === elem ) {
               return i;
            }
         }
      }

      return -1;
   };

   // And some jQuery specific helpers

   var class2type = {};

   // Populate the class2type map
   _each("Boolean Number String Function Array Date RegExp Object".split(" "), function(name, i) {
      class2type[ "[object " + name + "]" ] = name.toLowerCase();
   });

   var _type = function( obj ) {
      return obj == null ?
         String( obj ) :
         class2type[ toString.call(obj) ] || "object";
   };

   // Now start the jQuery-cum-Underscore implementation. Some very
   // minor changes to the jQuery source to get this working.

   // Internal Deferred namespace
   var _d = {};
   // String to Object options format cache
   var optionsCache = {};

   // Convert String-formatted options into Object-formatted ones and store in cache
   function createOptions( options ) {
      var object = optionsCache[ options ] = {};
      _each( options.split( /\s+/ ), function( flag ) {
         object[ flag ] = true;
      });
      return object;
   }

   _d.Callbacks = function( options ) {

      // Convert options from String-formatted to Object-formatted if needed
      // (we check in cache first)
      options = typeof options === "string" ?
         ( optionsCache[ options ] || createOptions( options ) ) :
         _extend( {}, options );

      var // Last fire value (for non-forgettable lists)
         memory,
      // Flag to know if list was already fired
         fired,
      // Flag to know if list is currently firing
         firing,
      // First callback to fire (used internally by add and fireWith)
         firingStart,
      // End of the loop when firing
         firingLength,
      // Index of currently firing callback (modified by remove if needed)
         firingIndex,
      // Actual callback list
         list = [],
      // Stack of fire calls for repeatable lists
         stack = !options.once && [],
      // Fire callbacks
         fire = function( data ) {
            memory = options.memory && data;
            fired = true;
            firingIndex = firingStart || 0;
            firingStart = 0;
            firingLength = list.length;
            firing = true;
            for ( ; list && firingIndex < firingLength; firingIndex++ ) {
               if ( list[ firingIndex ].apply( data[ 0 ], data[ 1 ] ) === false && options.stopOnFalse ) {
                  memory = false; // To prevent further calls using add
                  break;
               }
            }
            firing = false;
            if ( list ) {
               if ( stack ) {
                  if ( stack.length ) {
                     fire( stack.shift() );
                  }
               } else if ( memory ) {
                  list = [];
               } else {
                  self.disable();
               }
            }
         },
      // Actual Callbacks object
         self = {
            // Add a callback or a collection of callbacks to the list
            add: function() {
               if ( list ) {
                  // First, we save the current length
                  var start = list.length;
                  (function add( args ) {
                     _each( args, function( arg ) {
                        var type = _type( arg );
                        if ( type === "function" ) {
                           if ( !options.unique || !self.has( arg ) ) {
                              list.push( arg );
                           }
                        } else if ( arg && arg.length && type !== "string" ) {
                           // Inspect recursively
                           add( arg );
                        }
                     });
                  })( arguments );
                  // Do we need to add the callbacks to the
                  // current firing batch?
                  if ( firing ) {
                     firingLength = list.length;
                     // With memory, if we're not firing then
                     // we should call right away
                  } else if ( memory ) {
                     firingStart = start;
                     fire( memory );
                  }
               }
               return this;
            },
            // Remove a callback from the list
            remove: function() {
               if ( list ) {
                  _each( arguments, function( arg ) {
                     var index;
                     while( ( index = _inArray( arg, list, index ) ) > -1 ) {
                        list.splice( index, 1 );
                        // Handle firing indexes
                        if ( firing ) {
                           if ( index <= firingLength ) {
                              firingLength--;
                           }
                           if ( index <= firingIndex ) {
                              firingIndex--;
                           }
                        }
                     }
                  });
               }
               return this;
            },
            // Control if a given callback is in the list
            has: function( fn ) {
               return _inArray( fn, list ) > -1;
            },
            // Remove all callbacks from the list
            empty: function() {
               list = [];
               return this;
            },
            // Have the list do nothing anymore
            disable: function() {
               list = stack = memory = undefined;
               return this;
            },
            // Is it disabled?
            disabled: function() {
               return !list;
            },
            // Lock the list in its current state
            lock: function() {
               stack = undefined;
               if ( !memory ) {
                  self.disable();
               }
               return this;
            },
            // Is it locked?
            locked: function() {
               return !stack;
            },
            // Call all callbacks with the given context and arguments
            fireWith: function( context, args ) {
               args = args || [];
               args = [ context, args.slice ? args.slice() : args ];
               if ( list && ( !fired || stack ) ) {
                  if ( firing ) {
                     stack.push( args );
                  } else {
                     fire( args );
                  }
               }
               return this;
            },
            // Call all the callbacks with the given arguments
            fire: function() {
               self.fireWith( this, arguments );
               return this;
            },
            // To know if the callbacks have already been called at least once
            fired: function() {
               return !!fired;
            }
         };

      return self;
   };

   _d.Deferred = function( func ) {

      var tuples = [
            // action, add listener, listener list, final state
            [ "resolve", "done", _d.Callbacks("once memory"), "resolved" ],
            [ "reject", "fail", _d.Callbacks("once memory"), "rejected" ],
            [ "notify", "progress", _d.Callbacks("memory") ]
         ],
         state = "pending",
         promise = {
            state: function() {
               return state;
            },
            always: function() {
               deferred.done( arguments ).fail( arguments );
               return this;
            },
            then: function( /* fnDone, fnFail, fnProgress */ ) {
               var fns = arguments;

               return _d.Deferred(function( newDefer ) {

                  _each( tuples, function( tuple, i ) {
                     var action = tuple[ 0 ],
                        fn = fns[ i ];

                     // deferred[ done | fail | progress ] for forwarding actions to newDefer
                     deferred[ tuple[1] ]( _isFunction( fn ) ?

                        function() {
                           var returned;
                           try { returned = fn.apply( this, arguments ); } catch(e){
                              newDefer.reject(e);
                              return;
                           }

                           if ( returned && _isFunction( returned.promise ) ) {
                              returned.promise()
                                 .done( newDefer.resolve )
                                 .fail( newDefer.reject )
                                 .progress( newDefer.notify );
                           } else {
                              newDefer[ action !== "notify" ? 'resolveWith' : action + 'With']( this === deferred ? newDefer : this, [ returned ] );
                           }
                        } :

                        newDefer[ action ]
                     );
                  });

                  fns = null;

               }).promise();

            },
            // Get a promise for this deferred
            // If obj is provided, the promise aspect is added to the object
            promise: function( obj ) {
               return obj != null ? _extend( obj, promise ) : promise;
            }
         },
         deferred = {};

      // Keep pipe for back-compat
      promise.pipe = promise.then;

      // Add list-specific methods
      _each( tuples, function( tuple, i ) {
         var list = tuple[ 2 ],
            stateString = tuple[ 3 ];

         // promise[ done | fail | progress ] = list.add
         promise[ tuple[1] ] = list.add;

         // Handle state
         if ( stateString ) {
            list.add(function() {
               // state = [ resolved | rejected ]
               state = stateString;

               // [ reject_list | resolve_list ].disable; progress_list.lock
            }, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
         }

         // deferred[ resolve | reject | notify ] = list.fire
         deferred[ tuple[0] ] = list.fire;
         deferred[ tuple[0] + "With" ] = list.fireWith;
      });

      // Make the deferred a promise
      promise.promise( deferred );

      // Call given func if any
      if ( func ) {
         func.call( deferred, deferred );
      }

      // All done!
      return deferred;
   };

   // Deferred helper
   _d.when = function( subordinate /* , ..., subordinateN */ ) {

      var i = 0,
         resolveValues = ( _type(subordinate) === 'array' && arguments.length === 1 ) ? subordinate : slice.call( arguments ),
         length = resolveValues.length;

      if ( _type(subordinate) === 'array' && subordinate.length === 1 ) {
         subordinate = subordinate[ 0 ];
      }

      // the count of uncompleted subordinates
      var remaining = length !== 1 || ( subordinate && _isFunction( subordinate.promise ) ) ? length : 0,

      // the master Deferred. If resolveValues consist of only a single Deferred, just use that.
         deferred = remaining === 1 ? subordinate : _d.Deferred(),

      // Update function for both resolve and progress values
         updateFunc = function( i, contexts, values ) {
            return function( value ) {
               contexts[ i ] = this;
               values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
               if( values === progressValues ) {
                  deferred.notifyWith( contexts, values );
               } else if ( !( --remaining ) ) {
                  deferred.resolveWith( contexts, values );
               }
            };
         },

         progressValues, progressContexts, resolveContexts;

      // add listeners to Deferred subordinates; treat others as resolved
      if ( length > 1 ) {
         progressValues = new Array( length );
         progressContexts = new Array( length );
         resolveContexts = new Array( length );
         for ( ; i < length; i++ ) {
            if ( resolveValues[ i ] && _isFunction( resolveValues[ i ].promise ) ) {
               resolveValues[ i ].promise()
                  .done( updateFunc( i, resolveContexts, resolveValues ) )
                  .fail( deferred.reject )
                  .progress( updateFunc( i, progressContexts, progressValues ) );
            } else {
               --remaining;
            }
         }
      }

      // if we're not waiting on anything, resolve the master
      if ( !remaining ) {
         deferred.resolveWith( resolveContexts, resolveValues );
      }

      return deferred.promise();
   };

   // Try exporting as a Common.js Module
   if ( typeof module !== "undefined" && module.exports ) {
      module.exports = _d;

      // Or mixin to Underscore.js
   } else if ( typeof root._ !== "undefined" ) {
      root._.mixin(_d);

      // Or assign it to window._
   } else {
      root._ = _d;
   }

})(this);
/*! ****************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/Zenovations/knockout-sync
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function(ko) {
   "use strict";
   var undefined;

   // namespace
   ko.sync = {
      stores: {},

      isObservableArray: function(o) {
         return typeof(o) === 'function' && !!ko.isObservable(o) && !!o.splice && _.isArray(o());
      },

      /**
       * Creates a copy of the data with all observables unwrapped to their value
       *
       * @param {Object|Array} data
       * @return {Object}
       */
      unwrapAll: function(data) {
         var unwrap = ko.utils.unwrapObservable;
         data = unwrap(data);
         var out = _.isArray(data)? [] : {};
         _.each(data, function(v, key) {
            v = unwrap(v);
            out[key] = _.isObject(v)? ko.sync.unwrapAll(v) : v;
         });
         return out;
      },

      /**
       * Create a copy of the data suitable for sending to the store
       * @param {Object} data
       * @param {ko.sync.Store} store
       * @return {Object}
       */
      prepStoreData: function(data, store) {
         return data? _.pick(ko.sync.unwrapAll(data), store.getFieldNames()) : data;
      },

      /**
       * Apply updates to observable without destroying any properties on the object which aren't in our purview;
       * maintain any observables as such.
       *
       * @param {ko.observable} observable
       * @param {Object} data
       */
      applyUpdates: function(observable, data) {
         if( data ) {
            var isObs = ko.isObservable(observable);
            var out = ko.utils.extend({}, ko.utils.unwrapObservable(observable)||{});
            _.each(data, function(v, k) {
               if( ko.isObservable(out[k]) ) {
                  out[k](v);
               }
               else {
                  out[k] = v;
               }
            });
            if( isObs ) {
               observable(out);
            }
            else {
               observable = out;
            }
         }
         return observable;
      },

      /**
       * If the object contains any observable fields, then they are monitored. If the object itself is an observable,
       * it is also monitored.
       */
      watchRecord: function(store, rec, callback) {
         if( ko.isObservable(rec) ) {
            return rec.watchChanges(store, callback);
         }
         else {
            return ko.sync.watchFields(store, rec, callback);
         }
      },

      watchFields: function(store, rec, callback) {
         var subs = [], unwrappedRec = ko.utils.unwrapObservable(rec)||{};
         _.each(store.getFieldNames(), function(f) {
            var v = unwrappedRec[f];
            if( v && ko.isObservable(v) ) {
               if( ko.sync.isObservableArray(v) ) {
                  subs.push(v.subscribe(callback.bind(null, rec)));
               }
               else {
                  subs.push(v.subscribe(callback.bind(null, rec)));
               }
            }
         });
         return {
            dispose: function() {
               _.each(subs, function(s) {s.dispose()});
            }
         }
      },

      isEqual: function(fields, recA, recB) {
         if( !recA || !recB ) { return recA === recB; }
         return recA === recB || _.isEqual(_.pick(ko.sync.unwrapAll(recA), fields), _.pick(ko.sync.unwrapAll(recB), fields));
      }
   };

   /**
    * Synchronize knockout observable or observableArray to the data store.
    *
    * An observable is always immediately synchronized to the Store when this method is called. For an
    * observable object, an optional key can be passed to load the record from the Store by key. Otherwise,
    * the observable is assumed to contain new data and a create is called using the data in the observable.
    *
    * An observableArray should not contain data when sync is called.
    *
    * The opts object:
    *   {ko.sync.Store} store - required
    *   {String} key - optional (observable only) immediately fetches record from Store and synchronizes
    *   {ko.sync.Factory} factory - used to generate the objects in the array, if none specified, they are plain objects
    *
    * @param {ko.observable|ko.observableArray} target
    * @param {Object|ko.sync.Store} opts
    */
   ko.extenders.sync = function(target, opts) {
      opts = ko.utils.extend({}, opts instanceof ko.sync.Store? {store: opts} : opts);
      var store = opts.store;
      if( !(store instanceof ko.sync.Store) ) {
         throw new Error('Must declare a store to sync any observable');
      }

      if( ko.sync.isObservableArray(target) ) {
         target.crud = new ko.sync.CrudArray(target, store, opts.factory);
         target.crud.read();
      }
      else {
         target.crud = new ko.sync.Crud(target, store);
         if( opts.key ) { target.crud.read(opts.key); }
         else if(_.isObject(ko.utils.unwrapObservable(target))) {
            target.crud.create();
         }
      }

      return target;
   };

   /**
    * Notifies callback method whenever data within an observable array is changed. Only called if the data actually
    * changes and not just because observable(...some value...) is invoked.
    *
    * @param {ko.sync.Store} store
    * @param {Function} callback
    * @returns {{dispose: Function}}
    */
   ko.observable.fn.watchChanges = function(store, callback) {
      var rootSub, preSub, oldValue = null, fieldSubs;

      preSub = this.subscribe(function(prevValue) {
         oldValue = ko.sync.unwrapAll(prevValue);
      }, undefined, 'beforeChange');

      // watch for replacement of the entire object
      rootSub = this.subscribe(function(newValue) {
         var newUnwrapped = ko.sync.unwrapAll(newValue);
         if( !ko.sync.isEqual(store.getFieldNames(), newUnwrapped, oldValue) ) {
            // invoke the callback
            callback(newValue);
         }
      });

      fieldSubs = ko.sync.watchFields(store, this, callback);

      return {
         dispose: function() {
            rootSub && rootSub.dispose();
            preSub && preSub.dispose();
            fieldSubs && fieldSubs.dispose();
         }
      };
   };

   /**
    * Notifies callback method whenever data within an observable array is changed. The callback is given an object
    * keyed by the record ids, and an object containing:
    *    {String} status: create, delete, or update
    *    {Object} value:  the data
    *
    * @param {ko.sync.Store} store
    * @param {Function} callback
    * @returns {{dispose: Function}}
    */
   ko.observableArray.fn.watchChanges = function(store, callback) {
      if( this.watcher ) {
         this.watcher.add(callback);
      }
      else {
         this.watcher = new ko.sync.ArrayWatcher(this, store);
         this.watcher.add(callback);
      }
      return this.watcher;
   }

})(window.ko);
/*! ArrayWatcher.js
 *************************************/
(function () {
   "use strict";
   ko.sync.ArrayWatcher = function(obsArray, store) {
      var rootSub, preSub, oldValue, subs = [], recSubs = {};

      preSub = obsArray.subscribe(function(prevValue) {
         oldValue = ko.sync.unwrapAll(prevValue);
      }, undefined, 'beforeChange');

      var notify = function(changes) {
         _.each(subs, function(fn) {
            fn(changes);
         });
      };

      var watch = function(rec) {
         recSubs[store.getKey(rec)] = ko.sync.watchRecord(store, rec, function(changedRec) {
            var out = {};
            out[store.getKey(changedRec)] = {status: 'update', data: changedRec};
            notify(out);
         });
      };

      // watch for replacement of the entire object
      rootSub = obsArray.subscribe(function(newValue) {
         var changes = findChanges(store, oldValue, newValue);
         // update listeners for any nested callbacks
         _.each(changes, function(c, k) {
            switch(c.status) {
               case 'create':
                  // watch for changes to this record
                  watch(c.data);
                  break;
               case 'delete':
                  // stop watching this record
                  if( recSubs[k] ) {
                     recSubs[k].dispose();
                     delete recSubs[k];
                  }
                  break;
               default: // leave it alone
            }
         });
         // invoke the callbacks
         !_.isEmpty(changes) && notify(changes);
      });

      // watch pre-existing elements of the array
      _.each(obsArray()||[], watch);

      this.dispose = function() {
         rootSub && rootSub.dispose();
         preSub && preSub.dispose();
         _.each(recSubs, function(s) {s.dispose()});
      };

      this.add = function(fn) {
         subs.push(fn);
         return this;
      }.bind(this);
   };

/**
 * Assumptions:
 *   - fields in b not in a are added
 *   - fields in a not in b are deleted
 *   - object literals are compared using _.isEqual
 *   - objects with a .equals method are compared using .equals
 *   - other fields are compared with ===
 *
 * @param {ko.sync.Store} store
 * @param {Array} a the original
 * @param {Array} b the new
 * @return {object}
 */
function findChanges(store, a, b) {
   var out = {}, prevKey = null, i = 0, fieldNames = store.getFieldNames();
   compareArrays(store, a, b, function(key, newVal, oldVal, oldIdx) {
      if( !ko.sync.isEqual(fieldNames, oldVal, newVal) ) {
         if( oldVal === undefined ) {
            out[key] = { status: 'create', data: newVal, prevId: prevKey, idx: i };
         }
         else if( newVal === undefined ) {
            out[key] = { status: 'delete' };
         }
         else {
            out[key] = { status: 'update', data: newVal, prevId: prevKey, idx: i };
         }
      }
      else if( oldIdx !== i ) {
         out[key] = { status: 'move', prevId: prevKey, idx: i };
      }
      if( newVal !== undefined ) {
         i++;
         prevKey = key;
      }
//      if( out[key] ) { console.log('changed', key, out[key].status, out[key].idx); }//debug
   });
   return out;
}

/**
 * @param {ko.sync.Store} store
 * @param {Array} oldData
 * @param {Array} newData
 * @param {Function} fn
 */
function compareArrays(store, oldData, newData, fn) {
   // we index otherData but not the original data, this means we only iterate
   // each set exactly once (plus one iteration of all the added elmeents in otherData)
   var prevKey = null, newIndex = indexArray(store, newData), i = 0;
   _.each(oldData||[], function(oldVal) {
      var k = store.getKey(oldVal), newRec = newIndex[k] || {};
      fn(k, newRec.value, oldVal, i++);
      prevKey = k;
      delete newIndex[k];
   });
   _.each(newIndex, function(v,k) {
      fn(k, v.value, undefined, -1);
   });
}

function indexArray(store, data) {
   var out = {}, prevKey = null;
   ko.utils.arrayForEach(data||[], function(v) {
      var k = store.getKey(v);
      out[k] = {value: v, prevKey: prevKey};
      prevKey = k;
   });
   return out;
}
})();
/*! Crud.js
 *************************************/
(function (ko) {
   "use strict";

   ko.sync.Crud = function(observable, store) {
      this.observable = observable;
      this.store = store;
      this.ready = _.Deferred().resolve();
   };

   ko.utils.extend(ko.sync.Crud.prototype, {
      'create': function(newData) {
         return this._then(function() {
            if( newData ) {
               ko.sync.applyUpdates(this.observable, newData);
            }
            var data = ko.sync.prepStoreData(this.observable, this.store);
            return _.when(this.store.create(data))
               .done(function(key) {
                  this.key = key;
                  this._sync();
               }.bind(this));
         });
      },

      'read': function(key) {
         return this._then(function() {
            this.key = key;
            return _.when(this.store.read(key)).done(function(data) {
               this._change(this.observable, data);
               this._sync();
            }.bind(this));
         });
      },

      'update': function(updates) {
         return this._then(function() {
            if( updates ) {
               this.observable(ko.utils.extend(this.observable(), updates));
            }
            var data = ko.sync.prepStoreData(this.observable, this.store);
            return _.when(this.store.update(this.key, data));
         });
      },

      'delete': function() {
         return this._then(function() {
            return _.when(this.store.delete(this.key));
         });
      },

      _sync: function() {
         this.store.on('create update delete', this.key, this._change.bind(this));
         this.observable.watchChanges(this.store, this._local.bind(this));
      },

//      _add: function(k, v) {
//         if( k === this.key ) {
//            // key can change if the data it depends on changed
//            this.key = this.store.getKey(v);
//            this.observable(v);
//         }
//      },
//
//      _remove: function(k, v) {
//         if( k === this.key ) {
//            this.observable(null);
//         }
//      },

      _change: function(k, v) {
         if( !ko.sync.isEqual(this.store.getFieldNames(), this.observable, v) ) {
            ko.sync.applyUpdates(this.observable, v);
         }
      },

      _local: function(v) {
         this.store.update(this.key, ko.sync.prepStoreData(v, this.store));
      },

      _then: function(fn) {
         fn = fn.bind(this);
         this.ready = this.ready.then(function() {
            var d = _.Deferred();
            _.when(fn()).always(d.resolve);
            return d;
         });
         return this;
      }
   });

})(window.ko);
/*! CrudArray.js
 *************************************/
(function (ko) {
   "use strict";
   var undefined;

   /**
    * @param {ko.observableArray} observableArray
    * @param {ko.sync.Store} store
    * @param {ko.sync.Factory} [factory]
    * @constructor
    */
   ko.sync.CrudArray = function(observableArray, store, factory) {
      this.obs = observableArray;
      this.store = store;
      this._map = new ko.sync.KeyMap(store, observableArray);
      this.factory = factory || new ko.sync.Factory(store);
      this.ready = _.Deferred().resolve();
      this._synced = false;
      this.subs = [];
   };

   ko.utils.extend(ko.sync.CrudArray.prototype, {
      create: function(recs) {
         return this._then(function() {
            var ct = 0;
            if( !_.isArray(recs) ) { recs = recs? [recs] : []; }
            _.each(recs, function(rec) {
               if( this._create(this.store.getKey(rec), rec) >= 0 ) { ct++; }
            }.bind(this));
            return ct;
         });
      },

      read: function() {
         if( this._synced ) {
            return this.ready;
         }
         else {
            return this._then(function() {
               var def = _.Deferred(), loading = whenLoaded(def);

               // watch remote changes
               this.store.on('create', function(key, val, evt, prevId) {
                  this._create(key, val, prevId);
                  loading();
               }.bind(this));

               this.store.on('update', this._update.bind(this));
               this.store.on('delete', this._delete.bind(this));

               // watch local changes
               this.obs.watchChanges(this.store, this._local.bind(this));

               return def;
            });
         }
      },

      update: function(key, data) {
         return this._then(function() {
            if( this._update(key, data) >= 0 ) {
               return key;
            }
            else {
               console.warn('CrudArray::update - invalid key (not in local data)', key);
               return false;
            }
         });
      },

      delete: function(key) {
         return this._then(function() {
            var i = this._map.indexOf(key);
            if( i > -1 ) {
               return this.obs.splice(i, 1);
            }
            else {
               return false;
            }
         });
      },

      dispose: function() {
         _.each(this.subs, function(s) {s.dispose()});
      },

      _create: function(key, data, prevId) {
         var i = this._map.indexOf(key), prev = this._map.indexOf(prevId);
         if( i < 0 ) {
            var rec = this.factory.make(key, data);
            if( prevId === null || prev >= 0 ){
               this.obs.splice(prev + 1, 0, rec);
               return prev+1;
            }
            else {
               return this.obs.push(rec);
            }
         }
         else {
            this._update(key, data);
            return -1;
         }
      },

      _update: function(key, data) {
         var i = this._map.indexOf(key), rec;
         if( i >= 0 ) {
            rec = this.obs()[i];
            if( hasChanges(this.store.getFieldNames(), rec, data) ){
               // must make a copy otherwise observableArray.fn.watchChanges will fail to find
               // the change, since we will be modifying the original data (causing it to appear
               // to be the same after the update), fortunately, applyUpdates takes care of this
               var updatedRec = ko.sync.applyUpdates(rec, data);
               // if the record isn't itself an observable, then we force an update by calling splice
               ko.isObservable(updatedRec) || this.obs.splice(i, 1, updatedRec);
            }
         }
         return i;
      },

      _delete: function(key) {
         var i = this._map.indexOf(key);
         if( i >= 0 ) {
            this.obs.splice(i, 1);
         }
      },

      _local: function(changes) {
         _.each(changes, function(change, key) {
            switch(change.status) {
               case 'create':
                  this.store.create(ko.sync.prepStoreData(change.data, this.store));
                  break;
               case 'update':
                  this.store.update(key, ko.sync.prepStoreData(change.data, this.store));
                  break;
               case 'delete':
                  this.store.delete(key);
                  break;
               case 'move': // nothing to do here
                  break;
               default:
                  throw new Error('Invalid change status: '+change.status);
            }
         }.bind(this));
      },

      _then: function(fn) {
         fn = fn.bind(this);
         this.ready = this.ready.then(function() {
            var d = _.Deferred();
            _.when(fn()).always(d.resolve);
            return d;
         });
         return this;
      }

   });

   function hasChanges(fields, orig, newData) {
      if( !newData ) { return false; }
      return !ko.sync.isEqual(fields, orig, newData);
   }

   function whenLoaded(def) {
      var to = setTimeout(def.resolve, 1000);
      var fn = _.debounce(def.resolve, 100);
      var unresolved = true;
//      def.always(function() {
//         console.log('resolved'); //debug
//      });

      return function() {
         if( to ) {
            clearTimeout(to);
            to = null;
         }
         if( unresolved ) {
            fn();
            unresolved = def.state() === 'pending';
         }
      };
   }

})(window.ko);
/*! Factory.js
 *************************************/
(function () {
   "use strict";
   ko.sync.Factory = Class.extend({
      init: function(store, opts) {
         this.store = store;
         this.opts = opts || {};
      },
      make: function(key, data) {
         var dat = _.pick(data, this.store.getFieldNames());
         if( this.opts.observeFields ) {
            ko.utils.arrayForEach(this.opts.observeFields, function(f) {
               dat[f] = _.isArray(dat[f])? ko.observableArray(dat[f]) : ko.observable(dat[f]);
            });
         }
         if( this.opts.observe ) {
            return ko.observable(dat);
         }
         else {
            return dat;
         }
      }
   });
})();
/*! Index.js
 *************************************/
(function () {
   "use strict";
   ko.sync.KeyMap = function(store, observableArray) {
      this._subs = [];
      this._idx = {};
      this._init(store, observableArray);
   };

   ko.utils.extend(ko.sync.KeyMap.prototype, {
      indexOf: function(key) {
         return key && this.hasKey(key)? this._idx[key] : -1;
      },

      hasKey: function(key) {
         return _.has(this._idx, key);
      },

      _changed: function(changes) {
         var idx = this._idx;
         _.each(changes, function(c, k) {
            switch(c.status) {
               case 'delete':
                  delete idx[k];
                  break;
               case 'create':
               case 'update':
               case 'move':
                  idx[k] = c.idx;
                  break;
               default:
                  throw new Error('Invalid change status: '+ c.status);
            }
         });
      },

      _init: function(store, obsArray) {
         _.each(ko.sync.unwrapAll(obsArray), function(rec, i) {
            this._idx[ store.getKey(rec) ] = i;
         });
         this._subs.push(obsArray.watchChanges(store, this._changed.bind(this)));
      },

      dispose: function() {
         _.each(this._subs, function(s) {s.dispose()});
         this._idx = null;
         this._subs = null;
      }
   });
})();
/*! Store.js
 *************************************/
(function (ko) {
   "use strict";

   /**
    * A Store is any place that the data referenced in knockout can be retrieved from and saved back into.
    * This can be a database connection, localStorage, a third party library, or even an array that you
    * push and pull from. Knockout-sync doesn't care.
    *
    * To create a Store, simply extend ko.sync.Store and implement all the methods below. We're using John Resig's
    * Class inheritance () so put your constructor in the `init` method.
    *
    * For a quick example of a Store, see stores/LocalStore.js
    *
    * All the CRUD methods in Store have the option of returning a value, returning an Error, or returning
    * a Promise (a Deferred object for async lookups). Knockout-sync does all the dirty work, so that if
    * you have the data available you may simply return it immediately without the pretense of wrapping
    * everything in a Promise first.
    *
    * @constructor
    * @interface
    */
   ko.sync.Store = Class.extend({

      /**
       * The key (record id) must somehow be retrievable based on the data in the object that is given to
       * Knockout. The simplest answer is to store the id in the record. However, you could also generate
       * ids by combining values in some meaningful way or looking up the matching record--that's entirely
       * up to you.
       *
       * @param {Object} data  the data record
       * @returns {String}
       */
      getKey: function(data) {
         throw new Error('Implementations must declare getKey method');
      },

      /**
       * Returns a list of fields that are stored in the data record. This is to help with observables that have
       * their own properties attached.
       *
       * @returns {Array}
       */
      getFieldNames: function() {
         throw new Error('Implementations must declare getFieldNames method');
      },

      /**
       * Create a new record in the data Store. In the case that the record already exists, it is up to the Store's
       * discretion on how it should be handled; updating the record or ignoring the create operation are both valid
       * and should work fine, but it should not reject or return an Error.
       *
       * Return an Error or reject the Deferred for failed operations or invalid data.
       *
       * @param {Object} data  the new data record
       * @returns {Deferred|String} returns or resolves to the new record id (key)
       */
      create: function(data) {
         throw new Error('Implementations must declare create method');
      },

      /**
       * Fetch a record from the Store. If it doesn't exist, return null. If this method is called without a key,
       * then the store should load all records and invoke child_added events for them.
       *
       * Reject or return Error for operational errors.
       *
       * @param {String} [key]
       * @returns {Deferred|Object|null} returns or resolves to the record data
       */
      read: function(key) {
         throw new Error('Implementations must declare read method');
      },

      /**
       * Save changes to the Store. Reject or return an Error if the operation fails. If the record does not exist,
       * the Store may return/resolve false or create the record at its discretion. Reject or return an Error if the
       * data is invalid.
       *
       * @param {String} key
       * @param {Object} data
       * @returns {Deferred|String|Error|boolean} returns or resolves to the key (record id)
       */
      update: function(key, data) {
         throw new Error('Implementations must declare update method');
      },

      /**
       * Removes a record from the store. If the record doesn't exist, simply returns the key (behaves exactly
       * as if it was deleted).
       *
       * Reject or return Error if there is a problem with the operation.
       *
       * @param {String} key
       * @returns {Deferred|String} returns or resolves to the key (record id)
       */
      'delete': function(key) {
         throw new Error('Implementations must declare delete method');
      },

      /**
       * Listens for push events from the Store. The possible events are create, update, delete. The callback
       * will always be passed {String}key, {Object}data, and {String}event for every event. An optional
       * {String}prevId may be included with create events.
       *
       * Example:
       * <pre><code>
       *    // monitor both create and delete ops
       *    store.on('create delete', function(key, data, event, prevId) {
       *       alert('record ' + key);
       *    });
       * </code></pre>
       *
       * It is also possible to monitor events for a specific record by passing a key as the second argument. The only
       * valid event for monitoring a record is "update"
       *
       * Example:
       * <pre><code>
       *    // listen to one record only
       *    store.on('update', 'record123', function(key, data) {
       *       // note that the key is still passed to the callback
       *       alert('this record changed');
       *    });
       * </code></pre>
       *
       * Note that when a listener is attached to the 'create' event for the first time, it should immediately receive
       * all records (or in the case that key was passed exactly one record) from the data Store.
       *
       * @param {String} event  space delimited list of events to monitor
       * @param {String} [key] if provided, event defaults to "update"
       * @param {Function} callback
       * @return {Object} with a dispose function that can be invoked to cancel the listener
       */
      on: function(event, key, callback) {
         throw new Error('Implementations must declare on events for add, remove, and change');
      },

      /**
       * Close any opened sockets, connections, and notifications. Perform any cleanup needed in prep
       * for discarding the store and avoiding memory leaks.
       */
      dispose: function() {
         throw new Error('Implementations must declare dispose method');
      }

   });

})(window.ko);
/*! FirebaseStore.js
 *************************************/
(function () {
   "use strict";
   var undefined;

   ko.sync.stores.Firebase = ko.sync.Store.extend({
      init: function(firebaseRef, fieldNames, opts) {
         opts = _.extend({keyField: '_id', sortField: '.priority'}, opts);
         this.fieldNames = fieldNames;
         this.ref  = firebaseRef;
         this.pull = firebaseRef;
         this.kf = opts.keyField;
         this.sf = opts.sortField;
         this.subs = [];
         opts && this._applyOpts(opts);
         this._initRef();
      },

      /**
       * @param {Object} data  the data record
       * @returns {String}
       */
      getKey: function(data) {
         return data && data[this.kf]? data[this.kf] : null;
      },

      /**
       * @returns {Array}
       */
      getFieldNames: function() {
         return this.fieldNames;
      },

      /**
       * @param {Object} data  the new data record
       * @returns {Deferred|String} returns or resolves to the new record id (key)
       */
      create: function(data) {
         return _.Deferred(function(def) {
            if( data === undefined ) {
               def.reject('invalid data (undefined)');
            }
            else {
               var key = this.getKey(data);
               if( key ) {
                  this.update(key, data).done(def.resolve).fail(def.reject);
               }
               else {
                  console.log('Firebase::create', pushData(this.kf, this.sf, data)); //debug
                  var id = this.ref.push(pushData(this.kf, this.sf, data), function(error) {
                     if( error ) { def.reject(error); }
                     else { def.resolve(id, data); }
                  }).name();
               }
            }
         }.bind(this));
      },

      /**
       * @param {String} key
       * @returns {Deferred|Object|null} returns or resolves to the record data
       */
      read: function(key) {
         return _.Deferred(function(def) {
            console.log('Firebase::read', key); //debug
            this.ref.child(key).once('value', function(ss) {
               def.resolve(pullData(this.kf, this.sf, ss.name(), ss.val(), ss.getPriority()));
            }.bind(this), function(error) {
               def.reject(error);
            });
         }.bind(this));
      },

      /**
       * @param {String} key
       * @param {Object} data
       * @returns {Deferred|String|Error|boolean} returns or resolves to the key (record id)
       */
      update: function(key, data) {
         return _.Deferred(function(def) {
            if( data === undefined ) { def.reject('invalid data (undefined)'); }
            else {
               this.ref.child(key).set(pushData(this.kf, this.sf, data), function(error) {
                  if( error ) { def.reject(error); }
                  else { def.resolve(key, data); }
               });
            }
         }.bind(this));
      },

      /**
       * @param {String} key
       * @returns {Deferred|String} returns or resolves to the key (record id)
       */
      'delete': function(key) {
         return _.Deferred(function(def) {
            this.ref.child(key).remove(function(error) {
               if( error ) { def.reject(error); }
               else { def.resolve(key); }
            });
         }.bind(this));
      },

      /**
       * @param {String} event  space delimited list of events to monitor
       * @param {String} [key]
       * @param {Function} callback
       */
      on: function(event, key, callback) {
         if( arguments.length === 3 ) {
            return this._disp(listenRec(this.ref.child(key), this.kf, this.sf, callback));
         }
         else {
            callback = key;
            return this._disp(listenAll(this.pull, event.split(' '), this.kf, this.sf, callback));
         }
      },

      dispose: function() {
         _.each(this.subs, function(s) {s.dispose()});
         this.ref = null;
         this.pull = null;
         this.subs = [];
      },

      _disp: function(cb) {
         this.subs.push(cb);
         return cb;
      },

      _applyOpts: function(opts) {
         if( opts.limit && !_.has(opts, 'endAt') && !_.has(opts, 'startAt') ) {
            this.pull = this.pull.endAt();
         }
         _.each(['limit', 'endAt', 'startAt'], function(o, k) {
            if(_.has(opts, k)) { this.pull = this.pull[k](o); }
         }.bind(this));
      },

      _initRef: function() {
         // must prime ref by downloading children first, otherwise, if someone is listening only for
         // delete events and hasn't first added a create listener, notifications will not arrive
         this.pull.on('child_added', function() {});
      }
   });

   function pullData(keyField, sortField, id, data, pri) {
      if( data === null ) { return data; }
      var out = _.extend({}, data);
      out[keyField] = id;
      if( sortField ) {
         out[sortField] = pri;
      }
      return out;
   }

   function pushData(keyField, sortField, data) {
      var out = _.extend({}, data);
      if( sortField && sortField !== '.priority' ) {
         out['.priority'] = out[sortField] === undefined? null : out[sortField];
         delete out[sortField];
      }
      delete out[keyField];
      return out;
   }

   function mapEvent(event) {
      switch(event) {
         case 'create':
            return 'child_added';
         case 'update':
            return 'child_changed';
         case 'delete':
            return 'child_removed';
         default:
            throw new Error('Invalid event type: '+event);
      }
   }

   function listenRec(ref, keyField, sortField, callback) {
      var fn = ref.on('value', function(ss) {
         var data = pullData(keyField, sortField, ss.name(), ss.val(), ss.getPriority());
         callback(ss.name(), data, 'update');
      });
      return {
         dispose: function() {
            ref.off('value', fn);
         }
      }
   }

   function listenAll(ref, events, keyField, sortField, callback) {
      var subs = [];
      _.each(events, function(e) {
         var mappedEvent = mapEvent(e);
         var fn = ref.on(mappedEvent, function(ss, prevId) {
            callback(ss.name(), pullData(keyField, sortField, ss.name(), ss.val(), ss.getPriority()), e, prevId);
         });
         subs.push(function() {
            ref.off(mappedEvent, fn);
         })
      }.bind(this));
      return {
         dispose: function() {
            _.each(subs, function(sub) { sub(); });
         }
      };
   }
})();