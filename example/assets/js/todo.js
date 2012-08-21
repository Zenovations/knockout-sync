
jQuery(function() {
   /** KNOCKOUT-SYNC CONFIG
    ******************************************************************/
   ko.sync.Model.FIELD_DEFAULTS.required = true;

   // the data layer connection (Firebase)
   var STORE = new ko.sync.stores.FirebaseStore('http://gamma.firebase.com/wordspot', 'muck');

   // the data model for our list
   var TODO = new ko.sync.Model({
      table: 'todo',
      key: 'id',
      store:      STORE,
      sort:  'sort',
      fields: {
         id:             null,
         sort:      { type: 'int' },
         stringRequired: null,
         created:        { type: 'date' },
         completed:      { required: false, type: 'date'   },
         creator:        null,
         completor:      null,
         list:           null
      }
   });

   var USERS = new ko.sync.Model({
      table: 'users',
      key:   'id',
      store:       STORE,
      fields: { id: null, username: null, status: null, loggedin: { type: 'date' } }
   });

   var LISTS = new ko.sync.Model({
      table: 'lists',
      key:   'id',
      store:       STORE,
      fields: { id: null, name: null, sort: { type: 'int' } }
   });

   /** KNOCKOUT VIEW
    ******************************************************************/

   var VIEW = {
      todos: TODO.newList(),
      users: USERS.newList(),
      lists: LISTS.newList()
   };
   ko.applyBindings(VIEW);


   /** FETCH USER'S NAME
    ******************************************************************/
   var username = $.cookie('username');
   if( !username || username == 'Anonymous' ) {
      username = prompt('Please enter your name') || 'Anonymous';
      if( username !== 'Anonymous' ) {
         $.cookie('username', username, {expires: 30, path:    "/"});
      }
   }

   /** SHOW AN ALERT ANY TIME A USER LOGS IN
    ******************************************************************/
   var $freeow = $('<div id="freeow" class="freeow freeow-top-right"></div>').appendTo('body'), freeowOpts = {
      classes: ['smokey', 'slide'],
      showDuration: 250,
      autoHideDelay: 2000,
      hideStyle: {
         opacity: 0,
         left: "400px"
      },
      showStyle: {
         opacity: 1,
         left: 0
      }
   };
   $freeow.freeow('You are logged in', '(as '+username+')', freeowOpts);

   //todo
   //todo
   //todo
   //todo

   /** Handle clicks on the lists
    ******************************************************************/
   $('#navbar li').click(function() {
      //todo
      //todo
      //todo
      $(this).toggleClass('active');
   });


   /** check/uncheck the box whenever list item is clicked
    ******************************************************************/
   $('#thelist li i.icon-remove-sign').click(function(){
      //todo
      //todo
      //todo
      //$(this).parent('li').fadeOut(function() { $(this).remove(); });
      return false;
   });

   $('#thelist li a.tag').click(function() {
      //todo
      //todo
      //todo
      return false;
   });

   $('#thelist li').click(function() {
      //todo
      //todo
      //todo
      $(this).find('i[class*="icon-check"]').toggleClass('icon-check-empty icon-check');
   });

});

