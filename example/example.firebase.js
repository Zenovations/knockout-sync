/*! example.firebase.js
 *************************************/
(function ($) {
   "use strict";
   var fb = new Firebase('https://aniqi1tmal1.firebaseio-demo.com/chat-example');
   var pull = fb.limit(10);
   var store = new ko.sync.stores.Firebase(fb, ['u', 'm'], {limit: 10});

   var view = {
      name: ko.observable(ko.sync.demo.fetch('name') || randomName()),

      messages: ko.observableArray().extend({sync: store}),

      reset: function(e) {
         fb.set({
            example1: { u: 'Kato', m: 'God, why do programs have bugs?' },
            example2: { u: 'God',  m: 'This again?' },
            example3: { u: 'Kato', m: 'Yeah...' },
            example4: { u: 'God',  m: 'Look, I already told you...' },
            example5: { u: 'Kato', m: 'I know, I know, I should have used Python.' },
            example6: { u: 'God',  m: 'Exactly. Any more questions?' },
            example7: { u: 'Kato', m: 'No. I guess not. Thanks.' }
         });
      },

      changeName: function(e) {
         var name = prompt('Change your name', ko.sync.demo.fetch('name'));
         if( name ) {
            view.name(name);
            ko.sync.demo.store('name', name);
         }
      },

      addMessage: function(form) {
         var msg = $(form).find('[name="msg"]').val();
         if( msg ) {
            view.messages.push({u: view.name(), m: msg});
         }
      }
   };

   $(function($) {
      ko.applyBindings(view, $('#firebase')[0]);
      view.messages.subscribe(function() {
         $('#firebase').find('.content').scrollTo('max');
      });
      pull.on('value', function(ss) {
         $('#firebase').find('pre').text(JSON.stringify(ss.val(), null, 2)).scrollTo('max');
      });
   });

   function randomName() {
      var n = 'bio-unit #'+_.random(1000, 99999);
      ko.sync.demo.store('name', n);
      return n;
   }

})(jQuery);