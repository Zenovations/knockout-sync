/*! Knockout Sync - v0.1.0 - 2012-07-05
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


/*******************************************
 *** Standardize support for EcmaScript 5
 ******************************************/

// vim: ts=4 sts=4 sw=4 expandtab
// -- kriskowal Kris Kowal Copyright (C) 2009-2011 MIT License
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License (Narwhal Project)
// -- dantman Daniel Friesen Copyright (C) 2010 XXX TODO License or CLA
// -- fschaefer Florian Schäfer Copyright (C) 2010 MIT License
// -- Gozala Irakli Gozalishvili Copyright (C) 2010 MIT License
// -- kitcambridge Kit Cambridge Copyright (C) 2011 MIT License
// -- kossnocorp Sasha Koss XXX TODO License or CLA
// -- bryanforbes Bryan Forbes XXX TODO License or CLA
// -- killdream Quildreen Motta Copyright (C) 2011 MIT Licence
// -- michaelficarra Michael Ficarra Copyright (C) 2011 3-clause BSD License
// -- sharkbrainguy Gerard Paapu Copyright (C) 2011 MIT License
// -- bbqsrc Brendan Molloy (C) 2011 Creative Commons Zero (public domain)
// -- iwyg XXX TODO License or CLA
// -- DomenicDenicola Domenic Denicola Copyright (C) 2011 MIT License
// -- xavierm02 Montillet Xavier Copyright (C) 2011 MIT License
// -- Raynos Jake Verbaten Copyright (C) 2011 MIT Licence
// -- samsonjs Sami Samhuri Copyright (C) 2010 MIT License
// -- rwldrn Rick Waldron Copyright (C) 2011 MIT License
// -- lexer Alexey Zakharov XXX TODO License or CLA

/*!
 Copyright (c) 2009, 280 North Inc. http://280north.com/
 MIT License. http://github.com/280north/narwhal/blob/master/README.md
 */

// Module systems magic dance
(function (definition) {
   // RequireJS
   if (typeof define == "function") {
      define(definition);
      // CommonJS and <script>
   } else {
      definition();
   }
})(function () {

   /**
    * Brings an environment as close to ECMAScript 5 compliance
    * as is possible with the facilities of erstwhile engines.
    *
    * Annotated ES5: http://es5.github.com/ (specific links below)
    * ES5 Spec: http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf
    * Required reading: http://javascriptweblog.wordpress.com/2011/12/05/extending-javascript-natives/
    */

//
// Function
// ========
//

// ES-5 15.3.4.5
// http://es5.github.com/#x15.3.4.5

   if (!Function.prototype.bind) {
      Function.prototype.bind = function bind(that) { // .length is 1
         // 1. Let Target be the this value.
         var target = this;
         // 2. If IsCallable(Target) is false, throw a TypeError exception.
         if (typeof target != "function") {
            throw new TypeError("Function.prototype.bind called on incompatible " + target);
         }
         // 3. Let A be a new (possibly empty) internal list of all of the
         //   argument values provided after thisArg (arg1, arg2 etc), in order.
         // XXX slicedArgs will stand in for "A" if used
         var args = slice.call(arguments, 1); // for normal call
         // 4. Let F be a new native ECMAScript object.
         // 11. Set the [[Prototype]] internal property of F to the standard
         //   built-in Function prototype object as specified in 15.3.3.1.
         // 12. Set the [[Call]] internal property of F as described in
         //   15.3.4.5.1.
         // 13. Set the [[Construct]] internal property of F as described in
         //   15.3.4.5.2.
         // 14. Set the [[HasInstance]] internal property of F as described in
         //   15.3.4.5.3.
         var bound = function () {

            if (this instanceof bound) {
               // 15.3.4.5.2 [[Construct]]
               // When the [[Construct]] internal method of a function object,
               // F that was created using the bind function is called with a
               // list of arguments ExtraArgs, the following steps are taken:
               // 1. Let target be the value of F's [[TargetFunction]]
               //   internal property.
               // 2. If target has no [[Construct]] internal method, a
               //   TypeError exception is thrown.
               // 3. Let boundArgs be the value of F's [[BoundArgs]] internal
               //   property.
               // 4. Let args be a new list containing the same values as the
               //   list boundArgs in the same order followed by the same
               //   values as the list ExtraArgs in the same order.
               // 5. Return the result of calling the [[Construct]] internal
               //   method of target providing args as the arguments.

               var F = function(){};
               F.prototype = target.prototype;
               var self = new F;

               var result = target.apply(
                  self,
                  args.concat(slice.call(arguments))
               );
               if (Object(result) === result) {
                  return result;
               }
               return self;

            } else {
               // 15.3.4.5.1 [[Call]]
               // When the [[Call]] internal method of a function object, F,
               // which was created using the bind function is called with a
               // this value and a list of arguments ExtraArgs, the following
               // steps are taken:
               // 1. Let boundArgs be the value of F's [[BoundArgs]] internal
               //   property.
               // 2. Let boundThis be the value of F's [[BoundThis]] internal
               //   property.
               // 3. Let target be the value of F's [[TargetFunction]] internal
               //   property.
               // 4. Let args be a new list containing the same values as the
               //   list boundArgs in the same order followed by the same
               //   values as the list ExtraArgs in the same order.
               // 5. Return the result of calling the [[Call]] internal method
               //   of target providing boundThis as the this value and
               //   providing args as the arguments.

               // equiv: target.call(this, ...boundArgs, ...args)
               return target.apply(
                  that,
                  args.concat(slice.call(arguments))
               );

            }

         };
         // XXX bound.length is never writable, so don't even try
         //
         // 15. If the [[Class]] internal property of Target is "Function", then
         //     a. Let L be the length property of Target minus the length of A.
         //     b. Set the length own property of F to either 0 or L, whichever is
         //       larger.
         // 16. Else set the length own property of F to 0.
         // 17. Set the attributes of the length own property of F to the values
         //   specified in 15.3.5.1.

         // TODO
         // 18. Set the [[Extensible]] internal property of F to true.

         // TODO
         // 19. Let thrower be the [[ThrowTypeError]] function Object (13.2.3).
         // 20. Call the [[DefineOwnProperty]] internal method of F with
         //   arguments "caller", PropertyDescriptor {[[Get]]: thrower, [[Set]]:
         //   thrower, [[Enumerable]]: false, [[Configurable]]: false}, and
         //   false.
         // 21. Call the [[DefineOwnProperty]] internal method of F with
         //   arguments "arguments", PropertyDescriptor {[[Get]]: thrower,
         //   [[Set]]: thrower, [[Enumerable]]: false, [[Configurable]]: false},
         //   and false.

         // TODO
         // NOTE Function objects created using Function.prototype.bind do not
         // have a prototype property or the [[Code]], [[FormalParameters]], and
         // [[Scope]] internal properties.
         // XXX can't delete prototype in pure-js.

         // 22. Return F.
         return bound;
      };
   }

// Shortcut to an often accessed properties, in order to avoid multiple
// dereference that costs universally.
// _Please note: Shortcuts are defined after `Function.prototype.bind` as we
// us it in defining shortcuts.
   var call = Function.prototype.call;
   var prototypeOfArray = Array.prototype;
   var prototypeOfObject = Object.prototype;
   var slice = prototypeOfArray.slice;
// Having a toString local variable name breaks in Opera so use _toString.
   var _toString = call.bind(prototypeOfObject.toString);
   var owns = call.bind(prototypeOfObject.hasOwnProperty);

// If JS engine supports accessors creating shortcuts.
   var defineGetter;
   var defineSetter;
   var lookupGetter;
   var lookupSetter;
   var supportsAccessors;
   if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
      defineGetter = call.bind(prototypeOfObject.__defineGetter__);
      defineSetter = call.bind(prototypeOfObject.__defineSetter__);
      lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
      lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
   }

//
// Array
// =====
//

// ES5 15.4.3.2
// http://es5.github.com/#x15.4.3.2
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
   if (!Array.isArray) {
      Array.isArray = function isArray(obj) {
         return _toString(obj) == "[object Array]";
      };
   }

// The IsCallable() check in the Array functions
// has been replaced with a strict check on the
// internal class of the object to trap cases where
// the provided function was actually a regular
// expression literal, which in V8 and
// JavaScriptCore is a typeof "function".  Only in
// V8 are regular expression literals permitted as
// reduce parameters, so it is desirable in the
// general case for the shim to match the more
// strict and common behavior of rejecting regular
// expressions.

// ES5 15.4.4.18
// http://es5.github.com/#x15.4.4.18
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/forEach
   if (!Array.prototype.forEach) {
      Array.prototype.forEach = function forEach(fun /*, thisp*/) {
         var self = toObject(this),
            thisp = arguments[1],
            i = -1,
            length = self.length >>> 0;

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
         }

         while (++i < length) {
            if (i in self) {
               // Invoke the callback function with call, passing arguments:
               // context, property value, property key, thisArg object context
               fun.call(thisp, self[i], i, self);
            }
         }
      };
   }

// ES5 15.4.4.19
// http://es5.github.com/#x15.4.4.19
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
   if (!Array.prototype.map) {
      Array.prototype.map = function map(fun /*, thisp*/) {
         var self = toObject(this),
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
         }

         for (var i = 0; i < length; i++) {
            if (i in self)
               result[i] = fun.call(thisp, self[i], i, self);
         }
         return result;
      };
   }

// ES5 15.4.4.20
// http://es5.github.com/#x15.4.4.20
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
   if (!Array.prototype.filter) {
      Array.prototype.filter = function filter(fun /*, thisp */) {
         var self = toObject(this),
            length = self.length >>> 0,
            result = [],
            value,
            thisp = arguments[1];

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
         }

         for (var i = 0; i < length; i++) {
            if (i in self) {
               value = self[i];
               if (fun.call(thisp, value, i, self)) {
                  result.push(value);
               }
            }
         }
         return result;
      };
   }

// ES5 15.4.4.16
// http://es5.github.com/#x15.4.4.16
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
   if (!Array.prototype.every) {
      Array.prototype.every = function every(fun /*, thisp */) {
         var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
         }

         for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, self)) {
               return false;
            }
         }
         return true;
      };
   }

// ES5 15.4.4.17
// http://es5.github.com/#x15.4.4.17
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
   if (!Array.prototype.some) {
      Array.prototype.some = function some(fun /*, thisp */) {
         var self = toObject(this),
            length = self.length >>> 0,
            thisp = arguments[1];

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
         }

         for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, self)) {
               return true;
            }
         }
         return false;
      };
   }

// ES5 15.4.4.21
// http://es5.github.com/#x15.4.4.21
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce
   if (!Array.prototype.reduce) {
      Array.prototype.reduce = function reduce(fun /*, initial*/) {
         var self = toObject(this),
            length = self.length >>> 0;

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
         }

         // no value to return if no initial value and an empty array
         if (!length && arguments.length == 1) {
            throw new TypeError('reduce of empty array with no initial value');
         }

         var i = 0;
         var result;
         if (arguments.length >= 2) {
            result = arguments[1];
         } else {
            do {
               if (i in self) {
                  result = self[i++];
                  break;
               }

               // if array contains no values, no initial value to return
               if (++i >= length) {
                  throw new TypeError('reduce of empty array with no initial value');
               }
            } while (true);
         }

         for (; i < length; i++) {
            if (i in self) {
               result = fun.call(void 0, result, self[i], i, self);
            }
         }

         return result;
      };
   }

// ES5 15.4.4.22
// http://es5.github.com/#x15.4.4.22
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduceRight
   if (!Array.prototype.reduceRight) {
      Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
         var self = toObject(this),
            length = self.length >>> 0;

         // If no callback function or if callback is not a callable function
         if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
         }

         // no value to return if no initial value, empty array
         if (!length && arguments.length == 1) {
            throw new TypeError('reduceRight of empty array with no initial value');
         }

         var result, i = length - 1;
         if (arguments.length >= 2) {
            result = arguments[1];
         } else {
            do {
               if (i in self) {
                  result = self[i--];
                  break;
               }

               // if array contains no values, no initial value to return
               if (--i < 0) {
                  throw new TypeError('reduceRight of empty array with no initial value');
               }
            } while (true);
         }

         do {
            if (i in this) {
               result = fun.call(void 0, result, self[i], i, self);
            }
         } while (i--);

         return result;
      };
   }

