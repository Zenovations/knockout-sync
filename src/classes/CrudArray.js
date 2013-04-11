/*! CrudArray.js
 *************************************/
(function (ko) {
   "use strict";

   ko.sync.CrudArray = function(observableArray, store, factory) {
      this.obs = observableArray;
      this.store = store;
      this._map = new ko.sync.KeyMap(store, observableArray);
      this.factory = factory || new ko.sync.Factory(store);
      this.ready = _.Deferred().resolve();
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
         return this._then(function() {
            var def = _.Deferred(), loading = whenLoaded(def);

            // watch remote changes
            this.store.on('create', function() {
               this._create.apply(this, ko.utils.makeArray(arguments));
               loading();
            }.bind(this));

            this.store.on('update', this._update.bind(this));
            this.store.on('delete', this._delete.bind(this));

            // watch local changes
            this.obs.watchChanges(this.store, this._local.bind(this));

            return def;
         });
      },

      update: function(key, data) {
         return this._then(function() {
            if( this._update(key, data) ) {
               console.log('CrudArray:update', key); //debug
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

      _create: function(key, data) {
         //todo prevId
         var i = this._map.indexOf(key);
         if( i < 0 ) {
            return this.obs.push(this.factory.make(key, data));
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
            console.log('_update', i, hasChanges(rec, data), key, ko.sync.applyUpdates(rec, data)); //debug
            hasChanges(rec, data) && this.obs.splice(i, 1, ko.sync.applyUpdates(rec, data));
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
                  console.log('store update', key); //debug
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

   function hasChanges(orig, newData) {
      if( !newData ) { return false; }
      orig = ko.sync.unwrapAll(orig);
      var key;
      for (key in newData) {
         if (newData.hasOwnProperty(key) && !_.isEqual(orig[key], newData[key])) {
            console.log('change found', key, orig[key], newData[key]); //debug
            return true;
         }
      }
      return false;
   }

   function whenLoaded(def) {
      var to = setTimeout(def.resolve, 1000);
      var fn = _.debounce(def.resolve, 100);
      var unresolved = true;
      def.always(function() {
         console.log('resolved'); //debug
      });
      return function() {
         if( to ) {
            clearTimeout(to);
            to = null;
         }
         if( unresolved ) {
            console.log('unresolved'); //debug
            fn();
            unresolved = def.state() === 'pending';
         }
      };
   }

})(window.ko);