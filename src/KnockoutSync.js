
(function(ko) {

   ko.extenders.sync = function(target, startDirty) {
      target.crud = {
         /**
          * @param {boolean} [newValue]
          * @return {boolean}
          */
         isDirty: ko.observable(startDirty)
      };

      //todo should be checking to see if persist or observe are true
      //todo and probably simplifying this
      target.subscribe(function(newValue) { target.crud.isDirty(true); });

      return target;
   };

   ko.sync || (ko.sync = {});
   ko.sync.use = function() {};
   ko.sync.newList = function() {};
   ko.sync.newRecord = function() {};

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

})(ko);