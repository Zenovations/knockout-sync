
jQuery(function($) {

   var FIREBASE_URL = 'http://gamma.firebase.com/wordspot/';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync/';

   var firebaseRoot = new Firebase(FIREBASE_URL);
   var syncRoot = firebaseRoot.child(FIREBASE_TEST_URL);

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

   module("FirebaseStore");
   test("#create", function() {
      expect(8);
      var store = newStore();

      var keyedData = {
         id:             'test1',
         stringRequired: '1-stringRequired',
         dateRequired:   moment().add('days', 5).toDate(),
         intRequired:    -1,
         boolRequired:   true,
         floatRequired:  1.1,
         emailRequired:  'me@me.com'
      };

      stop();
      store.create(modelKeyed, keyedData)
            .done(function(id) {
               equal(id, 'test1', 'resolves with correct id');
               firebaseRoot.child('TableKeyed').child(id).once('value', function(snapshot) {
                  var rec = snapshot.val();
                  ok(rec, 'record exists');

               });
            })
            .fail(function(e) {
               ok(false, 'should not fail: '+e);
            })
            .always(start);


//      var unkeyedRecord = store.create(keyedModel, );

   });

   test("#read", function() {
      expect(1);
      ok(false, 'Implement me!')
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


   /**
    * @return {ko.sync.stores.FirebaseStore}
    */
   function newStore() {
      return new ko.sync.stores.FirebaseStore(FIREBASE_URL, FIREBASE_TEST_URL);
   }

   function clearAllRecords() {
      syncRoot.set({});
   }

});

