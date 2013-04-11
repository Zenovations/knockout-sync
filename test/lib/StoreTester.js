/*! StoreTester.js
 *************************************/
ko.sync.test.StoreTester = Class.extend({
   /**
    * Resets all data to default state for testing and returns a new instance of Store
    * @returns {Deferred|Store} resolves to a new store instance or returns one
    */
   rebuild: function() {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Sever all listeners and event notifications, close connections and cleans up. Should also dispose of the store
    * instance created during rebuild.
    */
   dispose: function() {
      this.store && this.store.dispose();
   },

   /**
    * Create a random set of valid data for use in create operations
    * @return {Object}
    */
   validData: function() {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Create a random set of invalid data for use in create operations
    * @return {Object}
    */
   invalidData: function() {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Return a copy of the data for this key, but make some change to the data. This is used
    * to perform updates on the client and test store's reaction to those updates; the update
    * should not actually be applied to the store data here.
    *
    * @param {String} key
    * @return {Object}
    */
   updateData: function(key) {
      throw new Error('StoreTester instances must declare updateData method');
   },

   /**
    * Creates a valid key that exists in the data which can be used for update/delete operations
    * @return {String}
    */
   validKey: function() {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Creates an invalid key for use in update/delete operations
    * @return {String}
    */
   invalidKey: function() {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Add record to store and trigger a create event for client to test event listeners
    * @param {String} [key]  if provided, it was obtained from validKey()
    */
   createEvent: function(key) {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Remove record from store and trigger a delete event for client to test event listeners
    * @param {String} [key]  if provided, it was obtained from validKey()
    */
   deleteEvent: function(key) {
      throw new Error('StoreTester instances must declare a make method');
   },

   /**
    * Udpate record in store and trigger an update event for the client to test event listeners
    * @param {String} [key]  if provided, it was obtained from validKey()
    */
   updateEvent: function(key) {
      throw new Error('StoreTester instances must declare a make method');
   }
});

ko.sync.test.StoreTester.testStore = function(storeName, storeTester) {
   if( !(storeTester instanceof ko.sync.test.StoreTester) ) {
      throw new Error('A valid ko.sync.test.StoreTester must be passed into testStore method');
   }

   module('Store::'+storeName);

   asyncTest('#getKey, null', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .done(function(store) {
            strictEqual(store.getKey(null), null);
         })
         .always(ko.sync.test.done);
   });

   asyncTest('#getKey', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .done(function(store) {
            var d = storeTester.validData();
            ok(store.getKey(d) !== null);
         })
         .always(ko.sync.test.done);
   });

   asyncTest('#getKey, invalid', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .done(function(store) {
            strictEqual(store.getKey(storeTester.invalidData()), null);
         })
         .always(ko.sync.test.done);
   });

   asyncTest('#create', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            ko.sync.test.disposable(store);
            return store.create(storeTester.validData());
         })
         .done(ok.bind(null, true))
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#create, invalid', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            ko.sync.test.disposable(store);
            return store.create(storeTester.invalidData());
         })
         .done(ok.bind(null, false))
         .fail(ok.bind(null, true))
         .always(ko.sync.test.done);
   });

   asyncTest('#read', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return store.read(storeTester.validKey());
         })
         .done(function(rec) {
            ok(_.isObject(rec), 'read returned a valid data object');
         })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#read, invalid', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return store.read(storeTester.invalidKey());
         })
         .done(function(rec) {
            strictEqual(rec, null, 'read returned null');
         })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#update', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      var key, store;
      _.when(storeTester.rebuild())
         .then(function(s) {
            store = s;
            key = storeTester.validKey();
            return store.read(key);
         })
         .then(function(rec) {
            ok(_.isObject(rec), 'read returned a valid data object');
            return store.update(key, storeTester.updateData(key, rec));
         })
         .done(ok.bind(null, true))
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#update, missing record', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return store.update(storeTester.invalidKey(), storeTester.validData());
         })
         .done(ok.bind(null, true, 'should not fail if record is missing'))
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#update, invalid', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return store.update(storeTester.validKey(), storeTester.invalidData());
         })
         .done(ok.bind(null, false, 'should reject/fail if data is invalid'))
         .fail(ok.bind(null, true, 'should reject/fail if data is invalid'))
         .always(ko.sync.test.done);
   });

   asyncTest('#delete', function() {
      expect(2);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return store
               .delete(storeTester.validKey())
               .then(store.read.bind(store))
               .done(function(data) {
                  strictEqual(data, null, 'data removed from store');
               })
               .always(store.dispose.bind(store));
         })
         .done(ok.bind(null, true))
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#delete, invalid', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            var invalidKey = storeTester.invalidKey();
            return store
               .delete(invalidKey)
               .done(function(key) {
                  strictEqual(key, invalidKey, 'returns the key even if it does not exist in store');
               });
         })
         .fail(ok.bind(null, false, 'should not reject if key is invalid'))
         .always(ko.sync.test.done);
   });

   asyncTest('#on, create', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return ko.sync.test.def(function(def) {
               // when no records arrive for more than half a second, we are done
               var loading = ko.sync.test.afterDone(def), ct = 0;
               store.on('create', function() { ct++; loading() });
               storeTester.createEvent();
               def.done(function() {
                  // we should have received all the existing records plus the new one we created
                  strictEqual(ct, 6, 'has correct number of records');
               })
            });
         })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#on, delete', function() {
      expect(1);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return ko.sync.test.def(function(def) {
               store.on('delete', def.resolve);
               storeTester.deleteEvent();
            });
         })
         .done(ok.bind(null, true))
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#on, update', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return ko.sync.test.def(function(def) {
               store.on('update', def.resolve);
               storeTester.updateEvent();
            });
         })
         .done(ok.bind(null, true))
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#on, multiple events', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return ko.sync.test.def(function(def) {
               var events = [];
               var loading = ko.sync.test.afterDone(def);
               store.on('update delete', function(key, dat, e) {
                  events.push(e);
                  loading();
               });
               storeTester.createEvent();
               storeTester.updateEvent();
               storeTester.deleteEvent();
               def.done(function() {
                  // give the events adequate time to fire
                  // then check the results
                  deepEqual(events, ['update', 'delete'], 'correct events were fired');
               });
            });
         })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#on, with key', function() {
      expect(4);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            return ko.sync.test.def(function(def) {
               var events = [], key = storeTester.validKey(), loading = ko.sync.test.afterDone(def);
               store.on('create update delete', key, function(k, dat, e) {
                  strictEqual(k, key, 'is for my key');
                  events.push(e);
                  loading();
               });
               _.when(store.create(storeTester.validData())).done(function(otherKey) {
                  storeTester.updateEvent(otherKey);
                  storeTester.updateEvent(key);
                  storeTester.deleteEvent(otherKey);
                  storeTester.deleteEvent(key);
               });
               def.done(function() {
                  // give the events adequate time to fire
                  // then check the results
                  deepEqual(events, ['create', 'update', 'delete'], 'correct events were fired');
               });
            });
         })
         .fail(ok.bind(null, false))
         .always(ko.sync.test.done);
   });

   asyncTest('#dispose', function() {
      expect(1);
      ko.sync.test.disposable(storeTester);
      _.when(storeTester.rebuild())
         .then(function(store) {
            try {
               store.dispose();
               ok(true);
            }
            catch(e) {
               ok(false, e);
            }
         })
         .always(ko.sync.test.done);
   });

   function disposeStore(store) {
      store && store.dispose();
   }
};