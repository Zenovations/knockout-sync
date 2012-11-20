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
         this.next      = $.Deferred().resolve();

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
         var list, def;
         if( this.list && this.list.isDirty() ) {
            list = this.list;
            def = pushAll(list, this.model, this.sharedContext).then(function() { list.checkpoint(); });
            this.next.pipe(pipeWhen(def));
         }
         else if( this.rec && this.rec.isDirty() ) {
            def = pushNextUpdate(this.model, this.sharedContext, this.rec);
            this.rec.isDirty() && this.next.pipe(pipeWhen(def));
         }
         else {
            this.next.pipe(pipeWhen(true));
         }
         return this.next;
      },

      promise: function() {
         return this.when.promise().pipe($.when(this.sharedContext.defer));
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
      console.log('_watchStoreRecord');//debug
      var model = c.model, ctx = c.sharedContext;

      if( !rec.hasKey() ) {
         // create the record if we are using auto-sync and it doesn't exist
         pushNextUpdate(model, ctx, rec, 'added');
      }

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
               syncToData(c, target, 'updated', record, fieldsChanged);
               break;
            default:
               model.auto && pushNextUpdate(model, ctx, record);
               nextEvent(ctx, 'pull', id, function() { syncToData(c, target, 'updated', record, fieldsChanged) });
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
            var data = c.isList? getDataFromObsArray(c.sharedContext, target, model, id) : ko.utils.unwrapObservable(target);
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
         action || (action = rec.hasKey()? 'updated' : 'added');
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
      console.log('cacheKeysForObsArray', cache);
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

   function pipeWhen(def) {
      return function() { return $.when(def); };
   }

})(jQuery);

