/*! Knockout Sync - v0.1.0 - 2012-07-02
* https://github.com/katowulf/knockout-sync
* Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL */

/**
 * https://github.com/katowulf/jquery-sequence
 */
(function($){var j;var l=$.Sequence=function(){this.master=$.Deferred();this.returnVals=[];this.fxns={};this.last=$.Deferred().resolve(this);this.shared={pauseEvent:false,abortEvent:false,lastIf:j};this.fxns.wait=_wrapFx(this.shared,function(a,b){var c=$.Deferred();_waitFor(a).then(function(){c.resolve(b)});return c},{prevPos:1})};l.CB=new Object();l.PREV=new Object();l.ERR=new Object();l.start=function(a){var b=new l();a&&_registerAll(b,a);return b};l.prototype.wait=function(b){var c=this.last,def=this.last=$.Deferred(),shared=this.shared;c.then(function(){var a=$.makeArray(arguments);_waitFor(b).then(function(){_resolve(def,shared,a)})},function(){def.reject.apply(def,_result(arguments))});return this};l.prototype.handle=function(a,b,c){var d=_parms(arguments);this.last=_ex(this.returnVals,this.master,this.last,_wrapFx(this.shared,d.fx,d.opts,true),d.scope,d.args,this.shared);return this};l.prototype.run=function(a,b){var c=$.makeArray(arguments);a=(typeof(c[0])==='object')?c.shift():null;b=c.shift();if(!(b in this.fxns)){throw new Error('invalid function name "'+b+'" (did you forget to call register?)');}this.last=_ex(this.returnVals,this.master,this.last,this.fxns[b],a,c,this.shared);return this};$.Sequence.prototype._=$.Sequence.prototype.run;l.prototype.register=function(a,b,c){c=$.extend({},c);if((a in this)){throw new Error(a+' already exists in Sequence, it cannot be overwritten by register() :(');}this[a]=function(){return this.run.apply(this,[a].concat($.makeArray(arguments)))};this.fxns[a]=_wrapFx(this.shared,b,c,('cbPos'in c));return this};l.prototype.wrap=function(a,b,c){var d=_parms(arguments);this.last=_ex(this.returnVals,this.master,this.last,_wrapFx(this.shared,d.fx,d.opts,false),d.scope,d.args,this.shared);return this};l.prototype.then=function(a,b){this.last.then(_catch(a),_catch(b));return this};l.prototype.parallel=function(b){var c=this;return this.wrap(function(a){var i=b.length,sharedContext={vals:[],done:0,max:b.length,masterDef:$.Deferred()};while(i--){_parallel(_altParms(c.shared,c.fxns,b[i]),i,a,sharedContext)}return sharedContext.masterDef.promise()},l.PREV)};l.prototype.if=function(c,d,e){var f=$.makeArray(arguments),fxns=this.fxns,shared=this.shared;c=f.shift();return this.wrap(function(a){shared.lastIf=c(a,shared.lastIf);if(shared.lastIf){var b=_altParms(shared,fxns,f),def=$.Deferred();b.fx(def,b.scope,b.args,a);return def.promise()}else{return a}},l.PREV)};l.prototype.end=function(a){var b=this.returnVals,master=this.master;this.last.then(function(){master.resolve(b)},function(){if(a){throw _result(arguments);}else{master.reject.call(master,_result(arguments))}});return master.promise()};l.prototype.pause=function(){this.shared.pauseEvent=$.Deferred();return this};l.prototype.unpause=function(){var e=this.shared.pauseEvent;e&&e.resolve();return this};l.prototype.abort=function(a){var e=this.shared.abortEvent=new Error(a||'Sequence aborted');e.sequenceAborted=true;if(this.shared.pauseEvent){this.shared.pauseEvent.reject(e)}return this};function _parms(a){var b=$.makeArray(a),out={opts:{},scope:null},pos=0;while(b.length&&pos++<3){if($.isFunction(b[0])){out.fx=b.shift();break}else if($.isPlainObject(b[0])){out.opts=$.extend({},b.shift())}else if(typeof(b[0])==='object'){out.scope=b.shift()}else if(b[0]!==null){throw new Error('Invalid argument '+b[0]+' at pos '+pos);}}if(!('fx'in out)){throw new Error('Function to call was not included in arguments');}out.args=b;return out}function _altParms(a,b,c){var i=-1,len=c.length,k,parms,isWrapped,wait=0;outer:while(++i<len&&i<3){switch(typeof(c[i])){case'string':k=c[i];if(!(k in b)){throw new Error('Invalid function name '+k);}c[i]=b[k];isWrapped=true;break outer;case'function':isWrapped=false;break outer;default:}}parms=_parms(c);parms.wait=wait;if(!isWrapped){parms.fx=_wrapFx(a,parms.fx,parms.opts,_usesCallback(parms))}return parms}function _ex(a,b,c,d,e,f,g){var h=$.Deferred();if(b.isResolved()||b.isRejected()){throw new Error('Cannot execute additional steps on a sequence after end() has been called :(');}if(c.isRejected()){h=c}else if(g.abortEvent){h.reject(g.abortEvent)}else if(g.pauseEvent){_ex(a,b,c,d,e,f,g).then(function(){_resolve(h,g,$.makeArray(arguments))},function(){h.reject.apply(h,$.makeArray(arguments))})}else{c.then(function(){d(h,e,f,_result(arguments))},function(){h.reject.apply(h,arguments)});h.always(function(){if(!c.isRejected()){a.push(_result(arguments))}})}return h}function _wrapFx(f,g,h,i){return function(a,b,c,d){try{var v=g.apply(b,_fxArgs(c,_ctx(f,h,a,i,d)));if(!i){if(_isDeferred(v)){v.then(function(){_resolve(a,f,$.makeArray(arguments))},function(){a.reject.apply(a,arguments)})}else if(v instanceof Error){a.reject(v)}else{_resolve(a,f,[v])}}}catch(e){a.reject(e)}}}function _resolve(a,b,c){if(b.abortEvent){a.reject(b.abortEvent)}else if(b.pauseEvent){b.pauseEvent.then(function(){a.resolve.apply(a,c)},function(e){a.reject(e)})}else{a.resolve.apply(a,c)}}function _fxArgs(a,b){var i,d,out=$.makeArray(a);m.fill(out,b);if('defaults'in b.opts){d=b.opts.defaults;i=d.length;while(i--){if(!_exists(out[i])){out[i]=d[i]}else if(typeof(d[i])==='object'&&typeof(out[i])==='object'){out[i]=$.extend(true,{},d[i],out[i])}}}return out}function _cb(a,b){return function(v){if(v instanceof Error){a.reject.apply(a,arguments)}else{_resolve(a,b,$.makeArray(arguments))}}}function _errCb(a){return function(){a.reject.apply(a,arguments)}}function _ctx(a,b,c,d,e){return{shared:a,opts:$.extend({},b),prev:e,def:c,placeholders:d?['cb','err','prev']:['prev']}}function _catch(b){if(!b){return j}return function(){try{b.apply(null,$.makeArray(arguments))}catch(e){var a=(typeof window.console=='object')?window.console:{error:function(){}};a.error(e)}}}function _result(a){if(a.length>1){return $.makeArray(a)}return a[0]}function _exists(a){return a!==j&&a!==null&&a!==''}function _isDeferred(o){return typeof(o)==='object'&&('then'in o)&&('always'in o)&&('fail'in o)}function _registerAll(a,b){var k,o,f;if(b&&$.isPlainObject(b)){for(k in b){if(b.hasOwnProperty(k)){f=b[k];switch(typeof(f)){case'function':o=null;break;case'object':o=f;f=o.fxn||o.fx;delete o.fxn;break;default:throw new Error('each element of hash passed into start() must be an object or function');}a.register(k,f,o)}}}}function _parallel(a,b,c,d){var f=$.Deferred();if(a.opts.wait>0){setTimeout(function(){a.fx(f,a.scope,a.args,c)},a.opts.wait)}else{a.fx(f,a.scope,a.args,c)}f.done(function(){d.vals[b]=_result(arguments);if(++d.done==d.max){d.masterDef.resolve(d.vals)}}).fail(function(e){d.masterDef.reject(e)});return f.promise()}function _usesCallback(a){if('cbPos'in a.opts){return true}var b=a.args,i=b.length;while(i--){if(b[i]===l.CB){return true}}return false}var m={};(function(d){m.fill=function(a,b){var p,k,len,keys=b.placeholders,i=keys.length,fromOpts=[],fromPlaceholders=[];while(i--){k=keys[i];p=_positionPlaceholder(a,b.opts,k);if(p.pos>-1){p.val=_valFor(k,b);(p.fromPlaceholder&&fromPlaceholders.push(p))||fromOpts.push(p)}}fromPlaceholders.sort(_sortPlaceholders);fromOpts.sort(_sortPlaceholders);len=fromPlaceholders.length;for(i=0;i<len;i++){p=fromPlaceholders[i];a[p.pos]=p.val}len=fromOpts.length;for(i=0;i<len;i++){_addToArgs(a,fromOpts[i])}};function _positionPlaceholder(a,b,c){var i,ph=_phFor(c),defaultPos=_defaultPosFor(c),optsPos=c+'Pos',optsKey=c+'Key',out={prefix:c,pos:-1,key:d,fromPlaceholder:false},hasPos=(optsPos in b&&b[optsPos]>=0),hasKey=(optsKey in b&&typeof(b[optsKey])in{number:1,string:1});if(hasPos){out.pos=b[optsPos];if(hasKey){out.key=b[optsKey]}}else{i=a.length;while(i--){if(a[i]===ph){out.pos=i;out.fromPlaceholder=true;break}}if(i<0&&typeof(defaultPos)=='number'){out.pos=defaultPos}}return out}function _sortPlaceholders(a,b){return a.pos-b.pos}function _containerFor(k){return typeof(k)==='number'?[]:{}}function _addToArgs(a,p){var b=(p.key!==d),ins=(a.length<p.pos+1);if(b){if(ins){a[p.pos]=_containerFor(p.key)}a[p.pos][p.key]=p.val}else{if(ins){a[p.pos]=p.val}else{a.splice(p.pos,0,p.val)}}}function _phFor(k){switch(k){case'cb':return l.CB;case'err':return l.ERR;case'prev':return l.PREV;default:throw new Error('Invalid placeholder type (must be one of cb/err/prev): '+k);}}function _defaultPosFor(k){switch(k){case'cb':return 0;case'err':return false;case'prev':return false;default:throw new Error('Invalid placeholder type (must be one of cb/err/prev): '+k);}}function _valFor(k,a){switch(k){case'cb':return _cb(a.def,a.shared);case'err':return _errCb(a.def);case'prev':return a.prev;default:throw new Error('Invalid placeholder type (must be one of cb/err/prev): '+k);}}})();function _waitFor(c){var d=new Date().getTime(),def=$.Deferred();setTimeout(function(){var a=new Date().getTime()-d;if(a<c){var b=setInterval(function(){if(new Date().getTime()-d>=c){clearInterval(b);def.resolve(true)}},a)}else{def.resolve(true)}},c);return def.promise()}function _remove(a,b,c){var d=a.slice((c||b)+1||a.length);a.length=b<0?a.length+b:b;return a.push.apply(a,d)}})(jQuery);



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

