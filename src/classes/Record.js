/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var undef;

   /**
    * @param {ko.sync.Model}  model
    * @param {object} [data]
    * @constructor
    */
   ko.sync.Record = function(model, data) {
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
   };

   ko.sync.Record.prototype.getRecordId = function() {
      return this.id;
   };

   ko.sync.Record.prototype.getSortPriority = function() {
      return this.sort? this.get(this.sort) : false;
   };

   ko.sync.Record.prototype.hasKey = function() {
      return this.getKey().isSet();
   };

   ko.sync.Record.prototype.getKey = function() {
      return this.id;
   };

   ko.sync.Record.prototype.hashKey = function() {
      return this.getKey().hashKey();
   };

   /**
    * Updating the key is intended to be used after a create operation during which the database sets the ID.
    * Thus, it does not mark the record dirty or send out notifications.
    *
    * This method will ignore any set requests if an ID already exists on the record
    * @param {string|object} hashKey
    */
   ko.sync.Record.prototype.updateHashKey = function( hashKey ) {
      if( !this.hasKey() ) {
         this.id.update(hashKey);
         //todo if fields are updated, a notice should be delivered; this can update fields without notification
         applyUpdates(this, _.isObject(hashKey)? hashKey : this.id.parse(hashKey));
         if( this.id.isSet() ) { applyKeyCallbacks(this); }
      }
      return this;
   };

   /**
    * This physically changes the record ID. This does update fields on the record and can result in notifications
    * being sent and database transactions. The old record is not deleted by this change (it's just forgotten).
    * @param {ko.sync.RecordId} newKey
    */
   ko.sync.Record.prototype.setKey = function( newKey ) {
      this.id = newKey;
      if( newKey.isSet() ) {
         this.updateAll(newKey.parse());
         applyKeyCallbacks(this);
      }
   };

   /**
    * @param {Array} [fields]
    * @param {boolean} [withTempId]
    * @return {Object}
    */
   ko.sync.Record.prototype.getData = function(fields, withTempId) {
      if( arguments.length === 1 && typeof(arguments[0]) === 'boolean' ) {
         withTempId = fields;
         fields = null;
      }
      var data = _.pick(this.data, fields||this.fields);
      withTempId && (data[ko.sync.KeyFactory.HASHKEY_FIELD] = this.hashKey());
      return data;
   };

   ko.sync.Record.prototype.get = function(field) {
      if(_.isArray(field)) {
         return _.pick(this.data, field);
      }
      else {
         return this.data[field];
      }
   };

   ko.sync.Record.prototype.set = function(field, val) {
      if( setWithoutNotice(this, field, ko.utils.unwrapObservable(val)) ) {
         this.changed = true;

         // only non-observables generate notifications here; the _watchObservables method handles the remainder
         // somewhat invisibly but quite effectively
         _updateListeners(this.listeners, this, field);
      }
      return this.changed;
   };

   ko.sync.Record.prototype.isDirty = function(newVal) {
      if( typeof(newVal) === 'boolean' ) {
         this.changed = newVal;
      }
      return this.changed;
   };

   ko.sync.Record.prototype.clearDirty = function() {
      this.isDirty(false);
      return this;
   };

   ko.sync.Record.prototype.isValid = function() {
      return !this.validator || this.validator.validate(this);
   };

   /**
    * @param {ko.sync.Record|object} newVals
    */
   ko.sync.Record.prototype.updateAll = function(newVals) {
      var changed = applyUpdates(this, newVals);
      if( changed.length ) {
         this.changed = true;
         // send a single notification for all the field changes
         _updateListeners(this.listeners,  this, changed);
      }
      return this;
   };

   /**
    * Invokes `callback` with this record object whenever a change occurs to the data
    */
   ko.sync.Record.prototype.subscribe = function(callback) {
      var listeners = this.listeners;
      listeners.push(callback);
      return {
         dispose: function() {
            var idx = _.indexOf(listeners, callback);
            if( idx > -1 ) { listeners.splice(idx, 1); }
         }
      };
   };

   /**
    * Waits for record to receive a permanent ID from the server and calls callback(hashKey, idFields, idData).
    * If this record already has an ID, this will be invoked immediately.
    * @param callback
    */
   ko.sync.Record.prototype.onKey = function(callback) {
      if( this.hasKey() ) {
         dataKeyCallback(callback, this);
      }
      else {
         this.keyCallbacks.push(callback);
      }
   };

   /**
    * Apply the record's data to target element. Make sure than any fields which are observables are created/updated
    * accordingly.
    *
    * @param {Object|ko.observable} target
    * @param {ko.sync.Record} rec
    * @param {Array} [fields]
    */
   ko.sync.Record.applyWithObservables = function(target, rec, fields) {
      fields || (fields = rec.fields);
      var data = rec.getData(fields, true);
      var targetData = ko.isObservable(target)? target()||{} : target||{};
      var obsKeys = _.keys(rec.observed);
      _.each(data, function(v, f) {
         // check for observables,
         if(_.indexOf(obsKeys, f) > -1) {
            if(_.has(targetData, f) && ko.isObservable(targetData[f])) {
               // make sure we don't overwrite observables; subscribers would be lost
               targetData[f](v);
            }
            else {
               // doesn't exist or isn't the right data type; fix it
               targetData[f] = _.isArray(v)? ko.observableArray(v) : ko.observable(v);
            }
         }
         else {
            // isn't observed so just set it
            targetData[f] = v;
         }
      });
      if( ko.isObservable(target) ) {
         // drop it back into the observed world
         target(targetData);
      }
      return target;
   };

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
     return v;
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

   function applyUpdates(rec, newVals) {
      var changed = [], idFields = rec.id.fields, idChanged;

      var data = (newVals instanceof ko.sync.Record)? newVals.getData(true) : newVals;
      _.each(data, function(v,k) {
         if( _.has(rec.data, k) ) {
            var newVal = ko.utils.unwrapObservable(data[k]);
            if( setWithoutNotice(rec, k, newVal) ) {
               if(_.inArray(idFields, k)) { idChanged = true; }
               changed.push(k);
            }
         }
      });

      // changes may affect the record id
      idChanged && rec.updateHashKey(rec.get(rec.id.fields));

      return changed;
   }

   /**
    *
    * @param {ko.sync.Record} rec
    * @param field
    * @param newVal
    * @return {Boolean}
    */
   function setWithoutNotice(rec, field, newVal) {
      var res = false;
      //todo-sort update sort stuff (move? notify of move?) when sort fields update
      if( field in rec.data && rec.get(field) !== newVal ) {
         //todo-validate !
         rec.data[field] = newVal;
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
      var data = rec.get(fields);
      callback(rec.hashKey(), fields, data);
   }

})(ko);
