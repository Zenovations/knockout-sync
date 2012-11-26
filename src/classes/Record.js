/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var undef;

   ko.sync.Record = Class.extend({
      /**
       * @param {ko.sync.Model}  model
       * @param {object} [data]
       * @constructor
       */
      init:            function(model, data) {
         data || (data = {});
         this.data      = _setFields(model.fields, data);
         this.observed  = _observed(model.fields);
         this.fields    = _.keys(this.data);
         this.id        = new ko.sync.RecordId(model.key, data);
         this.sort      = model.sort;
         this.changed   = false;
         this.type      = model.table;
         this.validator = model.validator;
         this.listeners = [];
         this.keyCallbacks = [];
         _watchObservables(this);
      },
      getRecordId:     function() {
         return this.id;
      },
      getSortPriority: function() {
         return this.sort? this.get(this.sort) : false;
      },
      hasKey:          function() {
         return this.getKey().isSet();
      },
      getKey:          function() {
         return this.id;
      },
      hashKey:         function() {
         return this.getKey().hashKey();
      },
      /**
       * Updating the key is intended to be used after a create operation during which the database sets the ID.
       * Thus, it does not mark the record dirty or send out notifications.
       *
       * This method will ignore any set requests if an ID already exists on the record
       * @param {string|object} hashKey
       */
      updateHashKey: function( hashKey ) {
         if( !this.hasKey() ) {
            this.id.update(hashKey);
            applyUpdates(this, this.id.parse(hashKey));
            if( this.id.isSet() ) { applyKeyCallbacks(this); }
         }
         return this;
      },
      /**
       * This physically changes the record ID. This does update fields on the record and can result in notifications
       * being sent and database transactions. The old record is not deleted by this change (it's just forgotten).
       * @param {ko.sync.RecordId} newKey
       */
      setKey: function( newKey ) {
         this.id = newKey;
         if( newKey.isSet() ) {
            this.updateAll(newKey.parse());
            applyKeyCallbacks(this);
         }

      },
      getData:         function(withTempId) {
         var data = _unwrapAll(this.observed, this.data);
         withTempId && (data[ko.sync.KeyFactory.HASHKEY_FIELD] = this.hashKey());
         return data;
      },
      get:             function(field) {
         if(_.isArray(field)) {
            return _unwrapAll(this.observed, _.pick(field));
         }
         else {
            return field in this.observed? this.data[field]() : this.data[field];
         }
      },
      set:             function(field, val) {
         if( setWithoutNotice(this, field, val) ) {
            this.changed = true;

            // only non-observables generate notifications here; the _watchObservables method handles the remainder
            // somewhat invisibly but quite effectively
            _updateListeners(this.listeners, this, field);
         }
         return this.changed;
      },
      isDirty:         function(newVal) {
         if( typeof(newVal) === 'boolean' ) {
            this.changed = newVal;
         }
         return this.changed;
      },
      clearDirty:      function() {
         this.isDirty(false);
         return this;
      },
      isValid:         function() {
         return !this.validator || this.validator.validate(this);
      },
      /**
       * @param {ko.sync.Record|object} newVals
       */
      updateAll: function(newVals) {
         var changed = applyUpdates(this, newVals);
         if( changed.length ) {
            this.changed = true;
            // send a single notification for all the field changes
            _updateListeners(this.listeners,  this, changed);
         }
         return this;
      },
      /**
       * Invokes `callback` with this record object whenever a change occurs to the data
       */
      subscribe: function(callback) {
         var listeners = this.listeners;
         listeners.push(callback);
         return {
            dispose: function() {
               var idx = _.indexOf(listeners, callback);
               if( idx > -1 ) { listeners.splice(idx, 1); }
            }
         };
      },
      /**
       * Waits for record to receive a permanent ID from the server and calls callback(hashKey, idFields, idData).
       * If this record already has an ID, this will be invoked immediately.
       * @param callback
       */
      onKey: function(callback) {
         if( this.hasKey() ) {
            dataKeyCallback(callback, this);
         }
         else {
            this.keyCallbacks.push(callback);
         }
      }
   });

   function _setFields(fields, data) {
      //todo validate the data before applying it
      var k, out = {}, keys = _.keys(fields), i = keys.length;
      while(i--) {
         k = keys[i];
         out[k] = _value(k, fields, data);
      }
      return out;
   }

   function _value(k, fields, data) {
      var field = fields[k];
      if( data.hasOwnProperty(k) && exists(data[k]) ) {
         var v = ko.utils.unwrapObservable(data[k]);
         switch(field.type) {
            case 'date':
               v = moment(v).utc().toDate();
               break;
            case 'int':
               v = ~~v;
               break;
            case 'float':
               v = parseFloat(v);
               if( isNaN(v) ) { v = field.default; }
               break;
            default:
               // nothing to do
         }
     }
     else {
        v = field.default;
     }
     return field.observe? ko.observable(v) : v;
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

   /**
    * Sends notices to all callbacks listening for events on this Record
    * @param {Array}  callbacks
    * @param {Record} record
    * @param {string|Array} fieldChanged
    * @private
    */
   function _updateListeners(callbacks, record, fieldChanged) {
      var i = -1, len = callbacks.length;
      while(++i < len) {
         callbacks[i](record, fieldChanged);
      }
   }

   /**
    * Determines which fields are being observed and creates a state context object for each.
    *
    * @param {object} fields
    * @return {Object}
    * @private
    */
   function _observed(fields) {
      var out = {};
      for (var key in fields) {
         if (fields.hasOwnProperty(key) && fields[key].observe ) {
            // the object stored here is utilized as a history and state context for staging notifications
            // and synchronization between this Record and the observable fields it manages.
            out[key] = {};
         }
      }
      return out;
   }

   /**
    * Creates a copy of the record data with all observables unwrapped to their value
    */
   function _unwrapAll(observed, data) {
      var out = {};
      for (var key in data) {
         if (data.hasOwnProperty(key)) {
            out[key] = (key in observed)? data[key]() : data[key];
         }
      }
      return out;
   }

   /**
    * Watch observables for changes and create notifications to our subscribers when they do change. This is necessary
    * to provide an abstracted way to monitor all the observable and non-observable values.
    *
    * The conundrum with observables, and the reason we need this and we can't just trigger the notifications from
    * Record.prototype.set, is that we are using them as the values. When knockout bindings fire, an update to the
    * observable is like hacking a private variable in a javascript object and skipping the setter method
    * (i.e. we don't know an updated occurred)
    *
    * So naturally we subscribe to the observable and monitor it for changes. However, determining which
    * changes are ours vs somebody else's from inside the observable is a challenging prospect which
    * generates some amount of coupling, so instead of trying this, or instead of trying to trigger some updates
    * from the setter method and others from the subscription of the observable, we just do all the observable
    * notifications right from here
    */
   function _watchObservables(record) {
      var observed = record.observed;
      _.each(observed, function(v, k) {
         _sync(record, k, record.data[k], v);
      });
   }

   function _sync(record, field, observable, observedProps) {
      observable.subscribe(function(newValue) {
         if( newValue !== observedProps.last ) {
            observedProps.last = newValue;
            _updateListeners(record.listeners, record, field);
         }
      });
   }

   function applyUpdates(rec, newVals) {
      var changed = [];

      var data = (newVals instanceof ko.sync.Record)? newVals.getData() : newVals;
      _.each(rec.data, function(v,k) {
         if( data.hasOwnProperty(k) ) {
            var newVal = data[k];
            if( setWithoutNotice(rec, k, newVal) ) {
               changed.push(k);
            }
         }
      });

      // changes may affect the record id
      rec.id.update(rec.get(rec.id.fields));

      return changed;
   }

   /**
    *
    * @param rec
    * @param field
    * @param newVal
    * @return {Boolean}
    */
   function setWithoutNotice(rec, field, newVal) {
      var res = false;
      //todo-sort update sort stuff (move? notify of move?) when sort fields update
      if( field in rec.data && rec.get(field) !== newVal ) {
         //todo-validate !
         var observed = rec.observed;
         if( field in observed ) {
            // prevents observables from triggering this record's update notifications
            observed[field].last = newVal;

            // sets the observable value
            rec.data[field](newVal);
         }
         else {
            rec.data[field] = newVal;
         }
         res = true;
      }
      else if( !field in rec.data ) {
         console.warn('field '+field+' does not exist for record type '+rec.type);
      }
      return res;
   }

   function applyKeyCallbacks(rec) {
      _.each(rec.keyCallbacks, function(fx) {
         dataKeyCallback(fx, rec);
      });
      rec.keyCallbacks = [];
   }

   function dataKeyCallback(callback, rec) {
      var fields = rec.id.fields;
      var data = _unwrapAll(rec.observed, _.pick(rec.data, fields));
      callback(rec.hashKey(), fields, data);
   }

})(ko);