(function(ko) {

   ko.sync || (ko.sync = {});

   function Model(props) {
      var defaults = ko.utils.extend({
         type: 'string',
         required: false,
         persist: true,
         observe: true,
         minLength: 0,
         maxLength: 0,
         valid:     null, //todo tie this to this.validator?
         format:    function(v) { return v; }
      }, props.defaults);

      this.store     = props.dataStore;
      this.table     = props.dataTable;
      this.key       = props.primaryKey;
      this.sort      = props.priorityField;
      this.validator = props.validator;
      this.fields    = _processFields(defaults, props.fields);
      this.recordFactory = new RecordFactory(this);
   }

   Model.prototype.new = function(data) {}; //todo

   function _processFields(defaults, fields) {
      var out = [], o;
      for (var k in fields) {
         if (fields.hasOwnProperty(k)) {
            o = ko.utils.extend(defaults, fields[k]);
            _applyDefault(o);
            out.push(o);
         }
      }
      return out;
   }

   function _applyDefault(o) {
      if( !o.hasOwnProperty('default') || !o.default ) {
         switch(o.type) {
            case 'boolean':
               o.default = false;
               break;
            case 'int':
            case 'float':
            case 'date':
               o.default = 0;
               break;
            case 'string':
            case 'email':
            default:
               o.default = null;
         }
      }
   }

   function RecordFactory(model) {} //todo
   RecordFactory.create = function(data) {};

   function Record() {} //todo
   Record.prototype.hasKey = function() {}; //todo
   Record.prototype.getKey = function() {}; //todo

})(ko);




