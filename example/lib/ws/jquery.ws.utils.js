/**
 * REQUIRES:
 *    jQuery 1.7+
 *    libs/ws/ws.js
 */
(function($) {
   $.fn.equalTo = function(object) {
      return !jQuery(this).not( jQuery(object) ).length;
   };

   RegExp.quote = function(str) {
      return str.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1");
   };

   Error.getLine = function(e) {
      return e.lineNumber || e.line || null;
   };

   Error.getFile = function(e) {
      var f = e.fileName || e.sourceURL || null;
      return f? (f.match(/.*\/([^\/]+)$/) || [,''])[1] : '';
   };

   if( !Array.prototype.remove ) {
      Array.prototype.remove = function(from, to) {
         var rest = this.slice((to || from) + 1 || this.length);
         this.length = from < 0 ? this.length + from : from;
         return this.push.apply(this, rest);
      };
   }

   if( !Object.keys ) {
      Object.keys = function( obj ) {
         var array = new Array();
         for ( var prop in obj ) {
            if ( obj.hasOwnProperty( prop ) ) {
               array.push( prop );
            }
         }
         return array;
      };
   }

   /**
    * @deprecated make this go away!
    * @param {number} amount
    */
   $.fn.applyOpacity = function(amount) {
      // disable opacity changes in IE < 9; this is easier and better performance than dealing
      // with IE's crazy opacity filters to make PNG appear correctly
      if( $.ws.useOpacity ) {
         this.each(function() {
            $(this).css({opacity: amount});
         });
      }
      return this;
   };

   /*************************************
    * Add universal border radius support
    ************************************/
   (function() { // individual scoping makes variable lookup faster
      var borderRadius = $.ws.cssSupports('borderRadius');
      if ( borderRadius && borderRadius !== "borderRadius" ) {
         $.cssHooks.borderRadius = {
            get: function( elem, computed, extra ) {
               return $.css( elem, borderRadius );
            },
            set: function( elem, value) {
               elem.style[ borderRadius ] = value;
            }
         };
      }
   })();

   (function() { // individual scoping makes variable lookup faster
      var borderTopLeftRadius = $.ws.cssSupports('borderTopLeftRadius');
      if ( borderTopLeftRadius && borderTopLeftRadius !== "borderTopLeftRadius" ) {
         $.cssHooks.borderTopLeftRadius = {
            get: function( elem, computed, extra ) {
               return $.css( elem, borderTopLeftRadius );
            },
            set: function( elem, value) {
               elem.style[ borderTopLeftRadius ] = value;
            }
         };
      }
   })();

   (function() { // individual scoping makes variable lookup faster
      var borderTopRightRadius = $.ws.cssSupports('borderTopRightRadius');
      if ( borderTopRightRadius && borderTopRightRadius !== "borderTopRightRadius" ) {
         $.cssHooks.borderTopRightRadius = {
            get: function( elem, computed, extra ) {
               return $.css( elem, borderTopRightRadius );
            },
            set: function( elem, value) {
               elem.style[ borderTopRightRadius ] = value;
            }
         };
      }
   })();

   (function() { // individual scoping makes variable lookup faster
      var borderBottomRightRadius = $.ws.cssSupports('borderBottomRightRadius');
      if ( borderBottomRightRadius && borderBottomRightRadius !== "borderBottomRightRadius" ) {
         $.cssHooks.borderBottomRightRadius = {
            get: function( elem, computed, extra ) {
               return $.css( elem, borderBottomRightRadius );
            },
            set: function( elem, value) {
               elem.style[ borderBottomRightRadius ] = value;
            }
         };
      }
   })();

   (function() { // individual scoping makes variable lookup faster
      var borderBottomLeftRadius = $.ws.cssSupports('borderBottomLeftRadius');
      if ( borderBottomLeftRadius && borderBottomLeftRadius !== "borderBottomLeftRadius" ) {
         $.cssHooks.borderBottomLeftRadius = {
            get: function( elem, computed, extra ) {
               return $.css( elem, borderBottomLeftRadius );
            },
            set: function( elem, value) {
               elem.style[ borderBottomLeftRadius ] = value;
            }
         };
      }
   })();

   /***********************************
    * Add universal box-shadow support
    **********************************/
   (function() {
      var boxShadow = $.ws.cssSupports('boxShadow');
      if ( boxShadow ) {
         $.cssHooks.boxShadow = {
            get: function( elem ) {//, computed, extra ) {
               return $.css( elem, boxShadow );
            },
            set: function(elem, value) {
               elem.style[ boxShadow ] = buildShadowString(value);
            }
         };
      }

      function buildShadowString(value) {
         var parts = value.split(' ');
         if( parts.length >= 5 ) { return value; }
         var props = $.extend({
            color:  '#aaaaaa',
            inset:  false,
            hoff:   '2px',
            voff:   '2px',
            blur:   '4px',
            spread: false
         }, _accShadowProps(parts, {}));
         return props.hoff+' '+props.voff+' '
               +(props.blur? props.blur+' ' : '')
               +(props.spread && props.blur? props.spread+' ' : '')
               +props.color+(props.inset? ' inset' : '');
      }

      function _accShadowProps(parts, props) {
         if( !parts.length ) {
            if( props.hoff && props.voff && !props.blur && !props.spread ) {
               // if exactly two numbers are provided, then we are going to
               // override the blur/spread defaults because that is probably what
               // was desired
               props.blur = false;
               props.spread = false;
            }
            return props;
         }
         var p = parts.shift();
         if( p === 'outset' || p === 'inset' ) {
            props.inset = p==='inset';
         }
         else if( p.match(/^[0-9.-]+(px|em|%)?$/) ) {
            if( !p.match(/\D/) ) { p = ''+p+'px'; }
            // it's a color so add it to the first slot that isn't filled yet
            $.each(['hoff', 'voff', 'blur', 'spread'], function(i, v) {
                if( !props.hasOwnProperty(v) ) { props[v] = p; return false; }
            });
         }
         else if( p ) { props.color = p; }
         return _accShadowProps(parts, props);
      }
   })();

   /******************************************
    * String utilities
    ******************************************/

   $.ws.string = {

      /**
       * @param {string} s
       * @return {String}
       */
      ucFirst: function(s) {
         s = s+'';
         return s.length? s.substr(0,1).toUpperCase() + s.substr(1) : '';
      }

   };

   /******************************************
    * Converter: Deal with em/px/% conversions
    ******************************************/

   (function() {
      /**
       * @param {number,HTMLElement} heightOrElm the element we'll be converting props for
       * @param {string,number} [amt]
       * @param {string} [units]
       */
      function Converter(heightOrElm, amt, units) {
         this.pxHeight = typeof(heightOrElm) === 'number'? heightOrElm : _pxHeight($(heightOrElm));
         // for some reason, IE doesn't like this.load() here (object doesn't support this property or method)
         if(typeof(amt) === 'undefined') { _load(this, 0); }
         else { _load(this, amt, units); }
      }

      Converter.prototype.clone = function($e) {
         return new Converter($e||this.pxHeight, this.amt, this.units);
      };

      Converter.prototype.load = function(amt, units) {
         _load(this, amt, units);
         return this;
      };

      Converter.prototype.add = function(b) {
         if( !(b instanceof Converter) ) {
            b = this.clone().load(b);
         }
         this.amt += b.convert(this.units);
         return this;
      };

      Converter.prototype.convert = function(newType) { return _convVal(this, newType); };

      Converter.prototype.px = function() { return this.convert('px'); };

      Converter.prototype.toString = function() {
         return ''+this.amt+this.units;
      };

      Converter.px = function($e, amt) {return (new Converter($e, amt)).convert('px'); };

      function _load(conv, amt, units) {
         var t = typeof(amt);
         if( t === 'string' ) {
            if( amt.match(/(smallest|small|medium|large|largest)/) ) {

            }
            else if( amt.match(/[^0-9.-]/) ) {
               units = _extractUnits(amt);
               amt = _extractVal(amt);
            }
            else if( amt === '' ) {
               amt = 0;
            }
            else {
               amt = parseFloat(amt);
            }
         }
         else if( t !== 'number' ) {
            throw new Error('not a valid number', amt);
         }
         conv.amt = amt;
         conv.units = units? units : 'px';
      }

      function _pxHeight($e) {
         var h, $d = $('<div style="display: none; font-size: 1em; margin: 0; padding:0; height: auto; line-height: 1; border:0;">&nbsp;</div>').appendTo($e);
         h = $d.height();
         $d.remove();
         return h;
      }

      function _extractVal(v) {
         return parseFloat(v.replace(/[^0-9.-]/, ''));
      }

      function _extractUnits(v) {
         if( v.match(/(em|px|%)$/) ) {
            return v.replace(/.*(em|px|%)$/, '$1');
         }
         else {
            throw new Error('Unable to determine units from '+v);
         }
      }

      function _convVal(a, newUnits) {
         var amt = a.amt, px = a.pxHeight;
         if( amt === 0 ) { return 0; }
         switch(newUnits) {
            case 'px':
               switch(a.units) {
                  case 'px':
                     return amt;
                  case 'em':
                     return _emToPx(px, amt);
                  case '%':
                     return _percentToPx(px, amt);
                  default:
                     throw Error('I don\'t know what type "'+a.units+'" is');
               }
            case 'em':
               switch(a.units) {
                  case 'px':
                     return _pxToEm(px, amt);
                  case 'em':
                     return amt;
                  case '%':
                     return _percentToEm(px, amt);
                  default:
                     throw Error('I don\'t know what type "'+a.units+'" is');
               }
            case '%':
               switch(a.units) {
                  case 'px':
                     return _pxToPercent(px, amt);
                  case 'em':
                     return _emToPercent(px, amt);
                  case '%':
                     return amt;
                  default:
                     throw Error('I don\'t know what type "'+a.units+'" is');
               }
            default:
               throw Error('I don\'t know what type "'+a.units+'" is');
         }
      }

      function _pxToEm(h, px) {
         if( px > 0 ) {
            return _round(px/h, 3);
         }
         return 0;
      }

      function _emToPx(h, em) {
         if( em > 0 ) {
            return _round(em*h, 3);
         }
         return 0;
      }

      function _percentToPx(h, perc) {
         return _round(h*perc/100, 3);
      }

      function _percentToEm(ph, perc) {
         return _pxToEm(ph, ph*perc/100);
      }

      function _pxToPercent(h, px) {
         return _round(px/h*100);
      }

      function _emToPercent(h, em) {
         return _pxToPercent(h, _emToPx(h, em));
      }

      function _round(number, decimals) {
         if( !decimals ) { decimals = 0; }
         return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
      }

      $.ws.UnitConverter = Converter;
   })();

})(jQuery);
