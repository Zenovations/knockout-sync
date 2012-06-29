
(function(ko) {

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
    * wait for it to fulfill and resolve with the results.
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

   function _fillPlaceholder(args, def) {
      var i = args.length, pos = 0;
      while(i--) {
         if( args[i] === Handle.CALLBACK ) {
            pos = i;
            break;
         }
      }
      args[pos] = def.callback();
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