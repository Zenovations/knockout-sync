
(function($) {

   /** CONTROLLER
    ********************************************************/
   var Controller = {
      setPanel: function(route, view) {
         Controller.panel[route] = view;
      },
      getPanel: function(route) {
         return Controller.panel[route];
      },
      setStore: function(name, store) {
         Controller.stores[name] = store;
         NavView.storeNames.push(name);
      },
      selectStore: function(name) {
         NavView.currentStore(name);
         Controller.Store = Controller.stores[name];
      },
      hasStores: ko.observable(false),
      panel: {},
      stores: {},
      Store: null
   };

   /** NavView
    ********************************************************/
   var NavView = Controller.NavView = {
      storeNames:   ko.observableArray(),
      currentStore: ko.observable(''),
      tablesLoaded: ko.observable(0)
   };

   /** StoresPanel
    ********************************************************/
   var StoresPanel = {
      EditPanel: {
         storeTypes:   ['Firebase'],
         storeModal: function(form) {
            var $form = $(form), type = $form.find('select[name=storeType]').val(),
               name = $form.find('input[name=storeName]').val();
            console.log(form);
            createModal({
               title: 'Create a '+type+' store',
               storeType: type,
               storeName: name,
               body: '<div data-bind="template: storetypes-'+type+'-template">'+name+'</div>'
            });
         },
         addStore: function(form) {
            console.log(form);
         },
         showEditForm: ko.observable(false),
         editAStore: function() {
            console.log('editAStore', this, arguments);
         }
      }
   };
   Controller.setPanel('StoresPanel', StoresPanel);

   /** Validation
    ********************************************************/


   /** DOM READY
    ********************************************************/
   $(function($) {
      ko.applyBindings(Controller);
   });

   /** UTIL FUNCTIONS
    ********************************************************/
   function loadPartial($where, name, view) {
      return $where.load('assets/partials/'+name+'.html', function() {
         ko.applyBindings(view, this);
      });
   }

   function createModal(props) {
      console.log(props);
      var $modal,
          view = $.extend({
             title:       false,
             footer:      false,
             showFooter:  function() { return view.footer? true : false; },
             showHeader:  function() { return true; },
             body:        "",
             partial:     false,
             destroyOnHide: true
         }, props);

      $modal = applyTemplate('modal-template', view);

      // initialize this as a bootstrap modal
      $modal.modal({show: false});

      if( view.destroyOnHide ) {
         $modal.on('hidden', function() {
            $(this).remove();
         });
      }
      if( view.partial ) {
         // partial views are loaded via ajax calls
         loadPartial($modal.find('.modal-body'), view.partial, view).then(function() {
            $modal.modal('show');
         });
      }
      else {
         $modal.modal('show');
      }
   }

   function applyTemplate(template, view, target, opts) {
      target || (target = 'body');
      opts   || (opts = {});
      var $e = $('<div />');
      ko.renderTemplate(template, view, opts, $e.get(0));
      // renderTemplate doesn't actually give us access to the element it creates
      // and if we use replaceNode we don't get access to that either, so instead
      // we will do this little magic to get the child of our element, which
      // is where the template contents will be
      return $e.find('.modal').appendTo(target);
   }

})(jQuery);