/*! FirebaseStore.js
 *************************************/
(function ($) {
   "use strict";
   ko.sync.stores.FirebaseStore = ko.sync.Store.extend({
      initialize: function(firebaseRef, fieldNames, opts) {
         opts = _.extend({keyField: '_id'}, opts);
         this.fieldNames = fieldNames;
         this.ref  = firebaseRef;
         this.pull = firebaseRef;
         this.kf = opts.keyField;
         opts && this._applyOpts(opts||{});
      },

      /**
       * @param {Object} data  the data record
       * @returns {String}
       */
      getKey: function(data) {
         return data && data[this.kf];
      },

      /**
       * @returns {Array}
       */
      getFieldNames: function() {
         return this.fieldNames;
      },

      /**
       * @param {Object} data  the new data record
       * @returns {Deferred|String} returns or resolves to the new record id (key)
       */
      create: function(data) {
         var kf = this.kf;
         return _.Deferred(function(def) {
            var id = this.ref.push(dropId(kf, data), function(error) {
               if( error ) { def.reject(error); }
               else { def.resolve(id, data); }
            }).name();
         }.bind(this));
      },

      /**
       * @param {String} key
       * @returns {Deferred|Object|null} returns or resolves to the record data
       */
      read: function(key) {
         return _.Deferred(function(def) {
            this.ref.child(key).once('value', function(ss) {
               def.resolve(ss.val());
            }.bind(this));
         });
      },

      /**
       * @param {String} key
       * @param {Object} data
       * @returns {Deferred|String|Error|boolean} returns or resolves to the key (record id)
       */
      update: function(key, data) {
         return _.Deferred(function(def) {
            this.ref.child(key).set(dropId(this.kf, data), function(error) {
               if( error ) { def.reject(error); }
               else { def.resolve(key, data); }
            });
         }.bind(this));
      },

      /**
       * @param {String} key
       * @returns {Deferred|String} returns or resolves to the key (record id)
       */
      'delete': function(key) {
         return _.Deferred(function(def) {
            this.ref.child(key).remove(function(error) {
               if( error ) { def.reject(error); }
               else { def.resolve(key); }
            });
         }.bind(this));
      },

      /**
       * @param {String} event  space delimited list of events to monitor
       * @param {String} [key]
       * @param {Function} callback
       */
      on: function(event, key, callback) {
         var events = event.split(' ');
         if( key ) {
            listenRec(this.ref.child(key), events, this.kf, callback);
         }
         else {
            listenAll(this.pull, events, this.kf, callback);
         }
      },

      dispose: function() {
         _.each(this.subs, function(s) {s.dispose()});
         this.ref = null;
         this.pull = null;
         this.subs = null;
      },

      _disp: function(cb) {
         this.subs.push(cb);
         return cb;
      },

      _applyOpts: function(opts) {
         _.each(['limit', 'endAt', 'startAt'], function(o, k) {
            if(_.has(opts, k)) { this.pull = this.pull[k](o); }
         }.bind(this));
      }
   });

   function dropId(keyField, data) {
      var out = _.extend({}, data);
      delete out[keyField];
      return out;
   }

   function addId(keyField, id, data) {
      data[keyField] = id;
      return data;
   }

   function mapEvent(event) {
      switch(event) {
         case 'create':
            return 'child_added';
         case 'update':
            return 'child_changed';
         case 'delete':
            return 'child_removed';
         default:
            throw new Error('Invalid event type: '+event);
      }
   }

   function listenRec(ref, events, keyField, callback) {
      var first = true;
      var hasCreate = ko.sync.arrayIndexOf(events, 'create') > 0;
      var hasUpdate = ko.sync.arrayIndexOf(events, 'update') > 0;
      var hasDelete = ko.sync.arrayIndexOf(events, 'delete') > 0;
      var fn = ref.on('value', function(ss) {
         var v = ss.val(), id = ss.name(), data = addId(keyField, id, v);
         if( v === null ) {
            hasDelete && callback(id, v, 'delete');
         }
         else if( first ) {
            hasCreate && callback(id, data, 'create');
         }
         else {
            hasUpdate && callback(id, data, 'update');
         }
      });
      return {
         dispose: function() {
            ref.off('value', fn);
         }
      }
   }

   function listenAll(ref, events, keyField, callback) {
      var subs = [];
      _.each(events, function(e) {
         var mappedEvent = mapEvent(e);
         var fn = ref.on(mappedEvent, function(ss) {
            callback(ss.name(), addId(keyField, ss.name(), ss.val()), e);
         }.bind(this));
         subs.push(function() {
            ref.off(mappedEvent, fn);
         })
      }.bind(this));
      return {
         dispose: function() {
            _.each(subs, function(sub) { sub(); });
         }
      };
   }
})(jQuery);