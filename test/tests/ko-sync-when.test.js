
jQuery(function($) {
   var undef;

   module("ko.sync.when");

   test("vanilla", function() {
      expect(2);
      var p = ko.sync.when(function() { return 1; });
      p.done(function(v) {
         strictEqual(v, 1, "Resolves with correct value");
      });
      ok(p.done && p.always && p.then && p.fail && !p.resolve && !p.reject, 'Is a proper promise object');
   });

   test("with null", function() {
      expect(1);

      // value
      ko.sync.when(function() { return null; })
         .done(function(v) {
            strictEqual(v, null, 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });
   });

   test("with undefined", function() {
      expect(1);

      // undefined
      ko.sync.when(function() {})
         .done(function(v) {
            strictEqual(v, undef, 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });
   });

   test("with Error", function() {
      expect(1);

      // error
      ko.sync.when(function() { return new Error('bye'); })
         .done(function(v) {
            ok(false, 'does not succeed');
         })
         .fail(function(e) {
            strictEqual(e.message, 'bye', 'fails with correct value');
         });
   });

   test("with promise", function() {
      expect(1);
      stop();

      // promise
      ko.sync.when(function() {
         var d = $.Deferred();
         setTimeout(function(){
            d.resolve('hello');
            start();
         }, 10);
         return d.promise();
      })
         .done(function(v) {
            equal(v, 'hello', 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });
   });

   test("with rejected promise", function() {
      expect(1);
      stop();

      // promise rejected
      ko.sync.when(function() {
         var d = $.Deferred();
         setTimeout(function(){
            d.reject('nonono');
            start();
         }, 10);
         return d.promise();
      })
         .done(function(v) {
            ok(false, 'does not resolve');
         })
         .fail(function(e) {
            equal(e, 'nonono', 'fails with correct value');
         });
   });

   test("with scope", function() {
      expect(3);

      var scope = { x: 'hi' };
      var p = ko.sync.when(scope, function(a) {
         equal(this.x, 'hi', 'scope value found and correct');
         equal(a, 'bye', 'arg passed correctly')
      }, 'bye');

      ok(p.done && p.always && p.then && p.fail && !p.resolve && !p.reject, 'Is a proper promise object');
   });

   test("throw error", function() {
      expect(1);

      // mostly, we want to know it was caught and not thrown out of the when operation
      ko.sync.when(function() { throw new Error('thrown'); })
         .done(function() { ok(false, 'should not resolve'); })
         .fail(function(e) { equal(e.message, 'thrown', 'fails with correct message'); });
   });

});

