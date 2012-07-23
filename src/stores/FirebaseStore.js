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
      //todo sort priorities
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
      return Util.val(table, hash).pipe(function(data) {
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
      //todo sort priorities
      var base = this.base;
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
      });
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
    * THE PROGRESS FUNCTION
    * ---------------------
    * Each record received is handled by `progressFxn`.
    *
    * In the case of a failure, the fail() method on the promise will always be notified immediately,
    * and the load operation will end immediately.
    *
    * @param {Function} progressFxn called once for each record received
    * @param {Model}    model
    * @param {object}   [params]
    * @return {Promise} fulfilled when all records have been fetched with {int} total number
    */
   FirebaseStore.prototype.query = function(progressFxn, model, params) {
      var def = $.Deferred();
      var opts = ko.utils.extend({limit: 100, offset: 0, where: null, sort: null}, params);
      _buildFilter(opts);
      var table = this.base.child(model.table);
      var count = 0, offset = ~~opts.offset, limit = opts.limit? ~~opts.offset + ~~opts.limit : 0;
      if( limit ) { table.limit(limit); }
      if( model.sort ) {
         //todo
         //todo
         //todo
         throw new Error('I\'m not ready for sort priorities yet');
      }
      else if( params.sort ) {
         //todo
         //todo
         //todo
         throw new Error('I\'m not ready for sorting yet');
      }
      else {
         var vals = [];
         Util.each(table, function(snapshot) {
            var data = snapshot.val();
            if( data !== null ) {
               count++;
               if( count <= start ) { return; }
               else if( limit && count > limit ) {
                  def.resolve(model.table, opts.limit);
                  return true;
               }
               if( !opts.filter || opts.filter(data) ) {
                  vals.push(data);
                  return progressFxn(data);
               }
            }
         });
         if( !def.isResolved() ) { def.resolve(vals); }
      }
      return def.promise();
   };

   /**
    * Given a particular data model, get a count of all records in the database matching
    * the parms provided. Parms is the same as query() method.
    *
    * This operation requires iterating all records in the table for Firebase.
    *
    * @param {ko.sync.Model} model
    * @param {object}        [parms]
    */
   FirebaseStore.prototype.count = function(model, parms) {
      if( !model.firebaseMeta ) { model.firebaseMeta = {}; }
      if( !count in model.firebaseMeta ) {
         var count = 0;
         var ref = this.base.child(model.table);
         Util.each(function(ss) {
            //todo
            //todo
            //todo
            //todo
         });
         model.firebaseMeta.count = count;
      }
      return model.firebaseMeta.count;
   };

   FirebaseStore.prototype.sync = function(model, callback) {}; //todo

   /** UTILITIES
    *****************************************************************************************/

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
      if( typeof(v) === 'object' ) {
         if( v.toISOString ) {
            return v.toISOString();
         }
         else if( typeof(moment) === 'object' && moment.isMoment && moment.isMoment(v) ) {
            return moment.defaultFormat()
         }
      }
      return getDefaultValue('date');
   }

   function _keyFor(recOrId) {
      if( typeof(recOrId) === 'object' && recOrId.getKey ) {
         return recOrId.getKey();
      }
      else {
         return recOrId;
      }
   }

   if (!Date.prototype.toISOString) {
      Date.prototype.toISOString = function() {
         function pad(n) { return n < 10 ? '0' + n : n }
         return this.getUTCFullYear() + '-'
               + pad(this.getUTCMonth() + 1) + '-'
               + pad(this.getUTCDate()) + 'T'
               + pad(this.getUTCHours()) + ':'
               + pad(this.getUTCMinutes()) + ':'
               + pad(this.getUTCSeconds()) + 'Z';
      };
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
       * Returns a promise which resolves to a hash containing name/val for each record. Also accepts an optional
       * function which is invoked for each snapshot value. The iteration of values stops if `fx` returns true.
       *
       * @param {Firebase} parentRef
       * @param {Function} [fx] passed into forEach() on each iteration, see http://www.firebase.com/docs/datasnapshot/foreach.html
       * @return {jQuery.Deferred} a promise
       */
      each: function(parentRef, fx) {
         return this.snap(parentRef).pipe(function(snapshot) {
            var def = $.Deferred(), vals = [], ret;
            try {
               snapshot.forEach(function(snapshot) {
                  vals.push({name: snapshot.name(), val: snapshot.val()});
                  return fx && fx(snapshot);
               });
               def.resolve(vals);
            }
            catch(e) {
               def.reject(e);
            }
            return def.promise();
         });
      },

      /**
       * @param {Firebase} parentRef
       * @param {String}   childPath the child object to retrieve and get the value for
       * @return {jQuery.Deferred} a promise
       */
      val: function(parentRef, childPath) {
         var def = $.Deferred(), to = _timeout(def);
         parentRef.child(childPath).once('value', function(snapshot) {
            clearTimeout(to);
            def.resolve(snapshot.val());
         });
         return def.promise();
      },

      /**
       * @param {Firebase} parentRef
       * @param {string|object|function} childPath
       * @return {jQuery.Deferred} resolves with child snapshot if it exists or fails if it does not
       */
      require: function(parentRef, childPath) {
         return this.find(parentRef, childPath).pipe(function(snapshot) {
            if( snapshot === null ) {
               return $.Deferred().reject('child not found: '+childPath);
            }
            else {
               return snapshot;
            }
         });
      },

      /**
       * @param {Firebase} parentRef
       * @param {string} childPath
       * @return {jQuery.Deferred} resolves to true if childPath exists or false if not
       */
      has: function(parentRef, childPath) {
         var def = $.Deferred(), to = _timeout(def);
         parentRef.child(childPath).once('value', function(snapshot) {
            clearTimeout(to);
            def.resolve(snapshot.val() !== null);
         });
         return def.promise();
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
       * @param {Firebase} parentRef
       * @param {string|Function|object} matchCriteria see description
       * @return {jQuery.Deferred} a promise which resolves to the snapshot of child or null if not found
       */
      find: function(parentRef, matchCriteria) {
         if( typeof(matchCriteria) === 'string' ) {
            return this.val(parentRef, matchCriteria);
         }
         else {
            var matchFxn = _matchFxn(matchCriteria), def = $.Deferred();
            this.each(parentRef, function(snapshot) {
               if( matchFxn(snapshot) ) {
                  def.resolve(snapshot);
                  return true;
               }
            });
            if( !def.isResolved() ) { def.resolve(null); }
            return def.promise();
         }
      },

      /**
       * Retrieves all child snapshots from the parentRef which match criteria.
       *
       * If the criteria is a Function, then the snapshot is passed in to that function to be compared. It must return
       * true or false.
       *
       * If the criteria is an Object, it's treated as key/value pairs representing fields on the child which must
       * match. Objects are compared with _.isEqual(...), strings/numbers/null/booleans are compared with ===.
       * Functions are invoked with arguments `value, key, snapshot` and must return true (keep) or false (discard).
       *
       * @param {Firebase} parentRef
       * @param {Function|object}  filterCriteria see description
       * @return {jQuery.Deferred} a promise which resolves to the {object} record after it is retrieved (or null if not found)
       */
      filter: function(parentRef, filterCriteria) {
         var matchFxn = _matchFxn(filterCriteria), def = $.Deferred();
         return $.when(function() {
            var vals = [];
            this.each(parentRef, function(snapshot) {
               matchFxn(snapshot) && vals.push(snapshot);
            });
            return vals;
         });
      }
   };

   function _matchFxn(criteria) {
      if(_.isFunction(criteria)) {
         return criteria;
      }
      else {
         return function(snapshot) {
            var val = snapshot.val();
            if( val === null ) { return false; }
            _.any(val, function(v, k) {
               if( k in this ) {
                  switch(typeof(this[k])) {

                  }
               }
            }, criteria);
         }
      }
   }

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
               opts.filter = _filterFromParms(opts);
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

   function _filterFromParms(opts) {
      return function(data) {
         return _.every(opts, function(v, k) {
            if( !(k in data) ) { return false; }
            switch(typeof(v)) {
               case 'function':
                  return v(data[k], k);
               case 'object':
                  return _.isEqual(v, data[k]);
               case 'number':
                  return v === ~~data[k];
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