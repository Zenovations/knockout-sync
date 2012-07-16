
(function($) {

   /** CONTROLLERS / VIEWS
    ********************************************************/

   var Controller = {
      setPanel: function(route, view) {
         Controller.panel[route] = view;
      },
      getPanel: function(route) {
         return Controller.panel[route];
      },
      addStore: function(name, store) {
         Controller.stores[name] = store;
         NavView.storeNames.push(name);
      },
      selectStore: function(name) {
         NavView.currentStore(name);
         Controller.Store = Controller.stores[name];
      },
      NavView: {
         storeNames:   ko.observableArray(),
         currentStore: ko.observable(),
         tablesLoaded: ko.observable(0)
      },
      panel: {},
      stores: {}
   };

   var NavView = Controller.NavView;

   function PanelView(route, props) {
      applyProps(this, props);
      this.route = route;
      this.title = routeTitle(route);
   }

   /** ROUTING
    ********************************************************/

   // STORES
   createPanel('#stores', {
      stores: [],
      storeTypes: {
         ignore: true,
         val: {Firebase: {template: 'firebase-store-template'}}
      }
   });

   // TABLES
   createPanel('#tables', {
      tables: [],
      setTable: function(name) {
         //todo
      }
   });

   // DATA
   createPanel('#data', {
      setTable: function(name) {
         //todo
      }
   });

   /** DOM READY
    *********************/
   $(function($) {
      ko.applyBindings(Controller);
   });

   /** UTILITIES
    ********************************************************/

   function createPanel(route, props) {
      var panel = new PanelView(route, props);
      Controller.setPanel(route, panel);
   }

   function applyProps(view, props) {
      _.each(props, function(k, v) {
         if( !$.isPlainObject(v) ) {
            v = {val: v};
         }
         switch(typeof(v.val)) {
            case 'object':
               if(_.isArray(v.val) ) {
                  view[k] = v.ignore? [] : ko.observableArray();
               }
               break;
            case 'string':
               view[k] = v.ignore? v.val : ko.observable(v.val);
               break;
            case 'function':
               view[k] = v.val;
               break;
            default:
               throw new Error('I don\'t know what to do with a '+ v.type);
         }
      });
   }

   function routeTitle(route) {
      return _.str.capitalize((route.match('#([a-zA-Z0-9]+)') || [null, 'Untitled'])[1]);
   }


})(jQuery);