// ES5 15.4.4.14
// http://es5.github.com/#x15.4.4.14
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
   if (!Array.prototype.indexOf) {
      Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
         var self = toObject(this),
            length = self.length >>> 0;

         if (!length) {
            return -1;
         }

         var i = 0;
         if (arguments.length > 1) {
            i = toInteger(arguments[1]);
         }

         // handle negative indices
         i = i >= 0 ? i : Math.max(0, length + i);
         for (; i < length; i++) {
            if (i in self && self[i] === sought) {
               return i;
            }
         }
         return -1;
      };
   }

// ES5 15.4.4.15
// http://es5.github.com/#x15.4.4.15
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf
   if (!Array.prototype.lastIndexOf) {
      Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
         var self = toObject(this),
            length = self.length >>> 0;

         if (!length) {
            return -1;
         }
         var i = length - 1;
         if (arguments.length > 1) {
            i = Math.min(i, toInteger(arguments[1]));
         }
         // handle negative indices
         i = i >= 0 ? i : length - Math.abs(i);
         for (; i >= 0; i--) {
            if (i in self && sought === self[i]) {
               return i;
            }
         }
         return -1;
      };
   }

//
// Object
// ======
//

// ES5 15.2.3.2
// http://es5.github.com/#x15.2.3.2
   if (!Object.getPrototypeOf) {
      // https://github.com/kriskowal/es5-shim/issues#issue/2
      // http://ejohn.org/blog/objectgetprototypeof/
      // recommended by fschaefer on github
      Object.getPrototypeOf = function getPrototypeOf(object) {
         return object.__proto__ || (
            object.constructor
               ? object.constructor.prototype
               : prototypeOfObject
            );
      };
   }

// ES5 15.2.3.3
// http://es5.github.com/#x15.2.3.3
   if (!Object.getOwnPropertyDescriptor) {
      var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a non-object: ";

      Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
         if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT + object);
         }
         // If object does not owns property return undefined immediately.
         if (!owns(object, property)) {
            return;
         }

         // If object has a property then it's for sure both `enumerable` and
         // `configurable`.
         var descriptor =  { enumerable: true, configurable: true };

         // If JS engine supports accessor properties then property may be a
         // getter or setter.
         if (supportsAccessors) {
            // Unfortunately `__lookupGetter__` will return a getter even
            // if object has own non getter property along with a same named
            // inherited getter. To avoid misbehavior we temporary remove
            // `__proto__` so that `__lookupGetter__` will return getter only
            // if it's owned by an object.
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;

            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);

            // Once we have getter and setter we can put values back.
            object.__proto__ = prototype;

            if (getter || setter) {
               if (getter) {
                  descriptor.get = getter;
               }
               if (setter) {
                  descriptor.set = setter;
               }
               // If it was accessor property we're done and return here
               // in order to avoid adding `value` to the descriptor.
               return descriptor;
            }
         }

         // If we got this far we know that object has an own property that is
         // not an accessor so we set it as a value and return descriptor.
         descriptor.value = object[property];
         return descriptor;
      };
   }

// ES5 15.2.3.4
// http://es5.github.com/#x15.2.3.4
   if (!Object.getOwnPropertyNames) {
      Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
         return Object.keys(object);
      };
   }

// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
   if (!Object.create) {
      Object.create = function create(prototype, properties) {
         var object;
         if (prototype === null) {
            object = { "__proto__": null };
         } else {
            if (typeof prototype != "object") {
               throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            }
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            // IE has no built-in implementation of `Object.getPrototypeOf`
            // neither `__proto__`, but this manually setting `__proto__` will
            // guarantee that `Object.getPrototypeOf` will work as expected with
            // objects created using `Object.create`
            object.__proto__ = prototype;
         }
         if (properties !== void 0) {
            Object.defineProperties(object, properties);
         }
         return object;
      };
   }

// ES5 15.2.3.6
// http://es5.github.com/#x15.2.3.6

// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//     http://msdn.microsoft.com/en-us/library/dd282900.aspx
//     http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//     https://bugs.webkit.org/show_bug.cgi?id=36423

   function doesDefinePropertyWork(object) {
      try {
         Object.defineProperty(object, "sentinel", {});
         return "sentinel" in object;
      } catch (exception) {
         // returns falsy
      }
   }

// check whether defineProperty works if it's given. Otherwise,
// shim partially.
   if (Object.defineProperty) {
      var definePropertyWorksOnObject = doesDefinePropertyWork({});
      var definePropertyWorksOnDom = typeof document == "undefined" ||
         doesDefinePropertyWork(document.createElement("div"));
      if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
         var definePropertyFallback = Object.defineProperty;
      }
   }

   if (!Object.defineProperty || definePropertyFallback) {
      var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
      var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
      var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
         "on this javascript engine";

      Object.defineProperty = function defineProperty(object, property, descriptor) {
         if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
         }
         if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null) {
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);
         }
         // make a valiant attempt to use the real defineProperty
         // for I8's DOM elements.
         if (definePropertyFallback) {
            try {
               return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
               // try the shim if the real one doesn't work
            }
         }

         // If it's a data property.
         if (owns(descriptor, "value")) {
            // fail silently if "writable", "enumerable", or "configurable"
            // are requested but not supported
            /*
             // alternate approach:
             if ( // can't implement these features; allow false but not true
             !(owns(descriptor, "writable") ? descriptor.writable : true) ||
             !(owns(descriptor, "enumerable") ? descriptor.enumerable : true) ||
             !(owns(descriptor, "configurable") ? descriptor.configurable : true)
             )
             throw new RangeError(
             "This implementation of Object.defineProperty does not " +
             "support configurable, enumerable, or writable."
             );
             */

            if (supportsAccessors && (lookupGetter(object, property) ||
               lookupSetter(object, property)))
            {
               // As accessors are supported only on engines implementing
               // `__proto__` we can safely override `__proto__` while defining
               // a property to make sure that we don't hit an inherited
               // accessor.
               var prototype = object.__proto__;
               object.__proto__ = prototypeOfObject;
               // Deleting a property anyway since getter / setter may be
               // defined on object itself.
               delete object[property];
               object[property] = descriptor.value;
               // Setting original `__proto__` back now.
               object.__proto__ = prototype;
            } else {
               object[property] = descriptor.value;
            }
         } else {
            if (!supportsAccessors) {
               throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            }
            // If we got that far then getters and setters can be defined !!
            if (owns(descriptor, "get")) {
               defineGetter(object, property, descriptor.get);
            }
            if (owns(descriptor, "set")) {
               defineSetter(object, property, descriptor.set);
            }
         }
         return object;
      };
   }

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
   if (!Object.defineProperties) {
      Object.defineProperties = function defineProperties(object, properties) {
         for (var property in properties) {
            if (owns(properties, property) && property != "__proto__") {
               Object.defineProperty(object, property, properties[property]);
            }
         }
         return object;
      };
   }

// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
   if (!Object.seal) {
      Object.seal = function seal(object) {
         // this is misleading and breaks feature-detection, but
         // allows "securable" code to "gracefully" degrade to working
         // but insecure code.
         return object;
      };
   }

// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
   if (!Object.freeze) {
      Object.freeze = function freeze(object) {
         // this is misleading and breaks feature-detection, but
         // allows "securable" code to "gracefully" degrade to working
         // but insecure code.
         return object;
      };
   }

// detect a Rhino bug and patch it
   try {
      Object.freeze(function () {});
   } catch (exception) {
      Object.freeze = (function freeze(freezeObject) {
         return function freeze(object) {
            if (typeof object == "function") {
               return object;
            } else {
               return freezeObject(object);
            }
         };
      })(Object.freeze);
   }

// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
   if (!Object.preventExtensions) {
      Object.preventExtensions = function preventExtensions(object) {
         // this is misleading and breaks feature-detection, but
         // allows "securable" code to "gracefully" degrade to working
         // but insecure code.
         return object;
      };
   }

// ES5 15.2.3.11
// http://es5.github.com/#x15.2.3.11
   if (!Object.isSealed) {
      Object.isSealed = function isSealed(object) {
         return false;
      };
   }

// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
   if (!Object.isFrozen) {
      Object.isFrozen = function isFrozen(object) {
         return false;
      };
   }

// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
   if (!Object.isExtensible) {
      Object.isExtensible = function isExtensible(object) {
         // 1. If Type(O) is not Object throw a TypeError exception.
         if (Object(object) !== object) {
            throw new TypeError(); // TODO message
         }
         // 2. Return the Boolean value of the [[Extensible]] internal property of O.
         var name = '';
         while (owns(object, name)) {
            name += '?';
         }
         object[name] = true;
         var returnValue = owns(object, name);
         delete object[name];
         return returnValue;
      };
   }

// ES5 15.2.3.14
// http://es5.github.com/#x15.2.3.14
   if (!Object.keys) {
      // http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
      var hasDontEnumBug = true,
         dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
         ],
         dontEnumsLength = dontEnums.length;

      for (var key in {"toString": null}) {
         hasDontEnumBug = false;
      }

      Object.keys = function keys(object) {

         if ((typeof object != "object" && typeof object != "function") || object === null) {
            throw new TypeError("Object.keys called on a non-object");
         }

         var keys = [];
         for (var name in object) {
            if (owns(object, name)) {
               keys.push(name);
            }
         }

         if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
               var dontEnum = dontEnums[i];
               if (owns(object, dontEnum)) {
                  keys.push(dontEnum);
               }
            }
         }
         return keys;
      };

   }

//
// Date
// ====
//

// ES5 15.9.5.43
// http://es5.github.com/#x15.9.5.43
// This function returns a String value represent the instance in time
// represented by this Date object. The format of the String is the Date Time
// string format defined in 15.9.1.15. All fields are present in the String.
// The time zone is always UTC, denoted by the suffix Z. If the time value of
// this object is not a finite Number a RangeError exception is thrown.
   if (!Date.prototype.toISOString || (new Date(-62198755200000).toISOString().indexOf('-000001') === -1)) {
      Date.prototype.toISOString = function toISOString() {
         var result, length, value, year;
         if (!isFinite(this)) {
            throw new RangeError("Date.prototype.toISOString called on non-finite value.");
         }

         // the date time string format is specified in 15.9.1.15.
         result = [this.getUTCMonth() + 1, this.getUTCDate(),
            this.getUTCHours(), this.getUTCMinutes(), this.getUTCSeconds()];
         year = this.getUTCFullYear();
         year = (year < 0 ? '-' : (year > 9999 ? '+' : '')) + ('00000' + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);

         length = result.length;
         while (length--) {
            value = result[length];
            // pad months, days, hours, minutes, and seconds to have two digits.
            if (value < 10) {
               result[length] = "0" + value;
            }
         }
         // pad milliseconds to have three digits.
         return year + "-" + result.slice(0, 2).join("-") + "T" + result.slice(2).join(":") + "." +
            ("000" + this.getUTCMilliseconds()).slice(-3) + "Z";
      }
   }

// ES5 15.9.4.4
// http://es5.github.com/#x15.9.4.4
   if (!Date.now) {
      Date.now = function now() {
         return new Date().getTime();
      };
   }

// ES5 15.9.5.44
// http://es5.github.com/#x15.9.5.44
// This function provides a String representation of a Date object for use by
// JSON.stringify (15.12.3).
   if (!Date.prototype.toJSON) {
      Date.prototype.toJSON = function toJSON(key) {
         // When the toJSON method is called with argument key, the following
         // steps are taken:

         // 1.  Let O be the result of calling ToObject, giving it the this
         // value as its argument.
         // 2. Let tv be ToPrimitive(O, hint Number).
         // 3. If tv is a Number and is not finite, return null.
         // XXX
         // 4. Let toISO be the result of calling the [[Get]] internal method of
         // O with argument "toISOString".
         // 5. If IsCallable(toISO) is false, throw a TypeError exception.
         if (typeof this.toISOString != "function") {
            throw new TypeError('toISOString property is not callable');
         }
         // 6. Return the result of calling the [[Call]] internal method of
         //  toISO with O as the this value and an empty argument list.
         return this.toISOString();

         // NOTE 1 The argument is ignored.

         // NOTE 2 The toJSON function is intentionally generic; it does not
         // require that its this value be a Date object. Therefore, it can be
         // transferred to other kinds of objects for use as a method. However,
         // it does require that any such object have a toISOString method. An
         // object is free to use the argument key to filter its
         // stringification.
      };
   }

