
jQuery(function($) {
   var undef;

   var FIREBASE_URL = 'http://gamma.firebase.com/wordspot/';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync/';

   var firebaseRoot = new Firebase(FIREBASE_URL);
   var syncRoot = firebaseRoot.child(FIREBASE_TEST_URL);

   var sequenceMethods = {
      create: function(store, model, data) {
         console.log('create', arguments);
         var record = new TestRecord(data, model.primaryKey);
         return store.create(model, record);
      },
      read: function(store, model, recordId) {
         console.log('read', arguments);
         return store.read(model, recordId);
      },
      waitForAdd: {fxn: function(table, recordId) {
         console.log('waitForAdd', arguments);
         return watchForEntry(syncRoot.child(table).child(recordId));
      }, prevPos: 1},
      check: {fxn: function(fields, origData, resultData) {
         console.log('check', arguments);
         var k, keys = Object.keys(fields), i = keys.length;
         while(i--) {
            k = keys[i];
            if( origData.hasOwnProperty(k) ) {
               switch(k) {
                  case 'dateRequired':
                  case 'dateOptional':
                     equal(moment(resultData[k]).valueOf(), origData[k].valueOf(), k+' has correct date');
                     break;
                  default:
                     equal(resultData[k], origData[k], k+' has correct value');
               }
            }
            else {
               equal(resultData[k], getDefaultValue(fields[k].type), k+' has correct default');
            }
         }
      }, prevPos: 2}
   };

   clearAllRecords();

   var modelKeyed = {
      dataTable: 'TableKeyed',
      primaryKey: 'id',
      fields: {
         id:             { required: true,  persist: true, type: 'string' },
         stringOptional: { required: false, persist: true, type: 'string' },
         stringRequired: { required: true,  persist: true, type: 'string' },
         dateOptional:   { required: false, persist: true, type: 'date' },
         dateRequired:   { required: true,  persist: true, type: 'date' },
         intOptional:    { required: false, persist: true, type: 'int' },
         intRequired:    { required: true,  persist: true, type: 'int' },
         boolOptional:   { required: false, persist: true, type: 'boolean' },
         boolRequired:   { required: true,  persist: true, type: 'boolean' },
         floatOptional:  { required: false, persist: true, type: 'float' },
         floatRequired:  { required: true,  persist: true, type: 'float' },
         emailOptional:  { required: false, persist: true, type: 'email' },
         emailRequired:  { required: true,  persist: true, type: 'email' }
      }
   };

   var modelUnkeyed = {
      dataTable: 'TableUnkeyed',
      fields: {
         stringOptional: { required: false, persist: true, type: 'string' },
         stringRequired: { required: true,  persist: true, type: 'string' },
         dateOptional:   { required: false, persist: true, type: 'date' },
         dateRequired:   { required: true,  persist: true, type: 'date' },
         intOptional:    { required: false, persist: true, type: 'int' },
         intRequired:    { required: true,  persist: true, type: 'int' },
         boolOptional:   { required: false, persist: true, type: 'boolean' },
         boolRequired:   { required: true,  persist: true, type: 'boolean' },
         floatOptional:  { required: false, persist: true, type: 'float' },
         floatRequired:  { required: true,  persist: true, type: 'float' },
         emailOptional:  { required: false, persist: true, type: 'email' },
         emailRequired:  { required: true,  persist: true, type: 'email' }
      }
   };

   var genericUnkeyedRecord = {
      stringOptional: 'optional-string',
      stringRequired: 'required-string',
      dateRequired:   new Date(),
      intRequired:    -25,
      boolRequired:   true,
      floatRequired:  2.5,
      emailRequired:  'two@five.com'
   };

   module("FirebaseStore");
   asyncTest("#create (keyed record)", function() {
      var store = newStore(), data = {
         id:             'test1',
         stringRequired: '1-stringRequired',
         dateRequired:   moment().add('days', 5).toDate(),
         intRequired:    -1,
         boolRequired:   true,
         floatRequired:  1.1,
         emailRequired:  'me1@me1.com'
      };

      // we perform one assertion for each field plus one assertion for the id returned by create
      expect(Object.keys(modelKeyed.fields).length+1);

      var keyedRecord = new TestRecord(data, modelKeyed.primaryKey);

      startSequence()
         .create(store, modelKeyed, data)
         .then(function(id) { equal(id, data.id, 'resolves with correct id'); })
         .waitForAdd(modelKeyed.dataTable)
         .check(modelKeyed.fields, data)
         .end()
         .fail(function(e) { ok(false, 'should not fail: '+e); })
         .always(start);

   });

   asyncTest("#create (unkeyed record)", function() {
      var store = newStore(), data = {
         stringRequired: '1-stringRequired',
         dateRequired:   moment().add('days', 5).toDate(),
         intRequired:    -1,
         boolRequired:   true,
         floatRequired:  1.1,
         emailRequired:  'me1@me1.com'
      };

      // we perform one assertion for each field plus one assertion for the id returned by create
      expect(Object.keys(modelUnkeyed.fields).length+1);

      startSequence()
         .create(store, modelUnkeyed, data)
         .then(function(id) { ok(exists(id), 'resolves with correct id'); })
         .waitForAdd(modelUnkeyed.dataTable)
         .check(modelUnkeyed.fields, data)
         .end()
         .fail(function(e) { ok(false, 'should not fail: '+e); })
         .always(start);

   });

   asyncTest("#create (empty record)", function() {
      var store = newStore(), data = {};

      // we perform one assertion for each field plus one assertion for the id returned by create
      expect(Object.keys(modelUnkeyed.fields).length+1);

      startSequence()
         .create(store, modelUnkeyed, data)
         .then(function(id) { ok(exists(id), 'test1', 'resolves with correct id'); })
         .waitForAdd(modelUnkeyed.dataTable)
         .check(modelUnkeyed.fields, data)
         .end()
         .fail(function(e) { ok(false, 'should not fail: '+e); })
         .always(start);
   });

   asyncTest("#read", function() {

   });

   asyncTest('sorted records', function() {
      //todo sorted data
      start();
   });


   test("#update", function() {
      expect(1);
      ok(false, 'Implement me!')
   });
   test("#delete", function() {
      expect(1);
      ok(false, 'Implement me!')
   });
   test("#query", function() {
      expect(1);
      ok(false, 'Implement me!')
   });
   test("#assignTempId", function() {
      expect(1);
      ok(false, 'Implement me!')
   });
   test("#sync", function() {
      expect(1);
      ok(false, 'Implement me!')
   });
   test("#onConnect", function() {
      expect(1);
      ok(false, 'Implement me!')
   });
   test("#onDisconnect", function() {
      expect(1);
      ok(false, 'Implement me!')
   });

   function watchForEntry(storeRec) {
      var def = $.Deferred();
      storeRec.on('value', function(snapshot) {
         var rec = snapshot.val();
         if( rec !== null ) {
            def.resolve(rec);
         }
      });
      return def.promise();
   }

   /**
    * @param {int} [timeout]
    * @return {jQuery.Sequence}
    */
   function startSequence(timeout) {
      timeout || (timeout = 5000);
      var seq = $.Sequence.start(sequenceMethods), timeoutRef;

      if( timeout ) {
         timeoutRef = setTimeout(function() {
            timeoutRef = null;
            seq.abort(new Error('timeout exceeded'));
         }, timeout);
      }

      seq.master.done(function() {
         if( timeoutRef ) { clearTimeout(timeoutRef); }
      });

      return seq;
   }

   /**
    * @return {ko.sync.stores.FirebaseStore}
    */
   function newStore() {
      return new ko.sync.stores.FirebaseStore(FIREBASE_URL, FIREBASE_TEST_URL);
   }

   function clearAllRecords() {
      syncRoot.set({});
   }

   /**
    * @param {object} data
    * @param {string} [key]
    * @constructor
    */
   function TestRecord(data, key) {
      this.data = data;
      this.key = key;
   }
   TestRecord.prototype.hasKey  = function() { return this.key? true : false; };
   TestRecord.prototype.getKey  = function() { return this.data[this.key]; };
   TestRecord.prototype.getData = function() { return this.data; };

   Object.keys || (Object.keys = function(o) {
      var result = [];
      for(var name in o) {
         if (o.hasOwnProperty(name))
            result.push(name);
      }
      return result;
   });


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

   function exists(val) {
      return  val !== null && val !== undef;
   }

});

