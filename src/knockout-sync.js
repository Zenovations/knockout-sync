/*******************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/katowulf/knockout-sync
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function(ko) {
   "use strict";
   var undefined;

   /**
    * @param {Object|ko.observable|ko.observableArray} target
    * @param {ko.sync.Model} model
    * @param {Object|String} [criteria]
    */
   ko.extenders.crud = function(target, model, criteria) {
      model.sync(target, criteria);
   };

   /**
    * credits: http://stackoverflow.com/questions/12166982/determine-which-element-was-added-or-removed-with-a-knockoutjs-observablearray
    * @param {ko.sync.KeyFactory} keyFactory (see SyncController)
    * @param callbacks
    * @param observedFields
    */
   ko.observableArray.fn.watchChanges = function(keyFactory, observedFields, callbacks) {
      function f(){}
      _.defaults(callbacks, {add: f, update: f, move: f, delete: f});
      //todo make this stateful; only one instance no matter how many times watchChanges is called
      var previousValue = undefined;
      var disposables = [];
      var ctx = {
         keyFactory: keyFactory,
         callbacks: callbacks,
         deferred: {},
         latestValue: null,
         observedFields: observedFields,
         disposables: disposables,
         keys: _buildInitialKeys(keyFactory, this()),
         keyFields: keyFactory.fields
      };

      this.indexForKey = function(hashKey) {
         return _.indexOf(ctx.keys, hashKey);
      };

      disposables.push(this.subscribe(function(_previousValue) {
         previousValue = _previousValue.slice(0);
      }, undefined, 'beforeChange'));

      disposables.push(this.subscribe(function(latestValue) {
         ctx.latestValue = latestValue;
         var changes = ko.utils.compareArrays(previousValue, latestValue);
         for (var i = 0, j = changes.length; i < j; i++) {
            applyRecChange(ctx, changes[i].status, changes[i].value);
         }
      }));

      if( observedFields.length ) {
         var self = this, keyField = ko.sync.KeyFactory.HASHKEY_FIELD;
         _.each(self(), function(v) {
            var id = keyFactory.make(v);
            //todo duplicated below
            disposables.push(
               _.extend(
                  {key: id}, // add an id to the disposable
                  watchFields(v, observedFields, function(newData) {
                     //todo doesn't handle key field changes
                     newData[keyField] = id;
                     applyRecChange(ctx, 'updated', newData);
                  })
               )
            );
         });
      }

      return {
         dispose: function() {
            _.each(disposables, function(d) {
               d.dispose();
            });
         }
      };
   };

   ko.observable.fn.watchChanges = function(observedFields, callback) {
      //todo make this stateful; only one instance no matter how many times watchChanges is called
      var fieldsSub, rootSub, preSub, oldValue;

      // watch for changes on any nested observable fields
      fieldsSub = watchFields(this(), observedFields, callback);

      preSub = this.subscribe(function(prevValue) {
         oldValue = ko.sync.unwrapAll(prevValue);
      }, undefined, 'beforeChange');

      // watch for replacement of the entire object
      rootSub = this.subscribe(function(newValue) {
         if( observedFields.length ) {
            // whenever the observable is changed out (this probably won't work for sync), reset the fields
            fieldsSub && fieldsSub.dispose();
            fieldsSub = watchFields(newValue, observedFields, callback);
         }

         var changes = _.changes(oldValue, ko.sync.unwrapAll(newValue));
         if(!_.isEmpty(changes)) {
            // invoke the callback
            callback(changes);
         }
      });

      return {
         dispose: function() {
            fieldsSub && fieldsSub.dispose();
            rootSub && rootSub.dispose();
            preSub && preSub.dispose();
         }
      };
   };

   function watchFields(data, observedFields, callback) {
      var disposables = [];
      _.each(observedFields, function(k) {
         if( _.has(data, k) && ko.isObservable(data[k]) ) {
            disposables.push(watchField(k, data[k], callback));
         }
      });

      return {
         //todo should have the key property here (see observableArray.fn.watchFields)
         dispose: function() {
            _.each(disposables, function(d) {d.dispose();});
         }
      }
   }

   function watchField(field, obs, callback) {
      var oldValue, preSub, changeSub;

      preSub = obs.subscribe(function(prevValue) {
//         console.log('watchField::beforeChange', prevValue);
         oldValue = prevValue;
      }, undefined, 'beforeChange');

      changeSub = obs.subscribe(function(newValue) {
         if( oldValue !== newValue ) {
//            console.log('watchField::change', newValue);
            var out = {};
            out[field] = newValue;
            callback(out);
         }
      });

      return {
         dispose: function() {
            preSub.dispose();
            changeSub.dispose();
         }
      }
   }

   function applyRecChange(ctx, status, data) {
      if(_.isArray(data)) {
         _.each(data, function(v) {
            applyRecChange(ctx, status, v);
         });
      }
      else {
         //todo this key isn't applied to the data; we can't match them up later
         var key = ctx.keyFactory.make(data);
//         status !== 'retained' && console.log('applyRecChange', status, key, data);
         switch (status) {
            case "retained":
               break;
            case "deleted":
               // remove it from the index right now, even if we don't delete it yet
               // this will keep it from affecting sort order and before/after id calculations
               _.remove(ctx.keys, key);
               ctx.deferred[key] = {
                  to: deferDelete(key, ctx.keys, ctx.deferred, ctx.callbacks.delete.bind(ctx.callbacks), ctx.disposables),
                  updates: []
               };
               break;
            case "updated":
               //todo-sort sort fields
               //todo handle key field changes
               if( key in ctx.deferred ) {
                  // store the update until we get a move event or the delete is completed
                  ctx.deferred[key].updates.push({key: key, data: data});
               }
               else {
                  ctx.callbacks.update(key, data);
               }
               break;
            case "added":
               // add key back into the index wherever it exists now in list
               // for a move, it will have been deleted above (when it was pulled out)
               var i = ko.sync.findByKey(ctx.latestValue, ctx.keyFactory, key, true);
               if( i === -1 ) {
                  throw new Error('added a rec but its not in the observable?');
               }

               // for moves, the old key was already deleted in `deleted` above, so it's not a concern here
               ctx.keys.splice(i, 0, key);

               if( key in ctx.deferred ) {
                  // move operation
                  clearTimeout(ctx.deferred.to);
                  var updates = ctx.deferred[key].updates;
                  delete ctx.deferred[key];
                  ctx.callbacks.move(key, data, prevKey(ctx.keys, key));
                  _.each(updates, function(update) {
                     ctx.callbacks.update(update.key, update.data);
                  });
               }
               else {
                  // add operation
                  ctx.callbacks.add(key, data, prevKey(ctx.keys, key));
                  var keyField = ko.sync.KeyFactory.HASHKEY_FIELD;
                  //todo duplicated above
                  ctx.disposables.push(_.extend(
                     { key: key },
                     watchFields(data, ctx.observedFields, function(newData) {
                        //todo doesn't handle key field changes
                        newData[keyField] = key;
                        applyRecChange(ctx, 'updated', newData);
                     })
                  ));
               }
               break;
         }
      }
   }

   function prevKey(keyList, key) {
      var currIndex = _.indexOf(keyList, key);
      if( currIndex === -1 ) { return null; } //todo-sort use the sort value to position in this case
      else if( currIndex === 0 ) { return 0; }
      else {
         return keyList[currIndex-1];
      }
   }

   function deferDelete(key, keyList, delayed, deleteCallback, disposables) {
      return setTimeout(function() {
         if(key in delayed) {
            _findAndDispose(disposables, key);
            delete delayed[key];
            deleteCallback(key);
         }
      }, 25);
   }

   /**
    * The disposables created in ko.observableArray.fn.watchChanges has a key which can be traced back to the
    * Record's hashKey to help with finding the correct subscription to dispose.
    * @param {Array} disposables
    * @param {string} key
    * @private
    */
   function _findAndDispose(disposables, key) {
      if( key ) {
         var s = _.find(disposables, function(v) { return v.key === key; });
         if( s ) {
            s.dispose();
            disposables.splice(_.indexOf(disposables, s), 1);
         }
      }
   }

   //todo-feature: ko.sync.remote to perform operations remotely without having to download records first? example: ko.sync.remote.delete( model, 'recordXYZ' );

   ko.sync || (ko.sync = {});
   ko.sync.stores || (ko.sync.stores = []);
   ko.sync.validators || (ko.sync.validators = []);

   ko.sync.isObservableArray = function(o) {
      return typeof(o) === 'function' && ko.isObservable(o) && o.splice && _.isArray(o());
   };

   ko.sync.watchFields = watchFields;

   /**
    * Use this only when making changes to the obsArray. For all other cases, you can use obsArray.findByKey instead.
    *
    * @param {ko.observableArray|Array} obsArray
    * @param {ko.sync.KeyFactory} keyFactory
    * @param {string|Object|ko.sync.Record} keyOrData
    * @param {boolean} ignoreIndex do not use the obsArray index (because we're modifying it right now)
    * @return {int}
    */
   ko.sync.findByKey = function(obsArray, keyFactory, keyOrData, ignoreIndex) {
      var key = keyOrData;
      if( typeof(keyOrData) !== 'string' ) {
         if( keyOrData instanceof ko.sync.Record) {
            keyOrData = keyOrData.getData(true);
         }
         key = keyFactory.make(keyOrData);
      }
      if( !ignoreIndex && obsArray.indexForKey ) {
         // optimized lookup since the obsArray can use cached keys that are always ordered and up to date
         return obsArray.indexForKey(key);
      }
      else {
         // just manually grok it ourselves
         var list = ko.utils.unwrapObservable(obsArray), i = -1, len = list.length;
         while(++i < len) {
            if( keyFactory.make(list[i]) === key ) {
               return i;
            }
         }
         return -1;
      }
   };

   /**
    * Creates a copy of the data with all observables unwrapped to their value
    *
    * @param {Object|Array} data
    * @return {Object}
    */
   ko.sync.unwrapAll = function(data) {
      var unwrap = ko.utils.unwrapObservable;
      data = unwrap(data);
      var out = _.isArray(data)? [] : {};
      _.each(data, function(v, key) {
         v = unwrap(v);
         out[key] = _.isObjectLiteral(v)? ko.sync.unwrapAll(v) : v;
      });
      return out;
   };

   function _buildInitialKeys(keyBuilder, unwrappedArray) {
      return _.map(unwrappedArray||[], function(v) {
         return keyBuilder.make(v);
      })
   }

   // the fromat of this value is coupled with RecordId's privade _isTempId() method :(
   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);