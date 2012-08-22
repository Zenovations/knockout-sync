/*******************************************
 * Knockout Sync - v0.1.0 - 2012-07-02
 * https://github.com/katowulf/knockout-sync
 * Copyright (c) 2012 Michael "Kato" Wulf; Licensed MIT, GPL
 *******************************************/
(function(ko) {
   "use strict";

   /**
    * This should only be used for observable arrays
    *
    * @param target
    * @param model
    * @param startDirty
    * @return {*}
    */
   ko.extenders.sync = function(target, model, startDirty) {

      if( !target.push ) {
         throw new Error('Sync extender is only intended for observableArray classes');
      }

      // convert to a mapped array as necessary
      target = ko.sync.CrudArray.map(target, model);
      target.crud = new ko.sync.CrudArray(target, model, startDirty);

      return target;
   };

   //todo does this have much better performance?
   //todo if so, we can use the isDirty({read: ..., write...}) approach
   //ko.extenders.dirty = function(target, startDirty) {
   //   var cleanValue = ko.observable(ko.mapping.toJSON(target));
   //   var dirtyOverride = ko.observable(ko.utils.unwrapObservable(startDirty));
   //
   //   target.isDirty = ko.computed(function(){
   //      return dirtyOverride() || ko.mapping.toJSON(target) !== cleanValue();
   //   });
   //
   //   target.markClean = function(){
   //      cleanValue(ko.mapping.toJSON(target));
   //      dirtyOverride(false);
   //   };
   //   target.markDirty = function(){
   //      dirtyOverride(true);
   //   };
   //
   //   return target;
   //};

   ko.sync || (ko.sync = {});
   ko.sync.stores || (ko.sync.stores = []);

   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);