(function(ko) {
   var undef;

   function FirebaseStore(url, base) {
      this.base = new Firebase(url).child(base);
   }

   FirebaseStore.RECORD_ID = new Object();

   FirebaseStore.prototype.create = function(model, record) {
      return ko.sync.handle(this, function(cb, eb) { // creates a promise
         var table = this.base.child(model.dataTable),
             key = record.hasKey()? record.getKey() : undef,
             ref = _buildRecord(table, key);
         ref.set(cleanData(model.fields, record.getData()), function(success) {
            (success && cb(ref.name())) || eb(ref.name());
         });
      });
   };

   FirebaseStore.prototype.read         = function(model, recOrId) {
      return ko.sync.handle(this, function(cb) {
         var table = this.base.child(model.dataTable),
             key   = _idFor(recOrId),
             ref   = _buildRecord(table, key);
         ref.once('value', function(snapshot) {
            cb(snapshot.val());
         });
      });
   };

   FirebaseStore.prototype.update       = function(model, rec) {}; //todo
   FirebaseStore.prototype.delete       = function(model, recOrId) {}; //todo
   FirebaseStore.prototype.query        = function(model, params) {}; //todo

   FirebaseStore.prototype.sync         = function(callback) {}; //todo
   FirebaseStore.prototype.onDisconnect = function(callback) {}; //todo
   FirebaseStore.prototype.onConnect    = function(callback) {}; //todo

   /** UTILITIES
    *****************************************************************************************/

   /**
    * Create or load a record to receive data. For new records, data/key are not necessary.
    *
    * @param table
    * @param {string} [key]
    * @return {Firebase}
    * @private
    */
   function _buildRecord(table, key) {
      return key? table.child(key) : table.push();
   }

   function exists(data, key) {
      var val = data && key && data.hasOwnProperty(key)? data[key] : undef;
      return  val !== null && val !== undef;
   }

   function cleanData(fields, data) {
      var k, cleaned = {};
      for(k in fields) {
         if( fields.hasOwnProperty(k) ) {
            cleaned[k] = cleanValue(fields[k].type, data, k);
         }
      }
      return cleaned;
   }

   function getDefaultValue(type) {
      switch(type) {
         case 'boolean':
            return false;
         case 'int':
            return 0;
         case 'float':
            return 0;
         case 'string':
         case 'email':
         case 'date':
            return null;
         default:
            throw new Error('Invaild field type '+type);
      }
   }

   function cleanValue(type, data, k) {
      if( !exists(data, k) ) {
         return getDefaultValue(type);
      }
      else {
         var v = data[k];
         switch(type) {
            case 'boolean':
               return v? true : false;
            case 'int':
               v = parseInt(v);
               return isNaN(v)? getDefaultValue(type) : v;
            case 'float':
               v = parseFloat(v);
               return isNaN(v)? getDefaultValue(type) : v;
            case 'date':
               return _formatDate(v);
            case 'string':
            case 'email':
               return v + '';
            default:
               throw new Error('Invaild field type '+type);
         }
      }
   }

   function _formatDate(v) {
      if( typeof(v) === 'object' ) {
         if( v.toISOString ) {
            return v.toISOString();
         }
         else if( typeof(moment) === 'object' && moment.isMoment && moment.isMoment(v) ) {
            return moment.defaultFormat()
         }
      }
      return getDefaultValue('date');
   }

   function _idFor(recOrId) {
      if( typeof(recOrId) === 'object' && recOrId.getKey ) {
         return recOrId.getKey();
      }
      else {
         return recOrId;
      }
   }

   if (!Date.prototype.toISOString) {
      Date.prototype.toISOString = function() {
         function pad(n) { return n < 10 ? '0' + n : n }
         return this.getUTCFullYear() + '-'
               + pad(this.getUTCMonth() + 1) + '-'
               + pad(this.getUTCDate()) + 'T'
               + pad(this.getUTCHours()) + ':'
               + pad(this.getUTCMinutes()) + ':'
               + pad(this.getUTCSeconds()) + 'Z';
      };
   }

//
//   function isTempId(data, key) {
//      var v = data && key && data.hasOwnProperty(key)? data[key] : null;
//      return typeof(v) === 'number' && v < 0;
//   }
//
//   function isPermanentId(data, key) {
//      var v = data && key && data.hasOwnProperty(key)? data[key] : null;
//      return v && typeof(v) === 'string';
//   }

   /** ADD TO NAMESPACE
    ******************************************************************************/

   ko.sync || (ko.sync = {stores: []});
   ko.sync.stores.FirebaseStore = FirebaseStore;

})(ko);