// ES5 15.9.4.2
// http://es5.github.com/#x15.9.4.2
// based on work shared by Daniel Friesen (dantman)
// http://gist.github.com/303249
   if (!Date.parse || Date.parse("+275760-09-13T00:00:00.000Z") !== 8.64e15) {
      // XXX global assignment won't work in embeddings that use
      // an alternate object for the context.
      Date = (function(NativeDate) {

         // Date.length === 7
         var Date = function Date(Y, M, D, h, m, s, ms) {
            var length = arguments.length;
            if (this instanceof NativeDate) {
               var date = length == 1 && String(Y) === Y ? // isString(Y)
                  // We explicitly pass it through parse:
                  new NativeDate(Date.parse(Y)) :
                  // We have to manually make calls depending on argument
                  // length here
                  length >= 7 ? new NativeDate(Y, M, D, h, m, s, ms) :
                     length >= 6 ? new NativeDate(Y, M, D, h, m, s) :
                        length >= 5 ? new NativeDate(Y, M, D, h, m) :
                           length >= 4 ? new NativeDate(Y, M, D, h) :
                              length >= 3 ? new NativeDate(Y, M, D) :
                                 length >= 2 ? new NativeDate(Y, M) :
                                    length >= 1 ? new NativeDate(Y) :
                                       new NativeDate();
               // Prevent mixups with unfixed Date object
               date.constructor = Date;
               return date;
            }
            return NativeDate.apply(this, arguments);
         };

         // 15.9.1.15 Date Time String Format.
         var isoDateExpression = new RegExp("^" +
            "(\\d{4}|[\+\-]\\d{6})" + // four-digit year capture or sign + 6-digit extended year
            "(?:-(\\d{2})" + // optional month capture
            "(?:-(\\d{2})" + // optional day capture
            "(?:" + // capture hours:minutes:seconds.milliseconds
            "T(\\d{2})" + // hours capture
            ":(\\d{2})" + // minutes capture
            "(?:" + // optional :seconds.milliseconds
            ":(\\d{2})" + // seconds capture
            "(?:\\.(\\d{3}))?" + // milliseconds capture
            ")?" +
            "(?:" + // capture UTC offset component
            "Z|" + // UTC capture
            "(?:" + // offset specifier +/-hours:minutes
            "([-+])" + // sign capture
            "(\\d{2})" + // hours offset capture
            ":(\\d{2})" + // minutes offset capture
            ")" +
            ")?)?)?)?" +
            "$");

         // Copy any custom methods a 3rd party library may have added
         for (var key in NativeDate) {
            Date[key] = NativeDate[key];
         }

         // Copy "native" methods explicitly; they may be non-enumerable
         Date.now = NativeDate.now;
         Date.UTC = NativeDate.UTC;
         Date.prototype = NativeDate.prototype;
         Date.prototype.constructor = Date;

         // Upgrade Date.parse to handle simplified ISO 8601 strings
         Date.parse = function parse(string) {
            var match = isoDateExpression.exec(string);
            if (match) {
               match.shift(); // kill match[0], the full match
               // parse months, days, hours, minutes, seconds, and milliseconds
               for (var i = 1; i < 7; i++) {
                  // provide default values if necessary
                  match[i] = +(match[i] || (i < 3 ? 1 : 0));
                  // match[1] is the month. Months are 0-11 in JavaScript
                  // `Date` objects, but 1-12 in ISO notation, so we
                  // decrement.
                  if (i == 1) {
                     match[i]--;
                  }
               }

               // parse the UTC offset component
               var minuteOffset = +match.pop(), hourOffset = +match.pop(), sign = match.pop();

               // compute the explicit time zone offset if specified
               var offset = 0;
               if (sign) {
                  // detect invalid offsets and return early
                  if (hourOffset > 23 || minuteOffset > 59) {
                     return NaN;
                  }

                  // express the provided time zone offset in minutes. The offset is
                  // negative for time zones west of UTC; positive otherwise.
                  offset = (hourOffset * 60 + minuteOffset) * 6e4 * (sign == "+" ? -1 : 1);
               }

               // Date.UTC for years between 0 and 99 converts year to 1900 + year
               // The Gregorian calendar has a 400-year cycle, so
               // to Date.UTC(year + 400, .... ) - 12622780800000 == Date.UTC(year, ...),
               // where 12622780800000 - number of milliseconds in Gregorian calendar 400 years
               var year = +match[0];
               if (0 <= year && year <= 99) {
                  match[0] = year + 400;
                  return NativeDate.UTC.apply(this, match) + offset - 12622780800000;
               }

               // compute a new UTC date value, accounting for the optional offset
               return NativeDate.UTC.apply(this, match) + offset;
            }
            return NativeDate.parse.apply(this, arguments);
         };

         return Date;
      })(Date);
   }

//
// String
// ======
//

// ES5 15.5.4.20
// http://es5.github.com/#x15.5.4.20
   var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
      "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
      "\u2029\uFEFF";
   if (!String.prototype.trim || ws.trim()) {
      // http://blog.stevenlevithan.com/archives/faster-trim-javascript
      // http://perfectionkills.com/whitespace-deviations/
      ws = "[" + ws + "]";
      var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
         trimEndRegexp = new RegExp(ws + ws + "*$");
      String.prototype.trim = function trim() {
         if (this === undefined || this === null) {
            throw new TypeError("can't convert "+this+" to object");
         }
         return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
      };
   }

//
// Util
// ======
//

