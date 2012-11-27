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
         this.model      = model;
         this.isList     = listOrRecord instanceof ko.sync.RecordList;
         this.observed   = ko.isObservable(target);
         this.twoway     = model.store.hasTwoWaySync();
         this.running    = null; //used by pushUpdates
         this.queued     = null; //used by pushUpdates

         this.sharedContext.keyFactory = new ko.sync.KeyFactory(model, true);

         if( this.isList && !ko.sync.isObservableArray(target) ) {
            throw new Error('When syncing a RecordList, the target must be a ko.observableArray');
         }

         if( this.isList ) {
            syncObsArray(target, listOrRecord);
            this.list = listOrRecord;
            this.twoway && this.subs.push(_watchStoreList(this, listOrRecord, target, criteria));
            this.subs.push(_watchRecordList(this, listOrRecord, target));
            this.subs.push(_watchObsArray(this, target, listOrRecord));
         }
         else {
            this.rec = listOrRecord;
            ko.sync.Record.applyWithObservables(findTargetDataSource(this, target), this.rec);
            this.twoway && this.subs.push(_watchStoreRecord(this, listOrRecord, target));
            this.subs.push(_watchRecord(this, listOrRecord, target));
            this.observed && this.subs.push(_watchObs(this, target, listOrRecord));
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
       *
       * This works off a queue. At most, there is one update running and one queued to run in the near future. Multiple
       * requests will simple receive the promise for the already queued run. The reason for this approach is that
       * you can't depend on one that is already running to handle anything that it received after starting, but
       * everything received before the queued update runs can go as a batch, so any number of calls to pushUpdates
       * may be lumped together in this way.
       *
       * @return {jQuery.Deferred} fulfilled when all updates are marked completed by the server
       */
      pushUpdates: function() {
         var def;
         if( this.running ) {
            // since our running copy might have missed updates before this was invoked, we'll queue another
            // (which hurts nothing if there are no changes; nothing gets sent)
            if( !this.queued ) { // but we never need to queue multiples, the next run will get everything outstanding
               this.queued = queueUpdateAll(this, this.running).progress(function(def) {
//                  console.log('starting queued instance');
               })
            }
            def = this.queued;
         }
         else {
            def = this.running = runUpdateAll(this.model, this.sharedContext, this.list, this.rec).always(function() {
               this.running = this.queued? this.queued : null;
               this.queued = null;
            }.bind(this));
         }
         return def.promise();
      }
   });

   function _watchStoreList(c, list, target, criteria) {
      var model = c.model, ctx = c.sharedContext;
      return model.store.watch(model, nextEventHandler(ctx, 'pull', idCallback(1),
         function(action, name, value, prevSibling) {
            var rec = list.find(name), key;
            if( !rec && action !== 'added' ) {
               console.debug('action invalid (record does not exist in this list)', action, name);
               return;
            }
            switch(action) {
               case 'added':
                  list.add(model.newRecord(value), prevSibling || 0);
                  break;
               case 'deleted':
                  key = rec.hasKey() && rec.hashKey();
                  key && !(key in list.changes.deleted) && list.remove(rec);
                  break;
               case 'updated':
                  rec.updateAll(value);
                  break;
               case 'moved':
                  list.move(rec, prevSibling || 0);
                  break;
               default:
                  console.error('invalid action', _.toArray(arguments));
            }
            //todo-diff this assumes no changes were made on client in the interim, how to we reconcile local edits and server updates?
            rec && rec.isDirty(false); // record now matches server
         }), criteria);
   }

   /**
    * Sync record with store when auto-sync is true
    * @param {SyncController} sync
    * @param {ko.sync.Record} rec
    * @param {Object} target
    * @return {jQuery.Deferred}
    * @private
    */
   function _watchStoreRecord(sync, rec, target) {
      var model = sync.model, ctx = sync.sharedContext;

      if( !rec.hasKey() ) {
         // create the record if we are using auto-sync and it doesn't exist
         pushNextUpdate(model, ctx, rec, 'added');
      }

      return model.store.watchRecord(model, rec, nextEventHandler(ctx, 'pull', idCallback(0), function(id, val, sortPriority) {
         //todo-diff this doesn't deal with conflicts (update on server and client at same time)
         //todo-sort this ignores sortPriority, which is presumably in the data, but should we rely on that?
         rec.updateAll(val);
         rec.isDirty(false); // record now matches server
      }));
   }

   function _watchRecordList(sync, list, target) {
      return list.subscribe(function(action, rec, meta) {
         var ctx = sync.sharedContext;
         var id = rec.hashKey();
         var dataSyncOpts = {sync: sync, target: target, list: list, action: action, rec: rec, prevId: meta, data: meta};
         switch(ctx.status[id]) {
            case 'push':
               // a push is in progress, send to server
               if( sync.model.auto ) { sync.pushUpdates().always(thenClearStatus(ctx, id)); }
               break;
            case 'pull':
               // a pull is in progress, send to data
               nextEvent(ctx, 'pull', id, function() { // apply it to the data
                  syncToData(dataSyncOpts);
               });
               break;
            default:
               // rec/list modified externally (goes both ways)
               nextEvent(ctx, 'pull', id, function() { // apply it to the data
                  syncToData(dataSyncOpts);
               });
               sync.model.auto && nextEvent(ctx, 'push', id, function() { // apply it to the server
                  return sync.pushUpdates();
               });
         }
      });
   }

   function _watchRecord(sync, rec, target) {
      return rec.subscribe(function(record, fieldsChanged) {
         var model = sync.model;
         var id = record.hashKey();
         var ctx = sync.sharedContext;
         var dataSyncOpts = {sync: sync, target: target, action: 'updated', rec: record, fields: fieldsChanged};
         switch(ctx.status[id]) {
            case 'push':
               model.auto && pushUpdate(model, 'updated', record);
               break;
            case 'pull':
               nextEvent(ctx, 'pull', id, function() {
                  return syncToData(dataSyncOpts);
               });
               break;
            default:
               nextEvent(ctx, 'pull', id, function() {
                  syncToData(dataSyncOpts)
               });
               model.auto && pushNextUpdate(model, ctx, record);
               break;
         }
      });
   }

   function _watchObsArray(sync, obs, list) {
      var ctx = sync.sharedContext;
      //credits: http://stackoverflow.com/questions/12166982/determine-which-element-was-added-or-removed-with-a-knockoutjs-observablearray
      // subscribeRecChanges is defined in knockout-sync.js!
      obs.subscribeRecChanges(ctx.keyFactory, {
         add: function(key, data, prevKey) {
            nextEventIf(ctx, 'push', key, function() {
               var rec = sync.model.newRecord(data);
               //todo needs to get the id apply it when returned
               //todo
               //todo
               //todo
               //todo
               list.add(rec, prevKey);
               sync.subs.push(watchFields(sync, data, rec));
            });
         },
         delete: function(key) {
            nextEventIf(ctx, 'push', key, function() {
               list.remove(key);
               //todo dose this need to invoke the dispose method and remove from subs?
            });
         },
         move: function(key, data, prevKey) {
            nextEventIf(ctx, 'push', key, function() {
               var rec = list.find(key);
               if( rec ) {
                  //rec.updateAll(data); //todo-sort ???
                  list.move(key, prevKey);
               }
            });
         }
      })
   }

   function _watchObs(sync, obs, rec) {
      var ctx = sync.sharedContext;
      obs.subscribe(function(newValue) {
         nextEvent(ctx, 'push', rec.hashKey(), function() {
            rec.updateAll(newValue);
         });
      });
   }

   function watchFields(sync, obs, rec) {
      var data = ko.utils.unwrapObservable(obs), disposables = [], ctx = sync.sharedContext;
      _.each(rec.observed, function(v, k) {
         if(_.has(data, k) && ko.isObservable(data[k])) {
            disposables.push(watchField(ctx, k, data[k], rec));
         }
      });

      return {
         dispose: function() {
            _.each(disposables, function(d) {d.dispose();});
         }
      }
   }

   function watchField(ctx, field, obs, rec) {
      return obs.subscribe(function(newValue) {
         nextEventIf(ctx, 'push', rec.hashKey(), function() {
            rec.set(field, newValue);
         });
      });
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
            console.error('invalid action', _.toArray(arguments));
      }
      return def.then(thenClearDirty(rec));
   }

   function syncToData(opts) {
      //todo this method is ugly and too complex
      var pos, len;

      /** @type {ko.sync.SyncController} */
      var sync  = opts.sync;
      /** @type {ko.sync.Model} */
      var model = sync.model;
      /** @type {ko.sync.Record} */
      var rec   = opts.rec;
      /** @type {String} */
      var id    = rec.hashKey();
      var ctx = sync.sharedContext;
      var target = opts.target;
      var sourceData;

      switch(opts.action) {
         case 'added':
            pos = newPositionForRecord(ctx, target, rec, opts.prevId, true);
            sourceData = rec.getData(true);
            if( pos < 0 ) {
               target.push(sourceData);
            }
            else {
               target.splice(pos, 0, sourceData);
            }
            if( !rec.hasKey() ) {
               var oldKey = rec.hashKey();
               rec.onKey(function(newKey, fields, data) {
                  nextEvent(ctx, 'pull', newKey, function() {
                     ko.sync.Record.applyWithObservables(findTargetDataSource(sync, target, oldKey), opts.rec, fields)
                  })
               });
            }
            break;
         case 'updated':
            var fields = _.isArray(opts.fields)? opts.fields : (opts.fields? [opts.fields] : []);
            if( fields.length ) {
               //todo-sort
               sourceData = findTargetDataSource(sync, target, id);
               ko.sync.Record.applyWithObservables(sourceData, rec, fields);
               //todo? this only affects unobserved fields which technically shouldn't change?
               //if(sync.isList) { opts.target.notifySubscribers(opts.target()); }
            }
            break;
         case 'deleted':
            pos = currentPositionForRecord(ctx, target, id);
            if( pos > -1 ) {
               target.splice(pos, 1);
            }
            break;
         case 'moved':
            pos = currentPositionForRecord(ctx, target, id);
            var newPos = newPositionForRecord(ctx, target, rec, opts.prevId);
            if( pos > -1 && pos !== newPos ) {
               target.splice(newPos, 0, target.splice(pos, 1));
            }
            break;
         default:
            throw new Error('invalid action: '+opts.action);
      }
   }

   function newPositionForRecord(ctx, obsArray, rec, prevId, isNew) {
      //todo this is probably duplicated in RecordList somewhere, should think about abstracting
      var len = obsArray().length;
      var newLoc = -1;
      var oldLoc = isNew? -1 : currentPositionForRecord(ctx, obsArray, rec.hashKey());

      prevId instanceof ko.sync.RecordId && (prevId = prevId.hashKey());
      if( typeof(prevId) === 'string' ) {
         newLoc = currentPositionForRecord(ctx, obsArray, prevId);
         if( newLoc > -1 && oldLoc > -1 && newLoc < oldLoc ) {
            newLoc++;
         }
      }
      else if( typeof(prevId) === 'number' ) {
         newLoc = prevId < 0? len - prevId : prevId;
      }

      return newLoc;
   }

   function currentPositionForRecord(ctx, obsArray, key) {
      if( !ctx.cachedKeys || !ctx.cachedKeys[key] ) {
         cacheKeysForObsArray(ctx, obsArray);
      }
      return key in ctx.cachedKeys? ctx.cachedKeys[key] : -1;
   }

   function findTargetDataSource(sync, target, id) {
      if( sync.isList ) {
         return target()[ currentPositionForRecord(sync.sharedContext, target, id) ];
      }
      else if( sync.observed ) {
         return target;
      }
      else {
         target.data || (target.data = {});
         return target.data;
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
         var id   = unwrapId(idAccessor, args);

         if( !ctx.status[id] ) { // avoid feedback loops by making sure an event isn't in progress
            return nextEventIf.apply(null, [ctx, pushOrPull, id, fx].concat(args));
         }
      }
   }

   function nextEventIf(ctx, status, id, fx) {
      if( !ctx.status[id] ) {
         nextEvent.apply(null, _.toArray(arguments));
      }
   }

   function nextEvent(ctx, status, id, fx) {
      var args      = _.toArray(arguments).slice(4);
      var wrappedFx = function() {
         ctx.status[id] = status;                                // mark this rec as actively pushing/pulling to prevent feedback loops
         return $.when(fx.apply(null, args)).always(thenClearStatus(ctx, id));
      };
      //todo for large data sets, particularly where recs are going to cycle in/out in a single page app, this is
      //todo going to slowly eat up memory
      if( id in ctx.defer ) {
         //todo does not run if the previous operation failed (should it?)
         ctx.defer[id] = ctx.defer[id].pipe(wrappedFx);
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
      return function(hashKey, success) {
         success !== false && rec.clearDirty();
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

   function cacheKeysForObsArray(ctx, obsArray) {
      var cache = ctx.cachedKeys = {}, f = ctx.keyFactory;
      _.each(ko.utils.unwrapObservable(obsArray), function(v, i) {
         cache[ f.make(v) ] = i;
      });
   }

   function queueUpdateAll(sc, runningDeferred) {
      return $.Deferred(function(def) {
         runningDeferred.always(function() { // whether it succeeds or not, we run the next!
            def.notify(def);
            _.defer(function() { sc.pushUpdates().then(def.resolve, def.reject); }); // prevent recursion stacks
         });
      });
   }

   function runUpdateAll(model, ctx, list, rec) {
      return $.Deferred(function(def) {
         if( list && list.isDirty() ) {
            pushAll(list, model, ctx).then(function() {
               //!list.isDirty() && list.checkpoint();
               def.resolve();
            }, def.reject);
         }
         else if( rec && rec.isDirty() ) {
            pushNextUpdate(model, ctx, rec).then(def.resolve, def.reject);
         }
         else {
            def.resolve();
         }
      });
   }

   function pushAll(recList, model, ctx) {
      //todo create a way to mass update with several records at once!
      var promises = [];
      _.each(recList.changeList(), function(v) {
         var action = v[0];
         var rec    = v[1];
         var def = pushNextUpdate(model, ctx, rec, action).then(function() {
               recList.clearEvent(action, rec.hashKey());
            });
         promises.push(def);
      });
      return $.when.apply($, promises);
   }

   function syncObsArray(target, list) {
      var it = list.iterator(), data = [];
      while(it.hasNext()) {
         data.push(ko.sync.Record.applyWithObservables({}, it.next()));
      }
      target(data);
   }

   function thenClearStatus(ctx, id) {
      return function() {
         delete ctx.status[id];
      }
   }

   function pipeWhen(def) {
      return function() { return $.when(def); };
   }

})(jQuery);

