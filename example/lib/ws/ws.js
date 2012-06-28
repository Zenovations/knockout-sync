
/**
 * REQUIRES THE FOLLOWING SCRIPTS TO RUN:
 *   <script type="text/javascript" src="libs/jquery/jquery-1.7.js"></script>
 *   <script type="text/javascript" src="libs/zen/class.js"></script>
 *
 * THESE SCRIPTS PROVIDE ADDITIONAL FUNCTIONALITY (OPTIONAL)
 *   <script type="text/javascript" src="libs/json/json2.js"></script>
 *   <script type="text/javascript" src="libs/freeow/freeow-min.js"></script>
 */

/************************************************
 * Switch to a localized scope and define $.ws
 ************************************************/

(function($) {
   if( !$.ws ) { $.ws = {}; }

   var WS_DEBUG = true; //todo
   //if( typeof(WS_DEBUG)  == 'undefined' ) { WS_DEBUG = false;  }
   if( typeof(WS_LIBURL) == 'undefined' ) { WS_LIBURL = false; }

   /******************************
    * wordspot namespace and utils
    ******************************/
   $.extend($.ws, {
      init: function(liburl, debug) {
         //todo-prod change these to cookies? something useful? write them in php?
         if( liburl ) { $.ws.LIBURL = liburl; }
         $.ws.DEBUG  = debug;
         if( $.fn.freeow && !$('#freeow').length ) {
            $(function() {$('<div id="freeow" class="freeow freeow-top-right"></div>').appendTo('body');});
         }
         this.useOpacity = (!$.browser.msie || $.browser.version >= 9);
         this.hasConsole = typeof(console) == 'object' && console && console.log && console.warn && console.error && console.info;
      },

      say: function(title, text) {
         if( typeof(text) === 'undefined' ) {
            text = title;
            title = 'Message';
         }
         else {
            $.ws.log(title);
         }
         $.ws.log(text);
         if( $.fn.freeow ) {
            $("#freeow").freeow(title, text, $.ws.freeowOpts);
         }
      },

      error: function() { logToConsole($.ws.hasConsole, 'error', $.makeArray(arguments)); },
      warn:  function() { logToConsole($.ws.hasConsole,  'warn', $.makeArray(arguments)); },
      info:  function() { logToConsole($.ws.hasConsole,  'info', $.makeArray(arguments)); },
      log:   function() { logToConsole($.ws.hasConsole,   'log', $.makeArray(arguments)); },

      event: function(e) {
         if( e instanceof jQuery.Event ) {
            if( arguments.length > 1 ) { e.type = arguments[1]; }
            return e;
         }
         else {
            return $.Event(e? e : 'undefined');
         }
      },

      alias: function(obj, fnName, aliasName) {
         if( typeof(fnName) != 'string' || typeof(aliasName) != 'string') {
            throw new Error('fnName and aliasName must both be strings representing functions in obj');
         }
         if( obj.hasOwnProperty(aliasName) ) {
            throw new Error('Trying to set alias '+aliasName+', but it already exists!');
         }
         if( !obj.hasOwnProperty(fnName) ) {
            throw new Error('Can\'t set alias from '+fnName+' because it doesn\'t exist!');
         }
         obj[aliasName] = obj[fnName];
      },

      /**
       * Given an event, return the top/left coordinates in a browser non-specific way
       * @param {jQuery.Event} event
       * @return Object
       */
      pos: function(event) {
         if( !event ) { return {top: 0, left: 0}; }
         return {top: event.pageY, left: event.pageX};
      },

      /**
       * Create a Coord object. If only one integer value is provided, it is used for the top value and the left value
       * is set to zero. If top is not an integer, left will be ignored.
       *
       * @param {int|Object|Array|jQuery.Event} top if Object, must contain top/left INTEGER values (a jQuery.fn.offset() object)
       * @param {int} [left]
       * @return Coord
       */
      getCoord: function(top, left) {
         if( arguments.length < 2 ) {
            if( top instanceof $.Event ) {
               var pos = $.ws.pos(top);
               top = pos.top;
               left = pos.left;
            }
            else if( typeof(top) == 'object' ) {
               if( !top ) { // a null
                  top = left = 0;
               }
               else if( $.isArray(top) ) {
                  left = top[1];
                  top = top[0];
               }
               else if( top.hasOwnProperty('y') ) { // x,y coords
                  left = top.x;
                  top = top.y;
               }
               else { // a Coord or something with top/left values
                  left = top.left;
                  top = top.top;
               }
            }
            else {
               left = 0;
            }
         }
         return new Coord(parseInt(top), parseInt(left));
      },

      /**
       * @param {int|Object|Array} start if object, must have start/end (a range) or top property (a single point)
       * @param {int} [end]
       * @return {Range}
       */
      getRange: function(start, end) {
         if( arguments.length < 2 ) {
            if( typeof(start) == 'object' ) {
               if( !start ) { // a null
                  start = end = 0;
               }
               else if( $.isArray(start) ) {
                  end = start[1];
                  start = start[0];
               }
               else if( start.hasOwnProperty('start') ) { // a Range or something with start/end values
                  end = start.end;
                  start = start.start;
               }
               else { // a Coord or something with top/left values
                  end = start = start.top;
               }
            }
            else {
               end = start;
            }
         }
         return new Range(parseInt(start), parseInt(end));
      },

      getUniqueRange: function(sortId, start, end) {
         if( arguments.length < 3 ) { end = start; }
         return new UniqueRange(sortId, start, end);
      },

      isNumber: function(n) {
         return !isNaN(parseFloat(n)) && isFinite(n);
      },

      dump: function(thing) {
         var t = typeof(thing);
         switch(t) {
            case 'object':
               if( !thing ) { return 'null'; }
               else if( JSON ) { return JSON.stringify(thing); }
               else {
                  return thing+'';
               }
            case 'string':
               return "'"+thing+"'";
            case 'boolean':
               return thing? 'true' : 'false';
            default:
               return thing;
         }
      },

      /**
       * Test for existence of `x` (not null or undefined), or if `key` is passed, then
       * test to make sure `x` is an object/array and that the given key/index exists
       * @param x the object or value to test
       * @param {string,int} [key]
       * @return boolean
       */
      exists: function(x, key) {
         var res = true, t = typeof(x);
         if( t == 'undefined' || (t == 'object' && !x) ) { res = false; }
         else if( typeof(key) != 'undefined' ) {
            if( $.isArray(x) ) {
               key = parseInt(key);
               res = x.length > key && $.ws.exists(x[key]);
            }
            else {
               res = x.hasOwnProperty(key) && $.ws.exists(x[key]);
            }
         }
         return res;
      },

      /**
       * Test to see if the browser supports a given CSS property. Results are cached in $.ws.supported
       * @param {string} prop
       * @return {string} name of property or undefined
       */
      cssSupports: function(prop) {
         if( prop in $.ws.supported ) { return $.ws.supported[prop]; }
         var vendorProp, supportedProp = false,
             capProp = prop.charAt(0).toUpperCase() + prop.slice(1),
             prefixes = [ "Moz", "Webkit", "O", "ms" ],
             div = document.createElement( "div" );

         if ( prop in div.style ) {
            supportedProp = prop;
         } else {
            for ( var i = 0; i < prefixes.length; i++ ) {
               vendorProp = prefixes[i] + capProp;
               if ( vendorProp in div.style ) {
                  supportedProp = vendorProp;
                  break;
               }
            }
         }

         div = null;
         $.ws.supported[ prop ] = supportedProp;
         return supportedProp;
      },

      /**
       * @param {number} number
       * @param {int} [decimals]
       */
      round: function(number, decimals) {
         number = parseFloat(number);
         if( !decimals ) { return Math.round(number); }
         return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
      },

      LIBURL: '/libs/',
      DEBUG: true,
      DOCREADY: false,
      useOpacity: true,
      supported: {},

      freeowOpts: {
         autoHideDelay: 3000,
         classes: ['smokey','slide'],
         showDuration: 2000,
         hideDuration: 2000,
         hideStyle: {
            opacity: 0,
            left: "400px"
         },
         showStyle: {
            opacity: .8,
            left: 0
         }
      }
   });

   $.ws.init(WS_LIBURL, WS_DEBUG);

   function logToConsole(hasConsole, severity, args) {
      if( !hasConsole ) { return; }
      if( args.length == 1 ) {
         console[severity](args[0]);
      }
      else {
         console[severity].apply(null, args);
      }
   }

   /**
    * Coord is a class representing x,y coords; a single point
    * @param {int} top
    * @param {int} left
    */
   var Coord = $.ws.Coord = function(top, left) {
      this.top = top;
      this.left = left;
   };

   $.extend(Coord.prototype, {
      compareTo: function(coordB) {
         if( !coordB ) { return -1; }
         if( this.equals(coordB) ) { return 0; }
         if( this.top == coordB.top ) {
            return this.left > coordB.left? 1 : -1;
         }
         return this.top > coordB.top? 1 : -1;
      },

      /**
       * @param {Coord} b
       * @param {Coord} mark
       */
      isCloserThan: function(b, mark) {
         if( !b ) { return true; }
         var y1 = Math.abs(this.top - mark.top);
         var y2 = Math.abs(b.top - mark.top);
         if( y1 == y2 ) {
            var x1 = Math.abs(this.left - mark.left);
            var x2 = Math.abs(b.left - mark.left);
            return x1 < x2;
         }
         return y1 < y2;
      },

      equals: function(wsCoord) {
         if( !wsCoord ) { return false; }
         return (this.left == wsCoord.left && this.top == wsCoord.top);
      },

      copy: function() {
         return new Coord(this.top, this.left);
      },

      toString: function() {
         return '{top: '+this.top+', left: '+this.left+'}';
      },

      /**
       * Returns the absolute distance to another value, regardless of which is first. Note that for home
       * positions with same top but different left, this will be 0, so this is not the same as equal()
       * @param {Coord} b
       * @return {int}
       */
      distance: function(b) {
         return Math.abs(this.top - b.top);
      },

      /**
       * True if this Coord is between a/b. When surrounds is true, this does not include cases where
       * it exactly matches a or b
       *
       * @param {Coord} a
       * @param {Coord} b
       * @param {boolean} [borders] if true, include a and b in the matching set (normally excluded)
       * @return {boolean}
       */
      between: function(a, b, borders) {
         // straighten it out if it's on the backward
         if( a.compareTo(b) > 0 ) { var c = a; a = b; b = c; }
         // include a and b in the matching set
         if( borders ) { return this.compareTo(a) >= 0 && this.compareTo(b) <= 0; }
         else { return this.compareTo(a) > 0 && this.compareTo(b) < 0;  }
      },

      /**
       * @param {Coord} coord
       * @param {CoordVisitor} visitor
       */
      visit: function(coord, visitor) {
         if( !(visitor instanceof CoordVisitor) ) {
            throw new Error('compareVisitor must be instance of $.ws.RangeVisitor')
         }
         switch(this.compareTo(coord)) {
            case -1: return visitor.lessThan(this, coord);
            case  1: return visitor.moreThan(this, coord);
            case  0: return visitor.equalTo(this, coord);
            default: throw new Error('compareTo value invalid: '+this.compareTo(coord));
         }
      }

   });

   /** @abstract */
   var CoordVisitor = $.ws.CoordVisitor = Class.extend({
      init:     function() {}, //constructor
      lessThan: function(a,b) { throw new Error('must declare lessThan()'); },
      moreThan: function(a,b) { throw new Error('must declare moreThan()'); },
      equalTo:  function(a,b) { throw new Error('must declare equalTo()');  }
   });

   /**
    * A Range is literally a start point and end point.
    *
    * To calculate distances and overlaps, it is important to keep in mind that the start point is inclusive and the
    * end point is exclusive.
    *
    * It helps to think of the range's start and end points as boundaries, and the spaces between the numbers as
    * "slots" for this to work logically. The start number of a range is the boundary just before the first
    * slot, thus, a range of 0 - 10 occupies the slot "after" 0 (inclusive), and all the other slots until
    * 10, but not the one between 10 and 11 (exclusive), because 10 is the boundary. Thus, the range is
    * 10 numbers long.
    *
    * On the contrary, a range between 1 and 10 occupies 9 slots (from the slot between 1 and 2 until the slot before
    * 10). The slot after 10 is free to be used by another range.
    *
    * If your head hasn't exploded, you now know why we need a Range object in the first place! :) If your head did
    * explode, then perhaps someone else should explain it next time.
    *
    * All Range comparison methods will accept an integer, Coord, or Range object. Additionally,
    * a plain object containing {top: nnn} will also be accepted.
    *
    *
    */
   var Range = $.ws.Range = Class.extend({
      /**
       * @param {int} start
       * @param {int} end
       */
      init: function(start, end) {
         // comparisons don't work well on string values (if they come from form fields, for instance)
         start = parseInt(start);
         end = parseInt(end);
         // don't allow reversed ranges to exist; less if/else in sorting, equality, etc
         if( start > end ) {
            var x = end; end = start; start = x;
         }
         /** @var int */
         this.start = start;
         /** @var int */
         this.end = end;
      },

      /**
       * @param {Range,Coord,int} wsRange
       * @return integer -1, 0, or 1
       */
      compareTo: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return -1; }
         wsRange = rangeFor(wsRange);
         if( this.start == wsRange.start && this.end == wsRange.end ) { return 0; }
         if( this.start == wsRange.start ) {
            return this.end > wsRange.end? 1 : -1;
         }
         return this.start > wsRange.start? 1 : -1;
      },

      /**
       * To surround another range, the start and end points must encompass the other range and cannot be equal.
       * For example: 10,20 surrounds all of these: 11,19  10,19  11,20
       * But does not surround these:  9,21  11,21  10,20 (itself)  10,21
       *
       * @param {Range,Coord,int} wsRange
       * @return boolean
       */
      surrounds: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return false; }
         wsRange = rangeFor(wsRange);
         return (this.start <= wsRange.start && this.end > wsRange.end) || (this.end >= wsRange.end && this.start < wsRange.start);
      },

      /**
       * Overlap is defined as any two ranges which share a single number. If range a ends at 40 and range b starts at 40,
       * these overlap by a distance of 0; If range a ends at 41 and range b starts at 40, these overlap by
       * a distance of 1; A range can overlap itself (40,45 overlaps 40,45 by a distance of 5).
       *
       * @param {Range,Coord,int} wsRange
       * @return boolean
       */
      overlaps: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return false; }
         wsRange = rangeFor(wsRange);
         return (this.start <=  wsRange.start && this.end >= wsRange.start) || (this.start <=  wsRange.end && this.end >= wsRange.end) ||
                (wsRange.start <= this.start && wsRange.end >= this.start) || (wsRange.start <= this.end && wsRange.end >= this.end);
      },

      /**
       * 'Touching' is defined as the start point of one range is adjacent to the end point of the other range without overlapping.
       *
       * Thus, if one element ends at 40 and another starts at 40, these elements overlap. If end is 39 and start is 40,
       * they touch. It doesn't matter which element's end touches which element's start.
       *
       * If you would like to treat touching as sharing exactly 1 number, use `distanceOverlap() == 0` instead.
       * 
       * @param {Range,Coord,int} wsRange
       * @return boolean
       */
      touches: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return false; }
         wsRange = rangeFor(wsRange);
         switch(this.compareTo(wsRange)) {
            case -1:
               // this starts before wsRange
               return wsRange.start == this.end+1;
            case 1:
               // this starts after wsRange
               return this.start == wsRange.end+1;
            case 0: //the same range (they overlap)
            default:
               return false;
         }
      },

      equals: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return false; }
         wsRange = rangeFor(wsRange);
         return (this.start == wsRange.start && this.end == wsRange.end);
      },

      /** @return $.ws.Range */
      copy: function() {
         return new Range(this.start, this.end);
      },


      /**
       * How long is this range?
       * @return {int}
       */
      distance: function() {
         return this.end - this.start;
      },

      /**
       * Answers the question: how far would this range have to move forward or backwards so that the end point
       * touches the start point of wsRange?
       *
       * A negative result means this element would have to move backward positionally; ranges might overlap
       * A positive result means it would need to move forward positionally and that there is a gap between the ranges.
       *
       * To simply see how big of a gap exists between ranges (in either direction), use distanceBetween() instead.
       *
       * @param wsRange
       * @return integer
       */
      distanceTo: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return 0; }
         wsRange = rangeFor(wsRange);
         return wsRange.start - this.end;
      },

      /**
       * Answers the question: how much empty space exists between these two ranges? Zero means they overlap. 1 means
       * they touch, this never returns a negative value (all overlaps return 0).
       *
       * @param {Range} wsRange
       * @return {int}
       */
      distanceBetween: function(wsRange) {
         if( !$.ws.exists(wsRange) ) { return 0; }
         wsRange = rangeFor(wsRange);
         if( this.overlaps(wsRange) ) { return 0; }
         switch(this.compareTo(wsRange)) {
            case -1:
               // this starts before wsRange
               return wsRange.start - this.end;
            case 1:
               // this starts after wsRange
               return this.start - wsRange.end;
            case 0: //handled by overlaps()
            default:
               return 0;
         }
      },

      /**
       * Overlap is defined as sharing at least 1 number. If range a ends at 40 and range b starts at 40, they do
       * not share a number(the overlap is 0). If range a ends at 41 and range b starts at 40, these overlap by 1 px.
       *
       * All ranges which do not overlap return -1 (e.g. end 39 and start 40). A range surrounded by another
       * overlaps by its distance() (i.e. 0-20, or height of 20, overlaps by 20, not 21!). If two ranges are
       * equal then they also overlap by exactly their height.
       *
       * @param {Range,Coord,int} range
       * @return int
       */
      distanceOverlap: function(range) {
         if( !$.ws.exists(range) ) { return -1; }
         var wsRange = rangeFor(range);
         if( !this.overlaps(wsRange) ) { return -1; }
         else if( this.surrounds(wsRange) ) { return wsRange.distance(); }
         else if( wsRange.surrounds(this) ) { return this.distance(); }
         else {
            switch(this.compareTo(wsRange)) {
               case -1:
                  // this starts before wsRange
                  return this.end - wsRange.start;
               case 1:
                  // this starts after wsRange
                  return wsRange.end - this.start;
               case 0:
                  // they start and end at same place
                  return this.distance();
               default:
                  $.ws.error('compareTo must return 1, -1, or 0!');
                  return -1;
            }
         }
      },

      toString: function() {
         return '{start: '+this.start+', end: '+this.end+'}';
      },

      /**
       * @param {Range} range
       * @param {RangeVisitor} visitor
       */
      visit: function(range, visitor) {
         if( !(visitor instanceof RangeVisitor) ) { throw new Error('compareVisitor must be instance of $.ws.RangeVisitor') }
         switch(this.compareTo(range)) {
            case -1: return visitor.lessThan(this, range);
            case  1: return visitor.moreThan(this, range);
            case  0: return visitor.equalTo(this, range);
            default: throw new Error('compareTo value invalid: '+this.compareTo(range));
         }
      }

   });

   /** @abstract */
   var RangeVisitor = $.ws.RangeVisitor = Class.extend({
      init:     function() {}, //constructor
      lessThan: function(a,b) { throw new Error('must declare lessThan()'); },
      moreThan: function(a,b) { throw new Error('must declare moreThan()'); },
      equalTo:  function(a,b) { throw new Error('must declare equalTo()');  }
   });

   /**
    * @param {Range,Coord,int}obj
    * @return {Range}
    */
   function rangeFor(obj) {
       if( obj instanceof Range ) { return obj; }
       return $.ws.getRange(obj);
   }

   var UniqueRange = $.ws.UniqueRange = Range.extend({
      init: function(sortId, start, end) {
         this.sortId = parseInt(sortId);
         this._super(start, end);
      },

      compareTo: function(wsRange) {
         if( !wsRange ) { return -1; }
         if( this.equals(wsRange) ) { return 0; }
         var c = this._super(wsRange);
         if( c != 0 ) { return c; }
         return this.sortId > wsRange.sortId? 1 : -1;
      },

      equals: function(wsRange) {
         return this._super(wsRange)===true && this.sortId == wsRange.sortId;
      },

      copy: function() {
         return new UniqueRange(this.sortId, this.start, this.end);
      },

      toString: function() {
         return '{id: '+this.sortId+', start: '+this.start+', end: '+this.end+'}';
      }
   });

})(jQuery);