// ES5 9.4
// http://es5.github.com/#x9.4
// http://jsperf.com/to-integer
   var toInteger = function (n) {
      n = +n;
      if (n !== n) { // isNaN
         n = 0;
      } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
         n = (n > 0 || -1) * Math.floor(Math.abs(n));
      }
      return n;
   };

   var prepareString = "a"[0] != "a";
   // ES5 9.9
   // http://es5.github.com/#x9.9
   var toObject = function (o) {
      if (o == null) { // this matches both null and undefined
         throw new TypeError("can't convert "+o+" to object");
      }
      // If the implementation doesn't support by-index access of
      // string characters (ex. IE < 9), split the string
      if (prepareString && typeof o == "string" && o) {
         return o.split("");
      }
      return Object(o);
   };
});
/*******************************************
 * jQuery-Sequence - v0.2.1 - 2012-07-03
 * https://github.com/katowulf/jquery-sequence
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function($) {
   "use strict";

   var undef;

   var Sequence = $.Sequence = function() {
      this.master     = $.Deferred();               // the master Deferred object which will resolve after calling end()
      this.returnVals = [];                         // results from all steps as they are fulfilled
      this.fxns       = {};                         // stored here by register() method for use in run()
      this.last       = $.Deferred().resolve(this); // a dummy placeholder, to get the ball rolling
      this.shared     = { pauseEvent: false, abortEvent: false, lastIf: undef };

      // make wait() available via run() and if() methods
      var shared = this.shared;
      this.fxns.wait  = _wrapFx(shared, function(milliseconds, prevStep) {
         var def = $.Deferred();
         _waitFor(milliseconds).then(function() {
            _resolve(def, shared, [prevStep]);
         });
         return def;
      }, {prevPos: 1});
   };

   /** @constant used as a placeholder for the callback in a list of arguments */
   Sequence.CB = new Object();
   /** @constant used as a placeholder for the prior step's returned value in a list of arguments  */
   Sequence.PREV = new Object();
   /** @constant used as a placeholder for an error callback in a list of arguments */
   Sequence.ERR = new Object();

   /**
    * Just a simple Factory-like abstraction, since in most cases, we don't want to hold onto the Sequence object but just
    * get a new one to chain commands. Additionally, it reinforces the start/end metaphor.
    *
    * See handle() and run() methods for sample usages of Sequence.start().
    *
    * An optional list of commands may be passed into start(), which will be registered with `register`. If the value
    * of any key is an object, then the `fxn` key represents the function to register and the rest of the object is
    * passed as the `opts` parameter to register().
    *
    * Examples:
    * <code>
    *    $.Sequence.start({
    *       returnFx: function() { return 'Mark'; },
    *       callbackFx:    {
    *          fxn: function(callback, retVal) { callback('goodbye '+retVal); },
    *          cbPos: 0, prevPos: 1
    *       }
    *    })
    *    .run('returnFx')
    *    .run('callbackFx')
    *    .end()
    *    .done(function(v) { ... }) // [ 'Mark', 'goodbye Mark' ]
    * </code>
    *
    * @static
    * @param {object} [fxns] if a hash is provided, then each entry is passed to `register` (see above)
    * @param {int}    [timeout] abort the sequence if timeout is reached
    * @return {Sequence}
    */
   Sequence.start = function(fxns, timeout) {
      var seq = new Sequence(), parms = _startParms($.makeArray(arguments));
      fxns && _registerAll(seq, parms.fxns);

      if( parms.timeout ) {
         var timeoutRef = setTimeout(function() {
            seq.abort('timeout exceeded');
            timeoutRef = null;
         }, parms.timeout);

         seq.master.always(function() {
            if( timeoutRef ) { clearTimeout(timeoutRef); timeoutRef = null; }
         });
      }
      return seq;
   };

   /**
    * Wait a specified length before invoking the next step of the sequence (just a good ole fashion sleep() method). This
    * Does not add any values to the array of results received after end() is called. The result of the previous step
    * is passed on to the next step as if wait() wasn't in the middle.
    *
    * @param {int} milliseconds
    * @return {Sequence}
    */
   Sequence.prototype.wait = function(milliseconds) {
      var prev = this.last, def = this.last = $.Deferred(), shared = this.shared;
      prev.then(function() {
         var args = $.makeArray(arguments);
         _waitFor(milliseconds).then(function() {
            _resolve(def, shared, args);
         });
      }, function() {
         def.reject.apply(def, _result(arguments));
      });
      return this;
   };

   /**
    * Call `fx`, which represents any function that invokes a callback on completion. Any number of arguments
    * may be passed to `fx` by simply including them after the function to be executed.
    *
    * This is intended for single uses. To call methods repeatedly, check out register() and run().
    *
    * The special constant Sequence.CB is used to specify where in the arguments the callback should appear. If it is not
    * found, then the callback is placed first. Examples:
    * <code>
    *    Sequence.start()
    *       .handle( fx );                    // fx( callback )
    *       .handle( fx, Sequence.CB, 'a', 'b' ) // fx( callback, 'a', 'b' )
    *       .handle( fx, 'a', 'b' )           // fx( 'a', 'b', callback )
    *       .handle( fx, 'a', Sequence.CB, 'b' ) // fx( 'a', callback, 'b' )
    * </code>
    *
    * If `scope` is provided, then inside fx, `this` will refer to scope.
    * <code>
    *    function Color(c) { this.color = c; }
    *    var col   = new Color('red');
    *    var sequence = new Sequence();
    *
    *    Sequence.start().handle(col, function(callback) {
    *       callback(this.color); // 'red'
    *    });
    * </code>
    *
    * The return value of any previous step in the sequence can be accessed using the placeholder Sequence.PREV, which behaves
    * much like Sequence.CB. Unlike Sequence.CB, it must exist and there is no default behavior if it is not included.
    *
    * Examples:
    * <code>
    *    // a simple callback structure
    *    function add(callback, base, amt) {
    *       setTimeout( function() { callback( base + amt ); }, 100 );
    *    }
    *
    *    // something with a little more configuration
    *    function subtract(amt, from, callback) {
    *       setTimeout( function() { callback( from - amt ); }, 200 );
    *    }
    *
    *    Sequence.start()
    *       .handle( add, 0, 1 );                        // 1
    *       .handle( add, Sequence.PREV, 1 )                // 2
    *       .handle( add, Sequence.PREV, 3 )                // 5
    *       .handle( subtract, 1, Sequence.PREV, Sequence.CB ) // 4
    *       .handle( subtract, 3, Sequence.PREV, Sequence.CB ) // 1
    *       .end()
    *       .done(...);                                  // [1, 2, 5, 4, 1]
    * </code>
    *
    * Instead of using Sequence.CB as a placeholder, we can also splice the callback in, or drop it into an
    * existing argument using the following keys in `opts`.
    *
    * Likewise, instead of using Sequence.PREV as a placeholder, we can also splice the return value in, or drop it
    * into an existing argument using the following keys in `opts`.
    *
    * The special `defaults` array can override any undefined arguments passed in.
    *
    * Last but not least, some methods include a success callback and an error callback. The special placeholder
    * Sequence.ERR can be used to insert an error callback into the arguments. And, of course, it can be specified in
    * `opts`:
    *
    * All possible keys in the `opts` hash:
    * <ul>
    *    <li>{int}        prevPos   which position will return value be spliced into? 0 represents the first
    *                               argument passed to `fx`</li>
    *    <li>{int|string} prevKey   instead of splicing return value into args, insert it into existing
    *                               object/array at `prevPos`, when using an array, the value is not spliced in, but
    *                               rather, the value at prevKey is replaced</li>
    *    <li>{int}        cbPos     which position will the callback be spliced into? 0 represents the first
    *                               argument passed to `fx`</li>
    *    <li>{int|string} cbKey     instead of splicing callback into args, insert it into existing object/array
    *                               at `cbPos`, when using an array, the value is not spliced in, but
    *                               rather, the value at prevKey is replaced</li>
    *    <li>{array}      defaults  any undefined|null argument is replaced with the default; this can also be used for
    *                               prev step's return value on the first iteration (i.e. when there is no previous step)</li>
    *    <li>{int}        errPos   which position will the error callback be spliced into? 0 represents the first argument passed to `fx`</li>
    *    <li>{int|string} errKey   instead of splicing error callback into args, insert it into existing object/array at `cbPos`</li>
    * </ul>
    *
    * Examples:
    * <code>
    *    function goToDisneyland( numberOfPeople, date, callback ) {
    *       var cost = 20.00;
    *       var dateString = date.toString('MM/dd/YYYY');
    *       callback( "Taking "+numberOfPeople+" to Disneyland on "+dateString+" will cost $"+(numberOfPeople*cost) );
    *    }
    *
    *    function goHome( opts ) {
    *       opts.callback( opts.message );
    *    }
    *
    *    function goToStore( callback, opts ) {
    *       callback( opts[0] + opts[1] );
    *    }
    *
    *    // splice callback and return value into arguments via the `opts` config parms
    *    Sequence.start()
    *       .wrap(function() { return new Date(2999, 01, 01) }) // get a return value to use in our example
    *       .handle( {cbPos: 2, prevPos: 1}, goToDisneyland, 10 )
    *       .end().done( alert ); // alerts: "Taking 10 people to Disneyland on 01/01/2999 will cost $200"
    *
    *    // put callback into an existing object
    *    Sequence.start().handle( {cbPos: 0, cbKey: callback}, goHome, {message: 'I am tired'} )
    *         .then(...); // 'I am tired'
    *
    *    // put return value into an existing array
    *    Sequence.start()
    *         .wrap( function() {return '$20.00'} )
    *         .handle( {prevPos: 1, prevKey: 1}, goToStore, ['I have '] )
    *         .then(...); // 'I have $20.00'
    * </code>
    *
    * Note that, in the case of an array, a new index is spliced into the array (there is no placeholder)
    *
    * @param {Object}    [scope]  the `this` context for fx, is provided
    * @param {Object}    [opts]   see description
    * @param {Function}  fx       the function to execute, which accepts a callback
    * @return {Sequence}
    */
   Sequence.prototype.handle = function(scope, opts, fx) {
      var parms = _parms(arguments);
      this.last = _ex(this.returnVals, this.master, this.last, _wrapFx(this.shared, parms.fx, parms.opts, true), parms.scope, parms.args, this.shared);
      return this;
   };

   /**
    * Run any function added with register() (see register() for examples and details).
    *
    * Use this method when a scope must be set on the call (i.e. set `this` inside the function). Otherwise,
    * simply call the methods directly with Sequence.methodName(...).
    *
    * @param {Object}  [scope]
    * @param {string}  fxnName
    * @return {Sequence}
    */
   Sequence.prototype.run = function(scope, fxnName) {
      var args = $.makeArray(arguments);
      scope = (typeof(args[0]) === 'object')? args.shift() : null;
      fxnName = args.shift();
      if( !(fxnName in this.fxns) ) { throw new Error('invalid function name "'+fxnName+'" (did you forget to call register?)'); }
      this.last = _ex(this.returnVals, this.master, this.last, this.fxns[fxnName], scope, args, this.shared);
      return this;
   };
   $.Sequence.prototype._ = $.Sequence.prototype.run;

   /**
    * Register a chained method which may then be executed multiple times by calling Sequence.methodName(...). To
    * set `this` inside the function (i.e. declare the scope) the special run() method may be used by calling
    * Sequence.run(scopeObject, methodName, ...) or simply Sequence._(scopeObject, methodName, ...)
    *
    * The `opts` hash may contain any of the following:
    *    {int}        cbPos     a callback is spliced into the arguments at this position, if this is not present,
    *                           then the return value is used and cbKey/errPos/errKey are ignored
    *    {string|int} cbKey     if specified, this alters the behavior of `cbPos`;
    *                           the callback is added into an object/array instead of spliced into args
    *                           for arrays, the value at cbKey is replaced (not spliced in)
    *    {int}        prevPos   if specified, the return value of previous function in sequence is spliced into args at this position
    *    {string|int} prevKey   if specified, this alters the behavior of `prevPos`;
    *                           the return value is added into an object/array instead of spliced into args,
    *                           for an array, the value at prevKey is replaced (not spliced in)
    *    {int}        errPos    if specified, an error callback is spliced into args at this position
    *    {string|int} errKey    if specified, inserts error callback into object/array at errPos instead of splicing it
    *    {array}      defaults  any undefined|null argument is replaced with the default; this can also be used for
    *                           prev step's return value on the first iteration (i.e. when there is no previous step)
    *
    * The cbPos is critical for determining how the method is used. If the method executes a callback, then cbPos
    * tells us where the callback is and the behavior is similar to Sequence.handle().
    *
    * However, if cbPos is not specified, then calls behave like Sequence.wrap() and use the return value. If the return
    * value is an Error, then the method is considered unsuccessful. Otherwise, even if it is undefined, then
    * it is a success. Note that the return value can also be a jQuery.Deferred (i.e. a promise). In this case,
    * it is monitored and when it is fulfilled then the resolve/reject value is used.
    *
    * The `errPos` and `errKey` options are only utilized if cbPos exists (we must declare a success callback if a
    * callback is to be used, otherwise, only the return value is evaluated).
    *
    * If an Error is thrown, regardless of return value or callback approach, then the chain is broken
    * immediately and error handlers are notified.
    *
    * Examples:
    * <code>
    *   function TestScope() {
    *      this.multiply = function(callback, a, b) {
    *         setTimeout( function() { callback( a * b ); }, 100 );
    *      }
    *   }
    *   var testScope = new TestScope();
    *
    *   Sequence.start()
    *      // register some functions
    *      .register( 'add', function(a, b) { return a + b; }, { defaults: [ 0, 1 ], prevPos: 0 } )
    *      .register( 'sum',
    *         function(callback, a, b) { return this.multiply(callback, a, b); },
    *         { cbPos: 0, prevPos: 2 } )
    *
    *      // now run them a bunch
    *      .add()          // 1  ( default=0,     default=1 )
    *      .add(3)         // 4  ( returnValue=1, arg=3 )
    *      .add()          // 5  ( returnValue=4, default=1 )
    *
    *      .run(testScope, 'sum', 5) // 25 `this` is set to testScope! ( returnValue=5, arg=5 )
    *      .end()
    *      .done(function(v) { console.log('done', v); })
    *      .fail(function(e) { console.error('fail() should not run', e); })
    *      .always(function(v) {
    *         console.log('always', v);
    *      });
    * </code>
    *
    * If the method names conflict then an Error is thrown and the sequence will be aborted, so it's important to
    * make sure they are unique.
    *
    * @param {string}     fxName
    * @param {function}   fx
    * @param {object|int} [opts] see desc
    * @return {Sequence}
    */
   Sequence.prototype.register = function(fxName, fx, opts) {
      opts = $.extend({}, opts);

      if( (fxName in this) ) {
         throw new Error(fxName+' already exists in Sequence, it cannot be overwritten by register() :(');
      }

      // add an alias which simply calls run()
      this[fxName] = function() {
         return this.run.apply(this, [fxName].concat($.makeArray(arguments)));
      };

      // store in the `fxns` hash for use with run()
      this.fxns[fxName] = _wrapFx(this.shared, fx, opts, ('cbPos' in opts)); // _altParms() is coupled to this call to _wrapFx()

      return this;
   };

   /**
    * Wrap `fx`, which returns a value instead of invoking a callback, and continue the sequence. Any number of arguments
    * may be passed after `fx`, which are passed to the method when it is invoked.
    *
    * If `fk` returns a jQuery.Deferred.promise() object, then it will be resolved before the sequence continues. Any other
    * value is treated as already resolved and we continue immediately. If `fx` throws or returns an error, then
    * the chain is broken (fail() listeners are called, done() listeners are never notified)
    *
    * The return value of any previous step in the sequence can be accessed using the placeholder Sequence.PREV.
    *
    * Examples:
    * <code>
    *    // returns a + b for fun and profit
    *    function add(a, b) {
    *       return a+b;
    *    }
    *
    *    // returns a promise object that will add a + b at some time in the future
    *    function promise(a, b) {
    *       var def = $.Deferred();
    *       setTimeout(function() {
    *          def.resolve(a + b); // but gets added later
    *       }, 500);
    *       return def.promise(); // returns immediately
    *    }
    *
    *    Sequence.start()
    *       .wrap( add, 0, 1 );             // 1
    *       .wrap( add, Sequence.PREV, 1 )     // 2
    *       .wrap( add, Sequence.PREV, 3 )     // 5
    *       .wrap( promise, Sequence.PREV, 1 ) // 6
    *       .wrap( promise, Sequence.PREV, 2 ) // 8
    *       .end()
    *       .done(...);                     // [1, 2, 5, 6, 8]
    * </code>
    *
    * Instead of using Sequence.PREV as a placeholder, we can also splice the return value in, or drop it into
    * an existing argument using the following keys in `opts`:
    * <ul>
    *    <li>{int}        prevPos   which position will return value be spliced into?
    *                               0 represents the first argument passed to `fx`</li>
    *    <li>{int|string} prevKey   instead of splicing return value into args,
    *                               insert it into existing object/array at `prevPos`,
    *                               for arrays, the value at prevKey is replaced, not spliced in</li>
    * </ul>
    *
    * Examples:
    * <code>
    *    function goToDisneyland( numberOfPeople, date ) {
    *       var cost = 20.00;
    *       return "Taking "+numberOfPeople+" to Disneyland on "+date+" will cost $"+(numberOfPeople*cost);
    *    }
    *
    *    // splice callback and return value into arguments via the `opts` config parms
    *    Sequence.start()
    *       .wrap(function() { return '01/01/2999' }) // a date to pass to the next step
    *       .wrap( {prevPos: 1}, goToDisneyland, 10 ) // inserts prev steps result at pos 1 (after 10)
    *       .then(...);                               // "Taking 10 people to Disneyland on 01/01/2999 will cost $200"
    * </code>
    *
    * @param {Object}   [scope] inside `fx`, `this` will be set to whatever is provided here
    * @param {Object}   [opts]  see description
    * @param {function} fx
    * @return {Sequence}
    */
   Sequence.prototype.wrap = function(scope, opts, fx) {
      var parms = _parms(arguments);
      this.last = _ex(this.returnVals, this.master, this.last, _wrapFx(this.shared, parms.fx, parms.opts, false), parms.scope, parms.args, this.shared);
      return this;
   };

   /**
    * Get the results of the previous step from sequence (once it resolves) and do something with it outside of the
    * sequence.
    *
    * This is a method of obtaining a single result from the sequence rather than waiting for the entire sequence to
    * complete. This call is not part of the sequence and the return value is ignored. Async calls within these functions
    * do not delay execution of the next step.
    *
    * Exceptions thrown by `fx` are caught, since they would prevent end/done/fail/always from being invoked.
    * However, they are discarded silently, so do not attempt to use then() to do anything that should break the
    * sequence if it fails.
    *
    * Examples:
    * <code>
    *    Sequence.start()
    *         .wrap( function() { return true; } )
    *         .then(...)                             // 'true'
    *         .then( function() { return false; } )  // return value is ignored
    *         .then(...)                             // 'true'
    *
    *         .then( function() {
    *             throw new Error('oops');            // this is caught and discarded
    *         })
    *
    *         .wrap( ... )                            // this gets run
    *         .handle( ... )                          // this gets run
    *         .done( ... )                            // this gets run
    *
    *         .fail( ... );                           // this does not get invoked
    * </code>
    *
    * Just like jQuery.Deferred, then() accepts an error handler as well:
    * <code>
    *    function resolve() { alert('success'); }
    *    function reject()  { alert('failed'); }
    *
    *    Sequence.start()
    *         .wrap( function() { return true; })
    *         .then( resolve, reject ) // 'success'
    *
    *         .wrap( function() { throw new Error('oops'); })
    *         .then( resolve, reject ); // 'failed'
    *
    *         // final results
    *         .done( ... ) // 'true'
    *         .fail( ... ) // never called!
    * </code>
    *
    * @param {function} fx
    * @param {function} errFx
    * @return {Sequence}
    */
   Sequence.prototype.then = function( fx, errFx ) {
      this.last.then(_catch(fx), _catch(errFx));
      return this;
   };

   /**
    * Run functions in parallel. When all have completed, then continue with the next entry in the list.
    * The return value for the next entry is an array containing the results of all the parallel functions
    * in the order they appear in the array (regardless of the order they complete).
    *
    * The functions ran inside parallel can use the return value from the previous step (before parallel() was called),
    * but not the return value of the other parallel steps (we are running them in parallel so we don't know
    * their return values yet).
    *
    * Each index in the `functions` array should itself be an array with the following components:
    * <code>[scope, ] [opts, ] fx [, args...]</code>
    *
    * The simplest way to think about this is that each entry in `functions` should be a set of arguments
    * compatible with `run`, `wrap`, or `handle` methods. Which format is used is determined as follows:
    * <ol>
    *   <li>if `fx` is a string: treat like run()</li>
    *   <li>otherwise, if `opts` has `cbPos` property or `Sequence.CB` in the args list: treat like handle() and use a callback</li>
    *   <li>otherwise, treat like wrap() and use return value</li>
    * </ol>
    *
    * The `opts` hash may contain any props used by handle/wrap, plus a couple extras:
    *    {int}        cbPos     a callback is spliced into the arguments at this position, if this is not present,
    *                           then the return value is used and cbKey/errPos/errKey are ignored
    *    {string|int} cbKey     if specified, this alters the behavior of `cbPos`;
    *                           the callback is added into an object/array instead of spliced into args
    *    {int}        prevPos   if specified, the return value of previous function in sequence is spliced into args at this position
    *    {string|int} prevKey   if specified, this alters the behavior of `prevPos`;
    *                           the return value is added into an object/array instead of spliced into args
    *    {int}        errPos    if specified, an error callback is spliced into args at this position
    *    {string|int} errKey    if specified, inserts error callback into object/array at errPos instead of splicing it
    *    {int}        wait      if provided, this many milliseconds will expire before this step is invoked (i.e. run in parallel, but offset)
    *    //todo add ifCondition?
    *
    * Okay, this is way too nebulous, so let's jump into some examples and sort this out:
    * <code>
    *    // create a method with a simple return value
    *    function addFxn(a, b) {
    *       return a + b;
    *    }
    *
    *    // create a method which returns a promise
    *    function promiseFxn(a, b) {
    *       var def = $.Deferred();
    *       setTimeout(function() {
    *          def.resolve( addFxn(a, b) );    // resolve promise with value from addFxn
    *       }, Math.floor(Math.rand()*500)+1); // set timeout to random value
    *       return def.promise();
    *    }
    *
    *    // create a method which invokes a callback
    *    function callbackFxn(callback, a, b) {
    *       setTimeout(function() {
    *          callback( addFxn(a, b) );       // invoke callback with value from addFxn
    *       }, Math.floor(Math.rand()*500)+1); // set timeout to random value
    *    }
    *
    *    // register a method we can call
    *    Sequence.start()
    *       .register('add', addFxn, {prevPos: 0, defaults: [0, 0]}) // calls add with the previous return value as `a`
    *
    *       // adds 1 to the default (0)
    *       .add( 1 )  // 1
    *
    *       // adds 1 to previous value (1)
    *       .add( 1 ) // 2
    *
    *       // execute some calls in parallel, Sequence.PREV will remain 2 for all these calls!
    *       .parallel([
    *          [ callbackFxn, Sequence.CB, Sequence.PREV, 3 ] // 5: callbackFunction(callback, 2, 3 )
    *          [ {prevPos: 0, wait: 100}, promiseFxn, 4 ]     // 6: promiseFxn( 2, 4 ), invoked after 100 milliseconds
    *          [ 'add', 5 ]                                   // 7: addFxn( 2, 5 )
    *       ])
    *
    *       // see what parallel returned
    *       .then(function(prev) {
    *          console.log(prev);   // gets an array containing [ 5, 6, 7 ], regardless of which completes first
    *       })
    *
    *       // finish up and get results
    *       .end()
    *       .done(function(results) {
    *          console.log(results);  //  [ 1, 2, [ 5, 6, 7 ] ]
    *       });
    * </code>
    *
    * @param {Array}  functions  see above
    * @return {Sequence}
    */
   Sequence.prototype.parallel = function( functions ) {
      var master = this; //scope
      // call wrap to make this entire affair one step in the chain
      return this.wrap(function(prevVal) {
         // Scope everything since we don't know when things are going to get returned and we want
         // the results to stay in order. The `shared` variable represents the data that's going to
         // increment and populate during the parallel operations:
         //    {array} vals: the return values from each parallel call
         //    {int}   done: the number of calls that have finished
         //    {int}   max:  the number of calls to be completed before we are done
         //    {jQuery.Deferred} def: a master promise that will resolve when the last call completes
         var i = functions.length, sharedContext = {vals: [], done: 0, max: functions.length, masterDef: $.Deferred()};
         while(i--) { // doesn't matter in which order we call parallel operations
            _parallel(_altParms(master.shared, master.fxns, functions[i]), i, prevVal, sharedContext);
         }
         return sharedContext.masterDef.promise();
      }, Sequence.PREV);
   };

   /**
    * Invokes `evalFx` and if that returns true, then the command specified is invoked with any arguments provided.
    *
    * Optionally, evalFx may return a promise (jQuery.Deferred), If this is the case, then when it is fulfilled,
    * the resolve/reject status will be used as the true/false condition.
    *
    * Each time if() is called, it automatically receives the return value of the previous step as the first argument.
    * If multiple iterations of if() are declared, then a second argument will contain a boolean which indicates whether
    * the previous if was executed or not.
    *
    * This method, similar to parallel(), may invoke `fx` by calling run(), handle(), or wrap(), depending on how
    * `fx` and `opts` are declared:
    * <ol>
    *   <li>if `fx` is a string: treat like run()</li>
    *   <li>otherwise, if `opts` has `cbPos` property or `Sequence.CB` in the args list: treat like handle() and use a callback</li>
    *   <li>otherwise, treat like wrap() and use return value</li>
    * </ol>
    *
    * The `opts` hash may contain any props used by run/handle/wrap, plus a couple extras:
    *    {int}        cbPos     a callback is spliced into the arguments at this position, if this is not present,
    *                           then the return value is used and cbKey/errPos/errKey are ignored
    *    {string|int} cbKey     if specified, this alters the behavior of `cbPos`;
    *                           the callback is added into an object/array instead of spliced into args
    *    {int}        prevPos   if specified, the return value of previous function in sequence is spliced into args at this position
    *    {string|int} prevKey   if specified, this alters the behavior of `prevPos`;
    *                           the return value is added into an object/array instead of spliced into args,
    *                           for arrays, the value at prevKey is replaced (it's not spliced in)
    *    {int}        errPos    if specified, an error callback is spliced into args at this position
    *    {string|int} errKey    if specified, inserts error callback into object/array at errPos instead of splicing it
    *    {int}        wait      if provided, this many milliseconds will expire before this step is invoked
    *
    * Okay, this is way too nebulous, so let's jump into some examples and sort this out:
    * <code>
    *    // just log something to prove an if step was run
    *    function log(val) {
    *       console.log(val);
    *    }
    *
    *    // execute a callback to prove it was run
    *    function invokeCallback(cbFx, val) {
    *       cbFx( val );
    *    }
    *
    *    // return a promise as an if condition
    *    function promiseCondition() {
    *       var def = $.Deferred();
    *       setTimeout(function() { def.resolve(); }, 100);
    *       return def.promise();
    *    }
    *
    *    Sequence.start()
    *       // a simple example
    *       .wrap( function() { return 5; } )
    *       .if( function(prev) { return prev > 10; }, log, 'Value more than 10' )                   // not invoked
    *       .if( function(prev) { return prev == 5; }, log, 'prev == 5' )                            // invoked
    *       .if( function(prev, ifRes) { return !ifRes; },    log, 'Prior if() did not get called' ) // not invoked
    *       .if( function(prev, ifRes) { return !ifRes; },    log, 'Prior if() did not get called' ) // invoked
    *
    *       // another simple example
    *       .wrap( function() { return 20; } )
    *       .if( function(prev) { return prev > 10; }, log, 'Value more than 10' )                   // invoked
    *       .if( function(prev) { return prev == 5; }, log, 'prev == 5' )                            // not invoked
    *       .if( function(prev, ifRes) { return !ifRes; },    log, 'Prior if() did not get called' ) // invoked
    *       .if( function(prev, ifRes) { return !ifRes; },    log, 'Prior if() did not get called' ) // not invoked
    *
    *       // using a promise as the if condition
    *       .if( promiseCondition, log, 'Promise fulfilled' ) // runs only if promise resolves successfully
    *
    *       // with a callback function -- called with handle()
    *       .if( condition, {cbPos: 0}, invokeCallback, 'Callback declared in opts' )
    *       .if( condition, invokeCallback, Sequence.CB, 'Callback added to args' )
    *
    *       // as a registered function -- called with run()
    *       .run( 'getColor', array(255, 0, 0) )
    *       .if( condition, 'makeWidget', Sequence.PREV ) // a red widget
    *
    *       .run( 'getColor', array(0, 255, 0) )
    *       .if( condition, {prevPos: 0}, 'makeWidget' )  // a green widget
    *
    *       // with a scope object
    *       .if( condition, new Widget('red'), function(message) { alert(msg + this.color); }, 'Roses are... ');
    * </code>
    *
    * @param {function} condition  must return true if this should be executed
    * @param [scope]
    * @param {string|Function} fx
    * @param {...}
      * @return {Sequence}
    */
   Sequence.prototype.if = function(condition, scope, fx) {
      var args = $.makeArray(arguments), fxns = this.fxns, shared = this.shared;
      condition = args.shift();
      // we can't just invoke it now because the prior steps haven't completed
      // so we use wrap() to get us to the right space in time
      return this.wrap(function(prevStep) {
         // one the prev step has completed, it's time to do our eval and decide if this step gets run
         shared.lastIf = condition(prevStep, shared.lastIf);
         if( shared.lastIf ) {
            // run the conditional step as a function
            var parms = _altParms(shared, fxns, args), def = $.Deferred();
            // invoke the wrapped function
            parms.fx(def, parms.scope, parms.args, prevStep);
            // return the promise
            return def.promise();
         }
         else {
            // if we don't run our conditional step, we simply pass on the previous step's return value
            return prevStep;
         }
      }, Sequence.PREV);
   };

   /**
    * After calling this method, no more steps may be added with wrap/handle/run methods. Once all existing steps
    * resolve, the promise returned by this method will return all results from all steps in an array.
    *
    * If the sequence is broken, an array is still returned, containing all results up to the breaking step, with
    * the final value as the rejected error value.
    *
    * Note that the steps of the sequence will complete and resolve without calling this method. It is only necessary
    * in order to retrieve all the results from each step.
    *
    * <code>
    *    Sequence.start()
    *       .wrap(function() { return 'hello'; })
    *       .wrap(function() { return 'goodbye'; })
    *       .end()
    *       .done(...)                    // ["hello", "goodbye"]
    *       .fail(function(e) { ... }     // does not get invoked
    *       .always(function(v) { ... }   // ["hello", "goodbye"]
    * </code>
    *
    * @param {boolean} [throwErrors] if true, instead of returning promise on erros, this method throws a javascript Error
    * @return {jQuery.Deferred} a promise, see http://api.jquery.com/category/deferred-object/
    */
   Sequence.prototype.end = function(throwErrors) {
      var results = this.returnVals, master = this.master, shared = this.shared;
      // when the last method fulfills the promise, it will automatically drop its result into this.returnVals
      // so there is no need to evaluate passed to then() callbacks here
      this.last.then(function() {
         // success returns the results
         _resolve(master, shared, [results]);
      }, function() {
         if( throwErrors ) {
            // mostly for debugging and test cases; not likely to be useful for client-facing code
            throw _result(arguments);
         }
         else {
            // failure returns the error
            master.reject.call(master, _result(arguments));
         }
      });
      return master.promise();
   };

   /**********************************************************************
    * Control Functions
    **********************************************************************/

   /**
    * Pause the sequence after the currently running step and do not invoke any more steps
    * until unpause() is called.
    *
    * This does not stop the currently running step from completing. Additionally, if the current step fails,
    * the entire chain will still be rejected and done()/fail() events may be fired (i.e. this pause() event
    * will never be overidden).
    *
    * @return {Sequence}
    */
   Sequence.prototype.pause = function() {
      this.shared.pauseEvent = $.Deferred();
      return this;
   };

   /**
    * Resume a Sequence chain stopped using pause(). If pause() has not been called, this does nothing.
    * @return {Sequence}
    */
   Sequence.prototype.unpause = function() {
      var e = this.shared.pauseEvent;
      e && e.resolve();
      return this;
   };

   /**
    * Stop the sequence after the currently running step completes and do not run any more steps.
    * The end() promise fails with an error condition.
    *
    * It is possible to tell if abort was called by checking the error for a `sequenceAborted` property. Example:
    * <code>
    *    Sequence.start()
    *       .wrap(function() { return 'hello'; }
    *       .abort()
    *       .wrap(function() { return 'ignored'; } // this won't run
    *       .end()
    *       .done(...) // not called
    *       .fail(function(e) {
    *          alert(e.sequenceAborted); // true!
    *       });
    * </code>
    *
    * @param {string} [msg]
    * @return {Sequence}
    */
   Sequence.prototype.abort = function(msg) {
      var e = this.shared.abortEvent = new Error(msg||'Sequence aborted');
      e.sequenceAborted = true;
      if( this.shared.pauseEvent ) {
         this.shared.pauseEvent.reject(e);
      }
      this.last.reject(e);
      return this;
   };

   /**********************************************************************
    * Private Utilities
    **********************************************************************/

   /**
    * Given an arguments object or an array, parse the properties, dealing with optional values,
    * assuming the following argument possibilities:
    * <ul>
    *    <li>{Object}   [scope] inside `fx`, `this` will be set to whatever is provided here </li>
    *    <li>{Object}   [opts]  a hash containing options for the call</li>
    *    <li>{function} fx </li>
    *    <li>{*}        args... any number of additional arguments</li>
    * </ul>
    *
    * The output is a hash object guaranteed to contain:
    * <ul>
    *    <li>{Object|null} scope   defaults to null</li>
    *    <li>{Object}      opts</li>
    *    <li>{function}    fx</li>
    *    <li>{array}       args</li>
    * </ul>
    *
    * @param arguments
    * @return {Object}
    * @private
    */
   function _parms(argList) {
      var args = $.makeArray(argList), out = { opts: {}, scope: null }, pos = 0;
      while(args.length && pos++ < 3) {
         if($.isFunction(args[0])) {
            out.fx = args.shift();
            break;
         }
         else if($.isPlainObject(args[0])) {
            out.opts = $.extend({}, args.shift());
         }
         else if( typeof(args[0]) === 'object' ) {
            out.scope = args.shift();
         }
         else if( args[0] !== null ) {
            throw new Error('Invalid argument '+args[0]+' at pos '+pos);
         }
      }
      if( !('fx' in out) ) {
         throw new Error('Function to call was not included in arguments');
      }
      out.args = args;
      return out;
   }

   /**
    * Parses arguments same as _parms(), but allows for fx to be a {string}name representing a method added
    * with register().
    *
    * Because we might already be using a pre-wrapped function (register pre-wraps them), we will also pre-wrap
    * any non-registered function for consistency.
    *
    * @param  {object} shared the Sequence object's this.shared hash
    * @param  {object} fxns  hash of the Sequence objects registered functions
    * @param  {Array}  args
    * @return {object}
    * @private
    */
   function _altParms(shared, fxns, args) {
      var i = -1, len = args.length, k, parms, isWrapped, wait = 0;
      outer:while(++i < len && i < 3) {
         // this tricky looking little loop/switch combination just starts at the beginning of the arguments
         // and finds the first string or function (which represents the function to call). Once it is found,
         // there is no need to go on, since all we are really doing is replacing a string fxName with the fx
         // it represents
         switch(typeof(args[i])) {
            case 'string':
               k = args[i]; // it's a function name
               if( !(k in fxns) ) { throw new Error('Invalid function name '+k); }
               args[i] = fxns[k];
               isWrapped = true;
               break outer;  // cancel loop
            case 'function':
               isWrapped = false;
               break outer;  // it's an actual function; cancel loop
            default: // continue the loop
         }
      }
      parms = _parms(args);
      parms.wait = wait;
      //todo maybe we should just pre-wrap everything? move it to _parms?
      if( !isWrapped ) { parms.fx = _wrapFx(shared, parms.fx, parms.opts, _usesCallback(parms))}
      return parms;
   }

   /**
    * Execute a callback created with _wrapFx() as the next step in the sequence. Store the result in the sequence's
    * `this.returnVals` array.
    *
    * @param {Array}           returnVals
    * @param {jQuery.Deferred} masterDef
    * @param {jQuery.Deferred} prevDef
    * @param {function} wrappedFx
    * @param {object}   scope
    * @param {Array}    args
    * @return {jQuery.Deferred} a promise
    * @private
    */
   function _ex(returnVals, masterDef, prevDef, wrappedFx, scope, args, shared) {
      var def = $.Deferred(), pauseEvent = shared.pauseEvent || $.Deferred().resolve();
      if( masterDef.isResolved() || masterDef.isRejected() ) {
         return masterDef.promise();
      }

      if( shared.abortEvent ) {
         // an abort has been called but not yet triggered; stop the show
         def.reject(shared.abortEvent);
      }
      else {
         // if a pause event is in play, then we need to wait for it to complete
         // but we don't want to get mixed up on our return values, or accidentally start
         // the next step before the previous one fulfills (if we pause/unpause before it is done)
         // so wait for its promise to resolve and THEN wait for the prevDef to resolve too
         // (using that one for return values)
         pauseEvent.then(function() {
            if( prevDef.isRejected() ) {
               // if the chain is already broken, don't add any more steps
               // recast the def here just in case this was not asynchronous
               def = prevDef;
            }
            else {
               // wait for prev function to complete before executing
               prevDef.then(function() {
                  // when prev resolves, we execute this step
                  wrappedFx(def, scope, args, _result(arguments));
               }, function() {
                  // if the previous step rejects, then this one does not get run
                  // we break the chain here, reject this step, and do not store a result (the error is the last one stored)
                  def.reject.apply(def, arguments);
               });
            }
         });

         // set up the resolution so we can store results
         def.always(function() {
            if( !prevDef.isRejected() ) {
               // store the result for the next step and end() evaluations
               returnVals.push(_result(arguments));
            }
         });
      }

      return def;
   }

   /**
    * Wrap a function in preparation for execution using _ex()
    *
    * The returned function has the following signature:
    *    {jQuery.Deferred} def       the deferred object to fulfill when `fx` completes
    *    {object}          scope     the `this` to use inside `fx` (null if static)
    *    {array}           args      any args to pass into `fx`, callbacks and prev return value are inserted automagically at invocation
    *    {*}               prevValue result from previous step, undefined for the first step
    *
    * @param {object}    shared the Sequence's this.shared hash space
    * @param {function}  fx     a function that returns a value (which may be a jQuery.Deferred)
    * @param {object}    opts   config parms for how the function should be executed
    * @param {boolean}   usesCallback does fx return a value or execute a callback?
    * @return {function}
    * @private
    */
   function _wrapFx(shared, fx, opts, usesCallback) {
      // the function returns a value and does not execute a callback
      return function(def, scope, args, prevValue) {
         try {
            // execute the function, since it's returning a value, we need to evaluate it
            var v = fx.apply(scope, _fxArgs(args, _ctx(shared, opts, def, usesCallback, prevValue)));
            if( !usesCallback ) {
               // callbacks will handle the deferred scope internally (see _fxArgs) so there is nothing to do
               // for return values, we need to determine the type of returned value to decide if it is resolved
               if( _isDeferred(v) ) {
                  // it returned a promise, so wait for it to complete and resolve accordingly
                  v.then(function() {
                     _resolve(def, shared, $.makeArray(arguments));
                  }, function() {
                     def.reject.apply(def, arguments);
                  });
               }
               else if( v instanceof Error ) {
                  // fx returned an Error, so we know something went wrong
                  def.reject(v);
               }
               else {
                  // no errors thrown and not a promise, so we resolve immediately with return value
                  _resolve(def, shared, [v]);
               }
            }
         }
         catch(e) {
            // fx threw an Error, so we reject
            def.reject(e);
         }
      };
   }

   /**
    * @param def
    * @param shared
    * @param args
    * @private
    */
   function _resolve(def, shared, args) {
      if( shared.abortEvent ) {
         def.reject(shared.abortEvent);
      }
      else if( shared.pauseEvent ) {
         shared.pauseEvent.then(function() {
            def.resolve.apply(def, args);
         }, function(e) {
            def.reject(e);
         });
      }
      else {
         def.resolve.apply(def, args);
      }
   }

   /**
    * Modifies `args` by inserting previous step's results and callbacks at the appropriate points
    *
    * @param  {Array}   args
    * @param  {object}  ctx
    * @return {Array}
    * @private
    */
   function _fxArgs(args, ctx) {
      var i, d, out = $.makeArray(args);

      Placeholders.fill(out, ctx);

      // set some defaults
      if( 'defaults' in ctx.opts ) {
         d = ctx.opts.defaults;
         i = d.length;
         while(i--) {
            if( !_exists(out[i]) ) {
               out[i] = d[i];
            }
            else if( typeof(d[i]) === 'object' && typeof(out[i]) === 'object' ) {
               out[i] = $.extend(true, {}, d[i], out[i]);
            }
         }
      }

      return out;
   }

   function _cb(def, shared) {
      return function(v) {
         if( v instanceof Error ) { def.reject.apply(def, arguments); }
         else { _resolve(def, shared, $.makeArray(arguments)); }
      }
   }

   function _errCb(def) {
      return function() {
         def.reject.apply(def, arguments);
      }
   }

   /**
    * Wrap the various options and parts of a function call into a single context object.
    *
    * @param {object} shared
    * @param {object} opts
    * @param {jQuery.Deferred} deferred
    * @param {boolean} usesCallback
    * @param [prevValue]
    * @return {Object}
    * @private
    */
   function _ctx(shared, opts, deferred, usesCallback, prevValue) {
      return {
         shared: shared,
         opts:   $.extend({}, opts),
         prev:   prevValue,
         def:    deferred,
         placeholders: usesCallback? ['cb', 'err', 'prev'] : ['prev']
      }
   }

   /**
    * Wrap a superfluous function in a try/catch block so it does not break our chain
    * @param fx
    * @return {Function}
    * @private
    */
   function _catch(fx) {
      if( !fx ) { return undef; }
      return function() {
         try {
            fx.apply(null, $.makeArray(arguments));
         }
         catch(e) {
            // we discard then() errors silently :(
            var console = (typeof window.console == 'object')? window.console : {error: function() {}};
            console.error(e);
         }
      }
   }

   /**
    * Just a quick utility to check the number of arguments and return either the first or all values
    * @param {Arguments} arguments
    * @return {*}
    * @private
    */
   function _result(argList) {
      if( argList.length > 1 ) { return $.makeArray(argList); }
      return argList[0];
   }

   /**
    * True if val is not null or undefined
    * @param val
    * @return {Boolean}
    * @private
    */
   function _exists(val) {
      return val !== undef && val !== null && val !== '';
   }

   /**
    * Determine if an object is a jQuery.Deferred (instanceof doesn't work)
    */
   function _isDeferred(o) {
      return typeof(o) === 'object' && ('then' in o) && ('always' in o) && ('fail' in o);
   }

   /**
    * Add a list of functions to a sequence
    */
   function _registerAll(seq, fxns) {
      var k, o, f;
      if( fxns && $.isPlainObject(fxns) ) {
         for( k in fxns ) {
            if( fxns.hasOwnProperty(k) ) {
               f = fxns[k];
               switch(typeof(f)) {
                  case 'function':
                     o = null;
                     break;
                  case 'object':
                     o = $.extend({}, f); // don't modify the original
                     f = o.fx;
                     delete o.fx;
                     break;
                  default:
                     throw new Error('each element of hash passed into start() must be an object or function');
               }
               seq.register(k, f, o);
            }
         }
      }
   }

   /**
    * Run a single operation as part of a parallel series. When each operation completes, we compare the
    * number that have completed vs the total number to run. Once we finish the last operation, fulfill a
    * master promise and give it all of the values as an array.
    *
    * @param {object}  parms      see _altParms()
    * @param {int}     pos        used to store this operation's results in the correct slot
    * @param           prevValue  return value from function before the parallel op
    * @param {object}  shared     the accumulated results of all the operations (see Sequence.prototype.parallel())
    * @return {jQuery.Deferred} promise
    * @private
    */
   function _parallel(parms, pos, prevValue, shared) {
      var def = $.Deferred();

      // invoke the wrapped function, which handles try/catch, callbacks, and promises for us
      if( parms.opts.wait > 0 ) {
         _waitFor(parms.opts.wait).then(function() {
            parms.fx(def, parms.scope, parms.args, prevValue);
         });
      }
      else {
         parms.fx(def, parms.scope, parms.args, prevValue);
      }

      // wait for the function to resolve
      def.done(function() {
         // store the result
         shared.vals[pos] = _result(arguments);

         // if this is the last operation to complete, then resolve the master promise
         if( ++shared.done == shared.max ) {
            shared.masterDef.resolve(shared.vals); //todo this stuff could move out to the caller
         }
      })
         .fail(function(e) {
            // if this operation fails, we can go ahead and reject the master; no need to wait for results
            shared.masterDef.reject(e);
         });

      return def.promise();
   }

   function _usesCallback(parms) {
      if( 'cbPos' in parms.opts ) { return true; }
      var args = parms.args, i = args.length;
      while(i--) {
         if( args[i] === Sequence.CB ) { return true; }
      }
      return false;
   }

   var Placeholders = {};
   (function(undef) {
      // scope some of this placeholder craziness

      /**
       * Inserts values into `args` in place of placeholders or splices them as needed.
       *
       * SIDE EFFECT: this modifies the args array
       *
       * @param {Array}      args
       * @param {Object}     ctx
       * @private
       */
      Placeholders.fill = function(args, ctx) {
         var p, k, len,
            keys = ctx.placeholders,
            i = keys.length,        // iterator
            fromOpts = [],          // placeholders inserted into args
            fromPlaceholders = [];  // placeholders in the args

         // first we get the locations of each key
         while(i--) {
            k = keys[i];
            p = _positionPlaceholder(args, ctx.opts, k);
            if(p.pos > -1) {
               p.val = _valFor(k, ctx);
               (p.fromPlaceholder && fromPlaceholders.push(p)) || fromOpts.push(p);
            }
         }

         // sort the placeholders to simplify the process of inserts/replace operations
         fromPlaceholders.sort(_sortPlaceholders);
         fromOpts.sort(_sortPlaceholders);

         // we are now ready to do the dirty work
         // we start with the placeholders, because they are only in position until we
         // start modifying the arguments; they are also terribly simple
         len = fromPlaceholders.length;
         for(i = 0; i < len; i++) {
            p = fromPlaceholders[i];
            args[p.pos] = p.val;
         }

         // now deal with the ones from opts, which will include inserts
         len = fromOpts.length;
         for(i = 0; i < len; i++) {
            _addToArgs(args, fromOpts[i]);
         }

         // there is nothing to return since args was passed by reference
         // if Array.slice() or other methods that return a new array are used, this will have to be refactored!
      };

      /**
       * Examines the options for the appropriate Sequence.PLACEHOLDER value. Returns an object suitable for
       * replacing or splicing the value.
       *
       * @param args
       * @param opts
       * @param key
       * @private
       */
      function _positionPlaceholder(args, opts, key) {
         var i,
            ph = _phFor(key),
            defaultPos = _defaultPosFor(key),
            optsPos = key+'Pos',
            optsKey = key+'Key',
            out = {prefix: key, pos: -1, key: undef, fromPlaceholder: false},
            hasPos = (optsPos in opts && opts[optsPos] >= 0),
            hasKey = (optsKey in opts && typeof(opts[optsKey]) in {number: 1, string: 1});

         if( hasPos ) {
            // anything set in opts supersedes placeholders
            out.pos = opts[optsPos];
            if( hasKey ) {
               out.key = opts[optsKey];
            }
         }
         else {
            // if nothing in opts, then we go hunting in the args for a placeholder
            i = args.length;
            while(i--) {
               if( args[i] === ph) {
                  out.pos = i;
                  out.fromPlaceholder = true;
                  break;
               }
            }
            // if no placeholder is found, then we look to see if there is a default (e.g. Sequence.CB defaults to 0)
            if( i < 0 && typeof(defaultPos) == 'number' ) {
               out.pos = defaultPos;
            }
         }

         return out;
      }

      function _sortPlaceholders(a,b) {return a.pos - b.pos;}

      function _containerFor(k) { return typeof(k) === 'number'? [] : {}; }

      function _addToArgs(args, p) {
         var hasKey = (p.key !== undef),
            ins    = (args.length < p.pos + 1);
         if(hasKey) {
            if( ins ) {
               // fill container with undefined up to p.pos
               args[p.pos] = _containerFor(p.key);
            }
            // we're inserting our value unto an existing object
            args[p.pos][p.key] = p.val;
         }
         else {
            if( ins ) {
               // if args is not long enough, splice fails (why? who knows!) so we
               // treat inserts like replace in that case
               args[p.pos] = p.val;
            }
            else {
               // splice time!
               args.splice(p.pos, 0, p.val);
            }
         }
      }

      function _phFor(k) {
         switch(k) {
            case 'cb':   return Sequence.CB;
            case 'err':  return Sequence.ERR;
            case 'prev': return Sequence.PREV;
            default:     throw new Error('Invalid placeholder type (must be one of cb/err/prev): '+k);
         }
      }

      function _defaultPosFor(k) {
         switch(k) {
            case 'cb':   return 0;
            case 'err':  return false;
            case 'prev': return false;
            default:     throw new Error('Invalid placeholder type (must be one of cb/err/prev): '+k);
         }
      }

      function _valFor(k, ctx) {
         switch(k) {
            case 'cb':   return _cb(ctx.def, ctx.shared);
            case 'err':  return _errCb(ctx.def);
            case 'prev': return ctx.prev;
            default:     throw new Error('Invalid placeholder type (must be one of cb/err/prev): '+k);
         }
      }

   })(); // end of Placeholder class

   function _waitFor(milliseconds) {
      var start = new Date().valueOf(), def = $.Deferred();
      setTimeout(function() {
         var diff = new Date().valueOf() - start;
         if( diff < milliseconds ) {
            // setTimeout() is completely unreliable in Firefox and can actually return BEFORE the timeout
            // specified (curse you Mozilla baby!), so if our wait doesn't meet the minimum, then wait some more
            var interval = setInterval(function() {
               if( new Date().valueOf() - start >= milliseconds ) {
                  clearInterval(interval);
                  def.resolve(true);
               }
            }, Math.max(diff, 10));
         }
         else {
            // other browsers don't have this issue
            def.resolve(true);
         }
      }, milliseconds);
      return def.promise();
   }

   function _remove(array, from, to) {
      var rest = array.slice((to || from) + 1 || array.length);
      array.length = from < 0 ? array.length + from : from;
      return array.push.apply(array, rest);
   }

   function _startParms(args) {
      var out = { fxns: false, timeout: false }, i = args.length;
      while(i--) {
         switch(typeof(args[i])) {
            case 'number':
               out.timeout = args[i];
               break;
            case 'object':
               out.fxns = args[i];
               break;
            default:
               throw new Error('Invalid argument to $.Sequence.start() of type '+typeof(args[i]));
         }
      }
      return out;
   }

})(jQuery);

