
(function(ko) {
   "use strict";

   /**
    * @param {Object}        target   an object or view containing the record data
    * @param {ko.sync.Model} model
    * @param {string|object} recordId
    * @constructor
    */
   ko.sync.Crud = function(target, model, recordId) {
      this.parent     = target;  // a knockout compatible alias useful for bindings
      this.model      = model;
      this.keyBuilder = new ko.sync.KeyFactory(model, true);
      this.isObs      = ko.isObservable(target);
      this.def        = $.Deferred().resolve();
      this.controller = null;
      recordId && setController(this, recordId);
   };

   var Crud = ko.sync.Crud;

   /**
    * Save a new record to the data layer
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.create = function() {
      var data = ko.sync.unwrapAll(this.parent);
      setController(this);
      this.def = pipeQueue(this, {
         action: 'create',
         to:     'store',
         data:   data,
         push:   true
      });
      return this;
   };

   /**
    * Load a record from the data layer into the local copy
    * @param {string} hashKey
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.read = function( hashKey ) {
      this.def = pipe(this.def, function() {
         return setController(this, hashKey);
      }.bind(this));
      return this;
   };

   /**
    * Push updates to the data layer
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.update = function(data) {
      if( data ) {
         data = $.extend(ko.utils.unwrapObservable(this.parent) || {}, data);
         if( this.isObs ) {
            this.parent(data);
         }
      }

      this.def = pipeQueue(this, {
         action: 'update',
         to:   'store',
         data: data,
         key:  this.keyBuilder.make(data),
         push: true
      });
      return this;
   };

   /**
    * Delete record locally and from the data layer service
    * @return {ko.sync.Crud} this
    */
   Crud.prototype.delete = function() {
      this.def = pipeQueue(this, {
         action: 'delete',
         to:     'store',
         key:    this.keyBuilder.make(ko.sync.unwrapAll(this.parent)),
         push:   true
      });
      return this;
   };

   /**
    * Alias to the `update` method.
    * @return {ko.sync.Crud}
    */
   Crud.prototype.save = function() {
      return this.update();
   };

   /**
    * Alias to the `read` method.
    * @return {ko.sync.Crud}
    */
   Crud.prototype.load = function() {
      return this.read.apply(this, _.toArray(arguments));
   };

   /**
    * @return {jQuery.Deferred} promise
    */
   Crud.prototype.promise = function() {
      return this.def.promise();
   };

   function pipeQueue(crud, props) {
      // both crud.def and crud.controller may change between ops, so accessing them can be tricky;
      // be careful in here that they are only accessed at the time they are to be used to prevent problems
      return pipe(crud.def, function() {
         console.log('pipe'); //debug
         return crud.controller.queue(props);
      });
   }

   function pipe(def, fx) {
      return def.pipe(function() {
         return $.Deferred(function(def) {
            fx().always(def.resolve);
         });
      });
   }

   function setController(crud, recordId) {
      if( crud.controller ) {
         crud.controller.dispose();
      }
      crud.controller = new ko.sync.SyncController(crud.model, crud.parent, recordId);
      crud.def = crud.def.pipe(crud.controller.ready());
      return crud.def;
   }

})(ko);

