
(function(ko) {

   /**
    * @param {Object} target a mapped observable array
    * @param {ko.sync.Model} model
    * @param {boolean} [startDirty]
    * @constructor
    */
   ko.sync.Crud = function(target, model, startDirty) {
      this.isDirty = ko.observable(startDirty||false);
      //todo not a good solution for arrays
      //todo does not account for persist/observe attributes of the model
      this.checkpoint = ko.mapping.toJSON(target);
      this.model = model;
      //todo deal with auto-updates
   };

   var Crud = ko.sync.Crud;
   $.extend(Crud.prototype, {
      create: function() {
         //todo
      },

      read: function( recordId ) {
         //todo
      },

      update: function() {
         //todo
      },

      delete: function() {
         //todo
      },

      save: function() {
         return this.update();
      },

      promise: $.Deferred().resolve(null).promise()
   });

   /**
    * @param {Object} target a mapped observable array
    * @param {ko.sync.Model} model
    * @param {boolean} [startDirty]
    * @constructor
    */
   ko.sync.CrudArray = function(target, model, startDirty) {
      this.isDirty = ko.observable(startDirty||false);
      //todo not a good solution for arrays
      //todo does not account for persist/observe attributes of the model
      this.checkpoint = ko.mapping.toJSON(target);
      this.model = model;
      //todo deal with auto-updates
   };

   var CrudArray = ko.sync.CrudArray;
   $.extend(CrudArray.prototype, {
      create: function( data ) {
         //todo
      },

      read: function( criteria ) {
         //todo
      },

      update: function() {
         //todo
      },

      delete: function( hashKey ) {
         //todo
      },

      save: function() {
         this.update.apply(this, _.toArray(arguments));
      },

      promise: $.Deferred().resolve(null).promise()
   });

   CrudArray.map = function( observableArray, model ) {

   };

})(ko);

