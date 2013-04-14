/*! FirebaseStore.js
 *************************************/
(function () {
   "use strict";
   var undefined;

   ko.sync.stores.Firebase = ko.sync.Store.extend({
      init: function(firebaseRef, fieldNames, opts) {
         opts = _.extend({keyField: '_id', sortField: '.priority'}, opts);
         this.fieldNames = fieldNames;
         this.ref  = firebaseRef;
         this.pull = firebaseRef;
         this.kf = opts.keyField;
         this.sf = opts.sortField;
         this.subs = [];
         opts && this._applyOpts(opts);
         this._initRef();
      },

      /**
       * @param {Object} data  the data record
       * @returns {String}
       */
      getKey: function(data) {
         return data && data[this.kf]? data[this.kf] : null;
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
         return _.Deferred(function(def) {
            if( data === undefined ) {
               def.reject('invalid data (undefined)');
            }
            else {
               var key = this.getKey(data);
               if( key ) {
                  this.update(key, data).done(def.resolve).fail(def.reject);
               }
               else {
                  console.log('Firebase::create', pushData(this.kf, this.sf, data)); //debug
                  var id = this.ref.push(pushData(this.kf, this.sf, data), function(error) {
                     if( error ) { def.reject(error); }
                     else { def.resolve(id, data); }
                  }).name();
               }
            }
         }.bind(this));
      },

      /**
       * @param {String} key
       * @returns {Deferred|Object|null} returns or resolves to the record data
       */
      read: function(key) {
         return _.Deferred(function(def) {
            console.log('Firebase::read', key); //debug
            this.ref.child(key).once('value', function(ss) {
               def.resolve(pullData(this.kf, this.sf, ss.name(), ss.val(), ss.getPriority()));
            }.bind(this), function(error) {
               def.reject(error);
            });
         }.bind(this));
      },

      /**
       * @param {String} key
       * @param {Object} data
       * @returns {Deferred|String|Error|boolean} returns or resolves to the key (record id)
       */
      update: function(key, data) {
         return _.Deferred(function(def) {
            if( data === undefined ) { def.reject('invalid data (undefined)'); }
            else {
               this.ref.child(key).set(pushData(this.kf, this.sf, data), function(error) {
                  if( error ) { def.reject(error); }
                  else { def.resolve(key, data); }
               });
            }
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
         if( arguments.length === 3 ) {
            return this._disp(listenRec(this.ref.child(key), this.kf, this.sf, callback));
         }
         else {
            callback = key;
            return this._disp(listenAll(this.pull, event.split(' '), this.kf, this.sf, callback));
         }
      },

      dispose: function() {
         _.each(this.subs, function(s) {s.dispose()});
         this.ref = null;
         this.pull = null;
         this.subs = [];
      },

      _disp: function(cb) {
         this.subs.push(cb);
         return cb;
      },

      _applyOpts: function(opts) {
         if( opts.limit && !_.has(opts, 'endAt') && !_.has(opts, 'startAt') ) {
            this.pull = this.pull.endAt();
         }
         _.each(['limit', 'endAt', 'startAt'], function(o, k) {
            if(_.has(opts, k)) { this.pull = this.pull[k](o); }
         }.bind(this));
      },

      _initRef: function() {
         // must prime ref by downloading children first, otherwise, if someone is listening only for
         // delete events and hasn't first added a create listener, notifications will not arrive
         this.pull.on('child_added', function() {});
      }
   });

   function pullData(keyField, sortField, id, data, pri) {
      if( data === null ) { return data; }
      var out = _.extend({}, data);
      out[keyField] = id;
      if( sortField ) {
         out[sortField] = pri;
      }
      return out;
   }

   function pushData(keyField, sortField, data) {
      var out = _.extend({}, data);
      if( sortField && sortField !== '.priority' ) {
         out['.priority'] = out[sortField] === undefined? null : out[sortField];
         delete out[sortField];
      }
      delete out[keyField];
      return out;
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

   function listenRec(ref, keyField, sortField, callback) {
      var fn = ref.on('value', function(ss) {
         var data = pullData(keyField, sortField, ss.name(), ss.val(), ss.getPriority());
         callback(ss.name(), data, 'update');
      });
      return {
         dispose: function() {
            ref.off('value', fn);
         }
      }
   }

   function listenAll(ref, events, keyField, sortField, callback) {
      var subs = [];
      _.each(events, function(e) {
         var mappedEvent = mapEvent(e);
         var fn = ref.on(mappedEvent, function(ss, prevId) {
            callback(ss.name(), pullData(keyField, sortField, ss.name(), ss.val(), ss.getPriority()), e, prevId);
         });
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
})();