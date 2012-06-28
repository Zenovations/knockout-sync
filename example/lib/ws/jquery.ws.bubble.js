/**
 * REQUIRES:
 *    jquery >= 1.7
 *    libs/ws/ws.js
 *    libs/ws/jquery.ws.utils.js
 *    libs/ws/jquery.ws.pos.js
 */
jQuery(function($) {

   //todo could we replace some of this logic with the new jQuery.ws.Position utility?

   $.fn.extend({
      /**
       * Creates border-radius, drop shadow, borders, and speech bubble pointers on an element. If element already
       * has any of these properties, they are overridden. In the case that a property is set to false, it is left
       * as-is.
       *
       * Does not support:
       *    border-radius ovals (i.e. border-radius: 20px 5px;)
       *
       * @param {object} [props]
       */
      wsbubble: function(props) {
         if( props ) {
            if( _has(props, 'defaultOff', 'boolean') ) {
               props = $.extend({background: false, shadow: false, radius: false, pointer: false, border: false}, props);
            }

            // defaults can be assigned by putting key: true in the props (useful with defaultOff)
            // here we just delete them so they are replaced by default values
            $.each(['background', 'radius', 'border', 'shadow', 'pointer'], function(i,v) {
               if( _has(props, v, 'boolean') ) { delete props[v]; } // this only matches true boolean (not any boolean)
            });

            // some properties can be replaced by shorthand versions, take care of those now
            if( _has(props, 'shadow',  'number') ) { props.shadow = {width: props.shadow}; }
            if( _has(props, 'border',  'number') ) { props.border = {width: props.border}; }
            if( _has(props, 'pointer', 'number') ) { props.pointer = {width: props.pointer}; }
            else if( _has(props, 'pointer', 'string') ) { props.pointer = {at: props.pointer}; }

         }

         // apply the defaults
         props = $.extend(true, {}, $.fn.wsbubble.defaults, props);

         // set the 'auto' property for pointer
         if(  _has(props, 'pointer') && props.pointer.at == 'auto' ) {
            if( _has(props, 'of') ) {
               var at = (props.at||'center center').replace('middle', 'center');
               if( at.match(/center([+-]\D+)? center([+-]\D+)?/) ) {
                  // when we use center/center, the 'auto' behavior is to hide the pointer
                  props.pointer = false;
               }
               else {
                  // otherwise, we make the pointer point at the element we are referencing
                  props.pointer.at = _pointerAt(props.at);
               }
            }
            else {
               // just use a reasonable default, since there isn't a way to decide
               props.pointer.at = 'left center';
            }
         }

         createBubble(this, props);
         return this;
      }
   });

   $.fn.wsbubble.defaults = {
      at: 'right center',  // if `of` is provided, this positions bubble relative to `of` (see ws.pos for options)
      of: null,            // if we want to position the bubble somewhere, this is the "somewhere"
      background: 'white', // false = off, or a pure css string
      radius: 5,           // false = off, number = radii, or pure css string
      border: {            // false = off, number = width, or pure css string to override
         width: 1,         // use a string to specify top/right/bottom/left values
         type: 'solid',
         color: 'gray'
      },
      shadow: {            // false = off, number = width, or pure css string to override
         width: 5,         // use a string to specify h-shadow/v-shadow/blur/spread values
         color: '#ccc',
         inset: false
      },
      pointer: {            // false = off, number = width/height
         at: 'auto',        // 'top/left/right/bottom left/center/right/top/bottom'
         width: 12,         // size of the pointer
         shape: 'default',  // currently only supports 'default'
         offset: 10         // from corner, if border-radius is set, from rounded edge
      }
   };

   var Position = $.ws.Position;


   function createBubble($e, props) {
      var css = {}, tempShow, hidden = $e.is(':hidden'),
          hasPosition = _has(props, 'of') && _has(props, 'at', 'string'),
          hasPointer = _has(props, 'pointer');
      if( _has(props, 'shadow') )     { shadow(css, props.shadow); }
      if( _has(props, 'border') )     { border(css, props.border); }
      if( _has(props, 'background') ) { background(css, props.background); }
      if( _has(props, 'radius') )     { round(css, props.radius); }
      // if we're going to position it, prepare the css properties
      hasPosition && posCss(css, props.of, props.at);
      if( hidden && (hasPosition || hasPointer) ) {
         // before we can position an element or a pointer, they must be visible since offsets/etc don't work
         // on hidden elements
         $e.show();
         tempShow = true;
      }
      //must apply css before adding pointer; it needs all props set
      if( !$.isEmptyObject(css) ) { $e.css(css); }
      if( hasPointer ) { pointer($e, props.pointer); }
      if( hasPosition ) { position($e, props); }
      // remove our temporary visibility
      if( tempShow ) { $e.hide(); }
   }

   function posCss(css, of, at) {
      $.extend(css, {
         position: 'absolute'
      });
   }

   function shadow(css, props) {
      if( typeof(props) === 'string' ) { css.boxShadow = props; }
      else {
         var w = typeof(props.width)==='string'? props.width : props.width+'px';
         css.boxShadow = w+' '+props.color+(props.inset? ' inset' : '');
      }
   }

   function background(css, props) { css.background = props; }

   function border(css, props) {
      if( typeof(props) === 'string' ) { css.border = props; }
      else {
         var w = typeof(props.width)==='string'? props.width : props.width+'px';
         css.border = w+' '+props.type+' '+props.color;
      }
   }

   function round(css, style) {
      css.borderRadius = (typeof(style) === 'number')? style+'px' : style;
   }

   function pointer($e, props) {
      var at = props.at.split(' '), borders = getBorderWidths($e);
      Shape.get(props.shape, {
         side:   at[0],
         pos:    at[1]=='middle'? 'center' : at[1],
         showBorder: borders[at[0]] > 0,
         parent:  {
            bgColor: $e.css('background-color'),
            borders: borders,
            colors:  getBorderColors($e),
            radii:   getBorderRadii($e),
            height:  $e.innerHeight(),
            width:   $e.innerWidth()
         },
         size:   props.width,
         offset: at[1].match(/^(middle|center)$/)? 0 : props.offset
      }).render($e);
   }

   function getBorderWidths($e) {
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

   function getBorderColors($e) {
      return {
         top:    $e.css('border-top-color'),
         right:  $e.css('border-right-color'),
         bottom: $e.css('border-bottom-color'),
         left:   $e.css('border-left-color')
      }
   }

   function getBorderRadii($e) {
      if( $e.css('border-style') === 'none' ) {
         // this is necessary for IE, who returns 'medium' when the border is turned off
         // rather than 0px (hello IE! are you even trying??)
         return { 'top-left': 0, 'top-right': 0, 'bottom-left': 0, 'bottom-right': 0 };
      }
      return {
         'top-left':     $.ws.UnitConverter.px($e, $e.css('border-top-left-radius')),
         'top-right':    $.ws.UnitConverter.px($e, $e.css('border-top-right-radius')),
         'bottom-left':  $.ws.UnitConverter.px($e, $e.css('border-bottom-left-radius')),
         'bottom-right': $.ws.UnitConverter.px($e, $e.css('border-bottom-right-radius'))
      }
   }

   function position($e, props) {
      var off = Position.relativeTo($e, props.of, props.at), at = Position.atSplit(props.at), pAt, w;
      if( props.pointer ) { // pointer exists
         pAt = Position.atSplit(props.pointer.at);

         // What this does is figure out if the pointer is oriented in such a way that it affects the element's position
         // by first seeing if they are both oriented on the same horiz/vert axis, then seeing if we are on the inside
         // or outside of the element
         //
         // In the case that we are outside the element, then pointer must be opposite in direction (e.g. right vs left)
         // of the element in order to be between it and the target, if we are inside, it must be in the same direction
         //
         // If this isn't true, there is no need to adjust the offset because the pointer isn't going to overlap anything
         if( pAt.axis === at.axis && ((!at.inner && pAt.side !== at.side) || (at.inner && pAt.side === at.side)) ) {
            // we just invert the width for inner, so that all the conditions of the switch are inverted :)
            w = at.inner? -props.pointer.width : props.pointer.width;
            switch(at.side) {
               case 'top':    off.top  -= w; break;
               case 'bottom': off.top  += w; break;
               case 'left':   off.left -= w; break;
               case 'right':  off.left += w; break;
               default: // all options exhausted
            }
         }
      }
      $e.offset(off);
   }

   var Shape;
   (function() {
      Shape = Class.extend({
         /**
          * Constructor
          *
          * Props:
          *    {string} side (top/bottom/left/right)
          *    {string} pos (top/bottom/left/right/center)
          *    {boolean} showBorder (true if a border should be included)
          *    {object} parent
          *         {string} bgColor
          *         {object} borders (top/bottom/left/right - integers)
          *         {object} colors (top/bottom/left/right - strings)
          *         {int}    height
          *         {int}    width
          *    {size} how big is the shape
          *    {offset} how far is it from `pos` (the edge); may not be less than border-radius (adjusted automagically)
          *
          * @param props
          */
         init: function(props) {
            this.props = props;
         },

         render: function($target) {
            if( this.props.showBorder ) {
               this.border().appendTo($target);
            }
            this.bg().appendTo($target);
         },

         border: function() {
            return $('<div class="ws-bubble-pointer-edge" />').css(this.borderCss());
         },

         bg: function() {
            return $('<div class="ws-bubble-pointer-bg" />').css(this.bgCss());
         },

         borderCss: function() { throw new Error('Implementing class must declare borderCss method'); },
         bgCss:     function() { throw new Error('Implementing class must declare bgCss method'); }
      });

      Shape.get = function(shape, props) {
         switch(shape) {
            case 'default': //todo use right triangles for corners as default
            case 'arrow':
               return new DefaultShape(props);
            default:
               throw new Error('Invalid shape '+shape);
         }
      };

      var DefaultShape;
      (function() {
         DefaultShape = Shape.extend({
            init: function(props) {
               this._super(props);
               _loadParts(this);
            },

            borderCss: function() { return this.borderCssObject; },
            bgCss: function() { return this.bgCssObject; }
         });

         function _loadParts(shape) {
            var parts = _build(shape);
            shape.bgCssObject = makeCssFromParts(parts);
            shape.borderCssObject = makeCssFromParts(_makeEdge(shape, parts));
         }

         function makeCssFromParts(parts) {
            var part, key, val,
                css = _initCss(parts);
            _sides(function(i, v) {
               part = _get(parts, v);
               if( part !== false ) {
                  for(key in part) {
                     val = part[key];
                     if( val && typeof(val) === 'number' || (typeof(val) === 'string' && !val.match(/\D/)) ) {
                        val = _px(val);
                     }
                     //if( key === 'width' ) { v = _px(v); }
                     css[_accProp('border', v, key)] = val;
                  }
               }
            });
            return css;
         }

         function _initCss(parts) {
            var pos = parts.pos,
                css = {
                   borderWidth: _px(parts.width),
                   borderStyle: 'outset', //fixes firefox, which creates tiny gray borders if this is 'solid'
                   borderColor: 'transparent'
                };
            // position the pointer bg/edge
            _sides(function(i,v) {
               if( _has(pos,v) ) { css[v] = _px(pos[v]); }
            });
            return css;
         }

         function _makeEdge(shape, parts) {
            if( !shape.props.showBorder ) { return {}; }
            var edge   = $.extend(true, {}, parts),
                pp     = shape.props,
                side   = pp.side,
                color  = pp.parent.colors[side],
                border = pp.parent.borders[side];

            // change the color of our edge element to the parent's border color
            _sides(function(i,v) {
               if( _has(edge, v+'.color') ) { edge[v].color = color; }
            });

            // offset our edge element to parent's border width;
            // since we're always working with negatives (i.e. outward from box) we
            // always subtract no matter what side/pos
            edge.pos[side] = edge.pos[side]-border;

            return edge;
         }

         function _build(shape) {
            var pp = shape.props, side = pp.side, pos = pp.pos, parent = pp.parent,
                length   = _vert(side)? parent.height : parent.width,
                base     = _base(parent, side),
                limit    = _limit(parent, side),
                trWidth  = Math.min(limit-base, pp.size*2),
                width    = trWidth/2,
                where    = _offset(pos, base ,limit, pp.offset, length, trWidth),
                parts    = {top: false, left: false, right: false, bottom: false, width: width, pos: {}};

            // the base is zero for bg shape, since we're always working outward from the box
            // this number is always negative regardless of side/pos
            parts.pos[side]  = -width;

            // offset it from the pos specified or if center, from the up/left most spot
            parts.pos[_nextTo(side, _end(pos))] = where;

            // set the border widths and colors
            parts[side] = {width: 0};
            parts[_opp(side)] = {color: parent.bgColor, style: 'solid'};
            return parts;
         }

         function _base(parent, side) {
            var pos = _nextTo(side), border = parent.borders[pos], rad = parent.radii[_orientate(side,pos)];
            //border-radius starts at the beginning of the adjacent border (not at zero)
            return 0 - border + rad;
         }

         function _limit(parent, side) {
            var opp = _nextTo(side,true), border = parent.borders[opp], rad = parent.radii[_orientate(side,opp)],
                size = _vert(side)? parent.height : parent.width;
            //border-radius starts at the end of the opposite border (not at zero)
            return size + border - rad;
         }

         function _offset(pos, base, limit, offset, parentSize, pointerSize) {
            var res, max = limit-base;
            // if pointer doesn't fit in the available space, fudge it (i.e. squeeze)
            // but with luck, the size should be adjusted before calling this
            //todo-bug this isn't working in IE for 'squeeze' (see test/ws.bubble/test.html for an example)
            //todo-bug it looks like once the pointer is resized to fit, it doesn't reset the base/offset data
            if( max < pointerSize ) { res = base - Math.ceil((max-pointerSize)/2); }
            else {
               switch(pos) {
                  case 'center':
                     res = parentSize/2-pointerSize/2+offset;
                     break;
                  case 'left':
                  case 'top':
                     res = offset;
                     break;
                  case 'bottom':
                  case 'right':
                     res = offset;
                     break;
                  default:
                     throw new Error('Invalid orientation: '+pos);
               }
            }
            if( _end(pos) ) {
               // check min/max relative to right edge
               if( parentSize - res > limit ) { res = parentSize-limit; }
               if( parentSize - res - pointerSize < base ) { res = base+pointerSize; }
            }
            else {
               // check min/max relative to left edge
               if( res + pointerSize > limit ) { res = limit - pointerSize; }
               if( res < base  ) { res = base; }
            }
            return res;
         }

//         function _primaryEdge(pos, offset, facing, adjacent) {
//            if( pos === 'center' ) { return facing; }
//            // return the adjacent or facing width, whichever is smaller
//            // however, if the
//            return Math.min(Math.max(0,adjacent+offset),facing);
//         }

         /**
          * @param {string} side
          * @param {boolean} [end]
          */
         function _nextTo(side, end) {
            if( _vert(side) ) {
               return end? 'bottom' : 'top';
            }
            else {
               return end? 'right' : 'left';
            }
         }

         function _opp(side) {
            switch(side) {
               case 'left':   return 'right';
               case 'right':  return 'left';
               case 'top':    return 'bottom';
               case 'bottom': return 'top';
               default:       throw new Error('Invalid orientation: '+side);
            }
         }

         function _vert(side) {
            switch(side) {
               case 'left':
               case 'right':
                  return true;
               case 'top':
               case 'bottom':
                  return false;
               default:
                  throw new Error('Invalid orientation: '+side);
            }
         }

         function _end(pos) {
            return pos === 'right' || pos === 'bottom';
         }

         function _accProp() {
            var args = $.makeArray(arguments), t = args.shift();
            while(args.length) {
               t += _ucFirst(args.shift());
            }
            return t;
         }

         function _ucFirst(txt) {
            if( !txt ) { return txt; }
            return txt.substring(0,1).toUpperCase()+txt.substring(1);
         }

         function _px(amt) { return amt === 0? amt : amt+'px'; }

         function _sides(fxn) { $.each(['top', 'right', 'bottom', 'left'], fxn); }

         function _orientate(side, pos) {
            if( pos === 'center' ) { return side; }
            else if( _vert(side) ) { return pos+'-'+side; }
            else                   { return side+'-'+pos; }
         }

      })();


   })();

   /**
    *
    * @param props
    * @param key
    */
   function _get(props, key) {
      var x,y,z;
      if( typeof(props) !== 'object' ) { return null; }
      x = key.indexOf('.');
      if( x > 0 ) {
         y = key.substring(0,x);
         z = key.substring(x+1);
         return _get(props[y], z);
      }
      else {
         if( $.ws.exists(props, key) ) {
            return props[key];
         }
         else { return null; }
      }
   }


   /**
    * @param props
    * @param {string} key
    * @param {string} [type]
    * @return {boolean}
    */
   function _has(props, key, type) {
      return _get(props, key) !== null && props[key] !== false &&
            (!type || type === typeof(props[key]));
   }

   function _pointerAt(atString) {
      var at = Position.atSplit(atString);
      if( at.inner ) {
         // don't simply use atString here because we
         // must remove any +/- values and 'inner' (not used by pointer)
         return at.side+' '+at.pos;
      }
      switch(at.side) {
         case 'left':
            return 'right '+at.pos;
         case 'right':
            return 'left '+at.pos;
         case 'top':
            return 'bottom '+at.pos;
         case 'bottom':
            return 'top '+at.pos;
         case 'center':
            // atSplit prevents first parameter from being center unless both are center, so this must be 'center center'
            throw new Error('can\'t position a pointer at center/center');
         default:
            throw new Error('invalid at parameter: '+atString);
      }
   }

});