
(function(ko) {
   "use strict";

   var exports = ko.sync.TestData = {}, Model = ko.sync.Model;

   var genericModelProps = {
      table: 'TableKeyed',
      key: 'id',
      fields: {
         id:             { required: true,  observe: false, persist: true, type: 'string' },
         stringOptional: { required: false, observe: true,  persist: true, type: 'string' },
         stringRequired: { required: true,  observe: true,  persist: true, type: 'string' },
         dateOptional:   { required: false, observe: false, persist: true, type: 'date' },
         dateRequired:   { required: true,  observe: true,  persist: true, type: 'date' },
         intOptional:    { required: false, observe: true,  persist: true, type: 'int' },
         intRequired:    { required: true,  observe: false, persist: true, type: 'int' },
         boolOptional:   { required: false, observe: true,  persist: true, type: 'boolean' },
         boolRequired:   { required: true,  observe: true,  persist: true, type: 'boolean' },
         floatOptional:  { required: false, observe: true,  persist: true, type: 'float' },
         floatRequired:  { required: true,  observe: false, persist: true, type: 'float' },
         emailOptional:  { required: false, observe: true,  persist: true, type: 'email' },
         emailRequired:  { required: true,  observe: true,  persist: true, type: 'email' }
      }
   };

   var genericModelPropsWithSort = ko.utils.extend(
      {sort: 'intRequired'}, genericModelProps);

   var genericDataWithoutId = {
      stringRequired: 'required',
      dateRequired:   moment().utc().format(),
      intRequired:    -25,
      boolRequired:   true,
      floatRequired:  2.5,
      emailRequired:  'two@five.com'
   };

   var genericDataWithId = ko.utils.extend({id: 'record123'}, genericDataWithoutId);

   /**
    * @param {object}  [moreOpts]
    * @param {boolean} [withSort]
    * @return {ko.sync.Model}
    */
   exports.model = function(moreOpts, withSort) {
      if( arguments.length == 1 && _.isBoolean(moreOpts) ) {
         withSort = moreOpts;
         moreOpts = null;
      }
      var props = $.extend({}, (withSort? genericModelPropsWithSort : genericModelProps), moreOpts);
      return new Model(props);
   };

   /**
    * @param {boolean} [unkeyed]
    * @param {object}  [moreData]
    * @return {object}
    */
   exports.genericData = function(unkeyed, moreData) {
      if( arguments.length == 1 && _.isObject(unkeyed) ) {
         moreData = unkeyed;
         unkeyed = false;
      }
      return $.extend({}, unkeyed? genericDataWithoutId : genericDataWithId, moreData);
   };

   /**
    * @param {boolean} [unkeyed]
    * @param {Object}  [moreData]
    * @return {Object}
    */
   exports.fullData = function(unkeyed, moreData) {
      //todo-sort
      return $.extend(
         {},
         exports.defaults(exports.model()),
         exports.genericData.apply(null, $.makeArray(arguments))
      );
   };

   /**
    * Ensures dates are converted to compatible formats for comparison
    * @param {object} data
    * @return {object}
    */
   exports.forCompare = function(data) {
      var out = $.extend({}, data);
      if( 'dateOptional' in out && out.dateOptional ) {
         out.dateOptional = moment.utc(out.dateOptional).toDate();
      }
      if( 'dateRequired' in out && out.dateRequired ) {
         out.dateRequired = moment.utc(out.dateRequired).toDate();
      }
      return out;
   };

   exports.defaults = function(model) {
      //todo-sort
      var defaults = {};
      _.each(model.fields, function(field, key) {
         defaults[key] = field.default;
      });
      return defaults;
   };


   /**
    * Creates records using ko.sync.TestData.makeRecord()
    *
    * @param {int}           len    how many records to create?
    * @param {object}        [data] adjust the default data object
    * @return {Array}
    */
   exports.makeRecords = function(len, data) {
      var recs = [], base = $.extend({}, genericDataWithId, data);
      for(var i = 1; i <= len; i++) {
         recs.push(exports.makeRecord(exports.model(), base, i));
      }
      return recs;
   };

   /**
    * @param {ko.sync.Model} model
    * @param {object}        base   a data template
    * @param {int}           i      used to build id, requiredInt, requiredFloat, and requiredString values
    * @return {ko.sync.Record}
    */
   exports.makeRecord = function(model, base, i) {
      var data = $.extend({}, base);
      data.id = 'record-'+i;
      data.requiredInt = i;
      data.requiredFloat = i + (i * .01);
      data.requiredString = 'string-'+i;
      return model.newRecord(data);
   };

   /**
    * Create a non-composite ID keyed by the `id` field with value specified. If no value is specified, the
    * ID gets a temporary ID.
    * @param {string} [value]
    */
   exports.makeRecordId = function(value) {
      return new ko.sync.RecordId(['id'], {'id': value});
   };

   exports.bigData = {
      COUNT: 200,
      props: {
         table: 'BigData',
         key: 'id',
         sort:  'sort',
         fields: {
            id:      { required: true,  persist: true, type: 'string'  },
            aString: { required: false, persist: true, type: 'string'  },
            sort:    { required: false, persist: true, type: 'int'     },
            aBool:   { required: false, persist: true, type: 'boolean' }
         }
      },

      /**
       * @param {int} id
       * @param {object} [moreData]
       * @param {ko.sync.Model} [model] must be a model of bigData!
       * @return {ko.sync.Record}
       */
      record: function(id, moreData, model) {
         model || (model = exports.bigData.model());
         var rec = model.newRecord(exports.bigData.data(id, moreData));
         if( moreData ) { rec.isDirty(true); }
         return rec;
      },

      /**
       * @param {int} id
       * @param {object} [moreData]
       * @return {object}
       */
      data: function(id, moreData) {
         return $.extend(
            {id: id, aString: 'string-'+id, sort: id, aBool: (id%2 === 0)},
            moreData
         )
      },

      recs: function(firebaseRoot, max, moreData, model) {
         var i=0;
         var recs = [];
         while(++i <= max) {
            recs.push(exports.bigData.record(i, moreData, model));
         }
         return recs;
      },

      /**
       * @param firebaseRoot
       * @param {int} [numrecs]
       * @return {jQuery.Deferred}
       */
      reset: function(firebaseRoot, numrecs, moreData) {
         console.time('bigData.reset()');
         var i, def = $.Deferred(), count = 0, ref = firebaseRoot.child('BigData');
         ref.set(null, function() {
            var max = numrecs || exports.bigData.COUNT;
            _.each(exports.bigData.recs(max, moreData, exports.bigData.model()), function(rec,i) {
               ref.child(i).setWithPriority(
                  rec.getData(),
                  i,
                  function() { if( ++count == max ) {
                     console.timeEnd('bigData.reset()');
                     def.resolve(ref);
                  }}
               );
            });
         });
         return def.promise();
      },

      /**
       * @param {object} [moreOpts]
       * @return {ko.sync.Model}
       */
      model: function(moreOpts) {
         var props = $.extend({}, exports.bigData.props, moreOpts);
         return new Model(props);
      }
   };



   (function() {

      /**
       * A test class used to track calls to the store object for synchronization
       */
      exports.TestStore = ko.sync.Store.extend({
         init: function(hasTwoWaySync, testCallback, records) {
            this.hasSync = hasTwoWaySync;
            this.testCallback = testCallback;
            this.records = records || [];
            this.callbacks = [];
         },

         /**
          * @param {ko.sync.Model} model
          * @param {ko.sync.Record} record
          * @return {Promise} resolves to the new record's ID or rejects if it could not be created
          */
         create: function(model, record) {
            this.testCallback('create', record.hashKey());
            return $.Deferred(function(def) {
               this.records.push(record);
//               this.notify('added', record.hashKey(), record.getData(), this.records.length-2);
               _.delay(function() { def.resolve(record.hashKey()); }, 10);
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model}     model
          * @param {ko.sync.RecordId}  recordId
          * @return {Promise}  resolves to the Record object or null if it is not found
          */
         read: function(model, recordId) {
            this.testCallback('read', recordId.hashKey());
            return $.Deferred(function(def) {
               _.delay(function() {
                  def.resolve(this.find(recordId));
               }.bind(this), 10);
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model}  model
          * @param {ko.sync.Record} rec
          * @return {Promise} resolves to callback({string}id, {boolean}changed) where changed is false if data was not dirty, rejected if record does not exist
          */
         update: function(model, rec) {
            this.testCallback('update', rec.hashKey());
            return $.Deferred(function(def) {
               _.delay(function() {
                  var oldRec = this.find(rec);
                  oldRec.updateAll(rec.getData());
                  def.resolve(oldRec.hashKey(), oldRec.isDirty());
//                  this.notify('updated', oldRec.hashKey(), oldRec.getData());
               }.bind(this), 10);
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model}           model
          * @param {ko.sync.Record|ko.sync.RecordId} recOrId
          * @return {Promise} resolves with record's {string}id
          */
         delete: function(model, recOrId) {
            var key = recOrId.hashKey(), rec = this.find(key);
            this.testCallback('delete', key);
            return $.Deferred(function(def) {
               _.delay(function() {
                  var idx = _.indexOf(this.records, rec);
                  if( idx >= 0 ) {
//                     this.notify('deleted', key, rec.getData());
                     def.resolve(key);
                  }
                  else {
                     def.reject('could not find '+key);
                  }
               }.bind(this), 10);
            }.bind(this));
         },

         /**
          * @param {Function} iterator
          * @param {ko.sync.Model}  model
          * @param {object} [filterCriteria]
          * @return {Promise}
          */
         query: function(model, iterator, filterCriteria) {
            this.testCallback('query', filterCriteria);
            return $.Deferred(function(def) {
               _.delay(function() {
                  def.resolve(_iterateRecords(this.records, filterCriteria, iterator));
               }.bind(this), 10);
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model} model
          * @param {object}        [filterCriteria]
          */
         count: function(model, filterCriteria) {
            this.testCallback('count', filterCriteria);
            return $.Deferred(function(def) {
               _.delay(function() {
                  def.resolve(_iterateRecords(this.records, filterCriteria, function() {}));
               }.bind(this), 10);
            }.bind(this));
         },

         /**
          * @return {boolean}
          */
         hasTwoWaySync: function() {
            this.testCallback('hasTwoWaySync');
            return this.hasSync;
         },

         /**
          * @param  {ko.sync.Model} model
          * @param  {Function}     callback
          * @param  {object}       [filterCriteria]
          * @return {Object}
          */
         watch: function(model, callback, filterCriteria) {
            this.testCallback('watch', filterCriteria);
            var self = this;
            this.callbacks.push(callback);
            return {
               dispose: function() {
                  self.callbacks = _.without(self.callbacks, callback);
               }
            };
         },

         /**
          * @param {ko.sync.Model}  model
          * @param  {Function}      callback
          * @param {ko.sync.RecordId|ko.sync.Record} recordId
          * @return {Object}
          */
         watchRecord: function(model, callback, recordId) {
            this.testCallback('watchRecord', recordId.hashKey());
            return this.find(recordId).subscribe(callback);
         },

         find: function(recordId) {
            typeof(recordId) === 'string' || (recordId = recordId.hashKey());
            return _.find(this.records, function(v) {
               return v.hashKey() == recordId;
            });
         },

         notify: function(action, id, data, prevId) {
            _.each(this.callbacks, function(fx) {
               fx(action, id, data, prevId);
            });
         }

      });

      function _buildFilter(opts) {
         var w =  'where' in opts? opts.where : null;
         if( w ) {
            switch(typeof(w)) {
               case 'object':
                  // convert to a function
                  opts.filter = _filterFromParms(w);
                  break;
               case 'function':
                  opts.filter = opts.where;
                  break;
               default:
                  throw new Error('Invalid `when` type ('+typeof(opts.when)+')');
            }
         }
         else {
            opts.filter = null;
         }
      }

      function _filterFromParms(where) {
         return function(data, key) {
            return _.every(where, function(v, k) {
               if( !(k in data) ) { return false; }
               switch(typeof(v)) {
                  case 'function':
                     return v(data[k], k, key);
                  case 'object':
                     if( v === null ) { return data[k] === null; }
                     return _.isEqual(v, data[k]);
                  case 'number':
                     return v === ~~data[k];
                  case 'undefined':
                     return data[k] === undef;
                  default:
                     return v == data[k];
               }
            });
         }
      }

      function _iterateRecords(records, criteria, iterator) {
         var matches = 0;
         _buildFilter(criteria);
         _.each(records, function(rec, curr) {
            var data = rec.getData(), key = rec.hashKey(), start = ~~criteria.offset, end = ~~criteria.limit + start;
            if( !criteria.filter || criteria.filter(data, key) ) {
               //todo-sort
               if( end && curr == end ) {
                  return true;
               }
               else if( curr >= start ) {
                  matches++;
                  return iterator && iterator(data, key);
               }
            }
         });
         return matches;
      }

   })();

})(ko);

