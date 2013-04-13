/*! CrudArray.js
 *************************************/
(function (ko) {
   "use strict";
   var undefined;

   /**
    * @param {ko.observableArray} observableArray
    * @param {ko.sync.Store} store
    * @param {ko.sync.Factory} [factory]
    * @constructor
    */
   ko.sync.CrudArray = function(observableArray, store, factory) {
      this.obs = observableArray;
      this.store = store;
      this._map = new ko.sync.KeyMap(store, observableArray);
      this.factory = factory || new ko.sync.Factory(store);
      this.ready = _.Deferred().resolve();
      this._synced = false;
      this.subs = [];
   };

   ko.utils.extend(ko.sync.CrudArray.prototype, {
      create: function(recs) {
         return this._then(function() {
            var ct = 0;
            if( !_.isArray(recs) ) { recs = recs? [recs] : []; }
            _.each(recs, function(rec) {
               if( this._create(this.store.getKey(rec), rec) >= 0 ) { ct++; }
            }.bind(this));
            return ct;
         });
      },

      read: function() {
         if( this._synced ) {
            return this.ready;
         }
         else {
            return this._then(function() {
               var def = _.Deferred(), loading = whenLoaded(def);

               // watch remote changes
               this.store.on('create', function(key, val, evt, prevId) {
                  this._create(key, val, prevId);
                  loading();
               }.bind(this));

               this.store.on('update', this._update.bind(this));
               this.store.on('delete', this._delete.bind(this));

               // watch local changes
               this.obs.watchChanges(this.store, this._local.bind(this));

               return def;
            });
         }
      },

      update: function(key, data) {
         return this._then(function() {
            if( this._update(key, data) >= 0 ) {
               return key;
            }
            else {
               console.warn('CrudArray::update - invalid key (not in local data)', key);
               return false;
            }
         });
      },

      delete: function(key) {
         return this._then(function() {
            var i = this._map.indexOf(key);
            if( i > -1 ) {
               return this.obs.splice(i, 1);
            }
            else {
               return false;
            }
         });
      },

      dispose: function() {
         _.each(this.subs, function(s) {s.dispose()});
      },

      _create: function(key, data, prevId) {
         var i = this._map.indexOf(key), prev = this._map.indexOf(prevId);
         if( i < 0 ) {
            var rec = this.factory.make(key, data);
            if( prevId === null || prev >= 0 ){
               this.obs.splice(prev + 1, 0, rec);
               return prev+1;
            }
            else {
               return this.obs.push(rec);
            }
         }
         else {
            this._update(key, data);
            return -1;
         }
      },

      _update: function(key, data) {
         var i = this._map.indexOf(key), rec;
         if( i >= 0 ) {
            rec = this.obs()[i];
            if( hasChanges(this.store.getFieldNames(), rec, data) ){
               // must make a copy otherwise observableArray.fn.watchChanges will fail to find
               // the change, since we will be modifying the original data (causing it to appear
               // to be the same after the update), fortunately, applyUpdates takes care of this
               var updatedRec = ko.sync.applyUpdates(rec, data);
               // if the record isn't itself an observable, then we force an update by calling splice
               ko.isObservable(updatedRec) || this.obs.splice(i, 1, updatedRec);
            }
         }
         return i;
      },

      _delete: function(key) {
         var i = this._map.indexOf(key);
         if( i >= 0 ) {
            this.obs.splice(i, 1);
         }
      },

      _local: function(changes) {
         _.each(changes, function(change, key) {
            switch(change.status) {
               case 'create':
                  this.store.create(ko.sync.prepStoreData(change.data, this.store));
                  break;
               case 'update':
                  this.store.update(key, ko.sync.prepStoreData(change.data, this.store));
                  break;
               case 'delete':
                  this.store.delete(key);
                  break;
               case 'move': // nothing to do here
                  break;
               default:
                  throw new Error('Invalid change status: '+change.status);
            }
         }.bind(this));
      },

      _then: function(fn) {
         fn = fn.bind(this);
         this.ready = this.ready.then(function() {
            var d = _.Deferred();
            _.when(fn()).always(d.resolve);
            return d;
         });
         return this;
      }

   });

   function hasChanges(fields, orig, newData) {
      if( !newData ) { return false; }
      return !ko.sync.isEqual(fields, orig, newData);
   }

   function whenLoaded(def) {
      var to = setTimeout(def.resolve, 1000);
      var fn = _.debounce(def.resolve, 100);
      var unresolved = true;
//      def.always(function() {
//         console.log('resolved'); //debug
//      });

      return function() {
         if( to ) {
            clearTimeout(to);
            to = null;
         }
         if( unresolved ) {
            fn();
            unresolved = def.state() === 'pending';
         }
      };
   }

})(window.ko);