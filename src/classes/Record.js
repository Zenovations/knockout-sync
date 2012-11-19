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
      setHashKey: function( hashKey ) {
         if( !this.hasKey() && this.id.isComposite() ) {
            this.set(this.id.fields[0], hashKey);
            this.id.update(this.getData());
         }
      },
      setKey: function( newKey ) {
         this.id = newKey;
         newKey.isSet() && this.updateAll(_.object(newKey.getCompositeFields(), newKey.hashKey().split(newKey.separator)));
      },
      getData:         function() {
         return _unwrapAll(this.observed, this.data);
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
         //todo-sort what should happen if fields affecting the sort priority are changed?
         if( !(field in this.data) ) { return false; }
         if( this.get(field) !== val ) {
            this.changed = true;
            //todo-validate !
            if( field in this.observed ) {
               this.data[field](val);
               // set the key if it doesn't exist and we now have all the fields to do so
               //todo what should happen if fields affecting the id are changed? maybe this? maybe too slow?
//               !this.hasKey() && _.indexOf(this.id.fields, field) > -1 && this.id.update(this.get(this.id.fields));
            }
            else {
               this.data[field] = val;
               // only non-observables generate notifications here; the _watchObservables method handles the remainder
               // somewhat invisibly but quite effectively
               //todo should this even exist? should we only trigger updates for observables?
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
         var self = this, observed = self.observed, changed = [];
         var data = (newVals instanceof ko.sync.Record)? newVals.getData() : newVals;
         console.log('updateAll', newVals);//debug
         _.each(self.data, function(v,k) {
            if( data.hasOwnProperty(k) ) {
               var newVal = data[k];
               // this little magic trick prevents change events from being sent for each field
               if( k in observed ) { observed[k].last = newVal; }
               if( self.set(k, newVal) ) {
                  changed.push(k);
               }
            }
         });
         if( changed.length ) {
            // send a single notification for all the field changes
            _updateListeners(self.listeners,  self, changed);
         }
         return self.changed;
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

})(ko);
