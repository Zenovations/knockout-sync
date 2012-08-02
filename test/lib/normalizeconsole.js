
(function(console) {
   /*********************************************************************************************
    * Make sure console exists because IE blows up if it's not open and you attempt to access it
    * Create some dummy functions if we need to, so we don't have to if/else everything
    *********************************************************************************************/
   console||(console = window.console = {
      // all this "a, b, c, d, e" garbage is to make the IDEs happy, since they can't do variable argument lists
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      log: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      info: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      warn: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      error: function(a, b, c, d, e) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      time: function(label) {},
      /**
       * @param a
       * @param [b]
       * @param [c]
       * @param [d]
       * @param [e]
       */
      timeEnd: function(label) {}
   });

   // le sigh, IE, oh IE, how we fight... fix Function.prototype.bind as needed
   if (!Function.prototype.bind) {
      Function.prototype.bind = function (oThis) {
         if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
         }

         var aArgs = Array.prototype.slice.call(arguments, 1),
               fToBind = this,
               fNOP = function () {},
               fBound = function () {
                  return fToBind.apply(this instanceof fNOP
                        ? this
                        : oThis || window,
                        aArgs.concat(Array.prototype.slice.call(arguments)));
               };

         fNOP.prototype = this.prototype;
         fBound.prototype = new fNOP();

         return fBound;
      };
   }

   // IE 9 won't allow us to call console.log.apply (WTF IE!) It also reports typeof(console.log) as 'object' (UNH!)
   // but together, those two errors can be useful in allowing us to fix stuff so it works right
   if( typeof(console.log) === 'object' ) {
      // Array.forEach doesn't work in IE 8 so don't try that :(
      console.log = Function.prototype.call.bind(console.log, console);
      console.info = Function.prototype.call.bind(console.info, console);
      console.warn = Function.prototype.call.bind(console.warn, console);
      console.error = Function.prototype.call.bind(console.error, console);
   }

   /**
    * Support group and groupEnd functions
    */
   ('group' in console) ||
   (console.group = function(msg) {
      console.info("\n------------\n"+msg+"\n------------");
   });
   ('groupEnd' in console) ||
   (console.groupEnd = function() {
      //console.log("\n\n");
   });

})(window.console);