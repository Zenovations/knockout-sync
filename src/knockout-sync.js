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
   ko.observableArray.fn.watchChanges = function(keyFactory, callbacks, observedFields) {
      var previousValue = undefined;
      var disposables = [];
      var ctx = {
         keyFactory: keyFactory,
         callbacks: callbacks,
         deferred: {},
         latestValue: null,
         observedFields: observedFields,
         disposables: disposables
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
            disposables.push(
               _.extend(
                  {key: id}, // add an id to the disposable
                  watchFields(v, observedFields, function(newData) {
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
      var fieldsSub, rootSub, preSub, oldValue;

      // watch for changes on any nested observable fields
      fieldsSub = watchFields(this(), observedFields, callback);

      preSub = this.subscribe(function(prevValue) {
         console.log('beforeChange', prevValue);//debug
         oldValue = ko.sync.unwrapAll(prevValue);
      }, undefined, 'beforeChange');

      // watch for replacement of the entire object
      rootSub = this.subscribe(function(newValue) {
         console.log('change', newValue);//debug
         if( observedFields.length ) {
            // whenever the observable is changed out (this probably won't work for sync), reset the fields
            fieldsSub.dispose();
            fieldsSub = watchFields(newValue, observedFields, callback);
         }

         var changes = _.changes(oldValue, ko.sync.unwrapAll(newValue));
         oldValue = _.clone(newValue);
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
         dispose: function() {
            _.each(disposables, function(d) {d.dispose();});
         }
      }
   }

   function watchField(field, obs, callback) {
//      console.log('watchField', field);//debug
      var oldValue, preSub, changeSub;

      preSub = obs.subscribe(function(prevValue) {
         console.log('watchField::beforeChange', prevValue);
         oldValue = prevValue;
      }, undefined, 'beforeChange');

      changeSub = obs.subscribe(function(newValue) {
         if( oldValue !== newValue ) {
            console.log('watchField::change', newValue);
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
               _findAndDispose(ctx.disposables, key);
               ctx.deferred[key] = deferDelete(key, ctx.deferred, ctx.callbacks.delete.bind(ctx.callbacks));
               break;
            case "updated":
               ctx.callbacks.update(key, data);
               break;
            case "added":
               if( key in ctx.deferred ) {
                  clearTimeout(ctx.deferred);
                  delete ctx.deferred[key];
                  ctx.callbacks.move(key, data, prevVal(ctx.keyFactory, data, ctx.latestValue));
               }
               else {
                  ctx.callbacks.add(key, data, prevVal(ctx.keyFactory, data, ctx.latestValue));
                  var keyField = ko.sync.KeyFactory.HASHKEY_FIELD;
                  ctx.disposables.push(watchFields(data, ctx.observedFields, function(newData) {
                     newData[keyField] = key;
                     applyRecChange(ctx, 'updated', newData);
                  }));
               }
               break;
         }
      }
   }

   function prevVal(keyBuilder, val, list) {
      var i = ko.sync.findByKey(list, keyBuilder, val);
      if( i === -1 ) { return null; }
      else if( i === 0 ) { return 0; }
      else {
         return keyBuilder.make(list[i-1]);
      }
   }

   function deferDelete(key, delayed, deleteCallback) {
      return setTimeout(function() {
         if(key in delayed) {
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
      var s = _.find(disposables, function(v) { return v.key === key; });
      if( s ) {
         s.dispose();
         disposables.splice(_.indexOf(disposables, s), 1);
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
    * @param {ko.observableArray|Array} obsArray
    * @param {ko.sync.KeyFactory} keyFactory
    * @param {string|Object|ko.sync.Record} keyOrData
    */
   ko.sync.findByKey = function(obsArray, keyFactory, keyOrData) {
      var key = keyOrData;
      if( typeof(keyOrData) !== 'string' ) {
         if( keyOrData instanceof ko.sync.Record) {
            keyOrData = keyOrData.getData(true);
         }
         key = keyFactory.make(keyOrData);
      }
      var list = ko.utils.unwrapObservable(obsArray), i = -1, len = list.length;
      while(++i < len) {
         if( keyFactory.make(list[i]) === key ) {
            return i;
         }
      }
      return -1;
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

   // the fromat of this value is coupled with RecordId's privade _isTempId() method :(
   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);