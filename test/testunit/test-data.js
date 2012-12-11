
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
      intRequired:    25,
      boolRequired:   true,
      floatRequired:  2.5,
      emailRequired:  'null@no.com'
   };

   var genericDataWithId = ko.utils.extend({id: 'record123'}, genericDataWithoutId);

   /**
    * @param {object}  [moreOpts]
    * @param {boolean} [hasTwoWaySync]
    * @param {Array}   [recs]
    * @return {ko.sync.Model}
    */
   exports.model = function(moreOpts, hasTwoWaySync, recs) {
      var noSort = moreOpts && moreOpts.sort === false;
      var props = $.extend({}, (noSort? genericModelProps : genericModelPropsWithSort), moreOpts);
      var model = new Model(props);
      model._testInstance = modelCount++;
      model.store || (model.store = new exports.TestStore(hasTwoWaySync, recs, model));
      return model;
   };
   var modelCount = 1;

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
    * @param {ko.sync.Model} [model]
    * @return {object}
    */
   exports.forCompare = function(data, model) {
      var out = $.extend({}, data), fields = _.keys((model||exports.model()).fields);
      if( 'dateOptional' in out && out.dateOptional ) {
         out.dateOptional = moment.utc(out.dateOptional).format();
      }
      if( 'dateRequired' in out && out.dateRequired ) {
         out.dateRequired = moment.utc(out.dateRequired).format();
      }
      // using pick here essentially sorts the values and ensures ordering is consistent
      return _.pick(ko.sync.unwrapAll(out), fields);
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
    * @param {int|string} [id]
    * @param {Object} [moreData]
    * @param {ko.sync.Model} [model]
    * @return {ko.sync.Record}
    */
   exports.rec = function(id, moreData, model) {
      if( typeof(id) === 'object' && !moreData ) {
         moreData = id;
         id = moreData.id || 1;
      }
      return (model||exports.model()).newRecord(exports.dat(id, moreData));
   };

   exports.dat = function(id, moreData) {
      var i = ~~id || 123;
      return $.extend({}, genericDataWithId, {
         id: typeof(id) === 'number'? 'record-'+id : id,
         intRequired: i,
         floatRequired: i + (i * .01),
         stringRequired: 'string-'+i,
         emailRequired: 'user'+i+'@no.com'
      }, moreData);
   };

   exports.tempRec = function(moreData, model) {
      return (model||exports.model()).newRecord(exports.dat(0, _.extend({id: null}, moreData)));
   };

   /**
    * @param {int} len
    * @param {Object} [data]
    * @param {ko.sync.Model} [model]
    * @return {Array}
    */
   exports.recs = function(len, data, model) {
      var recs = [];
      for(var i = 1; i <= len; i++) {
         recs.push(exports.rec(i, data, model));
      }
      return recs;
   };

   exports.keyFactory = function() {
      return new ko.sync.KeyFactory(exports.model(), true);
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
            astring: { required: false, type: 'string'  },
            sort:    { required: false, type: 'int'     },
            abool:   { required: false, type: 'boolean' }
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
            {id: id, astring: 'string-'+id, sort: id, abool: (id%2 === 0)},
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

   exports.pushRecsToObservableArray = function(target, recs, model) {
      var observedFields = (model || exports.model()).observedFields();
      _.each(recs, function(rec) {
         target.push(rec.applyData());
      });
      return target;
   };

   /**
    * @param {jQuery.Deferred} def
    * @param {int} [timeout]
    * @return {jQuery.Deferred}
    */
   exports.expires = function(def, timeout) {
      var to = setTimeout(function() {
         to = null;
         def.reject('timeout expired');
      }, timeout||TIMEOUT);
      def.always(function() {
         to && clearTimeout(to);
      });
      return def;
   };

   exports.deferWait = function(timeout) {
      timeout || (timeout = 100);
      return $.Deferred(function(def) {
         _.delay(def.resolve, timeout);
      });
   };


   /***********************************
    * TEST STORE
    **********************************/
   (function() {
      var testStoreCount = 1;

      /**
       * A pretend Store object that notifies a callback whenever a method is called on the Store interface. TestStore
       * meets all the requirements of Store interface and can be used normally in place of an asynchronous Store.
       *
       * However, the watch() methods filterCriteria parameter is ignored and does not come into play here.
       *
       * The special methods events() and eventsWithoutMeta() will also return all events from this object so
       * that no callback is necessary in most cases.
       */
      exports.TestStore = ko.sync.Store.extend({
         init: function(hasTwoWaySync, records, model) {
            if(_.isArray(hasTwoWaySync)) {
               records = hasTwoWaySync;
            }
            if( hasTwoWaySync !== false ) { hasTwoWaySync = true; }
            this.hasSync = hasTwoWaySync;
            this.records = _copyRecords(model||exports.model(), records);
            this.callbacks = [];
            this._testEvents = [];
            this._testInstance = testStoreCount++;
         },

         /**
          * @param {ko.sync.Model} model
          * @param {ko.sync.Record} record
          * @return {jQuery.Deferred} resolves to the new record's ID or rejects if it could not be created
          */
         create: function(model, record) {
            console.log('TestStore::create', record.hashKey()); //debug
            this.testCallback('create', record.hashKey());
            return $.Deferred(function(def) {
               this.records.push(record);
               var newId = record.hasKey()? record.hashKey() : 'record-'+this.records.length;
               var prevId = this.records.length > 1? this.records[this.records.length-2].hashKey() : null;
               this.fakeNotify('added', newId, record.getData(), prevId)
                  .then(thenResolve(def, newId));
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model}     model
          * @param {ko.sync.RecordId}  recordId
          * @return {jQuery.Deferred}  resolves to the Record object or null if it is not found
          */
         read: function(model, recordId) {
            this.testCallback('read', recordId.hashKey());
            return $.Deferred(function(def) {
               var rec = this.find(recordId);
               _.delay(thenResolve(def, rec), 10);
            }.bind(this));
         },

         /**
          * @param {ko.sync.Model}  model
          * @param {ko.sync.Record} rec
          * @return {jQuery.Deferred} resolves to callback({string}id, {boolean}changed) where changed is false if data was not dirty, rejected if record does not exist
          */
         update: function(model, rec) {
            var hashKey = rec.hashKey();
            this.testCallback('update', hashKey);
            return $.Deferred(function(def) {
               var oldRec = this.find(rec);
               if( oldRec ) {
                  oldRec && oldRec.updateAll(rec.getData());
                  //_.delay(thenResolve(def, rec.hashKey(), !!oldRec), 10);
                  this.fakeNotify('updated', hashKey)
                        .then(thenResolve(def, hashKey));
               }
               else {
                  def.reject('record not found');
               }
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
            if( rec ) {
               _.remove(this.records, rec);
               return $.Deferred(function(def) {
                  this.fakeNotify('deleted', key)
                        .then(thenResolve(def, key));
               }.bind(this));
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
            var prevId = null;
            _.each(this.records, function(rec) {
               _delayCallback(callback, 'added', rec, prevId);
               prevId = rec.hashKey();
            });
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
            var key = recordId.hashKey(), rec = this.find(key);
            this.testCallback('watchRecord', key);
            if( rec ) {
               _.delay(function() {
                  callback(recordId, rec.getData());
               }, 20);
            }
            return this.watch(model, function() {
               if( arguments[1] === key ) {
                  callback.apply(null, _.toArray(arguments).slice(1));
               }
            });
         },

         find: function(recordId) {
            typeof(recordId) === 'object' && (recordId = recordId.hashKey());
            typeof(recordId) !== 'string' && (recordId = recordId + '');
            return _.find(this.records, function(v) {
               return v.hashKey() == recordId;
            });
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
            if( arguments.length === 3 && typeof(changedData) !== 'object' ){
               prevId = changedData;
               changedData = {};
            }
            var rec = this.find(id), data = $.extend({}, rec? rec.getData() : {}, changedData);
            return $.Deferred(function(def) {
               if( this.hasTwoWaySync() ) {
                  _.delay(function() { // simulate event returning from server
                     _.each(this.callbacks, function(fx) {
                        fx(action, id, data, prevId);
                     });
                     def.resolve(id);
                  }.bind(this), 1);
               }
               else {
                  def.resolve(id);
               }
            }.bind(this));
         },

         /**
          * @param {String} action
          * @param [meta1]
          * @param [meta2]
          * @param [meta3]
          */
         testCallback: function(action, meta1, meta2, meta3) {
            this._testEvents.push(_.toArray(arguments));
         },

         eventsFiltered: function() {
            return _.filter(this._testEvents, function(v) {
               return v && !(v[0] in {hasTwoWaySync: 1, watch: 1, watchRecord: 1});
            })
         },

         events: function() {
            return this._testEvents.slice(0);
         }
      });

      /**
       * @param {Function} callback
       * @param {String} action
       * @param {ko.sync.Record} rec
       * @param {String} [prevId]
       * @private
       */
      function _delayCallback(callback, action, rec, prevId) {
         _.delay(function() {
            callback(action, rec.hashKey(), rec.getData(), prevId || null);
         }, 20);
      }

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
         var matches = 0, start, end, list = records, len = list.length;
         var s = ~~criteria.start, e = ~~criteria.end;
         if( s || e ) {
            list = _.filter(list, function(rec) {
               var x = rec.getPriority();
               return x >= s && (!e || x < e);
            });
         }
         if( criteria.limit || criteria.offset ) {
            len = list.length;
            start = ~~criteria.offset;
            end = ~~criteria.limit? (~~criteria.limit + start) : len;
            list = list.slice(start, end);
         }

         _buildFilter(criteria);
         if( criteria.filter ) {
            list = _.filter(list, criteria.filter);
         }

         iterator && _.find(list, function(rec, curr) {
            var data = rec.getData(), key = rec.hashKey();
            return iterator && iterator(data, key, matches++);
         });

         return matches;
      }

   })();

   function thenResolve(def) {
      var args = _.toArray(arguments);
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

   function _copyRecords(model, recs) {
      return _.map(recs||[], function(rec) {
         return model.newRecord(rec.getData());
      });
   }

   //todo make these work with exports/et al
   // override asyncTest for some logging
   var _asyncTest = window.asyncTest, currName;
   window.asyncTest = function(name, fx) {
      return _asyncTest(name, function() {
         console.log('starting', name);
         console.time(name);
         currName = name;
         fx();
      });
   };

   var _start = window.start;
   window.start = function() {
      console.timeEnd(currName);
      _start();
   };

   var _test = window.test;
   window.test = function(name, fx) {
      return _test(name, function() {
         console.info('invoking (synchronous): '+name);
         fx();
      });
   };

})(ko);
