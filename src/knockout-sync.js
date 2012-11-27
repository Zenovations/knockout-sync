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
    *
    * @param {ko.sync.KeyFactory} keyFactory (see SyncController)
    * @param callbacks
    */
   ko.observableArray.fn.subscribeRecChanges = function(keyFactory, callbacks) {
      var previousValue = undefined, delayed = {};
      var ctx = { keyFactory: keyFactory, callbacks: callbacks, deferred: {}, latestValue: null };
      this.subscribe(function(_previousValue) {
         previousValue = _previousValue.slice(0);
      }, undefined, 'beforeChange');
      this.subscribe(function(latestValue) {
         ctx.latestValue = latestValue;
         var diff = ko.utils.compareArrays(previousValue, latestValue);
         for (var i = 0, j = diff.length; i < j; i++) {
            applyRecChange(ctx, diff[i].status, diff[i].value);
         }
      });
   };

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
               break; //todo check for data changes?
            case "deleted":
               ctx.deferred[key] = deferDelete(key, ctx.deferred, ctx.callbacks.delete.bind(ctx.callbacks));
               break;
            case "added":
               if( key in ctx.deferred ) {
                  clearTimeout(ctx.deferred);
                  delete ctx.deferred[key];
                  ctx.callbacks.move(key, data, prevVal(ctx.keyFactory, data, ctx.latestValue));
               }
               else {
                  ctx.callbacks.add(key, data, prevVal(ctx.keyFactory, data, ctx.latestValue));
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

   //todo-feature: ko.sync.remote to perform operations remotely without having to download records first? example: ko.sync.remote.delete( model, 'recordXYZ' );

   ko.sync || (ko.sync = {});
   ko.sync.stores || (ko.sync.stores = []);
   ko.sync.validators || (ko.sync.validators = []);

   ko.sync.isObservableArray = function(o) {
      return typeof(o) === 'function' && ko.isObservable(o) && _.isArray(o());
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
         out[key] = unwrap(v);
      });
      return out;
   };

   // the fromat of this value is coupled with RecordId's privade _isTempId() method :(
   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);