
(function(ko, $) {

   ko.sync.Change = function(source, action, rec, meta) {
      this.source  = source;
      this.action  = action;
      this.rec     = rec;
      this.meta    = meta;
      this.status  = 'pending';
      this.done    = $.Deferred();
   };

   ko.sync.Change._expect = function(dest) {
      return new ko.sync.Change(dest, this.action, this.rec, this.meta);
   };

   ko.sync.Change.equals = function(change) {
      if( change instanceof ko.sync.Change
         && change.source === this.source
         && change.action === this.action
         && change.rec.hashKey() === this.rec.hashKey() ) {

         switch(change.action) {
            case 'create':
            case 'delete':
               return true;
            case 'update':
               return _.isEqual(change.meta.data, this.meta.data);
            case 'move':
               return change.meta.prevId = this.meta.prevId;
            default:
               throw new Error('invalid action ' + change.action);
         }

      }
      return false;
   };

   ko.sync.ChangeController = function() {
      this.changes = [];
      this.expected = {};
   };

   ko.sync.ChangeController.prototype.process = function() {
      //todo
      //todo
      //todo
      //todo
      //todo
   };

   ko.sync.ChangeController.prototype.add = function(change) {
      var expectedList = this.expected, expect = change._expect();
      if( !expectedList(expect) ) {
         this.changes.push(change);
         _.findOrCreate(expectedList, [expect.source, expect.action, expect.hashKey()], []).push(expect);
         change.done.then(function() {
            var entry = _.deepFind(expectedList, )
         });
      }
   };

   ko.sync.ChangeController.prototype.expected = function(change) {

   };

})(ko, jQuery);

