
(function(ko) {

   /**
    * This implementation of the promise pattern (http://en.wikipedia.org/wiki/Futures_and_promises) is primarily
    * for use via the When() and Handle() methods (below).
    *
    * It returns a deferred pattern that can be resolved, rejected, and from which a Promise pattern can be
    * extracted as a return value.
    *
    * See the README for more details.
    *
    * @constructor
    */
   function Defer() {
      var isDone = false, hasFailed = false, result, fxList = [], errList = [];

      function _addFx(fx) {
         if( typeof(fx) !== 'function' ) { return; }
         if(isDone && !hasFailed) {
            fx.apply(null, result);
         }
         else if( !isDone ) {
            fxList.push(fx);
         }
      }

      function _addErr(fx) {
         if( typeof(fx) !== 'function' ) { return; }
         if(isDone && hasFailed) {
            fx.apply(null, result);
         }
         else if( !isDone ) {
            errList.push(fx);
         }
      }

      var self = {
         then: function(fx, errFx) {
            _addFx(fx);
            _addErr(errFx);
            return self;
         },
         done: function(fx) {
            _addFx(fx);
            return self;
         },
         fail: function(fx) {
            _addErr(fx);
            return self;
         },
         always: function(fx) {
            if( !isDone ) {
               _addFx(fx);
               _addErr(fx);
            }
            else {
               fx.apply(null, result);
            }
            return self;
         },
         callback: function() {
            return function(v) {
               if( v instanceof Error ) {
                  self.reject.apply(self, arguments);
               }
               else {
                  self.resolve.apply(self, arguments);
               }
            }
         },
         errback: function() {
            return function() {
               self.reject.apply(self, arguments);
            }
         },
         resolve: function() {
            if( arguments[0] instanceof Error ) {
               return self.reject.apply(self, arguments);
            }
            else {
               var i = -1, len = fxList.length;
               isDone = true;
               result = _toArray(arguments);
               while(++i < len) {
                  fxList[i].apply(null, result);
               }
               return self;
            }
         },
         reject: function() {
            var i = -1, len = errList.length;
            isDone = true;
            hasFailed = true;
            result = _toArray(arguments);
            while(++i < len) {
               errList[i].apply(null, result);
            }
            return self;
         }
      };

      self.promise = {
         always: self.always,
         then: self.then,
         done: self.done,
         fail: self.fail
      };

      return self;
   }

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
      var def = Defer(), params = _params(arguments);
      try {
         var res = params.fx.apply(params.scope, params.args);
         if( _isPromise(res) ) {
            res.then(function() {
               def.resolve.apply(def, _toArray(arguments));
            }, function() {
               def.reject.apply(def, _toArray(arguments));
            });
            return def.promise;
         }
         else {
            return def.resolve(res).promise;
         }
      }
      catch(e) {
         return def.reject(e).promise;
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
      var def = Defer(), params = _params(arguments, true, def);
      scope || (scope = null);
      try {
         params.fx.apply(params.scope, params.args);
      }
      catch(e) {
         def.reject(e);
      }
      return def.promise;
   }
   Handle.CALLBACK = new Object();
   Handle.ERRBACK  = new Object();

   function _params(arguments, hasPlaceholder, def) {
      var args = _toArray(arguments), fx, scope = null, i = 0;
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
               args[i] = defer.callback();
            }
            else if( a === Handle.ERRBACK ) {
               args[i] = defer.errback();
            }
         }
         if( !hasCallback ) {
            // if none of the arguments are the CALLBACK placeholder
            // then it goes first in the list
            args.unshift(defer.callback());
         }
      }
      else {
         // if there are no arguments (probably the norm) then just apply callback/errback
         // to the first two positions as that's all that makes sense
         args[0] = defer.callback();
         args[1] = defer.errback();
      }
   }

   function _toArray(args) {
      return Array.prototype.slice.call(args);
   }

   function _isPromise(o) {
      return o !== null && (o instanceof Defer || (typeof(o) === 'object' && typeof(o.then) === 'function'));
   }

   ko.sync || (ko.sync = {});
   ko.sync.defer  = Defer;
   ko.sync.when   = When;
   ko.sync.handle = Handle;

})(ko);