/*! Knockout Sync - v0.1.0 - 2012-07-14
* https://github.com/katowulf/knockout-sync
* Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL */

(function(root) {
var ko = this.ko = root.ko, jQuery = this.jQuery = root.jQuery;



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


(function(console) {
   /*********************************************************************************************
    * Make sure console exists because IE blows up if it's not open and you attempt to access it
    * Create some dummy functions if we need to, so we don't have to if/else everything
    *********************************************************************************************/
   console||(console = window.console = {
      /** @param {...*} */
      log: function() {},
      /** @param {...*} */
      info: function() {},
      /** @param {...*} */
      warn: function() {},
      /** @param {...*} */
      error: function() {}
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
   ('group' in console) || (console.group = function(msg) {
      console.log("\n------------\n"+msg+"\n------------");
   });
   ('groupEnd' in console) || (console.groupEnd = function() {
      //console.log("\n\n");
   });

})(window.console);
//     Underscore.js 1.3.3
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore is freely distributable under the MIT license.
//     Portions of Underscore are inspired or borrowed from Prototype,
//     Oliver Steele's Functional, and John Resig's Micro-Templating.
//     For all details and documentation:
//     http://documentcloud.github.com/underscore

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
   var _ = function(obj) { return new wrapper(obj); };

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
   _.VERSION = '1.3.3';

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
         return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
      }
      var reversed = _.toArray(obj).reverse();
      if (context && !initial) iterator = _.bind(iterator, context);
      return initial ? _.reduce(reversed, iterator, memo, context) : _.reduce(reversed, iterator);
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

   // Determine if a given value is included in the array or object using `===`.
   // Aliased as `contains`.
   _.include = _.contains = function(obj, target) {
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
         rand = Math.floor(Math.random() * ++index);
         shuffled[index - 1] = shuffled[rand];
         shuffled[rand] = value;
      });
      return shuffled;
   };

   // Sort the object's values by a criterion produced by an iterator.
   _.sortBy = function(obj, val, context) {
      var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
      return _.pluck(_.map(obj, function(value, index, list) {
         return {
            value : value,
            criteria : iterator.call(context, value, index, list)
         };
      }).sort(function(left, right) {
            var a = left.criteria, b = right.criteria;
            if (a === void 0) return 1;
            if (b === void 0) return -1;
            return a < b ? -1 : a > b ? 1 : 0;
         }), 'value');
   };

   // Groups the object's values by a criterion. Pass either a string attribute
   // to group by, or a function that returns the criterion.
   _.groupBy = function(obj, val) {
      var result = {};
      var iterator = _.isFunction(val) ? val : function(obj) { return obj[val]; };
      each(obj, function(value, index) {
         var key = iterator(value, index);
         (result[key] || (result[key] = [])).push(value);
      });
      return result;
   };

   // Use a comparator function to figure out the smallest index at which
   // an object should be inserted so as to maintain order. Uses binary search.
   _.sortedIndex = function(array, obj, iterator) {
      iterator || (iterator = _.identity);
      var value = iterator(obj);
      var low = 0, high = array.length;
      while (low < high) {
         var mid = (low + high) >> 1;
         iterator(array[mid]) < value ? low = mid + 1 : high = mid;
      }
      return low;
   };

   // Safely convert anything iterable into a real, live array.
   _.toArray = function(obj) {
      if (!obj)                                     return [];
      if (_.isArray(obj))                           return slice.call(obj);
      if (_.isArguments(obj))                       return slice.call(obj);
      if (obj.toArray && _.isFunction(obj.toArray)) return obj.toArray();
      return _.values(obj);
   };

   // Return the number of elements in an object.
   _.size = function(obj) {
      return _.isArray(obj) ? obj.length : _.keys(obj).length;
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

   // Returns everything but the first entry of the array. Aliased as `tail`.
   // Especially useful on the arguments object. Passing an **index** will return
   // the rest of the values in the array from that index onward. The **guard**
   // check allows it to work with `_.map`.
   _.rest = _.tail = function(array, index, guard) {
      return slice.call(array, (index == null) || guard ? 1 : index);
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
   _.uniq = _.unique = function(array, isSorted, iterator) {
      var initial = iterator ? _.map(array, iterator) : array;
      var results = [];
      _.reduce(initial, function(memo, value, index) {
         if (isSorted ? (_.last(memo) !== value || !memo.length) : !_.include(memo, value)) {
            memo.push(value);
            results.push(array[index]);
         }
         return memo;
      }, []);
      return results;
   };

   // Produce an array that contains the union: each distinct element from all of
   // the passed-in arrays.
   _.union = function() {
      return _.uniq(flatten(arguments, true, []));
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
      var rest = flatten(slice.call(arguments, 1), true, []);
      return _.filter(array, function(value){ return !_.include(rest, value); });
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

   // Zip together two arrays -- an array of keys and an array of values -- into
   // a single object.
   _.zipObject = function(keys, values) {
      var result = {};
      for (var i = 0, l = keys.length; i < l; i++) {
         result[keys[i]] = values[i];
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
      var i, l;
      if (isSorted) {
         i = _.sortedIndex(array, item);
         return array[i] === item ? i : -1;
      }
      if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item);
      for (i = 0, l = array.length; i < l; i++) if (array[i] === item) return i;
      return -1;
   };

   // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
   _.lastIndexOf = function(array, item) {
      if (array == null) return -1;
      if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) return array.lastIndexOf(item);
      var i = array.length;
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
            if (more) func.apply(context, args);
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
      var timeout;
      return function() {
         var context = this, args = arguments;
         var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
         };
         var callNow = immediate && !timeout;
         clearTimeout(timeout);
         timeout = setTimeout(later, wait);
         if (callNow) func.apply(context, args);
      };
   };

   // Returns a function that will be executed at most one time, no matter how
   // often you call it. Useful for lazy initialization.
   _.once = function(func) {
      var ran = false, memo;
      return function() {
         if (ran) return memo;
         ran = true;
         return memo = func.apply(this, arguments);
      };
   };

   // Returns the first function passed as an argument to the second,
   // allowing you to adjust arguments, run code before and after, and
   // conditionally execute the original function.
   _.wrap = function(func, wrapper) {
      return function() {
         var args = [func].concat(slice.call(arguments, 0));
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
      return _.map(obj, _.identity);
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
      var result = {};
      each(flatten(slice.call(arguments, 1), true, []), function(key) {
         if (key in obj) result[key] = obj[key];
      });
      return result;
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
   function eq(a, b, stack) {
      // Identical objects are equal. `0 === -0`, but they aren't identical.
      // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
      if (a === b) return a !== 0 || 1 / a == 1 / b;
      // A strict comparison is necessary because `null == undefined`.
      if (a == null || b == null) return a === b;
      // Unwrap any wrapped objects.
      if (a._chain) a = a._wrapped;
      if (b._chain) b = b._wrapped;
      // Invoke a custom `isEqual` method if one is provided.
      if (a.isEqual && _.isFunction(a.isEqual)) return a.isEqual(b);
      if (b.isEqual && _.isFunction(b.isEqual)) return b.isEqual(a);
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
      var length = stack.length;
      while (length--) {
         // Linear search. Performance is inversely proportional to the number of
         // unique nested structures.
         if (stack[length] == a) return true;
      }
      // Add the first object to the stack of traversed objects.
      stack.push(a);
      var size = 0, result = true;
      // Recursively compare objects and arrays.
      if (className == '[object Array]') {
         // Compare array lengths to determine if a deep comparison is necessary.
         size = a.length;
         result = size == b.length;
         if (result) {
            // Deep compare the contents, ignoring non-numeric properties.
            while (size--) {
               // Ensure commutative equality for sparse arrays.
               if (!(result = size in a == size in b && eq(a[size], b[size], stack))) break;
            }
         }
      } else {
         // Objects with different constructors are not equivalent.
         if ('constructor' in a != 'constructor' in b || a.constructor != b.constructor) return false;
         // Deep compare objects.
         for (var key in a) {
            if (_.has(a, key)) {
               // Count the expected number of properties.
               size++;
               // Deep compare each member.
               if (!(result = _.has(b, key) && eq(a[key], b[key], stack))) break;
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
      stack.pop();
      return result;
   }

   // Perform a deep comparison to check if two objects are equal.
   _.isEqual = function(a, b) {
      return eq(a, b, []);
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
      return !!(obj && obj.nodeType == 1);
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

   // Is a given object a finite number?
   _.isFinite = function(obj) {
      return _.isNumber(obj) && isFinite(obj);
   };

   // Is the given value `NaN`?
   _.isNaN = function(obj) {
      // `NaN` is the only value for which `===` is not reflexive.
      return obj !== obj;
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

   // List of HTML entities for escaping.
   var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
   };

   // Regex containing the keys listed immediately above.
   var htmlEscaper = /[&<>"'\/]/g;

   // Escape a string for HTML interpolation.
   _.escape = function(string) {
      return ('' + string).replace(htmlEscaper, function(match) {
         return htmlEscapes[match];
      });
   };

   // If the value of the named property is a function then invoke it;
   // otherwise, return it.
   _.result = function(object, property) {
      if (object == null) return null;
      var value = object[property];
      return _.isFunction(value) ? value.call(object) : value;
   };

   // Add your own custom functions to the Underscore object, ensuring that
   // they're correctly added to the OOP wrapper as well.
   _.mixin = function(obj) {
      each(_.functions(obj), function(name){
         addToWrapper(name, _[name] = obj[name]);
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
   var noMatch = /.^/;

   // Certain characters need to be escaped so that they can be put into a
   // string literal.
   var escapes = {
      '\\':   '\\',
      "'":    "'",
      r:      '\r',
      n:      '\n',
      t:      '\t',
      u2028:  '\u2028',
      u2029:  '\u2029'
   };

   for (var key in escapes) escapes[escapes[key]] = key;
   var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;
   var unescaper = /\\(\\|'|r|n|t|u2028|u2029)/g;

   // Within an interpolation, evaluation, or escaping, remove HTML escaping
   // that had been previously added.
   var unescape = function(code) {
      return code.replace(unescaper, function(match, escape) {
         return escapes[escape];
      });
   };

   // JavaScript micro-templating, similar to John Resig's implementation.
   // Underscore templating handles arbitrary delimiters, preserves whitespace,
   // and correctly escapes quotes within interpolated code.
   _.template = function(text, data, settings) {
      settings = _.defaults(settings || {}, _.templateSettings);

      // Compile the template source, taking care to escape characters that
      // cannot be included in a string literal and then unescape them in code
      // blocks.
      var source = "__p+='" + text
         .replace(escaper, function(match) {
            return '\\' + escapes[match];
         })
         .replace(settings.escape || noMatch, function(match, code) {
            return "'+\n((__t=(" + unescape(code) + "))==null?'':_.escape(__t))+\n'";
         })
         .replace(settings.interpolate || noMatch, function(match, code) {
            return "'+\n((__t=(" + unescape(code) + "))==null?'':__t)+\n'";
         })
         .replace(settings.evaluate || noMatch, function(match, code) {
            return "';\n" + unescape(code) + "\n__p+='";
         }) + "';\n";

      // If a variable is not specified, place data values in local scope.
      if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

      source = "var __t,__p='',__j=Array.prototype.join," +
         "print=function(){__p+=__j.call(arguments,'')};\n" +
         source + "return __p;\n";

      var render = new Function(settings.variable || 'obj', '_', source);
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

   // The OOP Wrapper
   // ---------------

   // If Underscore is called as a function, it returns a wrapped object that
   // can be used OO-style. This wrapper holds altered versions of all the
   // underscore functions. Wrapped objects may be chained.
   var wrapper = function(obj) { this._wrapped = obj; };

   // Expose `wrapper.prototype` as `_.prototype`
   _.prototype = wrapper.prototype;

   // Helper function to continue chaining intermediate results.
   var result = function(obj, chain) {
      return chain ? _(obj).chain() : obj;
   };

   // A method to easily add functions to the OOP wrapper.
   var addToWrapper = function(name, func) {
      wrapper.prototype[name] = function() {
         var args = slice.call(arguments);
         unshift.call(args, this._wrapped);
         return result(func.apply(_, args), this._chain);
      };
   };

   // Add all of the Underscore functions to the wrapper object.
   _.mixin(_);

   // Add all mutator Array functions to the wrapper.
   each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
      var method = ArrayProto[name];
      wrapper.prototype[name] = function() {
         var obj = this._wrapped;
         method.apply(obj, arguments);
         if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
         return result(obj, this._chain);
      };
   });

   // Add all accessor Array functions to the wrapper.
   each(['concat', 'join', 'slice'], function(name) {
      var method = ArrayProto[name];
      wrapper.prototype[name] = function() {
         return result(method.apply(this._wrapped, arguments), this._chain);
      };
   });

   // Start chaining a wrapped Underscore object.
   wrapper.prototype.chain = function() {
      this._chain = true;
      return this;
   };

   // Extracts the result from a wrapped and chained object.
   wrapper.prototype.value = function() {
      return this._wrapped;
   };

}).call(this);
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
   ko.sync.stores || (ko.sync.stores = []);

   ko.sync.use = function(model, target) {}; //todo
   ko.sync.newView = function(model) {}; //todo
   ko.sync.newList = function(model) {}; //todo

   ko.sync.when   = When;
   ko.sync.handle = Handle;

   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(jQuery, ko);
/*******************************************
 * Model for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   var Model = Class.extend({
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
      sortField: null,
      valid:     null, //todo tie this to this.validator?
      updateCounter: 'update_counter',
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


   ko.sync || (ko.sync = {});

   /**
    * @param {object} props
    * @constructor
    */
   ko.sync.Model = Model;

})(this.ko);
/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var undef;

   var Record = Class.extend({
      /**
       * @param {ko.sync.Model}  model
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
         this.listeners = [];
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
      getData:         function() {
         return ko.utils.extend({}, this.data);
      },
      get:             function(field) {
         return this.data[field];
      },
      set:             function(field, val, suppressNotifications) {
         if( this.data.hasOwnProperty(field) && this.data[field] !== val ) {
            this.changed = true;
            //todo validate!
            this.data[field] = val;
            if( ! suppressNotifications ) {
               _updateListeners(this.listeners, this);
            }
            return true;
         }
         return false;
      },
      isDirty:         function(newVal) {
         if( typeof(newVal) === 'boolean' ) {
            this.changed = newVal;
         }
         return this.changed;
      },
      clearDirty:      function() {
         return this.isDirty(false);
      },
      isValid:         function() {
         return !this.validator || this.validator.validate(this);
      },
      /**
       * @param {Record|object} newVals
       */
      updateAll: function(newVals) {
         var k, data = (newVals instanceof Record)? newVals.getData() : newVals, changes = false;
         for(k in data) {
            if( data.hasOwnProperty(k) ) {
               changes |= this.set(k, data[k], true);
            }
         }
         if( changes ) {
            _updateListeners(this.listeners, this);
         }
         return this.changed;
      },
      /**
       * Invokes `callback` with this record object whenever a change occurs to the data
       */
      subscribe: function(callback) {
         this.listeners.push(callback);
      }
   });

   function _setFields(fields, data) {
      var k, out = {}, keys = _.keys(fields), i = keys.length;
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

   function _updateListeners(callbacks, value) {
      var i = -1, len = callbacks.length;
      while(++i < len) {
         callbacks[i](value);
      }
   }

   ko.sync || (ko.sync = {});
   ko.sync.Record = Record;

})(this.ko);


/*******************************************
 * RecordId class for knockout-sync
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
         _.isArray(fields) || (fields = [fields]);
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
   RecordId.DEFAULT_SEPARATOR = '|';
   RecordId.for = function(model, record) {
      return new RecordId(model.primaryKey, record.getData());
   };

   function _isTempId(hash) {
      return (hash && hash.match(/^tmp[.][0-9]+:[0-9]+[.]/))? true : false;
   }

   function _createTempHash() {
      return _.uniqueId('tmp.'+ko.sync.instanceId+'.');
   }

   function _createHash(separator, fields, data) {
      if( typeof(data) === 'object' && !_.isEmpty(data) ) {
         var s = '', f, i = fields.length;
         while(i--) {
            f = fields[i];
            // if any of the composite key fields are missing, there is no key value
            if( !exists(data[f]) ) {
               return _createTempHash();
            }
            // we're iterating in reverse (50% faster in IE) so prepend
            s = data[ f ] + (s.length? separator+s : s);
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

})(this.ko);


/*******************************************
 * RecordList class for knockout-sync
 *******************************************/
(function() {
   "use strict";

   var ko = this.ko;
   var _ = this._;

   /**
    * @var ko.sync.RecordList
    * @param {ko.sync.Model} model
    * @param {Array} [records] ko.sync.Record objects to initialize the list
    * @constuctor
    */
   var RecordList = function(model, records) {
      this.changed = [];
      this.added   = [];
      this.deleted = [];
      this.dirty   = false;
      this.model   = model;
      this.recs    = {};
      if( records ) { this.load(records); }
   };

   RecordList.prototype.checkpoint = function() {
      this.changed = [];
      this.added   = [];
      this.deleted = [];
      this.dirty   = false;
   };

   RecordList.prototype.store = function() {
      //todo
   };

   RecordList.prototype.iterator = function() {
      return new RecordList.Iterator(this);
   };

   RecordList.prototype.isDirty = function() {
      return this.dirty;
   };

   RecordList.prototype.add = function(record) {
      if( _.isArray(record) ) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.add(record[i]);
         }
      }
      else {
         record.isDirty(true);
         var key = record.hashKey();
         this.added.push(key);
         this.dirty = true;
         this.load(record);
      }
   };

   RecordList.prototype.load = function(record) {
      if(_.isArray(record)) {
         var i = -1, len = record.length;
         while(++i < len) {
            this.load(record[i]);
         }
      }
      else {
         record.subscribe(_.bind(this.updated, this));
         var key = record.hashKey();
         this.recs[key] = record;
      }
   };

   RecordList.prototype.remove = function(recordOrId) {
      var record = _findRecord(this.recs, recordOrId);
      if( record ) {
         var key = record.hashKey();
         record.isDirty(true);
         this.dirty = true;
         this.deleted.push(record);
         delete this.recs[key];
         ko.utils.arrayRemoveItem(this.recs, record);
      }
      else {
         console.log('could not find record', recordOrId);
         console.log(this.recs);
      }
   };

   /**
    * @param {ko.sync.Record} record
    * @param {string} [state]
    */
   RecordList.prototype.updated = function(record, state) {
      switch(state) {
         case 'deleted':
            this.remove(record);
            break;
         case 'added':
            this.add(record);
            break;
         default:
            if( state && state !== 'updated' ) {
               throw new Error('Invalid status '+state);
            }
            if( record.isDirty() && record.hashKey() in this.recs ) {
               this.changed.push(record);
               this.dirty = true;
            }
      }
      return true;
   };

   RecordList.Iterator = function(list) {
      this.curr = -1;
      // snapshot to guarantee iterator is not mucked up if synced records update during iteration
      this.recs = _.toArray(list.recs);
      this.len  = this.recs.length;
   };

   RecordList.Iterator.prototype.size    = function() { return this.len; };
   RecordList.Iterator.prototype.reset   = function() { this.curr = -1; };
   RecordList.Iterator.prototype.next    = function() { return this.hasNext()? this.recs[++this.curr] : null; };
   RecordList.Iterator.prototype.prev    = function() { return this.hasPrev()? this.recs[--this.curr] : null; };
   RecordList.Iterator.prototype.hasPrev = function() { return this.len && this.curr > 0; };
   RecordList.Iterator.prototype.hasNext = function() { return this.len && this.curr < this.len-1; };

   function _keyFor(recOrId) {
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

   function _findRecord(list, recOrId) {
      var key = _keyFor(recOrId);
      if( key === null ) {
         console.log('no key for '+recOrId);
         return null;
      }
      else {
         console.log('key for '+recOrId);
         return list[ key.hashKey() ];
      }
   }

   ko.sync || (ko.sync = {});
   ko.sync.RecordList = RecordList;

}).call(this);


/*******************************************
 * Store interface for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";

   ko.sync || (ko.sync = {});

   /**
    * Store interface describing how Store implementations should work and providing instanceof and extensibility
    *
    * @interface
    */
   var Store = ko.sync.Store = Class.extend({
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
       * @return {Promise} a jQuery.Deferred().promise() object
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
       * @return {Promise} resolves to true if an update occurred or false if data was not dirty
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
       * Perform a query against the database. The options for query are fairly limited:
       *
       * - limit:   {int=100}      number of records to return, use 0 for all
       * - offset:  {int=0}        starting point in records, e.g.: {limit: 100, start: 101} would return records 101-200
       * - filter:  {function|object}  filter rows using this function or value map
       * - sort:    {array|string} Sort returned results by this field or fields. Each field specified in sort
       *                           array could also be an object in format {field: 'field_name', desc: true} to obtain
       *                           reversed sort order
       *
       * USE OF FILTER
       * -------------
       * When `filter` is a function, it is always applied after the results are returned. Thus, when used in conjunction
       * with `limit`, there may (and probably will) be less results than `limit` en toto.
       *
       * When `filter` is a hash (key/value pairs), the application of the parameters is left up to the discretion of
       * the store. For SQL-like databases, it may be part of the query. For data stores like Simperium, Firebase, or
       * other No-SQL types, it could require fetching all results from the table and filtering them on return. So
       * use this with discretion.
       *
       * THE PROGRESS FUNCTION
       * ---------------------
       * Each record received is handled by `progressFxn`. When no limit is set, stores may never fulfill
       * the promise. This is a very important point to keep in mind.
       *
       * Additionally, even if a limit is set, if the number of results is less than limit, the promise may
       * still never fulfill (as stores will not fulfill until the required number of results is reached).
       *
       * In the case of a failure, the fail() method on the promise will always be notified immediately, and the load
       * operation will end immediately.
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
       * @param {Function} progressFxn
       * @param {ko.sync.Model}  model
       * @param {object} [parms]
       * @return {Promise}
       */
      query: function(progressFxn, model, parms) { throw new Error('Interface not implemented'); },

      /**
       * Given a particular data model, get notifications of any changes to the data. The change notifications will
       * come in the form:
       *
       *   - callback('added', {string}record_id, {object}hash_of_name_value_pairs)
       *   - callback('deleted', {string}record_id)
       *   - callback('updated', {string}record_id, {object}hash_of_name_value_pairs)
       *
       * @param {ko.sync.Model} model
       * @param {Function} callback
       * @return {Store} this
       */
      sync: function(model, callback) { throw new Error('Interface not implemented'); }

   });

})(this.ko);

}).call({}, this);

