/*******************************************
 * FirebaseStore for knockout-sync
 *******************************************/
(function(ko, jQuery, Firebase) {

   var undef;

   /** IDE CLUES
    **********************/
   /** @var {jQuery.Deferred}  */ var Promise;
   /** @var {ko.sync.Model}    */ var Model;
   /** @var {ko.sync.Record}   */ var Record;
   /** @var {ko.sync.RecordId} */ var RecordId;

   /**
    * Creates a new FirebaseStore for use as the store component in models.
    *
    * @param {string} url    the Firebase database
    * @param {string} [base] the child under the Firebase URL which is the root level of our data
    * @constructor
    */
   var FirebaseStore = ko.sync.Store.extend({
      init: function(rootPath) {
         this.base         = new Firebase(_.toArray(arguments).join('/'));
         this.listeners    = [];
         this.observedRecs = [];
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
    * @param {Record} rec  the data to be inserted
    * @return {jQuery.Deferred} promise - resolves to the record's {string} id
    */
   FirebaseStore.prototype.create = function(model, rec) {
      var base = this.base;
      var table = base.child(model.table);
      return _createRecord(table, rec.getKey(), cleanData(model.fields, rec.getData()), rec.getSortPriority());
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
    * @return {Promise} resolves to the updated Record object or null if not found
    */
   FirebaseStore.prototype.read = function(model, recOrId) {
      var table = this.base.child(model.table),
          hash  = recOrId.hashKey();
      return Util.val(table, hash).pipe(function(snapshot) {
         var data = snapshot.val();
         return data? model.newRecord(data) : null;
      });
   };

   /**
    * Update an existing record in the database. If the record does not already exist, the promise is rejected.
    *
    * @param {Model}  model
    * @param {Record} rec
    * @return {Promise} resolves to callback({string}id, {boolean}changed) where changed is false if data was not dirty, rejected if record does not exist
    */
   FirebaseStore.prototype.update = function(model, rec) {
      var hashKey = rec.hashKey();
      // was the record actually modified?
      if( !rec.hasKey() ) {
         return $.Deferred().reject('record has a temporary key (did you mean to call create?)', hashKey).promise();
      }
      else if( rec.isDirty() ) {
         var table = this.base.child(model.table);
         // does it exist?
         return Util.has(table, hashKey)
            .pipe(function(exists) {
               if( exists ) {
                  // if so perform the update
                  return _updateRecord(table, hashKey, cleanData(model.fields, rec.getData()), rec.getSortPriority())
                     .pipe(_pipedSync(hashKey));
               }
               else {
                  return $.Deferred(function(def) { def.reject('record does not exist'); }).promise();
               }
            });
      }
      else {
         // no update occurred
         return $.Deferred().resolve(hashKey, false).promise();
      }
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
      var base = this.base;
      if(_.isArray(recOrId)) {
         return $.when(_.map(recOrId, function(id) {
            return this.delete(model, id);
         }, this));
      }
      return $.Deferred(function(def) {
         var key = _keyFor(recOrId);
         if( !key.isSet() ) {
            def.reject('no key set on record; cannot delete it');
         }
         else {
            var hashKey = key.hashKey(), ref = base.child(model.table).child(hashKey);
            ref.remove(processSync(def, hashKey));
         }
      });
   };

   /**
    * Perform a query against the database. The `filterCriteria` options are fairly limited:
    *
    * - limit:   {int=100}         number of records to return, use 0 for all
    * - offset:  {int=0}           exclusive starting point in records, e.g.: {offset: 100, limit: 100} would return records 101-200 (the first record is 1 not 0)
    * - start:   {int=0}           using the sort's integer values, this will start us at record matching this sort value
    * - end:     {int=-1}          using the sort's integer values, this will end us at record matching this sort value
    * - where:   {function|object} filter rows using this function or value map
    * - sort:    {array|string}    Sort returned results by this field or fields. Each field specified in sort
    *                              array could also be an object in format {field: 'field_name', desc: true} to obtain
    *                              reversed sort order
    *
    * Start/end are more useful with sorted records (and faster). Limit/offset are slower but can be used with
    * unsorted records. Additionally, limit/offset will work with where conditions. Obviously, `start`/`end` are hard
    * limits and only records within this range, matching `where`, up to a maximum of `limit` could be returned.
    *
    * USE OF WHERE
    * -------------
    * See Store::query for options and details
    *
    * THE ITERATOR
    * ---------------------
    * Each record received is handled by `iterator`. If iterator returns true, then the iteration is stopped. The
    * iterator should be in the format `function(data, id, index)` where data is the record and index is the count
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
      //todo-perf filter iterates the entire table; could we optimize?
      return Util.filter(model, this.base, criteria, iterator);
   };

   /**
    * Given a particular data model, get a count of all records in the database matching
    * the `filterCriteria` provided, which uses the same format as query().
    *
    * The sole difference is that the default limit is 0. A limit may still be used and
    * useful in some cases, but is not set by default.
    *
    * `iterator` is the same as query() method, using the format `function(data, id, index)`
    *
    * This operation may require iterating all records in the table.
    *
    * @param {ko.sync.Model} model
    * @param {object}        [filterCriteria] must be a hash ($.isPlainObject())
    * @param {Function}      [iterator] if provided, receives each record as it is evaluated
    * @return {jQuery.Deferred} promise resolving to total number of records matched
    */
   FirebaseStore.prototype.count = function(model, filterCriteria, iterator) {
      if( arguments.length == 2 && typeof(filterCriteria) == 'function' ) {
         iterator = filterCriteria; filterCriteria = null;
      }

      if( filterCriteria ) {
         var opts  = ko.utils.extend({limit: 0, offset: 0, where: null, sort: null}, filterCriteria);
         console.log('count', opts);
         return Util.filter(model, this.base, opts, iterator);
      }
      else {
         return Util.each(this.base.child(model.table), iterator);
      }
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
      var props = { table: model.table, callback: callback, criteria: filterCriteria, scope: null };
      var obs = _.find(this.listeners, function(o) { return o.matches(props) });
      if( !obs ) {
         obs = new SyncObserver(this.listeners, this.base, props);
      }
      return obs;
   };

   /**
    * @param {ko.sync.Model}    model
    * @param {ko.sync.RecordId} recordId
    * @param  {Function}        callback
    * @return {Object}
    */
   FirebaseStore.prototype.watchRecord = function(model, recordId, callback) {
      var props = { table: model.table, key: recordId.hashKey(), callback: callback };
      var obs = _.find(this.observedRecs, function(o) { return o.matches(props); });
      if( !obs ) {
         obs = new RecordObserver(this.observedRecs, this.base, props);
      }
      return obs;
   };

   /** SYNC OBSERVER
    *****************************************************************************************/

   function SyncObserver(list, base, props) {
      var self = this;
      self.table    = props.table;
      self.criteria = props.criteria;
      self.scope    = props.scope || null;
      self.callback = props.callback;
      self.disposed = false;
      self.paused   = false;
      var ref       = Util.ref(base, self.table, self.criteria);

      //todo props.where not being applied in any case
      //todo props.limit not being applied if where exists
      //todo props.filter not being applied in any case

      // these need to be declared with each instantiation so that the functions
      // can be used as references for on/off; otherwise, calling off on one model
      // could also turn off all the other models referencing the same table!
      var events = {
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

      // a method to receive events and delegate them to the callback
      self.trigger = function() {
         if( !self.paused && !self.disposed ) {
            self.callback.apply(self.scope, _.toArray(arguments));
         }
      };

      // a method to stop listening for events and remove this observer from the list
      self.dispose = function() {
         if( !self.disposed ) {
            self.disposed = true;
            unwatchFirebase(events, ref);
            var idx = _.indexOf(list, self);
            if( idx >= 0 ) {
               list.splice(idx, 1);
            }
         }
      };

      list.push(self);
      watchFirebase(events, ref);
   }

   SyncObserver.prototype.equals = function(o) {
      return o instanceof SyncObserver && this.matches(o);
   };

   SyncObserver.prototype.matches = function(o) {
//      console.log('callback', this.callback === o.callback, this.callback, o.callback);
//      console.log('table', this.table === o.table, this.table, o.table);
//      console.log('criteria', _.isEqual(o.criteria, this.criteria), this.criteria, o.criteria);
//      console.log('scope', this.scope === o.scope, this.scope, o.scope);
      return o
         && this.callback === o.callback
         && this.table === o.table
         && _.isEqual(o.criteria, this.criteria)
         && o.scope === this.scope;
   };

   /** RECORD OBSERVER
    *****************************************************************************************/

   function RecordObserver(list, base, props) {
      var self = this;
      self.paused   = false;
      self.disposed = false;
      self.callback = props.callback;
      self.scope    = props.scope || null;
      self.table    = props.table;
      self.key      = props.key;

      // this must be local so that function is unique and can be referenced by off()
      // if we try to call off() on a prototype function, all listeners (not just this instance) will be turned off
      self.trigger = function(snapshot) {
         if( !self.paused && !self.disposed ) {
            self.callback.apply(self.scope, [snapshot.name(), snapshot.val(), snapshot.getPriority()]);
         }
      };

      // this is locally scoped because it is referencing list
      // the performance of this could be improved by reducing these closure scopes
      self.dispose = function() {
         if( !self.disposed ) {
            self.disposed = true;
            base.child(self.table).child(self.key).off('value', self.trigger);
            var idx = _.indexOf(list, self);
            if( idx >= 0 ) {
               list.slice(idx, 1);
            }
         }
      };

      list.push(self);
      base.child(self.table).child(self.key).on('value', self.trigger);
   }

   RecordObserver.prototype.equals = function(o) {
      return o instanceof RecordObserver && this.matches(o);
   };

   RecordObserver.prototype.matches = function(o) {
      return o
         && this.callback === o.callback
         && this.table === o.table
         && this.key === o.key;
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
      var def = $.Deferred(), ref,
          cb = function(success) { success? def.resolve(ref.name()) : def.reject(ref.name()); };
      if( key.isSet() ) {
         ref = table.child(key.hashKey());
         if( sortPriority ) {
            ref.setWithPriority(data, sortPriority, cb);
         }
         else {
            ref.set(data, cb);
         }
      }
      else if( sortPriority ) {
         ref = table.push(data);
         ref.setPriority(sortPriority, cb);
      }
      else {
         ref = table.push(data, cb);
      }
      return def.promise();
   }

   function _updateRecord(table, hashKey, data, sortPriority) {
      var def = $.Deferred(),
         ref = table.child(hashKey);
      if( sortPriority ) {
         ref.setWithPriority(data, sortPriority, def.resolve);
      }
      else {
         ref.set(data, def.resolve);
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
       * Returns a promise which resolves to number of records iterated. The snapshots for each record are passed into
       * `fx`. The iteration of values stops if `fx` returns true.
       *
       * @param {Firebase}         table
       * @param {Function} [iterator]    passed into forEach() on each iteration, see http://www.firebase.com/docs/datasnapshot/foreach.html
       * @return {jQuery.Deferred} a promise resolved to number of records iterated
       */
      each: function(table, iterator) {
         return this.snap(table).pipe(function(snapshot) {
            return $.Deferred(function(def) {
               var count = 0;
               try {
                  snapshot.forEach(function(snapshot) {
                     count++;
                     return iterator && iterator(snapshot.val(), snapshot.name());
                  });
                  def.resolve(count);
               }
               catch(e) {
                  def.reject(e);
               }
            }).promise();
         });
      },


      /**
       * Retrieves all child snapshots from the table which match given criteria.
       *
       * `filterCriteria` exactly matches the FirebaseStore.query and FirebaseStore.count() methods.
       *
       * If iterator returns true, then the filter operation is ended immediately
       *
       * @param {Model}            model
       * @param {Firebase}         base
       * @param {Function|Object}  filterCriteria see description
       * @param {Function}         [iterator] called each time a match is found with function(recordData, recordId)
       * @return {jQuery.Deferred} resolves to number of records matched when operation completes
       */
      filter: function(model, base, filterCriteria, iterator) {
         var opts    = ko.utils.extend({limit: 0, offset: 0, where: null, sort: null}, filterCriteria),
            table    = Util.ref(base, model.table, opts),
            start    = ~~opts.offset,
            end      = opts.limit? start + ~~opts.limit : 0,
            curr     = -1,
            matches  = 0;
         _buildFilter(opts);
         //todo-perf Util.each requires iterating the entire table; optimize?
         return Util.each(table, function(data, id) {
            if( data !== null && (!opts.filter || opts.filter(data, id)) ) {
               curr++;
               //todo-sort
               if( end && curr == end ) {
                  return true;
               }
               else if( curr >= start ) {
                  matches++;
                  return iterator && iterator(data, id);
               }
            }
         }).pipe(function(ct) { return matches; });
      },

      /**
       * Returns a snapshot of the current reference
       * @param {Firebase} ref
       * @return {jQuery.Deferred} a promise
       */
      snap: function(ref) {
         return $.Deferred(function(def) {
            var to = _timeout(def);
            ref.once('value', function(snapshot) {
               clearTimeout(to);
               def.resolve(snapshot);
            });
            return def.promise();
         }).promise();
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
       * @param {Model}            model
       * @param {Firebase}         base
       * @param {string|Function|object} matchCriteria see description
       * @return {jQuery.Deferred} a promise which resolves to the snapshot of child or null if not found
       */
      find: function(model, base, matchCriteria) {
         var table = Util.ref(base, model.table, matchCriteria);
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
       * This method retrieves a reference to a data path. It attempts to apply start/end/offset/limit at the Firebase
       * level to speed things up a bit. However, there are a couple very significant limitations and coupling
       * issues to keep in mind.
       *
       * Firstly, when using `criteria.when`, then `limit` is not applied, as this would prevent the filter
       * operations from working correctly.
       *
       * Secondly, `offset` is not handled here and is the duty of the caller to enforce. All we do here is apply
       * a limit that accounts for offset (by adding offset onto the limit amount) so that enough records are retrieved
       * to account for the offset. The caller must still manually strip off the offset amount (unh).
       *
       * //todo improve this when Firebase adds some more query related API features
       *
       * @param {Firebase} root
       * @param {string} tableName
       * @param {object} [criteria]
       * @return {*}
       */
      ref: function(root, tableName, criteria) {
         criteria || (criteria = {});
         var table = root.child(tableName),
              limit = Math.abs(~~criteria.limit),
              hasStart = 'start' in criteria, hasEnd = 'end' in criteria;
         // if a starting point is given, that's where we begin iterating
         if( hasStart ) {
            table = table.startAt(criteria.start, criteria.startId);
         }
         // if an ending point is given, that's where we stop iterating
         if( hasEnd ) {
            table = table.endAt(criteria.end, criteria.endId);
         }
         // we can't apply limit from here if we're going to filter the results (we want 100 filtered records,
         // not 100 minus those that don't match) so we skip the limit from here. Le sigh. This is yet another
         // very significant bit of coupling
         if( limit && !criteria.where ) {
            if( !hasStart && !hasEnd ) {
               // if the list is open ended, we can use an offset, otherwise start/end are the offset
               // we have a pretty big limitation with offset; we're depending on the caller to deal with that
               // and we simply increase our limit to accommodate; sadly not much else we can do until someone
               // brighter reads this and invents something genius to replace it
               limit += ~~criteria.offset; //todo-test
               if( criteria.limit < 0 ) {
                  // if the limit is negative, it means to work backwards from the end instead of
                  // upwards from the start, so adding an endAt() will have this effect (right?) //todo-test
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

   function processSync(def, id) {
      return function(success) {
         if( success ) {
            def.resolve(id);
         }
         else {
            def.reject('synchronize failed');
         }
      }
   }

   function _pipedSync(key) {
      return function(success) {
         return $.Deferred(function(def) {
            if( success ) { def.resolve(key, true); }
            else { def.reject('synchronize failed'); }
         });
      }
   }

   /** ADD TO NAMESPACE
    ******************************************************************************/

   ko.sync || (ko.sync = {stores: []});
   ko.sync.stores.FirebaseStore = FirebaseStore;

})(ko, jQuery, Firebase);