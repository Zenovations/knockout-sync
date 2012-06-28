/************************************************
 * Position: Deal with element relative positions
 *
 * REQUIRES: $.ws.UnitConverter (ws.js && jquery.ws.utils.js)
 ************************************************/

(function($) {
   /**
    * Given an element, determine its position in the document, or position it would occupy give an of/at set
    * relative to a target.
    *
    * This takes into account the window and document objects, which require special handling since
    * height/width/offset methods do not always work as intuited.
    *
    * Hidden elements may not work correctly with this utility as jQuery offset/height/width methods do not like
    * hidden elements.
    *
    * @param {*} sel any valid jquery selector (jQuery, string, or HTMLElement)
    * @param  {Position.Layout} [layout] (defaults to 'BorderLayout')
    * @constructor
    */
   function Position(sel, layout) {
      /** @type {Position.Base} */
      this.base = new Position.Base($(sel));
      this.layout = _getLayout(layout);
   }
   $.ws.Position = Position;

   /**
    * Position this element relative to another. It is positioned based on the `at` string. The layout determines
    * what all of that actually means.
    *
    * The `at` parameter contains two or three components, the "side" and the "alignment" parameters, and the
    * optional "inner" parameter. The valid values are:
    * 'top|left|right|bottom left|center|right|top|bottom[ inner]'
    *
    * The special "inner" operator tells some layouts to reverse the positioning. For instance, BorderLayout will
    * position the element inside of the target when 'inner' is true and outside the element when 'inner' is false.
    * (see BorderLayout for more details and examples)
    *
    * Additionally, it is possible to offset the box by any amount, by adding +/- followed by an integer. For
    * example, 'left+25 top' will shift the element 25 pixels right, and 'top center-10' will shift the element
    * 10 pixels left of center
    *
    * @param {string}  at  the 'horiz vert' string telling us how to position; see description
    * @param {jQuery,string,HTMLElement}  of  any jquery selector representing the object we'll position relative to
    * @return {Object} containing left/top coords suitable for use with jQuery.fn.offset()
    */
   Position.prototype.relativeTo = function(at, of) { return this.layout.relativePosition(this.base, new Position.Base($(of)), atSplit(at)); };

   /**
    * @see Position.Base
    * @return {Position.Base}
    */
   Position.prototype.base = function() { return this.base; };

   /**
    * Center the current element on top of `target`
    * @param {jQuery,string,HTMLElement} target
    * @return {object} top/left coords suitable for use with jQuery.fn.offset
    */
   Position.prototype.center = function(target) { return this.layout.center(this.base, new Position.Base($(target))); };

   /**
    * A static version of Position.prototype.relativeTo()
    *
    * @param  {*}         elm      represents the object we want to move (any jquery selector)
    * @param  {*}         target   represents the object `elm` will be positioned relative to (any jquery selector)
    * @param  {string}    at       the 'horiz vert' string telling us how to position: 'top|left|right|bottom left|center|right|top|bottom[ inner]'
    * @param  {Position.Layout|string} layout (defaults to 'BorderLayout')
    * @return {object} containing top/left coords suitable for use with jQuery.fn.offset()
    * @see Position.prototype.relativeTo
    * @static
    */
   Position.relativeTo = function(elm, target, at, layout) {
      return _getLayout(layout).relativePosition(new Position.Base($(elm)), new Position.Base($(target)), atSplit(at));
   };

   /**
    * A static version of Position.prototype.center
    *
    * @param {jQuery,string,HTMLElement} elm
    * @param {jQuery,string,HTMLElement} target
    * @param  {Position.Layout|string} layout (defaults to 'BorderLayout')
    * @return {object} top/left coords suitable for use with jQuery.fn.offset
    * @see Position.prototype.center
    * @static
    */
   Position.center = function(elm, target, layout) { return _getLayout(layout).center(new Position.Base($(elm)), new Position.Base($(target))); };

   /**
    * A simple config object describing the position and dimensions of an element. Takes into account window and
    * document objects, which require careful handling when using offset/height/width methods.
    *
    * The complete list of attributes in Base:
    * <ul>
    *    <li>{int}     top:     the y coord of the element relative to document</li>
    *    <li>{int}     left:    the x coord of the element relative to document</li>
    *    <li>{int}     height:  height of the element, including padding and border</li>
    *    <li>{int}     width:   width of the element, including padding and border</li>
    *    <li>{object}  inner:   box size without border, in arrangement height, width</li>
    *    <li>{object}  border:  border widths in arrangement top, right, bottom, left</li>
    *    <li>{object}  padding: padding widths in arrangement top, right, bottom, left</li>
    *    <li>{object}  margin:  margin widths in arrangement top, right, bottom, left</li>
    *    <li>{object}  radius:  border radius (rounding of corners) in the arrangement topLeft, topRight, bottomLeft, bottomRight</li>
    * </ul>
    *
    * @param {jQuery} $e
    * @constructor
    */
   Position.Base = function($e) {
      this.box     = _box($e);
      this.border  = _borders($e);
      this.inner   = _inner($e, this.box, this.border);
      this.radius  = _radii($e);
      this.padding = _padding($e);
      this.margin  = _margins($e);
   };

   /********************************
    * Layouts
    ********************************/

   /**
    * @param {function} relative  (see Position.Layout.prototype.relativePosition)
    * @param {function} center    (see Position.Layout.prototype.center)
    * @param {function} pointer   (see Position.Layout.prototype.pointer)
    * @constructor
    */
   Position.Layout = function(relative, center, pointer) {
      $.extend(this, {
         relativePosition: relative,
         center: center,
         pointer: pointer
      });
   };

   // we don't need these prototype declarations (below) but they help the IDE and doc generators

   /**
    * Get the top/left coords where element should be positioned, based on `target` and `at`
    * @param  {Position.Base}  base    the element to position
    * @param  {Position.Base}  target  the element we position relative to
    * @param  {object}         at      see _atSplit()
    * @return {Object} containing {int}left/top coords to use with offset()
    */
   Position.Layout.prototype.relativePosition = function(base, target, at) { throw new Error('relativePosition must be declared'); };

   /**
    * Positions `base` relative to the center of `target`
    * @param {Position.Base} base
    * @param {Position.Base} target
    * @return {Object} hash containing {int} left/top attributes
    */
   Position.Layout.prototype.center = function(base, target) { throw new Error('center must be declared'); };

   Position.layouts = {
      /**
       * This positions element relative to the border of the object. Normally, it's placed just outside the border,
       * but if 'inner' is appended to the `at` parameter, then it is positioned just inside of the border.
       *
       * Examples:
       * <code>
       *             top/left   top/center  top/right
       *                ■          ■          ■
       *                ------------------------
       *   left/top  ■ |                      | ■  right/top
       *                |                      |
       *                |   center/center      |
       * left/center ■ |          ■           | ■  right/center
       *                |                      |
       *                |                      |
       * left/bottom ■ |                      | ■  right/bottom
       *                ------------------------
       *                ■          ■          ■
       *          bottom/left bottom/center bottom/right
       * </code>
       *
       * With 'inner':
       * <code>
       *             top/left   top/center  top/right
       *                ------------------------
       *      left/top  |■         ■         ■| right/top
       *                |                      |
       *                |     center/center    |
       *    left/center |■         ■         ■| right/center
       *                |                      |
       *                |                      |
       *    left/bottom |■         ■         ■| right/bottom
       *                ------------------------
       *          bottom/left bottom/center bottom/right
       * </code>
       *
       * It might seem that with 'inner', that top/left and left/top would be exactly the same. Regarding box position,
       * this would be true. However, for use with wsbubble, the position of the pointer is flipped based on
       * which parameter is first
       *
       * Note that there is no pointer used with center/center
       */
      BorderLayout: new Position.Layout(
            function relativePosition(base, target, at) {
               return _off(base, target, at);
            },

            function center(base, target) {
               return this.relativePosition(base, target, atSplit('center center'));
            }
      )
   };

   /********************************
    * Utilities
    ********************************/

   /**
    * Fetches offset for `base` relative to `target` based on `at` position
    * @param {Position.Base} base
    * @param {Position.Base} target
    * @param {object} at (see _atSplit())
    * @return {Object} containing left/top attributes suitable for use with jQuery.fn.offset()
    * @private
    */
   function _off(base, target, at) {
      var out = {left: 0, top: 0}, box = target.box, h = base.box.height, w = base.box.width;
      switch(at.side) {
         case 'top':
            out.top = box.top + (at.inner? 0 : -h) + at.sideOffset;
            out.left = _sidePos(base, target, at);
            break;
         case 'bottom':
            out.top = box.bottom + (at.inner? -h : 0) + at.sideOffset;
            out.left = _sidePos(base, target, at);
            break;
         case 'left':
            out.left = box.left + (at.inner? 0 : -w) + at.sideOffset;
            out.top = _sidePos(base, target, at);
            break;
         case 'right':
            out.left = box.right + (at.inner? -w : 0) + at.sideOffset;
            out.top = _sidePos(base, target, at);
            break;
         case 'center':
            // COUPLING: we depend on _atSplit() to make sure that at.side is never 'center' unless at.pos is
            // also 'center', because it simplifies these already complex switch statements
            out.left = box.xcenter - w/2 + at.sideOffset;
            out.top  = box.ycenter - h/2 + at.posOffset;
            break;
         default:
         // do nothing (position it at 0,0 so the error is obvious)
      }
      return out;
   }

   /**
    * Grabs the appropriate number for at.pos relative to at.side
    * @param {Position.Base} base
    * @param {Position.Base} target
    * @param {object} at (see _atSplit())
    * @return {int}
    * @private
    */
   function _sidePos(base, target, at) {
      var box = target.box, h = base.box.height, w = base.box.width;
      switch(at.side) {
         case 'top':
         case 'bottom':
            switch(at.pos) {
               case 'left':
                  return box.left + at.posOffset;
               case 'right':
                  return box.right - w + at.posOffset;
               case 'center':
                  return box.xcenter - w/2 + at.posOffset;
               default:
                  return 0; // do nothing, show it in wrong place
            }
         case 'left':
         case 'right':
            switch(at.pos) {
               case 'top':
                  return box.top + at.posOffset;
               case 'bottom':
                  return box.bottom - h + at.posOffset;
               case 'center':
                  return box.ycenter - h/2 + at.posOffset;
               default:
                  return 0; // do nothing, show it in the wrong place
            }
         // COUPLING: we depend on _atSplit() to make sure that at.side is never 'center' unless at.pos is
         // also 'center', because it simplifies these already complex switch statements
         default:
            return 0; // do nothing, let it show up in the wrong place
      }
   }

   /**
    * Get width of `$e`, taking care with document and window objects (which don't have all height/width methods available)
    * @param {jQuery}  $e
    * @param {boolean} [inner] true = plus padding but not borders, false = plus padding and borders
    * @return {int}
    * @private
    */
   function _width($e, inner) {
      return isWinOrDoc($e)? $e.width() : (inner? $e.innerWidth() : $e.outerWidth());
   }

   /**
    * Get height of `$e`, taking care with document and window objects (which don't have all height/width methods available)
    * @param {jQuery} $e
    * @param {boolean} [inner] true = plus padding but not borders, false = plus padding and borders
    * @return {int}
    * @private
    */
   function _height($e, inner) {
      return isWinOrDoc($e)? $e.height() : (inner? $e.innerHeight() : $e.outerHeight());
   }

   /**
    * @param {object} atString
    * @return {object} contains {string|int}side/pos/inner keys
    * @private
    */
   function atSplit(atString) {
      var at = (atString+'').replace('middle', 'center').split(' '), axis, inner;
      // simplify by ensuring that any case but center/center always puts the center attribute in the pos slot
      if( at[0].match('center') && !at[1].match('center') ) {
         // don't forget the possible inner param in slot 3 ;)
         at = at.slice(0,2).reverse().concat(at.slice(2));
      }
      axis = (at[0] in {top: 1, bottom: 1})? 'vertical' : 'horizontal';
      inner = ( at.length === 3 && at[2] === 'inner' );
      return _offsets({side: at[0], pos: at[1], inner: inner, axis: axis, sideOffset: 0, posOffset: 0});
   }
   Position.atSplit = atSplit; // provide access but prevent modifying the function (a weak final pattern)

   /**
    * SIDE EFFECT: modifies `at`
    * @param at
    * @return {object} at
    * @private
    */
   function _offsets(at) {
      var parts, m;
      m = at.side.match(/([+-])/);
      if( m ) {
         parts = at.side.split(/[+-]/);
         at.side = parts[0];
         at.sideOffset = m[1] === '+'? ~~parts[1] : -(~~parts[1]);
      }
      m = at.pos.match(/([+-])/);
      if( m ) {
         parts = at.pos.split(/[+-]/);
         at.pos = parts[0];
         at.posOffset = m[1] === '+'? ~~parts[1] : -(~~parts[1]);
      }
      return at;
   }

   /**
    * Determine the border widths of the element and return them in the arrangement top/right/bottom/left
    * @param {jQuery} $e
    * @return {Object}
    * @private
    */
   function _borders($e) {
      if( $e.css('border-style') === 'none' ) {
         // this is necessary for IE, who returns 'medium' when the border is turned off
         // rather than 0px (hello IE! are you even trying??)
         return { top: 0, right: 0, bottom: 0, left: 0 };
      }
      return {
         top:    $.ws.UnitConverter.px($e, $e.css('border-top-width')),
         right:  $.ws.UnitConverter.px($e, $e.css('border-right-width')),
         bottom: $.ws.UnitConverter.px($e, $e.css('border-bottom-width')),
         left:   $.ws.UnitConverter.px($e, $e.css('border-left-width'))
      }
   }

   /**
    * Determine the border radii(edge rounding) of the element and return in the arrangement topLeft, topRight, bottomLeft, bottomRight
    * @param {jQuery} $e
    * @return {Object}
    * @private
    */
   function _radii($e) {
      if( $e.css('border-style') === 'none' ) {
         // this is necessary for IE, who returns 'medium' when the border is turned off
         // rather than 0px (hello IE! are you even trying??)
         return { topRight: 0, bottomRight: 0, bottomLeft: 0, topLeft: 0 };
      }
      return {
         topRight:    $.ws.UnitConverter.px($e, $e.css('border-top-right-radius')),
         bottomRight: $.ws.UnitConverter.px($e, $e.css('border-bottom-right-radius')),
         bottomLeft:  $.ws.UnitConverter.px($e, $e.css('border-bottom-left-radius')),
         topLeft:     $.ws.UnitConverter.px($e, $e.css('border-top-left-radius'))
      }
   }

   function _margins($e) {
      return {
         top:    _mg($e, 'top'),
         right:  _mg($e, 'right'),
         bottom: _mg($e, 'bottom'),
         left:   _mg($e, 'left')
      }
   }

   function _mg($e, side) {
      var css = $e.css('margin-'+side);
      if( css === 'auto' ) { css = 0; }
      return $.ws.UnitConverter.px($e, css);
   }

   function _padding($e) {
      return {
         top:    $.ws.UnitConverter.px($e, $e.css('padding-top')),
         right:  $.ws.UnitConverter.px($e, $e.css('padding-right')),
         bottom: $.ws.UnitConverter.px($e, $e.css('padding-bottom')),
         left:   $.ws.UnitConverter.px($e, $e.css('padding-left'))
      }
   }

   function _box($e) {
      var off,
          e   = $e.get(0),
          box = {top: 0, right: 0, bottom: 0, left: 0, width: _width($e), height: _height($e), xcenter: 0, ycenter: 0};
      if( e === document ) {
         box.top = 0;
         box.left = 0;
      }
      if( e === window ) {
         box.left = $e.scrollLeft();
         box.top = $e.scrollTop();
      }
      else {
         off = $e.offset();
         box.left = off.left;
         box.top = off.top;
      }

      box.right   = box.left + box.width;
      box.bottom  = box.top  + box.height;
      box.xcenter = box.left + (box.width/2);
      box.ycenter = box.top  + (box.height/2);

      return box;
   }

   function _inner($e, box, borders) {
      var out = {top: box.top + borders.top, right: 0, bottom: 0, left: box.left + borders.left, height: _height($e, true), width:  _width($e, true)};
      out.right   = out.left + out.width;
      out.bottom  = out.top  + out.height;
      out.xcenter = out.left + out.width/2;
      out.ycenter = out.top  + out.height/2;
      return out;
   }

   /**
    * Determine how much to offset position to account for edge border and possible rounding
    * @param {Position.Base}  base
    * @param {object}         at           see _atSplit()
    * @param {string}         orientation  left/top
    */
   function _borderOffset(base, at, orientation) {
      //todo do we want to account for this? probably...
      var border = base.border[orientation], rad = 0, altOrientation;

      // determine the orientation for the radius
      switch(orientation) {
         case 'left': // fall through
         case 'right':
            altOrientation = at.vert;
            break;
         case 'top': // fall through
         case 'bottom':
            altOrientation = at.horiz;
            break;
         default:
            throw new Error('Invalid orientation: '+orientation);
      }

      // fetch the radius
      if( altOrientation.match(/(left|right|top|bottom)/) ) {
         rad = base.radius[ orientation + $.ws.string.ucFirst(altOrientation) ];
      }

      // the radius starts from the border edge (not from zero) so you have to subtract the border before adding radius
      // but it's perfectly possible the border is thicker than the radius. It's also possible to assign a negative value
      // to a border, although for our uses, that would simply throw things off.
      return Math.max(0, 0-border+rad, border);
   }

   /**
    * True if $e is the `window` or `document` global variable
    * @param {jQuery} $e
    * @return {Boolean}
    */
   function isWinOrDoc($e) {
      var e = $e.get(0);
      return e === window || e === document;
   }

   /**
    * @param {Position.Layout,string} type
    * @return {Position.Layout}
    * @private
    */
   function _getLayout(type) {
      type = type || 'BorderLayout';
      if( typeof(type) === 'string' ) {
         return Position.layouts[type];
      }
      return type;
   }

})(jQuery);