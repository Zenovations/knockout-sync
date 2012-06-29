

jQuery(function($) {
   var undef;

   module("Defer");
   test("#resolve", function() {
      expect(6);
      equal('function', typeof(ko.sync.defer), 'ko.sync.defer exists');
      // sync
      ko.sync.defer()
        .then(function(v) {
                 strictEqual(v, true, 'sync.then() before resolve gets true');
              },
              function() {
                 ok(false, 'sync.then() does not fail');
              })
        .resolve(true)
        .then(function(v) { strictEqual(v, true, 'sync.then() after resolve gets true'); },
              function() { ok(false, 'sync.then() does not fail'); });

      // async
      stop();
      var def = ko.sync.defer()
         .then(function(v) {
                  equal(v, 'hello', 'async.then() gets "hello"');
               },
               function() {
                  ok(false, 'async.then() does not fail');
               });

      // resolve with Error
      ko.sync.defer()
         .resolve(new Error('resolved'))
         .then(function() {
                  ok(false, 'then() should not resolve');
               },
               function(e) {
                  ok(e instanceof Error, 'is an Error');
                  equal(e.message, 'resolved', 'rejects with "resolved" as error message');
               });

      setTimeout(function() {
         def.resolve('hello');
         setTimeout(start, 10);
      }, 20);
   });

   test("#reject", function() {
      expect(3);
      // sync
      ko.sync.defer()
         .then(function() {
                  ok(false, 'early then() does not resolve');
               },
               function(e) {
                  equal(e, 'no', 'early then() rejects to "no"');
               })
         .reject('no')
         .then(function() {
                  ok(false, 'late then() does not resolve');
               },
               function(e) {
                  ok(e, 'no', 'late then() rejects to "no"');
               });

      // async
      stop();
      var def = ko.sync.defer()
         .then(function() {
            ok(false, 'async.then() does not resolve');
         },
         function(v) {
            equal(v, 'nope', 'async.then() rejects with "nope"');
         });

      setTimeout(function() {
         def.reject('nope');
         setTimeout(start, 1);
      }, 10);
   });

   test("#callback", function() {
      expect(3);
      stop();
      var callback = ko.sync.defer().then(
         function(v) {
            deepEqual(v, {hello: true}, 'should resolve with correct value');
         },
         function() {
            ok(false, 'does not reject');
         }
      ).callback();

      setTimeout(function() {
         callback({hello: true});
         setTimeout(start, 1);
      }, 1);

      var callback2 = ko.sync.defer().then(
         function() {
            ok(false, 'does not resolve');
         },
         function(e) {
            ok(e instanceof Error, 'rejects with an Error');
            equal(e.message, 'reject', 'rejects with correct message');
         }
      ).callback();

      setTimeout(function() {
         callback2(new Error('reject'));
         setTimeout(start, 1);
      }, 10);
   });

   module('Promise');
   test("#always", function() {
      expect(4);

      // async
      var async = ko.sync.defer();
      async.promise.always(function(v) {
            strictEqual(v, true, 'always called with correct value');
         });
      async.resolve(true);

      stop(3);

      // resolve with error
      var def = ko.sync.defer();
      def.promise.always(function(v) {
            ok(v instanceof Error, 'always called with correct value');
         });
      setTimeout(function() {
         def.resolve(new Error('hello'));
         start();
      }, 10);

      // resolve
      var def2 = ko.sync.defer();
      def2.promise.always(function(v) {
            equal(v, 'hello', 'always called with correct value');
         });
      setTimeout(function() {
         def2.resolve('hello');
         start();
      }, 10);

      // reject
      var def3 = ko.sync.defer();
      def3.promise.always(function(v) {
            equal(v, 'hello', 'always called with correct value');
         });
      setTimeout(function() {
         def3.reject('hello');
         start();
      }, 10);
   });

   test("#done", function() {
      expect(1);

      // vanilla
      var def = ko.sync.defer();
      def.promise.done(function(v) {
         equal(v, 'hi', 'done called with correct value');
      });
      def.resolve('hi');

      // resolve with error
      var def2 = ko.sync.defer();
      def2.promise.done(function(v) {
         ok(false, 'should not call done');
      });
      def2.resolve(new Error('bye'));

      // reject
      var def3 = ko.sync.defer();
      def3.promise.done(function(v) {
         ok(false, 'should not call done');
      });
      def3.reject('bye');
   });

   test("#fail", function() {
      expect(3);

      // vanilla
      var def = ko.sync.defer();
      def.promise.fail(function(v) {
         ok(false, 'should not fail');
      });
      def.resolve('hi');

      // resolve with error
      var def2 = ko.sync.defer();
      def2.promise.fail(function(v) {
         ok(v instanceof Error, 'fails with Error');
         equal(v.message, 'bye', 'fail with correct message');
      });
      def2.resolve(new Error('bye'));

      // reject
      var def3 = ko.sync.defer();
      def3.promise.fail(function(v) {
         equal(v, 'bye', 'fail with correct message');
      });
      def3.reject('bye');
   });

   test("#then", function() {
      expect(4);
      stop(2);

      // sync success
      var def = ko.sync.defer();
      def.promise.then(function(v) {
            equal(v, 'hello', 'resolve with correct value');
         },
         function() {
            ok(false, 'should not reject');
         });
      def.resolve('hello');

      // sync reject
      var def2 = ko.sync.defer();
      def2.promise.then(function() {
            ok(false, 'should not resolve');
         },
         function(v) {
            equal(v, 'bye', 'reject with correct value');
         });
      def2.reject('bye');

      // async success
      var def3 = ko.sync.defer();
      def3.promise.then(function(v) {
            equal(v, 'hello', 'resolve with correct value');
         },
         function() {
            ok(false, 'should not reject');
         });
      setTimeout(function() {
         def3.resolve('hello');
         start();
      }, 10);

      // async fail
      var def4 = ko.sync.defer();
      def4.promise.then(function(v) {
            ok(false, 'should not resolve');
         },
         function(e) {
            equal(e.message, 'nope', 'reject with correct value');
         });
      setTimeout(function() {
         def4.resolve(new Error('nope'));
         start();
      }, 10);

   });

   module("When");
   test("vanilla", function() {
      expect(7);
      stop(2);

      // value
      ko.sync.when(function() { return null; })
         .done(function(v) {
            strictEqual(v, null, 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });

      // undefined
      ko.sync.when(function() {})
         .done(function(v) {
            strictEqual(v, undef, 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });

      // error
      ko.sync.when(function() { return new Error('bye'); })
         .done(function(v) {
            ok(false, 'does not resolve');
         })
         .fail(function(e) {
            strictEqual(e.message, 'bye', 'fails with correct value');
         });

      // promise
      ko.sync.when(function() {
            var d = ko.sync.defer();
            setTimeout(function(){
               d.resolve('hello');
               start();
            }, 10);
            return d.promise;
         })
         .done(function(v) {
            equal(v, 'hello', 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });

      // promise rejected
      ko.sync.when(function() {
         var d = ko.sync.defer();
         setTimeout(function(){
            d.reject('nonono');
            start();
         }, 10);
         return d.promise;
      })
      .done(function(v) {
         ok(false, 'does not resolve');
      })
      .fail(function(e) {
         equal(e, 'nonono', 'fails with correct value');
      });

      // no resolve/reject methods (returns the promise and not the deferred
      var p = ko.sync.when(function() {});
      strictEqual(p.resolve, undef, 'does not have resolve method');
      strictEqual(p.reject, undef, 'does not have reject method');
   });

   test("with scope", function() {
      expect(3);

      var scope = { x: 'hi' };
      var p = ko.sync.when(scope, function(a) {
         equal(this.x, 'hi', 'scope value found and correct');
         equal(a, 'bye', 'arg passed correctly')
      }, 'bye');

      ok(p.done && p.always && p.then && p.fail && !p.resolve && !p.reject, 'Is a promise object');
   });

   test("throw error", function() {
      expect(1);

      // mostly, we want to know it was caught and not thrown out of the when operation
      ko.sync.when(function() { throw new Error('thrown'); })
         .done(function() { ok(false, 'should not resolve'); })
         .fail(function(e) { equal(e.message, 'thrown', 'fails with correct message'); });
   });

   module("Handle");
   test("vanilla", function() {
      expect(2);
      stop(2);

      function _callback(cb) {
         setTimeout(function() {
            cb('good');
            start();
         }, 10);
      }

      function _errback(a, cb, c) {
         setTimeout(function() {
            cb(new Error('errback'));
            start();
         }, 10);
      }

      // success
      ko.sync.handle(_callback)
         .done(function(v) {
            strictEqual(v, 'good', 'resolves with correct value');
         })
         .fail(function(e) {
            ok(false, 'does not fail');
         });

      // fail
      ko.sync.handle(_errback, 0, ko.sync.handle.CALLBACK, 2)
         .done(function(v) {
            ok(false, 'does not resolve');
         })
         .fail(function(e) {
            equal(e.message, 'errback', 'rejects with correct value');
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



