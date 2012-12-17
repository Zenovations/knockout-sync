
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
      this.def        = $.Deferred().resolve();
      this.controller = null;
      if( ko.isObservable(target) ) {
         this.target = target;
      }
      else {
         if( !_.isObject(target.data) ) { target.data = {}; }
         this.target = target.data;
      }
      if( recordId ) {
         setController(this, recordId);
      }
      else {
         // just set up some empty default fields
         this.model.newRecord(this.target).applyData(this.target);
      }
   };

   /**
    * Save a new record to the data layer
    * @return {ko.sync.Crud} this
    */
   ko.sync.Crud.prototype.create = function() {
      var data = ko.sync.unwrapAll(this.target);
      setController(this);
      this.def = queueAndPush(this, {
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
   ko.sync.Crud.prototype.read = function( hashKey ) {
      this.def = pipe(this.def, function() {
         return setController(this, hashKey);
      }.bind(this));
      return this;
   };

   /**
    * Push updates to the data layer
    * @return {ko.sync.Crud} this
    */
   ko.sync.Crud.prototype.update = function(data) {
      this.def = pipe(this.def, function() {
         if( data ) {
            var target = this.target;
            var base = ko.sync.unwrapAll(target);
            var key = this.keyBuilder.make(base);
            var rec = this.model.newRecord(base);
            if( rec.updateAll(data).isDirty() ) {
               // use pre-existing temp id if no real ID is found
               // (easier to track if we don't let the rec create a new one)
               if( rec.hasKey() ) { key = rec.hashKey(); }
               rec.applyData(target);
               if( !this.model.auto ) {
                  // manually schedule update; if auto is on, this isn't necessary since
                  // updates will already be queued by the applyData() call
                  this.controller.queue({
                     action: 'update',
                     to:   'store',
                     data: data,
                     key:  key
                  });
               }
            }
         }
         // force the updates to the server
         return this.controller.pushUpdates();
      }.bind(this));
      return this;
   };

   /**
    * Delete record locally and from the data layer service
    * @return {ko.sync.Crud} this
    */
   ko.sync.Crud.prototype.delete = function() {
      this.def = queueAndPush(this, {
         action: 'delete',
         to:     'store',
         key:    this.keyBuilder.make(ko.sync.unwrapAll(this.target)),
         push:   true
      });
      return this;
   };

   /**
    * Alias to the `update` method.
    * @return {ko.sync.Crud}
    */
   ko.sync.Crud.prototype.save = function() {
      return this.update();
   };

   /**
    * Alias to the `read` method.
    * @return {ko.sync.Crud}
    */
   ko.sync.Crud.prototype.load = function() {
      return this.read.apply(this, _.toArray(arguments));
   };

   /**
    * @return {jQuery.Deferred} promise
    */
   ko.sync.Crud.prototype.promise = function() {
      return this.def.promise();
   };

   function queueAndPush(crud, props) {
      // both crud.def and crud.controller may change between ops, so accessing them can be tricky;
      // be careful in here that they are only accessed at the time they are to be used to prevent problems
      return pipe(crud.def, function() {
         return crud.controller.queue(props).pushUpdates();
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
      crud.controller = new ko.sync.SyncController(crud.model, crud.target, recordId);
      crud.def = crud.def.pipe(function() { return crud.controller.ready(); });
      return crud.def.promise();
   }

})(ko);

