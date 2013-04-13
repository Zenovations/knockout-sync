/*! Crud.js
 *************************************/
(function (ko) {
   "use strict";

   ko.sync.Crud = function(observable, store) {
      this.observable = observable;
      this.store = store;
      this.ready = _.Deferred().resolve();
   };

   ko.utils.extend(ko.sync.Crud.prototype, {
      'create': function(newData) {
         return this._then(function() {
            if( newData ) {
               ko.sync.applyUpdates(this.observable, newData);
            }
            var data = ko.sync.prepStoreData(this.observable, this.store);
            return _.when(this.store.create(data))
               .done(function(key) {
                  this.key = key;
                  this._sync();
               }.bind(this));
         });
      },

      'read': function(key) {
         return this._then(function() {
            this.key = key;
            return _.when(this.store.read(key)).done(function(data) {
               this._change(this.observable, data);
               this._sync();
            }.bind(this));
         });
      },

      'update': function(updates) {
         return this._then(function() {
            if( updates ) {
               this.observable(ko.utils.extend(this.observable(), updates));
            }
            var data = ko.sync.prepStoreData(this.observable, this.store);
            return _.when(this.store.update(this.key, data));
         });
      },

      'delete': function() {
         return this._then(function() {
            return _.when(this.store.delete(this.key));
         });
      },

      _sync: function() {
         this.store.on('create update delete', this.key, this._change.bind(this));
         this.observable.watchChanges(this.store, this._local.bind(this));
      },

//      _add: function(k, v) {
//         if( k === this.key ) {
//            // key can change if the data it depends on changed
//            this.key = this.store.getKey(v);
//            this.observable(v);
//         }
//      },
//
//      _remove: function(k, v) {
//         if( k === this.key ) {
//            this.observable(null);
//         }
//      },

      _change: function(k, v) {
         if( !ko.sync.isEqual(this.store.getFieldNames(), this.observable, v) ) {
            ko.sync.applyUpdates(this.observable, v);
         }
      },

      _local: function(v) {
         this.store.update(this.key, ko.sync.prepStoreData(v, this.store));
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

})(window.ko);