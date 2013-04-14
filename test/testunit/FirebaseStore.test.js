/*! FirebaseStore.test.js.js
 *************************************/
(function() {
   "use strict";
   var undefined;

   var expires = ko.sync.test.def;

   var Tester = ko.sync.test.StoreTester.extend({
      rebuild: function(testName) {
         this.dispose();
         var ref = this.ref = new Firebase('https://aniqi1tmal1.firebaseio-demo.com/'+keyName(testName));
         this.fields = ['user', 'email'];
         var store = this.store = new ko.sync.stores.Firebase(ref, this.fields);
         ref.onDisconnect().remove();
         return expires(function(def) {
            ref.set({
               one:   { name: 'John Gray',  email: 'jgray@anon.y.mous' },
               two:   { name: 'Mary Brown', email: 'mbrown@anon.y.mous' },
               three: { name: 'Will Green', email: 'wgreen@anon.y.mous' },
               four:  { name: 'Barb White', email: 'bwhite@anon.y.mous' },
               five:  { name: 'Jack Black', email: 'jblack@anon.y.mous' }
            }, function(error) {
               if( error ) { def.reject(error); }
               else { def.resolve(store); }
            })
         });
      },

      dispose: function() {
         this.store && this.store.dispose();
         this.store = null;
         this.ref = null;
      },

      validData: function() {
         var uid = 'new_'+_u.uniqueId();
         return { _id: uid, name: 'Random '+uid, email: uid+'@anon.y.mous' };
      },

      invalidData: function() {
         return undefined;
      },

      updateData: function(key) {
         return expires(function(def) {
            this.ref.child(key).once('value', function(ss) {
               var data = _.extend({}, ss.val());
               data.name += '_';
               def.resolve(data);
            }, function(error) {
               def.reject(error);
            });
         }.bind(this));
      },

      validKey: function() {
         return 'two';
      },

      invalidKey: function() {
         return 'not-a-key';
      },

      createEvent: function(key) {
         var dat = this.validData();
         key || (key = dat._id);
         return expires(function(def) {
            this.ref.child(key).set(pushData('_id', '.priority', dat), cb.bind(null,def));
         }.bind(this))
      },

      deleteEvent: function(key) {
         key || (key = 'four');
         return expires(function(def) {
            this.ref.child(key).remove(cb.bind(null,def));
         }.bind(this));
      },

      updateEvent: function(key) {
         key || (key = this.validKey());
         return expires(function(def) {
            _.when(this.updateData(key)).done(function(data) {
               this.ref.child(key).set(pushData('_id', '.priority', data), cb.bind(null,def));
            }.bind(this)).fail(def.reject);
         }.bind(this));
      }
   });

   function pushData(keyField, sortField, data) {
      var out = _.extend({}, data);
      if( sortField && sortField !== '.priority' ) {
         out['.priority'] = out[sortField] === undefined? null : out[sortField];
         delete out[sortField];
      }
      delete out[keyField];
      return out;
   }

   function keyName(name) {
      return (name+'').replace(/[.\/#$\[\]]/, '');
   }

   function cb(def, err) {
      if( err ){  def.reject(err); }
      else { def.resolve(); }
   }

   ko.sync.test.StoreTester.testStore('Firebase', new Tester());
})();
