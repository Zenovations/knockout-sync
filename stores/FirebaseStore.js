
function FirebaseStore(url, base) {
   var ref = new Firebase(url);
   this.base = base? ref.child(base) : ref;
}

FirebaseStore.prototype.create = function(table, key, data) {
   return ko.sync.handle(function(cb) {
      var table = this.base.child(table), ref = key? table.child(key) : table.push();
      ref.set(data, function(success) {
         //todo
         //todo add an errback to handle()!
         //todo
         //todo
         //todo
      });
   });
};

FirebaseStore.prototype.read   = function(model, recOrId) {}; //todo
FirebaseStore.prototype.update = function(model, rec) {}; //todo
FirebaseStore.prototype.delete = function(model, recOrId) {}; //todo
FirebaseStore.prototype.query  = function(model, params) {}; //todo
FirebaseStore.prototype.assignTempId = function(model, rec) {}; //todo

FirebaseStore.prototype.sync         = function(callback) {}; //todo
FirebaseStore.prototype.onDisconnect = function(callback) {}; //todo
FirebaseStore.prototype.onConnect    = function(callback) {}; //todo