/*
 json2.js
 2011-10-19

 Public Domain.

 NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

 See http://www.JSON.org/js.html


 This code should be minified before deployment.
 See http://javascript.crockford.com/jsmin.html

 USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
 NOT CONTROL.


 This file creates a global JSON object containing two methods: stringify
 and parse.

 JSON.stringify(value, replacer, space)
 value       any JavaScript value, usually an object or array.

 replacer    an optional parameter that determines how object
 values are stringified for objects. It can be a
 function or an array of strings.

 space       an optional parameter that specifies the indentation
 of nested structures. If it is omitted, the text will
 be packed without extra whitespace. If it is a number,
 it will specify the number of spaces to indent at each
 level. If it is a string (such as '\t' or '&nbsp;'),
 it contains the characters used to indent at each level.

 This method produces a JSON text from a JavaScript value.

 When an object value is found, if the object contains a toJSON
 method, its toJSON method will be called and the result will be
 stringified. A toJSON method does not serialize: it returns the
 value represented by the name/value pair that should be serialized,
 or undefined if nothing should be serialized. The toJSON method
 will be passed the key associated with the value, and this will be
 bound to the value

 For example, this would serialize Dates as ISO strings.

 Date.prototype.toJSON = function (key) {
 function f(n) {
 // Format integers to have at least two digits.
 return n < 10 ? '0' + n : n;
 }

 return this.getUTCFullYear()   + '-' +
 f(this.getUTCMonth() + 1) + '-' +
 f(this.getUTCDate())      + 'T' +
 f(this.getUTCHours())     + ':' +
 f(this.getUTCMinutes())   + ':' +
 f(this.getUTCSeconds())   + 'Z';
 };

 You can provide an optional replacer method. It will be passed the
 key and value of each member, with this bound to the containing
 object. The value that is returned from your method will be
 serialized. If your method returns undefined, then the member will
 be excluded from the serialization.

 If the replacer parameter is an array of strings, then it will be
 used to select the members to be serialized. It filters the results
 such that only members with keys listed in the replacer array are
 stringified.

 Values that do not have JSON representations, such as undefined or
 functions, will not be serialized. Such values in objects will be
 dropped; in arrays they will be replaced with null. You can use
 a replacer function to replace those with JSON values.
 JSON.stringify(undefined) returns undefined.

 The optional space parameter produces a stringification of the
 value that is filled with line breaks and indentation to make it
 easier to read.

 If the space parameter is a non-empty string, then that string will
 be used for indentation. If the space parameter is a number, then
 the indentation will be that many spaces.

 Example:

 text = JSON.stringify(['e', {pluribus: 'unum'}]);
 // text is '["e",{"pluribus":"unum"}]'


 text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
 // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

 text = JSON.stringify([new Date()], function (key, value) {
 return this[key] instanceof Date ?
 'Date(' + this[key] + ')' : value;
 });
 // text is '["Date(---current time---)"]'


 JSON.parse(text, reviver)
 This method parses a JSON text to produce an object or array.
 It can throw a SyntaxError exception.

 The optional reviver parameter is a function that can filter and
 transform the results. It receives each of the keys and values,
 and its return value is used instead of the original value.
 If it returns what it received, then the structure is not modified.
 If it returns undefined then the member is deleted.

 Example:

 // Parse the text. Values that look like ISO date strings will
 // be converted to Date objects.

 myData = JSON.parse(text, function (key, value) {
 var a;
 if (typeof value === 'string') {
 a =
 /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
 if (a) {
 return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
 +a[5], +a[6]));
 }
 }
 return value;
 });

 myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
 var d;
 if (typeof value === 'string' &&
 value.slice(0, 5) === 'Date(' &&
 value.slice(-1) === ')') {
 d = new Date(value.slice(5, -1));
 if (d) {
 return d;
 }
 }
 return value;
 });


 This is a reference implementation. You are free to copy, modify, or
 redistribute.
 */

