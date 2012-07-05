
jQuery(function($) {

   module("ko.sync.handle");
   test("vanilla", function() {
      expect(1);
      stop();

      function _callback(cb) {
         setTimeout(function() {
            cb('good');
            start();
         }, 10);
      }

      // no placeholder
      ko.sync.handle(_callback)
         .done(function(v) {
            strictEqual(v, 'good', 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });

   });

   test("error and placeholder", function() {
      expect(1);
      stop();

      function _callbackError(a, cb, c) {
         setTimeout(function() {
            cb(new Error('callback with error'));
            start();
         }, 10);
      }

      // fail, use placeholder
      ko.sync.handle(_callbackError, 0, ko.sync.handle.CALLBACK, 2)
         .done(function(v) {
            ok(false, 'does not resolve');
         })
         .fail(function(e) {
            equal(e.message, 'callback with error', 'rejects with correct value');
         });

   });

   test("errback", function() {
      expect(2);
      stop();

      function _errback(cb, a, eb, c) {
         setTimeout(function() {
            ok(typeof(cb) === 'function', 'was callback added');
            eb('nope');
            start();
         }, 10);
      }

      // errback
      ko.sync.handle(_errback, 0, ko.sync.handle.ERRBACK, 2) // should prepend the callback
         .done(function() {
            ok(false, 'should not resolve');
         })
         .fail(function(e) {
            equal(e, 'nope', 'should fail with correct value');
         });
   });

   test("with scope", function() {
      expect(3);
      ko.sync.handle({x: 'scoped'}, function(a, b, cb) {
         equal(this.x, 'scoped');
         equal(a, 'a');
         equal(b, 'b');
      }, 'a', 'b', ko.sync.handle.CALLBACK);
   });

   test("throw error", function() {
      expect(1);
      // mostly we want to see the error get caught and not thrown out of the handle scope
      ko.sync.handle(function() { throw new Error('thrown'); })
         .done(function() { okay(false, 'does not resolve'); })
         .fail(function(e) { equal(e.message, 'thrown', 'rejects with correct message'); });
   });

});

