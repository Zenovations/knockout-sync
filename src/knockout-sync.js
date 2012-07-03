
(function($, ko) {

   ko.extenders.sync = function(target, startDirty) {
      target.crud = {
         /**
          * @param {boolean} [newValue]
          * @return {boolean}
          */
         isDirty: ko.observable(startDirty)
      };

      //todo should be checking to see if persist or observe are true
      //todo and probably simplifying this
      target.subscribe(function(newValue) { target.crud.isDirty(true); });

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
      var def = $.Deferred(), params = _params(_toArray(arguments));
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
      var def = $.Deferred(), params = _params(_toArray(arguments), true, def);
      scope || (scope = null);
      try {
         console.log('applying fx', params.fx);
         params.fx.apply(params.scope, params.args);
         console.log('done applying fx', params.fx);
      }
      catch(e) {
         console.warn('Handle rejected', e);
         def.reject(e);
      }
      return def.promise();
   }
   Handle.CALLBACK = new Object();
   Handle.ERRBACK  = new Object();

   function _params(args, hasPlaceholder, def) {
      var fx, scope = null, i = 0;
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