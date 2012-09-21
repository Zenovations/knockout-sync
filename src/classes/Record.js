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
         this.id        = new ko.sync.RecordId(model.key, data);
         this.sort      = model.sort;
         this.changed   = false;
         this.validator = model.validator;
         this.listeners = [];
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
      setKey: function( newKey ) {
         this.id = newKey;
      },
      getData:         function() {
         return _unwrapAll(this.observed, this.data);
      },
      get:             function(field) {
         return field in this.observed? this.data[field]() : this.data[field];
      },
      set:             function(field, val) {
         //todo-sort what happens if fields affecting the sort priority change?
         if( !(field in this.data) ) { return false; }
         var obs = (field in this.observed), currVal = this.data[field];
         if( obs ) {
            currVal = currVal();
         }
         if( currVal !== val ) {
            this.changed = true;
            //todo-validate !
            if( obs ) {
               this.data[field](val);
            }
            else {
               this.data[field] = val;
               // only non-observables generate notifications here; the _watchObservables method handles the remainder
               // somewhat invisibly but quite effectively
               _updateListeners(this.listeners, this, field);
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
       * @param {ko.sync.Record|object} newVals
       */
      updateAll: function(newVals) {
         var k, observed = this.observed, changed = [];
         var data = (newVals instanceof ko.sync.Record)? newVals.getData() : newVals;
         for(k in data) {
            if( data.hasOwnProperty(k) ) {
               var v = data[k];
               // this little magic trick prevents change events from being sent for each field
               if( k in observed ) { observed[k].last = v; }
               if( this.set(k, v) ) {
                  changed.push(k);
               }
            }
         }
         if( changed.length ) {
            // send a single notification for all the field changes
            _updateListeners(this.listeners,  this, changed);
         }
         return this.changed;
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
               if( idx >= 0 ) { listeners.splice(idx, 1); }
            }
         };
      }
   });

   function _setFields(fields, data) {
      //todo validate the data before applying it somehow
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
    * @param {string} fieldChanged
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

})(ko);