/*jslint evil: true, regexp: true */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
 call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
 getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
 lastIndex, length, parse, prototype, push, replace, slice, stringify,
 test, toJSON, toString, valueOf
 */


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
   JSON = {};
}

(function () {
   'use strict';

   function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
   }

   if (typeof Date.prototype.toJSON !== 'function') {

      Date.prototype.toJSON = function (key) {

         return isFinite(this.valueOf())
            ? this.getUTCFullYear()     + '-' +
            f(this.getUTCMonth() + 1) + '-' +
            f(this.getUTCDate())      + 'T' +
            f(this.getUTCHours())     + ':' +
            f(this.getUTCMinutes())   + ':' +
            f(this.getUTCSeconds())   + 'Z'
            : null;
      };

      String.prototype.toJSON      =
         Number.prototype.toJSON  =
            Boolean.prototype.toJSON = function (key) {
               return this.valueOf();
            };
   }

   var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
      gap,
      indent,
      meta = {    // table of character substitutions
         '\b': '\\b',
         '\t': '\\t',
         '\n': '\\n',
         '\f': '\\f',
         '\r': '\\r',
         '"' : '\\"',
         '\\': '\\\\'
      },
      rep;


   function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

      escapable.lastIndex = 0;
      return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
         var c = meta[a];
         return typeof c === 'string'
            ? c
            : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      }) + '"' : '"' + string + '"';
   }


   function str(key, holder) {

// Produce a string from holder[key].

      var i,          // The loop counter.
         k,          // The member key.
         v,          // The member value.
         length,
         mind = gap,
         partial,
         value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

      if (value && typeof value === 'object' &&
         typeof value.toJSON === 'function') {
         value = value.toJSON(key);
      }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

      if (typeof rep === 'function') {
         value = rep.call(holder, key, value);
      }

// What happens next depends on the value's type.

      switch (typeof value) {
         case 'string':
            return quote(value);

         case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value) ? String(value) : 'null';

         case 'boolean':
         case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

         case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

            if (!value) {
               return 'null';
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

               length = value.length;
               for (i = 0; i < length; i += 1) {
                  partial[i] = str(i, value) || 'null';
               }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

               v = partial.length === 0
                  ? '[]'
                  : gap
                  ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                  : '[' + partial.join(',') + ']';
               gap = mind;
               return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === 'object') {
               length = rep.length;
               for (i = 0; i < length; i += 1) {
                  if (typeof rep[i] === 'string') {
                     k = rep[i];
                     v = str(k, value);
                     if (v) {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                     }
                  }
               }
            } else {

// Otherwise, iterate through all of the keys in the object.

               for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                     v = str(k, value);
                     if (v) {
                        partial.push(quote(k) + (gap ? ': ' : ':') + v);
                     }
                  }
               }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
               ? '{}'
               : gap
               ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
               : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
      }
   }

