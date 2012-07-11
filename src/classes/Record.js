/*******************************************
 * Record class for knockout-sync
 *******************************************/
(function(ko) {
   "use strict";
   var undef;

   var Record = Class.extend({
      /**
       * @param {ko.sync.Model}  model
       * @param {object} [data]
       * @constructor
       */
      init:            function(model, data) {
         data || (data = {});
         this.data      = _setFields(model.fields, data);
         this.id        = new ko.sync.RecordId(model.key, data);
         this.sort      = model.sort;
         this.changed   = false;
         this.validator = model.validator;
         this.listeners = [];
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
      getData:         function() {
         return ko.utils.extend({}, this.data);
      },
      get:             function(field) {
         return this.data[field];
      },
      set:             function(field, val, suppressNotifications) {
         if( this.data.hasOwnProperty(field) && this.data[field] !== val ) {
            this.changed = true;
            //todo validate!
            this.data[field] = val;
            if( ! suppressNotifications ) {
               _updateListeners(this.listeners, this);
            }
            return true;
         }
         return false;
      },
      isDirty:         function(newVal) {
         if( typeof(newVal) === 'boolean' ) {
            this.changed = newVal;
         }
         return this.changed;
      },
      clearDirty:      function() {
         return this.isDirty(false);
      },
      isValid:         function() {
         return !this.validator || this.validator.validate(this);
      },
      /**
       * @param {Record|object} newVals
       */
      updateAll: function(newVals) {
         var k, data = (newVals instanceof Record)? newVals.getData() : newVals, changes = false;
         for(k in data) {
            if( data.hasOwnProperty(k) ) {
               changes |= this.set(k, data[k], true);
            }
         }
         if( changes ) {
            _updateListeners(this.listeners, this);
         }
         return this.changed;
      },
      /**
       * Invokes `callback` with this record object whenever a change occurs to the data
       */
      subscribe: function(callback) {
         this.listeners.push(callback);
      }
   });

   function _setFields(fields, data) {
      var k, out = {}, keys = _.keys(fields), i = keys.length;
      while(i--) {
         k = keys[i];
         if( data.hasOwnProperty(k) && exists(data[k]) ) {
            out[k] = data[k];
         }
         else {
            out[k] = fields[k].default;
         }
      }
      return out;
   }

   function exists(v) {
      return v !== null && v !== undefined;
   }

   function _updateListeners(callbacks, value) {
      var i = -1, len = callbacks.length;
      while(++i < len) {
         callbacks[i](value);
      }
   }

   ko.sync || (ko.sync = {});
   ko.sync.Record = Record;

})(this.ko);

