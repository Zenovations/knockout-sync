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

      // convert to a mapped array
      target = ko.mapping.fromJS(ko.utils.unwrapObservable(target), model.mapping());

      // add crud operations
      ko.sync.Crud.applyTo(target, model, startDirty);

      return target;
   };

   //todo-feature: ko.sync.remote to perform operations remotely without having to download records first? example: ko.sync.remote.delete( model, 'recordXYZ' );

   ko.sync || (ko.sync = {});
   ko.sync.stores || (ko.sync.stores = []);
   ko.sync.validators || (ko.sync.validators = []);

   ko.sync.instanceId = moment().unix()+':'+(((1+Math.random())*1000)|0);

})(ko);