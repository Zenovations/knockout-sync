
jQuery(function($) {

   var console = window.console || {
         log: function() {},
         info: function() {},
         error: function() {},
         warn: function() {}
      };

   $.extend(true, $.Tut.defaults.tip.bubble, {
      background: '#ffc',
      border: {color: 'green'}
   });

   $.Tut.start()
         .panel({
            target: '#inner-panel',
            url: 'http://www.wordspot.org/api/repeat.php?t='+encodeURIComponent($('#repeat-code').html()),
            filter: function(data) { return $('<div />').append(data).find('.content').html(); }
         })
         .wait(1500)
         .panel({target: '#inner-panel', text: 'this is <em>text</em>'})
         .wait(1500)
         .panel({target: '#panel', html: '<p>This <em>html</em> replaces the <code>inner-panel</code> element</p>'})
         .wait(1500)
         .panel({target: '#panel', detach: true, src: '#panel1'}) // replaces inner-panel!
         .tip('#input', {text: 'Here is an input field and a really long description for no reason at all', at: 'left top', clone: true, hide: 2500})
         .tip('#target', {src: '#msg', at: 'bottom center', hide: 500})
         .mouse({at: 'bottom center', of: '#panel'})
         .simclick({at: 'bottom left', of: '#panel'})
         .click('#input')
         .hint('#input', 'I clicked this', 1499)
         .wait(1500)
         .panel({target: '#panel', src: '#panel2'})
         .simclick('#google')
         .hint('#google', 'I didn\'t actually click that', 1000)
         .hover('#google')
         .wait(1500)
         .hint('#google', 'But I am hovering it', 2000)
         .wait(1500)
         .blur('#google')
         .mouse('#yahoo')
         .hint('#yahoo', 'Now I\'m hovering here', 1000)
         .wait(1000)
         .panel({target: '#panel', src: '#panel3', detach: true})
         .simclick('#sample-menu .dropdown-toggle')
         .menu('#sample-menu', 4, {hide: 100})
         .end()
         .done(function() {
            console.info('Tut chain completed successfully');
         })
         .fail(function(parts) {
            var i = parts.length;
            while(i--) {
               if( parts[i] instanceof Error ) {
                  console.error(parts[i]);
               }
               else {
                  console.log(parts[i]);
               }
            }
         });

});
