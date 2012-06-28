/*************************
 * Create jQuery animated activities that resemble a user
 * interacting with a browser (suitable for tutorials and
 * guides and--with a few mods--testing)
 *
 * USES: (if available)
 *    jquery.mousey.js
 *    jquery.jtype.js
 *    jquery.xdomainajax.js (if you want to make cross-domain requests for data)
 *
 * REQUIRES:
 *    jquery.eventfilter.js
 *    ws.js
 *    jquery.ws.utils.js
 *    jquery.ws.pos.js
 *    jquery.ws.bubble.js
 ***************************/

(function($) {
   var $mousey = null;
   if( 'mousey' in $.fn ) {
      //todo this can only run one mousey at a time :(
      $mousey = $('<div />').appendTo('body').mousey('init');
   }

   /********************************************************************
    * Animations
    ********************************************************************/

   $.Tut = {
      start: function() {
         return createSequence($.Tut.fxns);
      },

      defaults: {
         tip: {
            speed:      750,  // how quickly tip appears/disappears
            hide:         0,  // if > 0, tip is hidden after this many milliseconds
            src:       null,
            text:     'Hello World!',
            clone:    false,  // make a copy before applying properties and moving `src` around (ignored for `text`)
            maxWidth:   250,  // used only with `text` (if you use src, you must size it)
            padding:  '5px',  // used only with `text` (if you use src, you must pad it)
            bubble:       {}  // any props accepted by wsbubble can be inserted here; `of` will be set automagically
         },
         menu: {
            pauseAfterOpen: 500 // 0=disabled, pause after clicking on menu and before selecting something (so viewer can read it)
         },
         type:  {},          // override any properties accepted by jtype here, `of` is set automagically
         mouse: {},          // override any properties accepted by mousey here, `of` will be set automagically
         hover:  {
            styles: 'active hover'  // the styles added by hover event (in addition to calling mouseenter/mouseleave)
         },
         hide: {
            speed:   250,
            effect:  'fadeOut',
            destroy: false,
            to:      null
         },
         show: {
            speed:   250,
            effect:  'fadeIn',
            to:      null
         },
         panel: {
            detach: true,
            speed:  250,
            effect: 'fadeIn',
            target: 'body',
            text:   'Oops, must declare one of text/html/src/url',
            store: null
         }
      },

      fxns: {
         /**
          * Display a popup message calling out a widget on the page to the user, probably telling them what to
          * do next or what is going on.
          *
          * The following parameters may be included in `opts`:
          * <ul>
          *    <li>hide:   {int=5000} hide after x milliseconds (0 = never)</li>
          *    <li>src:    {HTMLElement|string|jQuery=null} something to use for the hint object (anything that can
          *                            be passed into $(...)--i.e. a selector, html string, or element)</li>
          *    <li>text:   {string} used if src isn't provided as a simple string to display</li>
          *    <li>at:     {string='right center'} where bubble is relative to `target`;
          *                            in the format 'left|right|bottom|top top|center|bottom|left|right[ inner]' (see ws.bubble)
          *    <li>bubble: {object} a hash containing any properties usable by jquery.ws.bubble.js</li>
          *    <li>clone:  {boolean} if true, `src` will be cloned instead of moved about (does nothing with `text`)</li>
          *    <li>hide:   {int=0}     if > 0, the tip will hide after this many milliseconds (does not delay chain)</li>
          *    <li>speed:  {int}      speed the tip fades in/out
          * </ul>
          *
          * If `opts` is a string, it is used as the `text` field (i.e. it contains a simple string of text to include in the hint
          *
          * @param {HTMLElement,string,jQuery} target where to show hint; anything that can be passed into $(...)--i.e. a selector, html string, or element
          * @param {object,string} opts the options for configuring how hint is displayed
          * @return {jQuery.Deferred}
          */
         tip: function(target, opts) {
            // parse our (ugly but useful) options
            var def = $.Deferred(), $e, speed;
            $.isPlainObject(opts) || (opts = {text: opts});
            opts = $.extend(true, {}, $.Tut.defaults.tip, opts, {bubble: {of: $(target), at: opts.at}});
            if( opts.src ) {
               if( opts.clone ) {
                  $e = $(opts.src).clone().hide().removeAttr('id').appendTo('body');
               }
               else {
                  $e = $(opts.src).hide().css('position', 'absolute').appendTo('body');
               }
            }
            else {
               $e = _makeBubble(opts);
            }
            speed = opts.speed || 300;


            $e.wsbubble(opts.bubble).fadeIn(speed, function() {
               if( opts.hide ) {
                  setTimeout(function() {
                     $e.fadeOut(speed*1.5);
                  }, ~~opts.hide);
               }
               def.resolve();
            });
            return def.promise();
         },

         /**
          * Display a bootstrap style tooltip. (http://twitter.github.com/bootstrap/javascript.html#tooltips)
          *
          * @param {jQuery|HTMLElement|string} target a jQuery selector
          * @param {string} [text]  if not provided, the element's title attribute is used instead
          * @param {int}    [hide]  if > 0, the hint will hide after this many milliseconds (does not delay the chain)
          */
         hint: function(target, text, hide) {
            // parse our (ugly but useful) optional arguments
            var def = $.Deferred(), args = $.makeArray(arguments), $target = $(args.shift()), i = args.length;
            while(i--) {
               switch(typeof(args[i])) {
                  case 'number':
                     hide = ~~args[i]; break;
                  case 'string':
                     text = args[i]; break;
                  default:
                     throw new Error('invalid argument type '+typeof(args[i])+' at pos '+i);
               }
            }

            // initialize the hint
            if( !$target.attr('rel') === 'tooltip' ) { $target.tooltip(); }
            if( text ) {
               $target.prop('title', text);
               $target.tooltip('fixTitle');
            }

            // show the hint and resolve the promise immediately
            def.resolve($target.tooltip('show'));

            // hide the hint; does not affect promise resolution
            if( hide > 0 ) {
               setTimeout(function() {
                  $target.tooltip('hide');
               }, hide)
            }
            return def.promise();
         },

         /**
          * Call jQuery.fn.jtype with the given options.
          * @param {string} sel
          * @param {string} txt
          * @param props
          * @return {jQuery.Deferred}
          * @private
          */
         type: function(sel, txt, props) {
            var def = $.Deferred(), $e = $(sel);
            props = $.extend({}, $.Tut.defaults.type, props);
            props.complete = _extendFxn(function(){ def.resolve.apply(def, arguments); }, props.complete);
            _type($e, txt, props);
            return def.promise();
         },

         /**
          * Simulate a mouse moving on the screen.
          *
          * Calls jQuery.fn.mousey() if it's available. Resolve the promise when mousey completes.
          *
          * If `props` is not a hash ($.isPlainObject() !== true) then it will become the `of` parameter
          * passed into mousey (i.e. the target of the mouse move) by using it as a jQuery selector (can be
          * a string, HTMLElement, or jQuery set).
          *
          * If there is more than one object in the set matched by `of`, the mouse moves to each in turn.
          *
          * COUPLING: This method is coupled to the scoped jQuery variable $mousey
          *
          * @param {*} props delivered directly to mousey,
          * @private
          */
         mouse: function(props) {
            return _mouse(props, {click: false});
         },

         /**
          * Simulate a mouse moving to `of` and clicking on it. No actual click event is fired.
          *
          * If `props` is not a hash ($.isPlainObject() !== true) then it will become the `of` parameter
          * passed into mousey (i.e. the target of the mouse move) by using it as a jQuery selector (can be
          * a string, HTMLElement, or jQuery set).
          *
          * If there is more than one object in the set matched by `of`, only the first in the list is used.
          *
          * COUPLING: This method is coupled to the scoped jQuery variable $mousey
          *
          * @param {Object} props delivered directly to mousey
          * @private
          */
         simclick: function(props) {
            return _mouse(props, {realClick: false, click: true});
         },

         /**
          * Simulate a mouse moving on the screen and actually trigger a click (and a focus) on `of`
          *
          * Calls jQuery.fn.mousey() if it's available. Resolves the promise when click completes.
          *
          * If `props` is not a hash ($.isPlainObject() !== true) then it will become the `of` parameter
          * passed into mousey (i.e. the target of the mouse move) by using it as a jQuery selector (can be
          * a string, HTMLElement, or jQuery set).
          *
          * If there is more than one object in the set matched by `of`, the mouse moves to each in turn.
          *
          * COUPLING: This method is coupled to the scoped jQuery variable $mousey
          *
          * @param {Object} props delivered directly to mousey, the `complete` method is declared internally
          * @private
          */
         click: function(props) {
            return _mouse(props, {realClick: true, click: true});
         },

         /**
          * Activate the hover effect on an element. This uses the mouseenter if it is available and also adds
          * css tags defined in $.Tut.defaults.hover.styles. To remove the hover, use blur()
          *
          * @param {jQuery|HTMLElement|string} target a jQuery selector
          * @return {jQuery.Deferred|jQuery}
          */
         hover: function(target) {
            var $target = $(target), def = $.Deferred().resolve($target);
            if( $target.is(':Event(mouseenter)') ) {
               $target.trigger('mouseenter');
            }
            $target.addClass($.Tut.defaults.hover.styles);
            return def.promise();
         },

         /**
          * Activate the mouseleave() and blur() events on an object. If it has no blur event, then we will just
          * try setting focus to a temporary div element to make sure any active element is blurred.
          * This removes css tags defined in $.Tut.defaults.hover.styles, if they exist.
          *
          * @param {jQuery|HTMLElement|string} target a jQuery selector
          */
         blur: function(target) {
            var $target = $(target), def = $.Deferred().resolve($target);
            if( $target.is(':Event(mouseleave)') ) {
               $target.trigger('mouseleave');
            }
            if( $target.is(':Event(blur)') ) {
               $target.blur();
            }
            else {
               $('body').click().focus();
            }
            $target.removeClass($.Tut.defaults.hover.styles);
            return def.promise();
         },

         /**
          * Move the mouse to an input field, click on it, and then type in some text.
          *
          * The `props` object can contain any of the following optional values:
          * <ul>
          *    <li>mouse: {object} any properties to pass directly to mousey event, setting this to false disables mouse event</li>
          *    <li>type:  {object} any properties to pass directly to the jtype event, setting this to false disables jtype event</li>
          *    <li>blur:  {int|boolean} if a number (zero is okay) blur the input field after this many milliseconds</li>
          * </ul>
          *
          * @param sel
          * @param {string} text
          * @param {object} [props]
          * @return {*}
          */
         input: function(sel, text, props) {
            props = $.extend({}, props);
            var innerTut = $.Tut.start();
            if( !('mouse' in props) || props.mouse !== false  ) {
               innerTut
                  .click($.extend({of: sel}, props.mouse, {at: 'center center'}))
                  .mouse($.extend({of: sel, at: 'right top'}, props.mouse));
            }

            $(sel).select();

            if( !('type' in props) || props.type !== false  ) {
               innerTut.type(sel, text, props.type);
            }
            else {
               $(sel).val(text);
            }

            if( 'blur' in props && props.blur !== false ) {
               if( props.blur > 0 ) {
                  innerTut.wait(props.blur);
               }
               innerTut.blur(sel);
            }
            return innerTut.end();
         },

         /**
          * Show a bootstrap style popup menu and select an option (if selectOption is a number).
          *
          * If `selectOption` is present, the optional `props` has can contain any of:
          * <ul>
          *    <li>mouse: {object} any config properties to deliver to the mousey call ( e.g. {realClick: true} )</li>
          *    <li>pauseAfterOpen: {int} 0 = disabled, pauses after triggering menu open (give viewer time to read it before clicking on an option)</li>
          * </ul>
          *
          * @param {jQuery|string} sel
          * @param {int}          [selectOption] begins at 1
          * @param {object}       [opts]
          * @return {jQuery.Deferred}
          */
         menu: function(sel, selectOption, opts) {
            var $menu = $(sel).addClass('open'), def = $.Deferred();
            if( typeof(selectOption) === 'number' ) {
               opts = $.extend(true, {}, $.Tut.defaults.menu, opts);
               if( opts.pauseAfterOpen > 0 ) {
                  setTimeout(function() {
                     _activateMenu($menu, selectOption, def, opts.mouse);
                  }, opts.pauseAfterOpen);
               }
               else {
                  _activateMenu($menu, selectOption, def, opts.mouse);
               }
            }
            else {
               def.resolve($menu);
            }
            return def.promise();
         },

         /**
          * Close a bootstrap style popup menu
          * @param sel
          */
         menuClose: function(sel) {
           return $(sel).removeClass('open');
         },

         /**
          * Insert content into a panel (a container). Replaces any content already in the panel. To append content,
          * try show() instead.
          *
          * The `opts` argument should contain exactly one of the following. If more than one are encountered, then
          * the order of this list is the order of precedence:
          * <ul>
          *    <li>url:  {string} if a url is provided, content is loaded (as html) from that location using XHR request</li>
          *    <li>src:  {jQuery|HTMLElement|string} a jQuery selector, the element is cloned and duplicate is
          *                       inserted into panel using jQuery.fn.append()</li>
          *    <li>html: {string} if html is provided, it is inserted using jQuery.fn.html()</li>
          *    <li>text: {string} if text is provided, it is inserted using jQuery.fn.text()</li>
          * </ul>
          *
          * And `opts` must contain the following:
          * <ul>
          *    <li>target: {jQuery|HTMLElement|string} a jQuery selector, the panel we are inserting content into</li>
          * </ul>
          *
          * And `opts` may contain any of these optional modifiers:
          * <ul>
          *    <li>detach:  {boolean} if data is from `src`, true moves the element (useful for preserving ids, etc), false clones it and strips the ids (useful for repeated use)</li>
          *    <li>speed:   {int} the speed at which the information fades into view (defaults to 250)</li>
          *    <li>effect:  {string} effect used, fadeIn, show, or slideDown (defaults to fadeIn)</li>
          *    <li>timeout: {int} a timeout in milliseconds for `url` to return</li>
          *    <li>filter:  {function} if data is from `url`, this function filters the results data and returns a string or jQuery set</li>
          *    <li>store:   {*} a jQuery selector, if provided, the old content of panel is appended to the first item in this wrapped set instead of destroyed</li>
          * </ul>
          *
          * @param {object} opts see description above
          * @return {jQuery.Deferred}
          */
         panel: function(opts) {
            if( typeof(opts) === 'string' ) { opts = {target: opts, text: ''}; }
            opts = $.extend({}, $.Tut.defaults.panel, opts);
            var $o, $target = $(opts.target), def = $.Deferred(), ajaxOpts;

            function applyContent(content) {
               var $content = typeof(content) === 'string'? $('<p />').text(content) : content;
               if( opts.store ) {
                  $(opts.store).append($target.children());
               }
               $target.empty().append($content.hide());
               _show($content, opts.effect, opts.speed, function() {
                  def.resolve.apply(def, arguments);
               })
            }

            if( opts.url ) {
               ajaxOpts = $.extend({ url: opts.url, type: 'GET', dataType: 'html'},
                     (opts.timeout? {timeout: opts.timeout} : {}),
                     {
                        success: function(data, success, xhr) {
                           if( data.responseText ) { data = data.responseText; }
                           if( opts.filter ) { data = opts.filter(data); }
                           applyContent($(data));
                        },
                        error: function(xhr, status, e) {
                           def.reject(e);
                        },
                        type: 'GET'
                     }
               );
               $.ajax(ajaxOpts);
            }
            else if( opts.src ) {
               $o = $(opts.src);
               if( !opts.detach ) {
                  $o = $o.clone().removeAttr('id');
                  $o.find('[id]').removeAttr('id');
               }
               applyContent($o);
            }
            else if( opts.html ) {
               applyContent($(opts.html));
            }
            else {
               applyContent(opts.text);
            }

            // return the promise that will eventually resolve
            return def.promise();
         },



         /**
          * Display specified html component and possibly insert it into a parent element as necessary.
          *
          * OPTS: In addition to passing in the selector (or raw html string) to be shown, a second argument
          * can provide any of the following:
          * <ul>
          *    <li>speed:   {int=250} duration of the effect</li>
          *    <li>to:      {string|jQuery='body'} parent element (will be moved here if already in dom)</li>
          *    <li>effect:  {string='show'} one of fadeIn, show, slideDown</li>
          * </ul>
          *
          * If a `to` param is specified, the element will be moved into this element as necessary. Otherwise, if the item to
          * show already exists in the DOM, it will be left where it is. If there is no `to` parm and it does not exist in
          * the DOM, it will be inserted into 'body'
          *
          * SHORTCUTS: If `opts` is a number would represent the `speed` property. Any object other than a
          * hash ($.isPlainObject) would be used as the `to` property (expects HTMLElement or jQuery set)
          *
          * @param {string}            sel    jQuery selector or raw html string
          * @param {Object,int,string} [opts] hash of props (see description)
          * @return {jQuery.Deferred}
          * @private
          */
         show: function(sel, opts) {
            var $e = $(sel), hasParent = $e.parent().length > 0, def = $.Deferred();
            if( !$.isPlainObject(opts) ) {
               if( opts === null ) { opts = {}.undef; }
               switch(typeof(opts)) {
                  case 'number':    opts = {speed: opts}; break;
                  case 'undefined': opts = {};            break;
                  default:          opts = {to: opts};
               }
            }
            opts = $.extend({}, $.Tut.defaults.show, opts);
            if( !hasParent && !opts.to ) { opts.to = 'body'; }

            if( opts.to ) {
               $e.appendTo(opts.to);
            }

            _show($e, opts.effect, opts.speed, function() { def.resolve.apply(def, arguments) });

            // return the promise that will eventually resolve
            return def.promise();
         },

         /**
          * Remove the element from the dom.
          *
          * OPTS: In addition to passing in the selector (or raw html string) to be shown, a second argument
          * can provide any of the following:
          * <ul>
          *    <li>speed:   {int=250} duration of the effect</li>
          *    <li>effect:  {string='fadeOut'} one of fadeOut, slideUp, or hide</li>
          *    <li>destroy: {boolean=false} if true, element is removed from dom after hiding it</li>
          *    <li>to:      {string|jQuery} moves the element into this element after hiding it (not compatible with `destroy`)</li>
          * </ul>
          *
          * SHORTCUTS: If `opts` is a number would represent the `speed` property. If it is a string, it's used as
          * the `effect` property, and if it's a boolean, it's used as the `destroy` property.
          *
          * @param {string}             sel     jQuery selector or raw html string
          * @param {object|int|string}  [opts]  see description
          * @return {jQuery.Deferred}
          * @private
          */
         hide: function(sel, opts) {
            // parse all the fun optional arguments!
            var $e = $(sel), def = $.Deferred(), optsParsed = $.extend({}, $.Tut.defaults.hide), undef,
                fx = function() {
                   if( optsParsed.to ) {
                     $(this).appendTo($(optsParsed.to));
                   }
                   if( optsParsed.destroy ) { $(this).remove(); }
                   def.resolve.apply(def, arguments);
                };

            if( $.isPlainObject(opts) ) {
               optsParsed = opts;
            }
            else if( opts !== null && opts !== undef ) {
               switch(typeof(opts)) {
                  case 'number':
                     optsParsed.speed = ~~opts;
                     break;
                  case 'string':
                     optsParsed.effect = opts;
                     break;
                  case 'boolean':
                     optsParsed.destroy = !!opts;
                     break;
                  default:
                     throw new Error('invalid opts argument type (must be a hash, boolean, string, or number): '+typeof(opts));
               }
            }

            _hide($e, optsParsed.effect, optsParsed.speed, fx);

            // return the promise that will eventually resolve
            return def.promise();
         }

      }
   };

   /**********************************************************************
    * Utility Methods
    **********************************************************************/

   function createSequence(fxns) {
      return $.Sequence.start(fxns);
   }

   /**
    * Move the mouse, hover over links, and click something in an open menu. Must call run('menu', ...) before
    * this (since this will use the return value).
    *
    * @param {jQuery}   $menu        returned by run('menu', ...) which must be called before this method
    * @param {int}      index        which item in the list to mouse to and activate, starting from 0
    * @param {object}   [mouseyProps]
    */
   function _activateMenu($menu, index, def, mouseyProps) {
      var defOpts = $.extend({
               click: false,
               hover: false,
               at: 'center top',
               duration: 350,
               mouseImage: $.fn.mousey.defaults.hoverImage
          }, mouseyProps, {hide: false}), // don't hide on each step, only at the end
          $items  = $menu.find('.dropdown-menu a');
      mouseyProps = mouseyProps || {};

      function _doNext(i) {
         var opts = $.extend({}, defOpts, {of: $items.get(i)});
         _mouse(opts).then(function() {
            $items.parent().removeClass('active');
            $items.eq(i).parent().addClass('active');
            if( ++i <= index ) {
               _doNext(i);
            }
            else {
               _doFinal();
            }
         });
      }

      function _doFinal() {
         var opts = $.extend({}, defOpts, {of: $items.get(index)}, {
            click: true,
            at: 'center center'
         });
         opts.duration = Math.floor(opts.duration/2);
         if( 'hide' in mouseyProps ) { opts.hide = mouseyProps.hide; }
         _mouse(opts).then(function() {
            $menu.removeClass('open').find('.active').removeClass('active');
            def.resolve();
         })
      }

      _doNext(0);

      return def.promise();
   }

   function _extendFxn(fxNew, a, b, c) {
      var args = $.makeArray(arguments);
      fxNew = args.shift();
      return function() {
         var i = args.length;
         fxNew.apply(this, arguments);
         while(i--) {
            typeof(args[i]) === 'function' && args[i].apply(this, arguments);
         }
      }
   }

   function _type($e, txt, opts) {
      if( 'jtype' in jQuery.fn ) {
         $e.jtype(txt, opts);
      }
      else {
         $e.html( $e.html()+txt );
         opts.complete('jtype disabled (did you include jquery.jtype.js?)');
      }
   }

   function _mouse(opts, add) {
      var def = $.Deferred();
      opts = _mouseProps(opts, add, def);
      if( $mousey ) {
         $mousey.mousey(opts);
      }
      else {
         setTimeout(function() {
            if( opts.realClick ) {
               $(opts.of).click().focus();
            }
            opts.complete('mousey disabled (did you include jquery.mousey.js?)');
         }, opts.duration);
      }
      return def.promise();
   }

   function _mouseProps(props, add, def) {
      add || (add = {});
      if( !$.isPlainObject(props) ) { props = props? {of: props} : {}; }
      add.complete = _extendFxn(function() { def.resolve.apply(def, arguments); }, props.complete, add.complete);
      return $.extend({}, $.Tut.defaults.mouse, props, add);
   }

   function _css(opts) {
      return {
         position: 'absolute',
         float: 'left',
         maxWidth: opts.maxWidth,
         padding: opts.padding
      };
   }

   function _show($e, effectName, speed, cb) {
      if( speed === 0 ) { effectName = ''; }
      // launch our effect and establish callback
      switch(effectName) {
         case 'fadeIn':
         case 'slideDown':
         case 'show':
            $e[effectName].call($e, speed, cb);
            break;
         default:
            if( speed ) {
               $e.fadeIn(speed, cb);
            }
            else {
               $e.show();
               cb.call($e);
            }
      }
   }

   function _hide($e, effectName, speed, cb) {
      if( speed === 0 ) { effectName = ''; }
      // launch our effect and establish callback
      switch(effectName) {
         case 'fadeOut':
         case 'slideUp':
         case 'hide':
            $e[effectName].call($e, speed, cb);
            break;
         default:
            if( speed ) {
               $e.fadeOut(speed, cb);
            }
            else {
               $e.hide();
               cb.call($e);
            }
      }
   }

   function _makeBubble(opts) {
      return $('<div class="Ws-Tut-hint">'+opts.text+'</div>').css(_css(opts)).hide().appendTo('body');
   }

})(window.jQuery);