// If the JSON object does not yet have a stringify method, give it one.

   if (typeof JSON.stringify !== 'function') {
      JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

         var i;
         gap = '';
         indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

         if (typeof space === 'number') {
            for (i = 0; i < space; i += 1) {
               indent += ' ';
            }

// If the space parameter is a string, it will be used as the indent string.

         } else if (typeof space === 'string') {
            indent = space;
         }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

         rep = replacer;
         if (replacer && typeof replacer !== 'function' &&
            (typeof replacer !== 'object' ||
               typeof replacer.length !== 'number')) {
            throw new Error('JSON.stringify');
         }

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

         return str('', {'': value});
      };
   }


// If the JSON object does not yet have a parse method, give it one.

   if (typeof JSON.parse !== 'function') {
      JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

         var j;

         function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
               for (k in value) {
                  if (Object.prototype.hasOwnProperty.call(value, k)) {
                     v = walk(value, k);
                     if (v !== undefined) {
                        value[k] = v;
                     } else {
                        delete value[k];
                     }
                  }
               }
            }
            return reviver.call(holder, key, value);
         }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

         text = String(text);
         cx.lastIndex = 0;
         if (cx.test(text)) {
            text = text.replace(cx, function (a) {
               return '\\u' +
                  ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
         }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

         if (/^[\],:{}\s]*$/
            .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
            .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
            .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

            j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

            return typeof reviver === 'function'
               ? walk({'': j}, '')
               : j;
         }

// If the text is not JSON parseable, then a SyntaxError is thrown.

         throw new SyntaxError('JSON.parse');
      };
   }
}());


