/*! store.Test.js.js
 *************************************/
(function ($, sync) {
   "use strict";
   sync.stores.TestStore = sync.Store.extend({
      init: function(opts) {
         opts = _.extend({}, opts);
         this.data = opts.noData? {} : {
            one:   { _key: 'one',   name: 'John Gray',  email: 'jgray@anon.y.mous' },
            two:   { _key: 'two',   name: 'Mary Brown', email: 'mbrown@anon.y.mous' },
            three: { _key: 'three', name: 'Will Green', email: 'wgreen@anon.y.mous' },
            four:  { _key: 'four',  name: 'Barb White', email: 'bwhite@anon.y.mous' },
            five:  { _key: 'five',  name: 'Jack Black', email: 'jblack@anon.y.mous' }
         };
         this.firstRecord = 'one';
         this.lastRecord = 'five';
         this.dispose();
      },

      getKey: function(koObject) {
         return koObject? ko.utils.unwrapObservable(koObject)._key : null;
      },

      getFieldNames: function() {
         return ['_key', 'name', 'email'];
      },

      create: function(data) {
         return $.Deferred(function(def) {
            if(_.isObject(data)) {
               var key = this.getKey(data);
               if( !_.isEqual(data, this.data[key]) ) {
                  if( !_.has(this.data, key) ) {
                     this._trigger('create', key, data);
                  }
                  else {
                     this._trigger('update', key, data);
                  }
                  this.data[key] = data;
               }
               def.resolve(key);
            }
            else {
               def.reject('invalid data');
            }
         }.bind(this));
      },

      read: function(key) {
         return $.when(this.data[key]||null);
      },

      update: function(key, data) {
         console.log('TestStore::update', key, data); //debug
         return $.Deferred(function(def) {
            if( !_.has(this.data, key) ) {
               def.resolve(false);
            }
            else if( !data ) {
               console.warn('invalid data', key, data);
               def.reject('invalid data');
            }
            else if( !_.isEqual(data, this.data[key]) ) {
               this.data[key] = data;
               this._trigger('update', key, data);
               def.resolve(key);
            }
            else {
               console.warn('TestStore::update no change');
               def.resolve(key);
            }
         }.bind(this));
      },

      'delete': function(key) {
         return $.Deferred(function(def) {
            if( key ) {
               var data = this.data[key];
               delete this.data[key];
               this._trigger('delete', key, data);
            }
            def.resolve(key);
         }.bind(this));
      },

      on: function(event, key, callback) {
         if(_.isFunction(key)) {
            callback = key;
            key = null;
         }
         if( key ) {
            // for our TestStore, we just wrap the callback and make sure it has
            // the right key before returning the value; not the most optimized solution
            var _callback = callback;
            callback = function(k, data, event) {
               if( k === key ) { _callback(k, data, event); }
            }
         }
         var subs = [];
         ko.utils.arrayForEach(event.split(' '), function(e) {
            this.subs[e].push(callback);
            subs.push(ko.utils.arrayRemoveItem.bind(null, this.subs[e], callback));
            if( e === 'create' ) {
               _.each(key? _.pick(this.data, key) : this.data, function(rec, id) {
                  _.defer(callback.bind(null, id, rec, 'create'));
               });
            }
         }.bind(this));
         return {
            dispose: function() {
               ko.utils.arrayForEach(subs, function(s) { s(); });
            }
         }
      },

      dispose: function() {
         this.subs = {create: [], update: [], delete: []};
      },

      _trigger: function(event, key, data) {
         _.each(this.subs[event], function(fn) {
            _.defer(fn.bind(null, key, data, event));
         });
      },

      _first: function() {
         return this.data[this.firstRecord];
      }
   });

   sync.stores.TestStore.Tester = sync.test.StoreTester.extend({
      init: function() { this.store = null; },

      // opts is used for internal testing and is not necessary for impls of StoreTester
      rebuild: function(opts) {
         this.store && this.store.dispose();
         this.store = new sync.stores.TestStore(opts);
         return this.store;
      },

      validData: function() {
         var uid = 'new_'+_.uniqueId();
         return { _key: uid, name: 'Random '+uid, email: uid+'@anon.y.mous' };
      },

      invalidData: function() {
         return null;
      },

      updateData: function(key) {
         var data = _.extend({}, this.store.data[key]);
         data.name += '_';
         return data;
      },

      validKey: function() {
         var d = this.store._first();
         return d._key;
      },

      invalidKey: function() {
         return '';
      },

      createEvent: function(key) {
         var dat = this.validData();
         key && (dat._key = key);
         this.store.create(dat);
      },

      deleteEvent: function(key) {
         // create some data to delete
         key || (key = 'four');
         this.store.delete(key);
      },

      updateEvent: function(key) {
         key || (key = this.store._first()._key);
         this.store.update(key, this.updateData(key));
      }
   });
})(jQuery, ko.sync);