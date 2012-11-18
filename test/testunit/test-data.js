
(function(ko) {
   "use strict";

   var exports = ko.sync.TestData = {}, Model = ko.sync.Model;
   var TIMEOUT = 5000;

   var genericModelProps = {
      table: 'TableKeyed',
      key: 'id',
      fields: {
         id:             { required: true,  observe: false, type: 'string' },
         stringOptional: { required: false, observe: true,  type: 'string' },
         stringRequired: { required: true,  observe: true,  type: 'string' },
         dateOptional:   { required: false, observe: false, type: 'date' },
         dateRequired:   { required: true,  observe: true,  type: 'date' },
         intOptional:    { required: false, observe: true,  type: 'int' },
         intRequired:    { required: true,  observe: false, type: 'int' },
         boolOptional:   { required: false, observe: true,  type: 'boolean' },
         boolRequired:   { required: true,  observe: true,  type: 'boolean' },
         floatOptional:  { required: false, observe: true,  type: 'float' },
         floatRequired:  { required: true,  observe: false, type: 'float' },
         emailOptional:  { required: false, observe: true,  type: 'email' },
         emailRequired:  { required: true,  observe: true,  type: 'email' }
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
            id:      { required: true,  type: 'string'  },
            aString: { required: false, type: 'string'  },
            sort:    { required: false, type: 'int'     },
            aBool:   { required: false, type: 'boolean' }
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

      /**
       * @param {int} max
       * @param {object} [moreData]
       * @param {Model} [model]
       * @return {Array}
       */
      recs: function(max, moreData, model) {
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
         var i, def = $.Deferred(), count = 0, ref = firebaseRoot.child('BigData');
         ref.set(null, function() {
            var max = numrecs || exports.bigData.COUNT;
            _.each(exports.bigData.recs(max, moreData, exports.bigData.model()), function(rec,i) {
               ref.child(rec.get('id')).setWithPriority(
                  rec.getData(),
                  rec.get('id'),
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

   exports.startTimeout = function(def) {
      return setTimeout(function() {
         def.reject('timeout expired');
      }, TIMEOUT);
   };


   /***********************************
    * TEST STORE
    **********************************/
   (function() {

      /**
       * A pretend Store object that notifies a callback whenever a method is called on the Store interface. TestStore
       * meets all the requirements of Store interface and can be used normally in place of an asynchronous Store.
       *
       * However, the watch() methods filterCriteria parameter is ignored and does not come into play here.
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
               this.notify('added', record.hashKey(), record.getData(), this.records[this.records.length-2].hashKey())
                  .then(resolve(def, record.hashKey()));
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
          * @return {jQuery.Deferred} resolves to callback({string}id, {boolean}changed) where changed is false if data was not dirty, rejected if record does not exist
          */
         update: function(model, rec) {
            this.testCallback('update', rec.hashKey());
            return $.Deferred(function(def) {
               var oldRec = this.find(rec);
               oldRec.updateAll(rec.getData());
               def.resolve();
               this.notify('updated', oldRec.hashKey(), oldRec.getData()).then(resolve(def, oldRec.hashKey(), oldRec.isDirty()));
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model}           model
          * @param {ko.sync.Record|ko.sync.RecordId} recOrId
          * @return {jQuery.Deferred} resolves with record's {string}id
          */
         delete: function(model, recOrId) {
            var key = recOrId.hashKey(), rec = this.find(key);
            this.testCallback('delete', key);
            var idx = _.indexOf(this.records, rec);
            if( idx >= 0 ) {
               return this.notify('deleted', key, rec.getData());
            }
            else {
               return $.Deferred(function(def) { def.reject('could not find '+key); });
            }
         },

         /**
          * @param {Function} iterator
          * @param {ko.sync.Model}  model
          * @param {object} [filterCriteria]
          * @return {jQuery.Deferred}
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
          * FILTER CRITERIA DOES NOT WORK HERE :(
          *
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
          * @param {ko.sync.RecordId|ko.sync.Record} recordId
          * @param  {Function}      callback
          * @return {Object}
          */
         watchRecord: function(model, recordId, callback) {
            var key = recordId.hashKey();
            this.testCallback('watchRecord', key);
            return this.watch(model, function() {
               if( arguments[1] == key ) {
                  callback.apply(null, _.toArray(arguments).slice(1));
               }
            });
         },

         find: function(recordId) {
            typeof(recordId) === 'string' || (recordId = recordId.hashKey());
            return _.find(this.records, function(v) {
               return v.hashKey() == recordId;
            });
         },

         /**
          * This is triggered whenever add/update/delete/move events occur to simulate the modification
          * which would be returned by the server after save.
          *
          * @param action
          * @param id
          * @param [data]
          * @param [prevId]
          * @return {jQuery.Deferred} just so test cases know how long to wait before asserting
          */
         notify: function(action, id, data, prevId) {
            return $.Deferred(function(def) {
               if( this.hasTwoWaySync() ) {
                  _.delay(function() { // simulate event returning from server
                     _.each(this.callbacks, function(fx) {
                        fx(action, id, data, prevId);
                     });
                     def.resolve(id);
                  }.bind(this), 10);
               }
               else {
                  def.resolve(id);
               }
            }.bind(this));
         },

         /**
          * Create a fake notification event which would simulate an update occurring on the server and us
          * getting that update via a push event
          *
          * @param {string} action
          * @param {string} id
          * @param {object} [changedData]
          * @param {string} [prevId]
          * @return {jQuery.Deferred} just so test cases know how long to wait before asserting
          */
         fakeNotify: function(action, id, changedData, prevId) {
            if( arguments.length === 3 && typeof(changedData) === 'string' ){
               prevId = changedData;
               changedData = {};
            }
            var rec = this.find(id), data = $.extend({}, rec? rec.getData() : {}, changedData);
            return this.notify(action, id, data, prevId);
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

   function resolve(def) {
      var args = $.makeArray(arguments);
      args.shift();
      if( args.length ) {
         return function() {
            def.resolve.apply(def, args);
         }
      }
      else {
         return def.resolve;
      }
   }

})(ko);

