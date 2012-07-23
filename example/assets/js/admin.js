
(function($) {
   "use strict";

   /** CONTROLLER
    ********************************************************/
   var Controller = ko.mapping.fromJS({
      setPanel: function(name, panel) {
         Controller.panel[name] = panel;
      },
      getPanel: function(name) {
         return Controller.panel[name];
      },
      bindPanel: function(name, parentContext) {
         return parentContext.createChildContext(Controller.getPanel(name));
      },
      setStore: function(name, type, store) {
         Controller.stores.push({name: name, type: type, inst: store});
         if( Controller.storeNames.indexOf(name) < 0 ) {
            Controller.storeNames.push(name);
            Controller.currentStore(name);
         }
      },
      selectStore: function(name) {
         // handle store objects
         if( typeof(name) === 'object' ) { name = name.name(); }
         Controller.currentStore(name);
         Controller.Store = Controller.stores[name];
      },
      storeNames:   [],
      currentStore: 'muck', //debug
      tablesLoaded: 0,
      panel: {},
      stores: [ //debug
         {name: 'muck', type: 'Firebase', store: new Firebase('http://gamma.firebase.com/wordspot/muck')},
         {name: 'sync', type: 'Firebase', store: new Firebase('http://gamma.firebase.com/wordspot/SYNC')}
      ],
      Store: null
   }, {
      'stores': {
         key: function(data) {
            return ko.utils.unwrapObservable(data.name);
         }
      },
      'copy': ['panel']
   });
   Controller.hasStores = ko.computed(function() { return Controller.stores().length > 0; });

   /** StoresPanel
    ********************************************************/
   var StoresPanel = {
      EditPanel: new (function() {
         var self = this, $modal;
         self.storeTypes = ['Firebase'];
         self.createStore = function(form) {
            var $form = $(form);
            if( $form.valid() ) {
               var name = $('#instanceName').val(),
                   type = $form.find('[name="storeType"]').val(),
                   url  = $('#instanceUrl').val(),
                   store;
               $modal && $modal.modal('hide');
               store = new ko.sync.stores.FirebaseStore(url);
               Controller.setStore(name, type, store);
               console.log('Store added');
            }
            return false;
         };
         self.showEditForm = ko.observable(false);
         self.editStore = function() {
            console.log('editStore', this, arguments);
         };
         self.baseUrl = ko.observable('http://gamma.firebase.com/test');
         self.keyedBaseName = ko.observable('');
         self.baseName = ko.computed({
            read: function() {
               return self.keyedBaseName() || _baseName(self.baseUrl());
            },
            write: function(value) {
               self.keyedBaseName(value);
            }
         });
         self.storeModal = function(form) {
            var $form = $(form),
               name = $form.find('input[name=storeName]').val(),
               storeType = ko.observable('Firebase');
            $modal = createModal($.extend({
               title: 'Create a Store',
               body: '<div data-bind="template: \'form-create-store\'"></div>',
               storeName: name,
               storeType: storeType,
               storeTemplate: ko.computed(function() {
                  var type = storeType();
                  return type? 'storetypes-'+type : 'storetypes-select';
               })
            }, self));
         };
      })
   };
   Controller.setPanel('StoresPanel', StoresPanel);

   /** CUSTOM BINDINGS
    ********************************************************/
   ko.bindingHandlers.boundHtml = {
      update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
         console.log('boundHtml');
         var html = valueAccessor();
         $(element).html(html);
         ko.applyBindings(viewModel, element);
      }
   };

   ko.bindingHandlers.validate = {
      init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
         // This will be called when the binding is first applied to an element
         $(element).validate();
      }
   };

   ko.bindingHandlers.partial = {
      init: function(element, valAccessor, allAccessor, view, bindContext) {
         var val = valAccessor(), props = $.extend({
            ctx: view, name: null, after: '' },
            typeof(val) === 'object'? val : {name: val});
         if( props.panel ) {
            props.ctx = Controller.bindPanel(props.panel, bindContext);
         }
         console.log({bindContext: bindContext});
         console.log({props: props});
         _after(props.after).done(loadPartial($(element), props.name, props.ctx));
         // Also tell KO *not* to bind the descendants itself, otherwise they will be bound twice
         return { controlsDescendantBindings: (props.ctx? true : false) };
      }
   };

   /** DOM READY
    ********************************************************/
   $(function($) {
      ko.applyBindings(Controller);
   });

   /** UTIL FUNCTIONS
    ********************************************************/
   var AFTER = {};
   function loadPartial($where, name, view) {
      var def = $.Deferred(), promise = def.promise();
      $where.load('assets/partials/'+name+'.html', function() {
         ko.applyBindingsToDescendants(view, this);
         def.resolve(true);
      });
      return _start(name, promise);
   }

   /**
    * @param {string} name
    * @param [promise]
    * @private
    */
   function _start(name, promise) {
      AFTER[name] = promise? promise : $.Deferred().resolve(true).promise();
      return AFTER[name];
   }

   function _after(name) {
      return (name || '') in AFTER? AFTER[name] : $.Deferred().resolve(true).promise();
   }

   function createModal(props) {
      var $modal,
          view = $.extend({
             title:       false,
             footer:      false,
             showFooter:  function() { return view.footer? true : false; },
             showHeader:  function() { return true; },
             body:        "",
             bodyBinding: false,
             partial:     false,
             destroyOnHide: true
         }, props);
      console.log('creating modal', props);
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
      return $modal;
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

   function _baseName(url) {
      var i = url.lastIndexOf('/')+1;
      return i && !url.substr(0, i).match(/^https?:\/\/$/)? url.substr(i) : '';
   }

})(jQuery);