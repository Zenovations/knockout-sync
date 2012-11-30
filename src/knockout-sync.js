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
         var diff = ko.utils.compareArrays(previousValue, latestValue);
         for (var i = 0, j = diff.length; i < j; i++) {
            applyRecChange(ctx, diff[i].status, diff[i].value);
         }
      }));

      if( observedFields.length ) {
         _.each(this(), function(v) {
            disposables.push(
               _.extend(
                  {key: keyFactory.make(v)}, // add an id to the disposable
                  watchFields(v, observedFields, function(newData) {
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
      var fieldsSub, rootSub;

      // initialize
      fieldsSub = watchFields(this(), observedFields, callback);

      // watch for replacements of the entire object
      rootSub = this.subscribe(function(newValue) {
         // whenever the observable is changed out (this probably shouldn't happen and wouldn't work), reset the fields
         if( observedFields.length ) {
            fieldsSub.dispose();
            fieldsSub = watchFields(newValue, observedFields, callback);
         }

         // invoke the callback
         callback(newValue);
      });

      return {
         dispose: function() {
            fieldsSub && fieldsSub.dispose();
            rootSub && rootSub.dispose();
         }
      };
   };

   function watchFields(data, observedFields, callback) {
//      console.log('watchFields', observedFields, data); //debug
      var disposables = [];
      _.each(observedFields, function(k) {
//         console.log('testing', k); //debug
         if( _.has(data, k) && ko.isObservable(data[k]) ) {
//            console.log('observing', k); //debug
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
      return obs.subscribe(function(newValue) {
//         console.log('watchField invoked', field);//debug
         var out = {};
         out[field] = newValue;
         callback(out);
      });
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
                  ctx.disposables.push(watchFields(data, ctx.observedFields, function(newData) {
                     applyRecChange(ctx, 'updated', newData);
                  }));
               }
               break;
         }
      }
   }

   function prevVal(keyBuilder, val, list) {
      var i = _.indexOf(val);
      if( i === -1 || i === list.length-1 ) { return null; }
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
      return typeof(o) === 'function' && ko.isObservable(o) && _.isArray(o());
   };

   ko.sync.watchFields = watchFields;

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
         out[key] = unwrap(v);
      });
      return out;
   };

   // the fromat of this value is coupled with RecordId's privade _isTempId() method :(
   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);