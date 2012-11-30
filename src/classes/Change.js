
(function(ko, $) { //todo remove jQuery dependency?
   "use strict";
   var undef;

   /**
    * Props:
    *    to     {string} one of 'store' or 'obs'
    *    action {string} one of 'create', 'update', 'delete', or 'move'
    *    id     {String} the hashKey for the record being modified
    *    prevId {string} required by move and add operations
    *    data   {object} required by add and update, the data to be applied in the change
    *    model  {ko.sync.Model}
    *    obs    {Object|ko.sync.observable} the knockout data being synced, which can be an observableArray (observed)
    *    rec    {ko.sync.Record} required when `to` is set to 'store'
    *
    * @param props see above
    * @constructor
    */
   ko.sync.Change = function(props) {
      // declarations for the IDE
      /** @type {string} */
      this.to     = undef;
      /* @type {string} */
      this.action = undef;
      /* @type {string} */
      this.prevId = undef;
      /* @type {Object} */
      this.data   = undef;
      /* @type {ko.sync.Model} */
      this.model  = undef;
      /* @type {ko.observable|ko.observableArray|Object} */
      this.obs    = undef;
      /* @type {ko.sync.Record} */
      this.rec    = undef;

      // apply the properties provided
      _.extend(this, _.pick(props, ['to', 'action', 'prevId', 'data', 'model', 'rec', 'obs']));
      this.status  = 'pending';
      this.done    = $.Deferred();
   };

   ko.sync.Change.prototype.equals = function(change) {
      if( change instanceof ko.sync.Change
         && change.to === this.to
         && change.action === this.action
         && change.key() === this.key() ) {

         switch(change.action) {
            case 'create':
            case 'delete':
               return true;
            case 'update':
               return _.isEqual(change.data, this.data);
            case 'move':
               return change.prevId === this.prevId;
            default:
               throw new Error('invalid action ' + change.action);
         }

      }
      return false;
   };

   /**
    * @return {String}
    */
   ko.sync.Change.prototype.key = function() {
      return this.rec.hashKey();
   };

   /**
    * @param {Object} ctx  must contain keyFactory and cachedKeys
    * @return {jQuery.Deferred}
    */
   ko.sync.Change.prototype.run = function(ctx) {
      switch(this.to) {
         case 'store':
            return sendToStore(this);
         case 'obs':
            sendToObs(ctx, this);
            return $.Deferred().resolve(this).promise();
         default:
            throw new Error('invalid destination: '+this.to);
      }
   };

   function sendToStore(change) {
      return $.Deferred(function(def) {
         var store = change.model.store;
         switch(change.action) {
            case 'create':
               store
                  .create(change.model, change.rec)
                  .done(function(id) {
                     def.resolve(change, id);
                  })
                  .fail(def.reject);
               break;
            case 'update':
               store
                  .update(change.model, change.rec)
                  .done(function() {
                     def.resolve(change);
                  })
                  .fail(def.reject);
               break;
            case 'delete':
               store
                  .delete(change.model, change.rec)
                  .done(function() {
                     def.resolve(change);
                  })
                  .fail(def.reject);
               break;
            case 'move':
               store
                  .update(change.model, change.rec)
                  .done(function() {
                     def.resolve(change);
                  })
                  .fail(def.reject);
               break;
            default:
               throw new Error('invalid action: '+change.action);
         }
      });
   }

   /**
    * @param {Object} ctx
    * @param {ko.sync.Change} change
    */
   function sendToObs(ctx, change) {
      //todo this method is ugly, abstract out the various parts
      var pos;

      /** @type {ko.sync.Model} */
      var model  = change.model;
      /** @type {String} */
      var id     = change.key();
      /** @type {Object|ko.observable} */
      var target = change.obs;
      /** @type {Boolean} */
      var isList = ko.sync.isObservableArray(target);
      /** @type {Object} */
      var data   = change.data;
      /** @type {Object} */
      var sourceData;
      /** @type {Array} */
      var observedFieldKeys = model.observedFields();

      switch(change.action) {
         case 'create':
            if( isList ) {
               sourceData = ko.sync.Record.applyWithObservables({}, data, observedFieldKeys);
               pos = newPositionForRecord(ctx, target, id, change.prevId, true);
               if( pos < 0 ) {
                  target.push(sourceData);
               }
               else {
                  target.splice(pos, 0, sourceData);
               }
            }
            else {
               ko.sync.Record.applyWithObservables(findTargetDataSource(ctx, target, id), data, observedFieldKeys);
            }
            break;
         case 'update':
            ko.sync.Record.applyWithObservables(findTargetDataSource(ctx, target, id), data, observedFieldKeys);
            break;
         case 'delete':
            pos = currentPositionForRecord(ctx, target, id);
            if( pos > -1 ) {
               target.splice(pos, 1);
            }
            break;
         case 'move':
            pos = currentPositionForRecord(ctx, target, id);
            var newPos = newPositionForRecord(ctx, target, id, change.prevId);
            if( pos > -1 && pos !== newPos ) {
               target.splice(newPos, 0, target.splice(pos, 1));
            }
            break;
         default:
            throw new Error('invalid action: '+change.action);
      }
   }

   function newPositionForRecord(ctx, obsArray, key, prevId, isNew) {
      var len = obsArray().length;
      var newLoc = -1;
      var oldLoc = isNew? -1 : currentPositionForRecord(ctx, obsArray, key);

      prevId instanceof ko.sync.RecordId && (prevId = prevId.hashKey());
      if( typeof(prevId) === 'string' ) {
         newLoc = currentPositionForRecord(ctx, obsArray, prevId);
         if( newLoc > -1 && oldLoc > -1 && newLoc < oldLoc ) {
            newLoc++;
         }
      }
      else if( typeof(prevId) === 'number' ) {
         newLoc = prevId < 0? len - prevId : prevId;
      }

      return newLoc;
   }

   function currentPositionForRecord(ctx, obsArray, key) {
      if( !ctx.cachedKeys || !ctx.cachedKeys[key] ) {
         cacheKeysForObsArray(ctx, obsArray);
      }
      return key in ctx.cachedKeys? ctx.cachedKeys[key] : -1;
   }

   /**
    * @param {Object} ctx
    * @param {ko.observable|Object} target
    * @param {String} id
    * @return {Object}
    */
   function findTargetDataSource(ctx, target, id) {
      if( ko.sync.isObservableArray(target) ) {
         return target()[ currentPositionForRecord(ctx, target, id) ];
      }
      else if( ko.isObservable(target) ) {
         return target;
      }
      else {
         target.data || (target.data = {});
         return target.data;
      }
   }

   function cacheKeysForObsArray(ctx, obsArray) {
      var cache = ctx.cachedKeys = {}, f = ctx.keyFactory;
      _.each(ko.utils.unwrapObservable(obsArray), function(v, i) {
         cache[ f.make(v) ] = i;
      });
   }

})(ko, jQuery);

