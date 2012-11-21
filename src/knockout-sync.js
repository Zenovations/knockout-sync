/*******************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/katowulf/knockout-sync
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function(ko) {
   "use strict";

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
      var previousValue = undefined, delayed = {}, deleteFx =  _.bind(callbacks.delete, callbacks);
      this.subscribe(function(_previousValue) {
         previousValue = _previousValue.slice(0);
      }, undefined, 'beforeChange');
      this.subscribe(function(latestValue) {
         var diff = ko.utils.compareArrays(previousValue, latestValue);
         var prevDelayed = delayed;
         _.invoke(prevDelayed, 'clearTimeout');
         delayed = {};
         for (var i = 0, j = diff.length; i < j; i++) {
            var data = diff[i].value, key = keyFactory.make(data);
            switch (diff[i].status) {
               case "retained":
                  break; //todo check for moves and/or data changes?
               case "deleted":
                  if( key ) { delayed[key] = deferDelete(key, delayed, deleteFx); }
                  break;
               case "added":
                  if( key && key in prevDelayed ) {
                     delete prevDelayed[data];
                     callbacks.move(key, data, prevVal(keyFactory, data, latestValue));
                  }
                  else {
                     callbacks.add(key, data, prevVal(keyFactory, data, latestValue));
                  }
                  break;
            }
         }
         _.each(prevDelayed, function(v, k) { callbacks.delete(k); });
         previousValue = undefined;
      });
   };

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

   // the fromat of this value is coupled with RecordId's privade _isTempId() method :(
   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);