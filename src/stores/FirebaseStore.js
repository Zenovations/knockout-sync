/*******************************************
 * FirebaseStore for knockout-sync
 *******************************************/
(function() {
   var undef, ko = this.ko, Firebase = this.Firebase||window.Firebase, $ = this.jQuery;

   /** IDE CLUES
    **********************/
   /** @var {jQuery.Deferred}  */ var Promise;
   /** @var {ko.sync.Model}    */ var Model;
   /** @var {ko.sync.Record}   */ var Record;
   /** @var {ko.sync.RecordId} */ var RecordId;

   /**
    * Creates a new FirebaseStore for use as the dataStore component in models.
    *
    * @param {string} url    the Firebase database
    * @param {string} [base] the child under the Firebase URL which is the root level of our data
    * @constructor
    */
   var FirebaseStore = ko.sync.Store.extend({
      init: function(url, base) {
         this.base = _base(new Firebase(url), base);
      }
      // we don't need to include all the methods here because there is no _super to deal with
      // we're just inheriting for the "is a" behavior and to enforce the contract of Store
   });

   /**
    * Writes a new record to the database. If the record exists, then it will be overwritten (does not check that
    * id is not in database).
    *
    * The Firebase store accepts both keyed and unkeyed records. For keyed records, models should normally set
    * the `model.priorityField` property, as records would otherwise be ordered lexicographically. The model
    * properties used by this method are as follows:
    *   - model.table:   the table name is appended to the Firebase root folder to obtain the correct data
    *                    bucket for this model.
    *   - model.fields:  used to parse and prepare fields for insertion
    *   - model.sort:    provides a field in the record to use for setting priority (sorting) the data
    *
    * @param {Model}  model   the schema for a data model
    * @param {Record} record  the data to be inserted
    * @return {Promise} resolves to the record's {string} id
    */
   FirebaseStore.prototype.create = function(model, record) {
      //todo-sort priorities
      return ko.sync.handle(this, function(cb, eb) { // creates a promise
         var table = this.base.child(model.table);
         // fetch the record using .child()
         _createRecord(table, record.getKey(), cleanData(model.fields, record.getData())).then(function(success, recordId) {
            (success && cb(recordId)) || eb(recordId);
         });
      });
   };

   /**
    * Read a record from the database. If the record doesn't exist, a null will be returned. If record.hasKey()
    * would return false, then this method will return null (can't retrieve a record with a temporary id).
    *
    * The model is used for the following fields:
    *   - model.table:  the table name is appended to the Firebase root folder to obtain the correct data
    *                   bucket for this model.
    *
    * @param {Model}           model
    * @param {RecordId|Record} recOrId
    * @return {Promise} resolves to the Record object or null if not found
    */
   FirebaseStore.prototype.read = function(model, recOrId) {
      var table = this.base.child(model.table),
            key   = _keyFor(recOrId),
            hash  = key.hashKey();
      return Util.val(table, hash).pipe(function(snapshot) {
         var data = snapshot.val();
         return data? model.newRecord(data) : null;
      });
   };

   /**
    * Update an existing record in the database. If the record does not already exist, the promise is rejected.
    * @param {Model}  model
    * @param {Record} rec
    * @return {Promise} resolves to callback({string}id, {boolean}updated), where updated is true if an update occurred or false if data was not dirty
    */
   FirebaseStore.prototype.update = function(model, rec) {
      //todo-sort priorities
      var base = this.base;
      //todo use .pipe instead of ko.sync.handle
      return ko.sync.handle(this, function(cb, eb) {
         if( !rec.hasKey() ) { eb('Invalid key'); }
         this.read(model, rec).done(function(origRec) {
            if( origRec === null ) { eb('Record does not exist'); }
            else {
               origRec.updateAll(rec);
               if( origRec.isDirty() ) {
                  var key = _keyFor(origRec), ref = base.child(model.table).child(key.hashKey());
                  ref.set(cleanData(model.fields, rec.getData()), function(success) {
                     (success && cb(ref.name(), true)) || eb('synchronize failed');
                  });
               }
               else {
                  cb(origRec.getRecordId().hashKey(), false);
               }
            }
         }).fail(function(e) { eb(e); });
      });
   };

   /**
    * Delete a record from the database. If the record does not exist, then it is considered already deleted (no
    * error is generated)
    *
    * @param {Model}           model
    * @param {Record|RecordId} recOrId
    * @return {Promise} resolves with record's {string}id
    */
   FirebaseStore.prototype.delete = function(model, recOrId) {
      if(_.isArray(recOrId)) {
         return $.when(_.map(recOrId, function(id) {
            return this.delete(model, id);
         }, this));
      }
      return ko.sync.handle(this, function(cb, eb) {
         var key = _keyFor(recOrId);
         if( !key.isSet() ) {
            eb('no key set on record; cannot delete it');
         }
         else {
            var ref = this.base.child(model.table).child(key.hashKey());
            ref.remove(function(success) {
               (success && cb(ref.name())) || eb(ref.name(), 'Unable to sync');
            });
         }
      })
   };

   /**
    * Perform a query against the database and get a snapshot of current matching records. To perform
    * a query that is synchronized and updated whenever the records change, try `sync` instead.
    *
    * The options for query are fairly limited:
    *  - limit:   {int=100}         number of records to return, use 0 for all records in table
    *  - offset:  {int=0}           start after this record, e.g.: {limit: 100, offset: 100} would return records 101-200
    *  - where:   {function|object} filter returned results using this function (true=include, false=exclude) or a map of key/values
    *  - sort:    {string|object|array}
    *
    * USE OF WHERE
    * -------------
    * See Store::query for options and details
    *
    * THE ITERATOR
    * ---------------------
    * Each record received is handled by `iterator`. If iterator returns true, then the iteration is stopped. The
    * iterator should be in the format `function(data, index, model)` where data is the record and index is the count
    * of the record starting from 0
    *
    * In the case of a failure, the fail() method on the promise will always be notified immediately,
    * and the load operation will end immediately.
    *
    * @param {Model}    model
    * @param {Function} iterator called once for each record received
    * @param {object}   [criteria]
    * @return {Promise} fulfilled when all records have been fetched with {int} total number
    */
   FirebaseStore.prototype.query = function(model, iterator, criteria) {
      var def = $.Deferred();
      var table = this.base.child(model.table); //todo-ref -> Util.ref()
      if( model.sort ) {
         //todo-sort
         //todo-sort
         //todo-sort
         throw new Error('I\'m not ready for sort priorities yet');
      }
      else if( criteria && criteria.sort ) {
         //todo-sort
         //todo-sort
         //todo-sort
         throw new Error('I\'m not ready for sorting yet');
      }
      else {
         var count = 0;
         return Util.filter(table, criteria, function(snapshot) {
            return iterator(snapshot.val(), count++, model);
         });
      }
   };

   /**
    * Given a particular data model, get a count of all records in the database matching
    * the parms provided. Parms is the same as query() method.
    *
    * The sole difference is that the default limit is 0. A limit may still be used and
    * useful in some cases, but is not set by default.
    *
    * This operation requires iterating all records in the table for Firebase.
    *
    * @param {ko.sync.Model} model
    * @param {object}        [parms] must be a hash ($.isPlainObject())
    */
   FirebaseStore.prototype.count = function(model, parms) {
      var count = 0, table = this.base.child(model.table), //todo-ref -> Util.ref()
          opts  = ko.utils.extend({limit: 0, offset: 0, where: null, sort: null}, parms),
          start = ~~opts.offset,
          end   = opts.limit? start + ~~opts.limit : 0,
          curr  = -1;
      _buildFilter(opts);
      return Util.each(table, function(snapshot) { //todo Util.filter instead?
         var data = snapshot.val();
         if( data !== null && (!opts.filter || opts.filter(data)) ) {
            curr++;
            if( end && curr == end ) {
               return true;
            }
            else if( curr >= start ) {
               count++;
            }
         }
      }).pipe(function() {
         return count;
      })
   };

   /**
    * True if this data layer provides push updates that can be monitored for the given model
    * @return {boolean}
    */
   FirebaseStore.prototype.hasTwoWaySync = function(model) { return true; };

   /**
    * @param  {ko.sync.Model} model
    * @param  {Function}     callback
    * @param  {object}       [filterCriteria]
    * @return {Object}
    */
   FirebaseStore.prototype.watch = function(model, callback, filterCriteria) {
      if( !('FirebaseSync' in model) ) {
         model.FirebaseSync = new ModelSyncManager();
      }
      var ref = Util.ref(this.base, model.table, filterCriteria);
      return model.FirebaseSync.on(callback, ref);
   };

   /**
    * @param {ko.sync.Model}  model
    * @param {ko.sync.Record} record
    * @param  {Function}      callback
    * @return {Object}
    */
   FirebaseStore.prototype.watchRecord = function(model, record, callback) {
      //todo
      //todo
      //todo
      throw new Error('Interface not implemented');
   };

   /** SYNC MANAGER
    *****************************************************************************************/

   /**
    * @param {FirebaseStore} store
    * @param {Array}         eventTypes
    * @constructor
    */
   function ModelSyncManager() {
      var self       = this;
      self.list      = [];
      self.subs      = [];
      // these need to be declared with each instantiation so that the functions
      // can be used as references for on/off; otherwise, calling off on one model
      // could also turn off all the other models referencing the same table!
      this.events = {
         child_added: function(snapshot, prevSiblingId) {
            var data = snapshot.val();
            if( data !== null ) {
               self.trigger('added', snapshot.name(), data, prevSiblingId);
            }
         },
         child_removed: function(snapshot) {
            self.trigger('deleted', snapshot.name(), snapshot.val());
         },
         child_changed: function(snapshot, prevSiblingId) {
            self.trigger('updated', snapshot.name(), snapshot.val(), prevSiblingId);
         },
         child_moved: function(snapshot, prevSiblingId) {
            self.trigger('moved', snapshot.name(), snapshot.val(), prevSiblingId);
         }
      };
   }

   ModelSyncManager.prototype.on = function(callback, ref, scope) {
      var self = this,
          obs  = _.find(self.list, function(v) { return v.listener === callback && v.ref === ref && v.scope === scope });
      if( !obs ) {
         obs = {
            listener: callback,
            ref: ref,
            scope: scope || null,
            paused: false,
            dispose: function() {
               var idx = _.indexOf(self.subs, obs);
               unwatchFirebase(self.events, ref);
               self.subs.splice(idx, 1);
            }
         };
         self.subs.push(obs);
         //todo this is wrong! this notifies all callbacks on any change on any ref!
         //todo link each watch/unwatch to the specific reference/callback set
         //todo
         //todo-bug
         //todo
         //todo
         //todo
         watchFirebase(self.events, ref);
      }
      return obs;
   };

   ModelSyncManager.prototype.trigger = function() {
      var obs, observers = this.subs, i = observers.length, args = _.toArray(arguments);
      while (i--) {
         obs = observers[i];
         if( !obs.paused ) { obs.listener.apply(obs.scope, args); }
      }
      return this;
   };

   /** UTILITIES
    *****************************************************************************************/

   function watchFirebase(events, table) {
      _.each(events, function(fx, key) {
         table.on(key, fx);
      });
   }

   function unwatchFirebase(events, table) {
      _.each(events, function(fx, key) {
         table.off(key, fx);
      });
   }

   /**
    * Create or load a record to receive data. If `key` is provided, then the record is created
    * with the unique id of `key`, otherwise an ID is generated automagically (and chronologically)
    * by Firebase.
    *
    * @param table
    * @param {RecordId}  key
    * @param {object}    data
    * @param {int}      [sortPriority]
    * @return {jQuery.Deferred}
    * @private
    */
   function _createRecord(table, key, data, sortPriority) {
      var def = $.Deferred(), ref, cb = function(success) { def.resolve(success, ref.name()); };
      if( key.isSet() ) {
         ref = table.child(key.hashKey());
         (sortPriority && ref.setWithPriority(data, sortPriority, cb)) || ref.set(data, cb);
      }
      else {
         ref = table.push(data, cb);
         if( sortPriority ) { ref.setPriority(sortPriority); }
      }
      return def.promise();
   }

   function exists(data, key) {
      var val = data && key && data.hasOwnProperty(key)? data[key] : undef;
      return  val !== null && val !== undef;
   }

   function cleanData(fields, data) {
      var k, cleaned = {};
      for(k in fields) {
         if( fields.hasOwnProperty(k) ) {
            cleaned[k] = cleanValue(fields[k].type, data, k);
         }
      }
      return cleaned;
   }

   function getDefaultValue(type) {
      switch(type) {
         case 'boolean':
            return false;
         case 'int':
            return 0;
         case 'float':
            return 0;
         case 'string':
         case 'email':
         case 'date':
            return null;
         default:
            throw new Error('Invaild field type '+type);
      }
   }

   function cleanValue(type, data, k) {
      if( !exists(data, k) ) {
         return getDefaultValue(type);
      }
      else {
         var v = data[k];
         switch(type) {
            case 'boolean':
               return v? true : false;
            case 'int':
               v = parseInt(v);
               return isNaN(v)? getDefaultValue(type) : v;
            case 'float':
               v = parseFloat(v);
               return isNaN(v)? getDefaultValue(type) : v;
            case 'date':
               return _formatDate(v);
            case 'string':
            case 'email':
               return v + '';
            default:
               throw new Error('Invaild field type '+type);
         }
      }
   }

   function _formatDate(v) {
      switch(typeof(v)) {
         case 'object':
            if( typeof(moment) === 'object' && moment.isMoment && moment.isMoment(v) ) {
               return v.utc().format();
            }
            else if( 'toISOString' in v ) {
               return v.toISOString();
            }
            else {
               return getDefaultValue('date');
            }
         case 'string':
         case 'number':
            return moment(v).format();
         default:
            return getDefaultValue('date');
      }
   }

   function _keyFor(recOrId) {
      if( typeof(recOrId) === 'object' && recOrId.getKey ) {
         return recOrId.getKey();
      }
      else {
         return recOrId;
      }
   }

   if ( !Date.prototype.toISOString ) {
      (function() {
         function pad(number) {
            var r = String(number);
            if ( r.length === 1 ) {
               r = '0' + r;
            }
            return r;
         }

         Date.prototype.toISOString = function() {
            return this.getUTCFullYear()
               + '-' + pad( this.getUTCMonth() + 1 )
               + '-' + pad( this.getUTCDate() )
               + 'T' + pad( this.getUTCHours() )
               + ':' + pad( this.getUTCMinutes() )
               + ':' + pad( this.getUTCSeconds() )
               + '.' + String( (this.getUTCMilliseconds()/1000).toFixed(3) ).slice( 2, 5 )
               + 'Z';
         };
      }());
   }

   /**
    * @param root
    * @param base
    * @return {Firebase}
    * @private
    */
   function _base(root, base) {
      if( base ) {
         var curr = root;
         //todo is this necessary?
         _.forEach(base.split('/'), function(p) {
            curr = curr.child(p);
         });
         return curr;
      }
      else {
         return root;
      }
   }

   var Util = FirebaseStore.Util = {
      /**
       * Returns a snapshot of the current reference
       * @param {Firebase} ref
       * @return {jQuery.Deferred} a promise
       */
      snap: function(ref) {
         var def = $.Deferred(), to = _timeout(def);
         ref.once('value', function(snapshot) {
            clearTimeout(to);
            def.resolve(snapshot);
         });
         return def.promise();
      },

      /**
       * Returns a promise which resolves to number of records iterated. The snapshots for each record are passed into
       * `fx`. The iteration of values stops if `fx` returns true.
       *
       * @param {Firebase} table
       * @param {Function} [fx]    passed into forEach() on each iteration, see http://www.firebase.com/docs/datasnapshot/foreach.html
       * @return {jQuery.Deferred} a promise resolved to number of records iterated
       */
      each: function(table, fx) {
         return this.snap(table).pipe(function(snapshot) {
            var def = $.Deferred(), count = 0;
            try {
               snapshot.forEach(function(snapshot) {
                  count++;
                  return fx? fx(snapshot) : undef;
               });
               def.resolve(count);
            }
            catch(e) {
               def.reject(e);
            }
            return def.promise();
         });
      },

      /**
       * @param {Firebase} table
       * @param {String}   childPath the child object to retrieve and get the value for
       * @return {jQuery.Deferred} a promise
       */
      val: function(table, childPath) {
         var def = $.Deferred(), to = _timeout(def);
         table.child(childPath).once('value', function(snapshot) {
            clearTimeout(to);
            def.resolve(snapshot);
         });
         return def.promise();
      },

      /**
       * @param {Firebase} table
       * @param {string|object|function} childPath
       * @return {jQuery.Deferred} resolves with child snapshot if it exists or fails if it does not
       */
      require: function(table, childPath) {
         return this.find(table, childPath).pipe(function(snapshot) {
            if( snapshot === null ) {
               return $.Deferred().reject('child not found: '+childPath);
            }
            else {
               return snapshot;
            }
         });
      },

      /**
       * @param {Firebase} table
       * @param {string} childPath
       * @return {jQuery.Deferred} resolves to true if childPath exists or false if not
       */
      has: function(table, childPath) {
         return Util.val(table, childPath).pipe(function(ss) {
            return ss.val() !== null;
         });
      },

      /**
       * Retrieves first child snapshot from the parentRef which matches criteria. If the criteria
       * is a string, it's treated as a child path (making this the same as calling val())
       *
       * If the criteria is an Object, it's treated as key/value pairs representing fields on the child which must
       * match. Each value may also be a function in the format function(value, key, child) {...} which must return true/false.
       *
       * If the criteria is a Function, then the object is passed in to that function to be compared. It must return
       * true or false.
       *
       * @param {Firebase} table
       * @param {string|Function|object} matchCriteria see description
       * @return {jQuery.Deferred} a promise which resolves to the snapshot of child or null if not found
       */
      find: function(table, matchCriteria) {
         if( typeof(matchCriteria) === 'string' ) {
            return Util.val(table, matchCriteria);
         }
         else {
            var def = $.Deferred();
            this.filter(table, {'where': matchCriteria}, function(snapshot) {
               def.resolve(snapshot);
               return true;
            });
            if( !def.isResolved() ) { def.resolve(null); }
            return def.promise();
         }
      },

      /**
       * Retrieves all child snapshots from the table which match given criteria.
       *
       * `filterCriteria` exactly matches the FirebaseStore.query and FirebaseStore.count() methods.
       *
       * If iterator returns true, then the filter operation is ended immediately
       *
       * @param {Firebase}         table
       * @param {Function|Object}  filterCriteria see description
       * @param {Function}         iterator called each time a match is found
       * @return {jQuery.Deferred} resolves to number of records matched when operation completes
       */
      filter: function(table, filterCriteria, iterator) {
         var opts    = ko.utils.extend({limit: 0, offset: 0, where: null, sort: null}, filterCriteria),
             start   = ~~opts.offset,
             //todo utilize Util.ref() here
             end     = opts.limit? start + ~~opts.limit : 0,
             curr    = -1,
             matches = 0;
         _buildFilter(opts);
         return Util.each(table, function(snapshot) {
            var data = snapshot.val();
            if( data !== null && (!opts.filter || opts.filter(data, snapshot.name())) ) {
               curr++;
               if( end && curr == end ) {
                  return true;
               }
               else if( curr >= start ) {
                  matches++;
                  return iterator(snapshot);
               }
            }
         }).pipe(function(ct) { return matches; });
      },

      ref: function(root, tableName, parms) {
         parms || (parms = {});
         var table = root.child(tableName),
              limit = Math.abs(~~parms.limit);
         if( parms.start ) {
            // if a starting point is given, that's where we begin iterating
            table = table.startAt(parms.start, parms.startId);
         }
         if( parms.end ) {
            // if an ending point is given, that's where we stop iterating
            table = table.endAt(parms.end, parms.endId);
         }
         if( limit ) {
            if( !parms.start && !parms.end ) {
               // if the list is open ended, we can use an offset, otherwise start/end are the offset
               // we have a pretty big limitation with offset; we're depending on the caller to deal with that
               // and we simply increase our limit to accommodate; sadly not much else we can do
               limit += ~~parms.offset; //todo-test
               if( parms.limit < 0 ) {
                  table = table.endAt();
               }
            }
            table = table.limit(limit);
         }
         return table;
      }
   };

   /**
    * @param {jQuery.Deferred} def
    * @param {int} [timeout]
    * @return {Number}
    * @private
    */
   function _timeout(def, timeout) {
      return setTimeout(function() {
         def.reject('timed out');
      }, timeout||15000);
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

   /** ADD TO NAMESPACE
    ******************************************************************************/

   ko.sync || (ko.sync = {stores: []});
   ko.sync.stores.FirebaseStore = FirebaseStore;

}).call(this);