/*******************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/katowulf/knockout-sync
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function($, ko) {
   "use strict";

   ko.extenders.sync = function(target, startDirty) {
      //todo replace startDirty with record object; sync this and the record's dirty
      var cleanValue = ko.observable(ko.mapping.toJSON(target));
      var dirtyOverride = ko.observable(ko.utils.unwrapObservable(startDirty));

      target.crud = {
         /**
          * @param {boolean} [newValue]
          * @return {boolean}
          */
         isDirty: ko.computed(function(){
            return dirtyOverride() || ko.mapping.toJSON(target) !== cleanValue();
         }),

         markClean: function(){
            cleanValue(ko.mapping.toJSON(target));
            dirtyOverride(false);
         },

         markDirty: function(){
            dirtyOverride(true);
         }
      };

      return target;
   };

   ko.sync || (ko.sync = {});
   ko.sync.stores || (ko.sync.stores = []);

   ko.sync.use = function() {}; //todo
   ko.sync.newList = function() {}; //todo
   ko.sync.newRecord = function() {}; //todo

   //todo does this have much better performance?
   //todo if so, we can use the isDirty({read: ..., write...}) approach
   //ko.extenders.dirty = function(target, startDirty) {
   //   var cleanValue = ko.observable(ko.mapping.toJSON(target));
   //   var dirtyOverride = ko.observable(ko.utils.unwrapObservable(startDirty));
   //
   //   target.isDirty = ko.computed(function(){
   //      return dirtyOverride() || ko.mapping.toJSON(target) !== cleanValue();
   //   });
   //
   //   target.markClean = function(){
   //      cleanValue(ko.mapping.toJSON(target));
   //      dirtyOverride(false);
   //   };
   //   target.markDirty = function(){
   //      dirtyOverride(true);
   //   };
   //
   //   return target;
   //};

   /**
    * Run a function that may return a value or a promise object. If a promise object is returned, this method will
    * wait for it to fulfill and resolve with the results. Otherwise, it resolves immediately with the value.
    *
    * @param [scope]
    * @param fx
    * @return {Promise}
    * @constructor
    */
   function When(scope, fx) {
      var def = $.Deferred(), params = _params(arguments);
      try {
         var res = params.fx.apply(params.scope, params.args);
         if( res instanceof Error ) {
            return def.reject(res).promise();
         }
         else if( _isPromise(res) ) {
            return res;
         }
         else {
            return def.resolve(res).promise();
         }
      }
      catch(e) {
         return def.reject(e).promise();
      }
   }

   /**
    * Turn a function with a callback into a deferred promise. Optionally, an error callback may also be specified.
    *
    * The position of the callback and errback are specified using a placeholder like so:
    * <code>
    *    ko.sync.handle( fxToCall, arg1, ko.sync.handle.CALLBACK, arg3, ko.sync.handle.ERRBACK ).then(...)
    * </code>
    *
    * If there are no arguments, the callback/errback are positions 0 and 1. If the position of the
    * CALLBACK isn't specified, then it is inserted before the arguments:
    * <code>
    *    function add( callback, a, b ) {
    *        callback( a + b );
    *    }
    *
    *    ko.sync.handle( add, 3, 4 ).then(...) // 7
    * </code>
    *
    * If the position of the errback is not specified, it is not included. It is assumed that the method will either
    * throw an exception or return an Error if the operation fails.
    *
    * @param [scope]
    * @param fx
    * @return {Promise}
    * @constructor
    */
   function Handle(scope, fx) {
      var def = $.Deferred(), params = _params(arguments, true, def);
      scope || (scope = null);
      try {
         params.fx.apply(params.scope, params.args);
      }
      catch(e) {
         def.reject(e);
      }
      return def.promise();
   }
   Handle.CALLBACK = new Object();
   Handle.ERRBACK  = new Object();

   function _params(argList, hasPlaceholder, def) {
      var args = _toArray(argList), fx, scope = null, i = 0;
      while(args.length && !fx && i++ < 2) {
         if( typeof(args[0]) === 'function' ) {
            fx = args.shift();
         }
         else {
            scope = args.shift()||null;
         }
      }
      if( !fx ) { throw new Error('first two arguments to handle() and when() must be either a scope object or the function to run'); }
      hasPlaceholder && _fillPlaceholder(args, def);
      return {fx: fx, scope: scope, args: args};
   }

   function _fillPlaceholder(args, defer) {
      var i = -1, a, len = args.length, hasCallback = false;
      if( len ) {
         while(++i < len) {
            a = args[i];
            if( a === Handle.CALLBACK ) {
               hasCallback = true;
               args[i] = _callback(defer);
            }
            else if( a === Handle.ERRBACK ) {
               args[i] = _errback(defer);
            }
         }
         if( !hasCallback ) {
            // if none of the arguments are the CALLBACK placeholder
            // then it goes first in the list
            args.unshift(_callback(defer));
         }
      }
      else {
         // if there are no arguments (probably the norm) then just apply callback/errback
         // to the first two positions as that's all that makes sense
         args[0] = _callback(defer);
         args[1] = _errback(defer);
      }
   }

   function _toArray(args) {
      return Array.prototype.slice.call(args);
   }

   function _isPromise(o) {
      return o !== null && typeof(o) === 'object' && typeof(o.then) === 'function' && typeof(o.always) === 'function';
   }

   function _callback(defer) {
      return function(v) {
         if( v instanceof Error ) {
            defer.reject.apply(defer, arguments);
         }
         else {
            defer.resolve.apply(defer, arguments);
         }
      }
   }

   function _errback(defer) {
      return function() {
         defer.reject.apply(defer, arguments);
      }
   }

   ko.sync || (ko.sync = {});
   ko.sync.when   = When;
   ko.sync.handle = Handle;

})(jQuery, ko);
/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   var Model = ko.sync.Model = Class.extend({
      /**
       * @param {object} props
       * @constructor
       */
      init: function(props) {
         var defaults       = ko.utils.extend(Model.FIELD_DEFAULTS, props.defaults);
         this.store         = props.dataStore;
         this.table         = props.dataTable;
         this.key           = props.primaryKey;
         this.sort          = props.sortField;
         this.validator     = props.validator;
         this.counter       = props.updateCounter;
         this.fields        = _processFields(defaults, props.fields);
         this.recordFactory = props.recordFactory || new RecordFactory(this);
      },

      applyTo: function(viewOrObject, initialData) { }, //todo

      /**
       * @param {object} [data]
       * @return {*}
       */
      newRecord: function(data) {
         return this.recordFactory.create(data);
      }
   });
   Model.FIELD_DEFAULTS = {
      type:      'string',
      required:  false,
      persist:   true,
      observe:   true,
      minLength: 0,
      maxLength: 0,
      valid:     null, //todo tie this to this.validator?
      updateCounter: 'update_counter',
      format:    function(v) { return v; }
   };

   function _processFields(defaults, fields) {
      var out = {}, o, k;
      Object.keys(fields).forEach(function(k) {
         o = ko.utils.extend({}, defaults);
         o = ko.utils.extend(o, fields[k]);
         _applyDefault(o);
         out[k] = o;
      });
      return out;
   }

   function _applyDefault(o) {
      if( !o.hasOwnProperty('default') || !exists(o.default) ) {
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
      return new ko.sync.Record(this.model, data);
   };

})(ko);
/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   var Record = ko.sync.Record = Class.extend({
      /**
       * @param {Model}  model
       * @param {object} [data]
       * @constructor
       */
      init:            function(model, data) {
         data || (data = {});
         this.data      = _setFields(model.fields, data);
         this.id        = new ko.sync.RecordId(model.key, data);
         this.sort      = model.sort;
         this.changed   = false;
         this.validator = model.validator;
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
      getData:         function() {
         return ko.utils.extend({}, this.data);
      },
      get:             function(field) {
         return this.data[field];
      },
      set:             function(field, val) {
         if( this.data.hasOwnProperty(field) && this.data[field] !== val ) {
            this.changed = true;
            //todo validate!
            this.data[field] = val;
            return true;
         }
         return false;
      },
      isDirty:         function() {
         return this.changed;
      },
      clearDirty:      function() {
         this.changed = false;
      },
      isValid:         function() {
         return !this.validator || this.validator.validate(this);
      },
      /**
       * @param {Record|object} newVals
       */
      updateAll: function(newVals) {
         var k, data = (newVals instanceof Record)? newVals.getData() : newVals;
         for(k in data) {
            if( data.hasOwnProperty(k) ) {
               this.set(k, data[k]);
            }
         }
         return this.changed;
      }
   });

   function _setFields(fields, data) {
      var k, out = {}, keys = Object.keys(fields), i = keys.length;
      while(i--) {
         k = keys[i];
         if( data.hasOwnProperty(k) && exists(data[k]) ) {
            out[k] = data[k];
         }
         else {
            out[k] = fields[k].default;
         }
      }
      return out;
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(ko);


/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   var RecordId = ko.sync.RecordId = Class.extend({
      /**
       * @param {Array|string} fields
       * @param {object} [data]
       * @param {string} [separator]
       * @constructor
       */
      init: function(fields, data, separator) {
         Array.isArray(fields) || (fields = [fields]);
         this.separator = separator || RecordId.DEFAULT_SEPARATOR;
         this.multi = fields.length > 1;
         this.fields = fields;
         this.id = _buildRecordId(this.separator, fields, data);
      },
      isSet:              function() { return this.id !== null; },
      isComposite:        function() { return this.multi; },
      valueOf:            function() { return this.id; },
      toString:           function() { return this.valueOf(); },
      getCompositeFields: function() { return this.fields; },
      equals:             function(o) {
         return o instanceof RecordId && o.valueOf() === this.valueOf();
      }
   });
   RecordId.DEFAULT_SEPARATOR = '|';
   RecordId.for = function(model, record) {
      return new RecordId(model.primaryKey, record.getData());
   };

   function _buildRecordId(separator, fields, data) {
      if( typeof(data) === 'object' && Object.keys(data).length ) {
         var s = '', f, i = fields.length;
         while(i--) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return null;
            }
            // we're iterating in reverse (50% faster in IE) so prepend
            s = data[ f ] + (s.length? separator+s : s);
         }
         return s;
      }
      return null;
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

})(ko);


/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

})(ko);

