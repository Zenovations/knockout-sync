/*******************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/katowulf/knockout-sync
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