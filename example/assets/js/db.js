
(function($) {
   "use strict";

   /** CONTROLLER
    ********************************************************/
   var Controller = {
      setPanel: function(name, panel) {
         Controller.panels[name] = panel;
      },
      getPanel: function(name) {
         return Controller.panels[name];
      },
      bindPanel: function(name, parentContext) {
         return parentContext.createChildContext(Controller.getPanel(name));
      },
      addStore: function(name, type, store, desc) {
         var opts = {name: name, type: type, inst: store, desc: desc};
         Controller.stores.mappedCreate(opts);
         Controller.storeNames.push(name);
      },
      storeNames:   ko.observableArray(),
      panels: {}, //todo observable?
      models: {}  //todo observable?
   };
   _.extend(Controller, ko.mapping.fromJS({
         stores: []
      }, {
         'stores': {
            key: function(data) {
               return ko.utils.unwrapObservable(data.name);
            }
         }
      }
   ));
   Controller.modelsCount = ko.computed(function() {
      return _.size(Controller.models);
   });
   Controller.hasStores = ko.computed(function() { return Controller.stores().length > 0; });
   Controller.addStore('muck', 'Firebase', new Firebase('http://wordspot.firebaseio.com/muck'), 'http://wordspot.firebaseio.com/muck');
   Controller.addStore('sync', 'Firebase', new Firebase('http://wordspot.firebaseio.com/SYNC'), 'http://wordspot.firebaseio.com/SYNC');

   /** StoresPanel
    ********************************************************/
   var StoresPanel = {
      EditPanel: new (function() {
         var self = this, $modal;
         self.storeTypes = ['Firebase'];
         self.createStore = function(form) {
            console.log('create store invoked');
            var $form = $(form);
            if( $form.valid() ) {
               var name = $('#instanceName').val(),
                     type = $form.find('[name="storeType"]').val(),
                     url  = $('#instanceUrl').val(),
                     store;
               $modal && $modal.modal('hide');
               store = new ko.sync.stores.FirebaseStore(url);
               Controller.addStore(name, type, store, url);
               console.log('Store added');
            }
            return false;
         };
         self.showEditForm = ko.observable(false);
         self.editStore = function() {
            console.log('editStore', this, arguments);
         };
         self.baseUrl = ko.observable('');
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
                  storeType = ko.observable('Firebase');
            $modal = createModal($.extend({
               title: 'Create a Store',
               body: '<div data-bind="template: \'form-create-store\'"></div>',
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

   /** ModelsPanel
    ********************************************************/
   var ModelsPanel = {
      models: Controller.loadedModels,
      EditPanel: new (function() {
         var self = this, $modal;
         self.fillModelForm = function(form) {
            console.log('fillModelForm', form, this);
         };
         self.createModel = function(form) {
            console.log('createModel', form, this);
         };
         self.storeNames = Controller.storeNames;
      })
   };
   Controller.setPanel('ModelsPanel', ModelsPanel);

   /** CUSTOM BINDINGS
    ********************************************************/
   ko.bindingHandlers.boundHtml = {
      update: function(element, valueAccessor) {
         console.log('boundHtml');
         var html = valueAccessor();
         $(element).html(html);
//         ko.applyBindings(viewModel, element);
      }
   };

   ko.bindingHandlers.validate = {
      init: function(element, valueAccessor) {
         // This will be called when the binding is first applied to an element
         // any items added by a template or after the initial binding won't be handled here
         var opts = valueAccessor();
         typeof(opts) === 'object' || (opts = {});
         console.log('validate', opts);
         $(element).validate(opts);
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
         _after(props.after).done(loadPartial($(element), props.name, props.ctx));
         // Also tell KO *not* to bind the descendants itself, otherwise they will be bound twice
         return { controlsDescendantBindings: (props.ctx? true : false) };
      }
   };

   ko.bindingHandlers.slideToggle = {
      init: function(element, valAccessor, allAccessor, view, bindContext) {
         var props = $.extend({}, valAccessor()), $target = $(props.target), $button = $(element);
         $button.click(function() {
            $target.slideToggle().toggleClass('active');
            $button.toggleClass('btn-primary').text($button.hasClass('btn-primary')? 'Add a Model' : 'Cancel');
         });
      }
   };

   /** DOM READY
    ********************************************************/
   $(function($) {
      // add some jQuery validations
      $.validator.addMethod('uniqueStoreName', function(value, element) {
         return Controller.stores.mappedIndexOf({name: value}) < 0;
      }, 'That name already exists');
      $.validator.addMethod('uniqueModelName', function(value, element) {
         return ModelsPanel.models.mappedIndexOf({name: value}) < 0;
      }, 'That name already exists');

      // connect them to css classes
      jQuery.validator.addClassRules({
         uniqueStoreName: { uniqueStoreName: true, required: true },
         uniqueModelName: { uniqueModelName: true, required: true }
      });

      // dropkick knockout in the temple
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
      // renderTemplate doesn't actually give us access to the element it creates
      // and if we use replaceNode we don't get access to that either, so instead
      // we will do this little magic to get the child of our element, which
      // is where the template contents will be
      var $e = $('<div />');
      ko.renderTemplate(template, view, opts, $e.get(0));
      return $e.find('.modal').appendTo(target);
   }

   function _baseName(url) {
      var i = url.lastIndexOf('/')+1;
      return i && !url.substr(0, i).match(/^https?:\/\/$/)? url.substr(i) : '';
   }

})(jQuery);