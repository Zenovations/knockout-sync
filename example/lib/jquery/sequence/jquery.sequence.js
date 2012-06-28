
(function($) {
   var undef;

   var Sequence = $.Sequence = function() {
      this.master     = $.Deferred();               // the master Deferred object which will resolve after calling end()
      this.returnVals = [];                         // results from all steps as they are fulfilled
      this.fxns       = {};                         // stored here by register() method for use in run()
      this.last       = $.Deferred().resolve(this); // a dummy placeholder, to get the ball rolling
      this.shared     = { pauseEvent: false, abortEvent: false };
   };

   /** @constant unique constant used for handle() method */
   Sequence.CB = new Object();
   /** @constant unique constant used for the handle() method */
   Sequence.PREV = new Object();
   /** @constant unique constant used for the handle() method */
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
    * @return {Sequence}
    */
   Sequence.start = function(fxns) {
      var seq = new Sequence();
      fxns && _registerAll(seq, fxns);
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
      var prev = this.last, def = this.last = $.Deferred();
      prev.then(function() {
         var args = $.makeArray(arguments); // scope
         setTimeout(function() {
            def.resolve.apply(def, args);
         }, milliseconds);
      }, function() {
         def.reject.apply(def, arguments);
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
    *                               object/array at `cbPos`</li>
    *    <li>{int}        cbPos     which position will the callback be spliced into? 0 represents the first
    *                               argument passed to `fx`</li>
    *    <li>{int|string} cbKey     instead of splicing callback into args, insert it into existing object/array
    *                               at `cbPos`</li>
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
    *    {int}        cbPos     if specified, a callback is spliced into the arguments at this position
    *    {string|int} cbKey     if specified, this alters the behavior of `cbPos`;
    *                           the callback is added into an object/array instead of spliced into args
    *    {int}        prevPos   if specified, the return value of previous function in sequence is spliced into args at this position
    *    {string|int} prevKey   if specified, this alters the behavior of `prevPos`;
    *                           the return value is added into an object/array instead of spliced into args
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
      opts = opts || {};

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
    *                               insert it into existing object/array at `cbPos`</li>
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
      this.last = _ex(this.returnVals, this.master, this.last, _wrapFx(this.shared, parms.fx, parms.opts), parms.scope, parms.args, this.shared);
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
    *   <li>`fx` is a string: treat like run()</li>
    *   <li>`opts` has `cbPos` property or `Sequence.CB` in the args list: treat like handle() and use a callback</li>
    *   <li>otherwise, treat like wrap() and use return value</li>
    * </ol>
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
    *          [ promiseFxn, Sequence.PREV, 4 ]               // 6: promiseFxn( 2, 4 )
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
         var i = functions.length, shared = {vals: [], done: 0, max: functions.length, masterDef: $.Deferred()};
         while(i--) { // doesn't matter in which order we call parallel operations
            _parallel(_altParms(master.shared, master.fxns, functions[i]), i, prevVal, shared);
         }
         return shared.masterDef.promise();
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
    * @return {jQuery.Deferred} a promise, see http://api.jquery.com/category/deferred-object/
    */
   Sequence.prototype.end = function() {
      var results = this.returnVals, master = this.master;
      // when the last method fulfills the promise, it will automatically drop its result into this.returnVals
      // so there is no need to evaluate passed to then() callbacks here
      this.last.then(function() {
         // success returns the results
         master.resolve(results);
      }, function() {
         // failure returns the error
         master.reject.call(master, _result(arguments));
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
    * It's important to note that if the current step fails, the entire chain will still be rejected and
    * done()/fail() events may be fired (i.e. this pause() event will never be reached and not take hold).
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
   function _parms(arguments) {
      var args = $.makeArray(arguments), out = { opts: {}, scope: null }, pos = 0;
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
      var i = -1, len = args.length, k, parms, isWrapped;
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
      //todo maybe we should just pre-wrap everything? move it to _parms?
      if( !isWrapped ) { parms.fx = _wrapFx(shared, parms.fx, parms.opts, _isCallback(parms))}
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
      var def = $.Deferred();
      if( masterDef.isResolved() || masterDef.isRejected() ) {
         throw new Error('Cannot execute additional steps on a sequence after end() has been called :(');
      }

      if( prevDef.isRejected() ) {
         // if the chain is already broken, don't add any more steps
         def = prevDef;
      }
      else if( shared.abortEvent ) {
         // an abort has been called but not yet triggered; stop the show
         def.reject(shared.abortEvent);
      }
      else if( shared.pauseEvent ) {
         // just wait around for the pause to end and then call _ex again :)
         _ex(returnVals, masterDef, prefDef, wrappedFx, scope, args, shared).then(function() {
            _resolve(def, shared, $.makeArray(arguments));
         }, function() {
            def.reject.apply(def, $.makeArray(arguments));
         })
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
    * @param {object}    [opts] config parms for how the function should be executed
    * @param {boolean}   [isCallback] does fx return a value or execute a callback?
    * @return {function}
    * @private
    */
   function _wrapFx(shared, fx, opts, isCallback) {
      if( typeof(opts) === 'boolean' ) {
         isCallback = opts;
         opts = {};
      }
      opts = opts||{};

      // the function returns a value and does not execute a callback
      return function(def, scope, args, prevValue) {
         try {
            // execute the function, since it's returning a value, we need to evaluate it
            var v = fx.apply(scope, _fxArgs(shared, def, opts, args, prevValue, isCallback));
            if( !isCallback ) {
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
    * @param  {jQuery.Deferred} def
    * @param  {object}  opts
    * @param  {Array}   args
    * @param            [prevValue]
    * @param  {boolean} hasCallback
    * @return {Array}
    * @private
    */
   function _fxArgs(shared, def, opts, args, prevValue, hasCallback) {
      var i, d, out = $.makeArray(args);
      opts = opts || {};

      if( hasCallback ) {
         // for methods with callbacks, we use _cb() to drop in a function that fulfills our promise object
         _fillPlaceholder(out, Sequence.CB, opts.cbPos, opts.cbKey, _cb(def, shared), 0);
         _fillPlaceholder(out, Sequence.ERR, opts.errPos, opts.errKey, _errCb(def));
      }

      // pass on the results of the previous step
      _fillPlaceholder(out, Sequence.PREV, opts.prevPos, opts.prevKey, prevValue);

      // set some defaults
      if( 'defaults' in opts ) {
         d = opts.defaults;
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
    * Examines `args` object for Sequence.* constants and replaces them with the specified value. If `pos` specifies
    * where the value should be placed, that supersedes placeholders and they are ignored.
    *
    * SIDE EFFECT: this modifies the args array
    *
    * @param {Array}      args
    * @param {Object}     ph    a constant (Sequence.CB, Sequence.PREV, Sequence.ERR)
    * @param {int}        pos   use undef or null to search for the constant instead
    * @param {string|int} key   if `pos` exists, this causes `replacement` to get inserted into array/object at that pos instead of splicing
    * @param replacement        the value to be inserted
    * @param [defaultPos]       if `pos` is not provided and placeholder isn't found, the value is inserted here (or skipped if this is undefined)
    * @private
    */
   function _fillPlaceholder(args, ph, pos, key, replacement, defaultPos) {
      var i, replaceLength = 0, hasPos = _exists(pos), hasKey = _exists(key);
      if( hasPos ) {
         // this supersedes a placeholder
         i = pos;
      }
      else {
         // if no pos, look for the placeholder
         key = 'placeholder';
         i = args.length;
         while(i--) {
            if( args[i] === ph) {
               replaceLength = 1; // this tells splice to replace the value (the placeholder) instead of just splicing
               break;
            }
         }
         if( i < 0 && typeof(defaultPos) == 'number' ) {
            // if no placeholder is found, then we look to see if there is a default (e.g. Sequence.CB defaults to 0)
            i = defaultPos;
         }
      }

      // if pos was specified or we found a placeholder, drop in our value
      if( i >= 0 ) {
         if( hasPos && hasKey ) {
            if( !_exists(args[i]) ) {
               args[i] = typeof(key) === 'string'? {} : [];
            }
            // we're inserting the value into an existing object/array
            args[i][key] = replacement;
         }
         else {
            // we're splicing our value into the args or replacing a placeholder
            args.splice(i, replaceLength, replacement);
         }
      }

      // there is nothing to return since args was passed by reference
      // if Array.slice() or other methods that return a new array are used, this will have to be refactored!
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
            fx.apply(null, arguments);
         }
         catch(e) {
            // we discard then() errors silently :(
            if( typeof(console) === 'object' && typeof(console.error) === 'function' ) {
               // but if the console is open, we can at least note them
               console.error(e);
            }
         }
      }
   }

   /**
    * Just a quick utility to check the number of arguments and return either the first or all values
    * @param {Arguments} arguments
    * @return {*}
    * @private
    */
   function _result(arguments) {
      if( arguments.length > 1 ) { return $.makeArray(arguments); }
      return arguments[0];
   }

   /**
    * True if val is not null or undefined
    * @param val
    * @return {Boolean}
    * @private
    */
   function _exists(val) {
      return val !== undef && val !== null;
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
                     o = f;
                     f = o.fxn;
                     delete o.fxn;
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
    * master promise and give it all of the values.
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
      parms.fx(def, parms.scope, parms.args, prevValue);

      // wait for the function to resolve
      def.done(function() {
         // store the result
         shared.vals[pos] = _result(arguments);

         // if this is the last operation to complete, then resolve the master promise
         if( ++shared.done == shared.max ) {
            shared.masterDef.resolve(shared.vals);
         }
      })
      .fail(function(e) {
         // if this operation fails, we can go ahead and reject the master; no need to wait for results
         shared.masterDef.reject(e);
      });

      return def.promise();
   }

   function _isCallback(parms) {
      if( 'cbPos' in parms ) { return true; }
      var args = parms.args, i = args.length;
      while(i--) {
         if( args[i] === Sequence.CB ) { return true; }
      }
      return false;
   }

})(jQuery);

