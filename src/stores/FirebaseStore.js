/*******************************************
 * FirebaseStore for knockout-sync
 *******************************************/
(function() {
   var undef, ko = this.ko, Firebase = this.Firebase, $ = this.jQuery;

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
         var table = this.base.child(model.table),
             // fetch the record using .child()
             ref = _buildRecord(table, record.getKey());
         ref.set(cleanData(model.fields, record.getData()), function(success) {
            (success && cb(ref.name())) || eb(ref.name());
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
      var table = this.base.child(model.table);
      return ko.sync.handle(this, function(cb, eb) {
         if( !rec.hasKey() ) { eb('Invalid key'); }
         this.read(model, rec).done(function(origRec) {
            if( origRec === null ) { eb('Record does not exist'); }
            else {
               origRec.updateAll(rec);
               if( origRec.isDirty() ) {
                  var key = _keyFor(origRec), ref = _buildRecord(table, key);
                  ref.set(cleanData(model.fields, rec.getData()), function(success) {
                     (success && cb(ref.name(), true)) || eb('Synchronize failed');
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
         var ref = _buildRecord(this.base.child(model.table), _keyFor(recOrId));
         ref.remove(function(success) {
            (success && cb(ref.name())) || eb(ref.name());
         })
      });
   };

   /**
    * Perform a query against the database. The options for query are fairly limited:
    *
    * - limit:   {int=100}      number of records to return, use 0 for all
    * - offset:  {int=0}        start after this record, e.g.: {limit: 100, offset: 100} would return records 101-200
    * - filter:  {function}     filter returned results using this function (true=include, false=exclude)
    * - sort:    {array|string} Sort returned results by this field or fields. Each field specified in sort
    *                           array could also be an object in format {field: 'field_name', desc: true} to obtain
    *                           reversed sort order
    *
    * The use of `filter` is applied by stores after `limit`. Thus, when using `filter` it is important to note that
    * less results may (and probably will) be returned than `limit`.
    *
    * Each record received is handled by the progressFxn, not by the fulfilled promise. The fulfilled promise simply
    * notifies listeners that it is done retrieving records.
    *
    * There are no guarantees on how a store will optimize the query. It may apply the constraints before or after
    * retrieving data, depending on the capabilities and structure of the data layer. To ensure high performance
    * for very large data sets, and maintain store-agnostic design, implementations should use some sort of
    * pre-built query data in an index instead of directly querying records (think NoSQL databases like
    * DynamoDB and Firebase, not MySQL queries)
    *
    * Alternately, very sophisticated queries could be done external to the knockout-sync module and then
    * injected into the synced data after.
    *
    * @param {Function} progressFxn called once for each record received
    * @param {Model}  model
    * @param {object} [params]
    * @return {Promise} fulfilled with callback('tableName', limit) if limit is reached
    */
   FirebaseStore.prototype.load = function(progressFxn, model, params) {
      var def = $.Deferred();
      var opts = ko.utils.extend({limit: 100, offset: 0, filter: null, sort: null}, params);
      var table = this.base.child(model.table);
      var count = 0, offset = ~~opts.offset, limit = opts.limit? ~~opts.offset + ~~opts.limit : 0;
      //todo if the model has a sort priority, we can use that with startAt() and endAt()
      if( limit ) { table.limit(limit); }
      table.forEach(function(snapshot) { //todo need table snapshot to do this
         var data = snapshot.val();
         if( data !== null ) {
            count++;
            if( count <= start ) { return; }
            else if( count > limit ) {
               def.resolve(model.table, opts.limit);
               return true;
            }
            if( !opts.filter || opts.filter(data) ) {
               progressFxn(data);
            }
         }
      });
      return def.promise();
   };

   FirebaseStore.prototype.sync = function(location, callback) {}; //todo

   /** UTILITIES
    *****************************************************************************************/

   /**
    * Create or load a record to receive data. If `key` is provided, then the record is created
    * with the unique id of `key`, otherwise an ID is generated automagically (and chronologically)
    * by Firebase.
    *
    * @param table
    * @param {RecordId}  [key]
    * @return {Firebase}
    * @private
    */
   function _buildRecord(table, key) {
      return key.isSet()? table.child(key.hashKey()) : table.push();
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
         base.split('/').forEach(function(p) {
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
               snapshot.forEach(function(childSnapshot) {
                  vals.push({name: childSnapshot.name(), val: childSnapshot.val()});
                  return fx && fx(childSnapshot);
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

   /** ADD TO NAMESPACE
    ******************************************************************************/

   ko.sync || (ko.sync = {stores: []});
   ko.sync.stores.FirebaseStore = FirebaseStore;

}).call(this);