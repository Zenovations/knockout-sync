
(function(ko) {

   ko.sync.KeyFactory = function(model, hashKeyField) {
      this.model = model;
      this.fields = _.isArray(model.key)? model.key : [model.key];
      this.hashKeyField = hashKeyField === true? KeyFactory.HASHKEY_FIELD : hashKeyField;
   };
   var KeyFactory = ko.sync.KeyFactory;
   KeyFactory.prototype.make = function(data) {
      if( this.hashKeyField && _.has(data, this.hashKeyField) && data[this.hashKeyField] ) {
         return data[this.hashKeyField];
      }
      else {
         return ko.sync.RecordId.for(this.model, data).hashKey();
      }
   };
   KeyFactory.HASHKEY_FIELD = '_hashKey';

})(ko);

