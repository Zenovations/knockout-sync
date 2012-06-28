
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

