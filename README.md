
//todo-readme remove all references to ko.sync.use, ko.sync.newList, ko.sync.newRecord, ko.sync.newView

# KnockoutSync

<span style="color: red">**This is pre-alpha software (unstable)**</span>

KnockoutSync is a persistence, validation, and synchronization library that connects Knockout.js with a data layer.

Right now, Firebase is the only data layer supported, but the design should allow any data layer by simply creating
a data store for the appropriate storage type and using that instead.

Simplified example:

```javascript
    //define a data model (e.g. a Firebase path or data table)
    var model = new ko.sync.Model({
        store:  new ko.sync.FirebaseStore(MY_URL),
        table:  'user',
        key: 'login',
        auto:   true,    // automagically sync changes
        fields: {
           login:    'string',
           email:    'email',
           pass:     'password',
           joinDate: 'date'
        }
    });

    //apply it to a knockout view (one record)
    var view = new View();
    model.sync(view);

    // or let the model automagically create a view
    var view = model.newView();   // one user

    // or let the model create a mapped observableArray
    var list = model.newList();   // a list of users

    // now the fields login, email, pass, and joinDate exist in the view/list
    view.email('new@address.tld'); // automatically synced to database!

    // arrays work as normal
    list.push( {login: 'newuser', email:...} ); // automatically saved too!
```

## Installation
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/zenovations/knockout-sync/master/dist/knockout-sync.min.js
[max]: https://raw.github.com/zenovations/knockout-sync/master/dist/knockout-sync.js

In your web page, you need to have [jQuery][2], [Knockout.js][3], [Knockout-mapping][5], and Knockout-sync!

```html
   <script type="text/javascript" src="jquery.js"></script>
   <script type="text/javascript" src="knockout.js"></script>
   <script type="text/javascript" src="knockout.mapping.js"></script>
    <script type="text/javascript" src="knockout-sync.all.js"></script>
```

Alternately, if you want to include your own data store or validator:

```html
    <!-- just the basic libs -->
    <script type="text/javascript" src="knockout-sync.js"></script>
    <!-- my validator -->
    <script type="text/javascript" src="assets/js/MyValidator.js"></script>
    <!-- my data store -->
    <script type="text/javascript" src="stores/{PICKONE}Store.js"></script>
```

## Usage

### Create a connection to your data layer (a store):

```javascript
    // create a store
    var store = new ko.sync.stores.FirebaseStore('http://beta.firebase.com/account_name/path/to/store');
```

### Create a data model

A data model represents a table/bucket/data type kept in the store and explains it's fields and storage behaviours. It
also provides validation if a validator is configured.

```javascript
    // create a data model
    var model = new ko.sync.Model({
        store:  store,
        table:  'user',
        key: 'userId',
        auto:   true,     // default is false, this makes record sync whenever a change occurs
        validator:  ko.sync.Validator,
        fields: {
            // primary key for this record, not a ko.observable()
            userId:       { observe: false },
            // required string
            name:         'string',
            // required email
            email:        'email',
            // required data
            created:      'date',
            // optional string, not stored in database (but is observed by ko)
            status:       { persist: false, required: false },
            // required counter, not observed by ko
            counter:      { type: 'int', observe: false },
            // required 5 digit number
            fiveDigitNum: { type: 'int', minLen: 5, maxLen: 5 },
            // custom field with custom formatting and validation
            customFormat: { format: formatFxn, valid: validateFxn }
        }
    });
```

### Create a view from the model

```javascript
   // creates a view representing a single Record
   var view = model.newView();
   ko.applyBindings(view);
```

### Create an observableArray from the model

The array is created using the ko.mapping plugin, and the methods available (mappedCreate, mappedRemove, et al) all
function as expected here.

```javascript
   // creates an array of Records (a RecordList) //todo-readme
   var users = model.newList();
```

### Apply model data to an existing view

```javascript
   // or initialize a more complex view using the data model
   function View(model) {
      // add all the fields from the data model
      // this view now represents a single Record
      model.sync(this);

      // (the fields from model are now ko.observable() instances!)
   };
   ko.applyBindings(new View(model));
```

### Perform CRUD operations on a view

Once `model.sync()` is called on a view/object, it gets a `rec` with CRUD methods:

```javascript
    model.sync(view);

    // create a user from some json data we got elsewhere
    // and sync the view's observables
    view.rec.create( {preloadedData...} );

    // or get a user from the database and load it into the view
    view.rec.read( userId );

    // update the user
    view.rec.update().then(function() { console.log('saved!'); });

    // delete the user
    view.rec.delete();

    // see if the record has changed
    view.rec.isDirty();

    // validate the user
    view.rec.validate();
```

### Perform crud operations on observable arrays

Arrays also get special `crud` member with complete CRUD operations. Note that there is no need to wrestle with `destroy()` and `remove()` as deleted items are automagically tracked and handled internally!

```javascript
    // sync an array
    model.sync( users [, preloadedData...] );

    // create a new user in the array
    users.crud.create({name: 'John Smith', ...});
    users.push(model.newRecord({name: 'John Smith', ...})); // same thing

    // or load some users from the database (all users created in the last hour)
    users.crud.read( {created: {greaterThan: new Date().valueOf() - 3600}} );

    // delete a user from the list
    users.crud.delete( userId );
    users.remove(user); // this works too

    // now save all of the changes
    // only necessary if the model was created with autoUpdate: false
    users.crud.update();
```

# Some Mistakes to Avoid

Why make the same ones everyone else does? Be original!

 - fields which are not observable may be persistent, but they will not trigger auto-updates (we aren't observing them after all)
 - you must call Model.sync(...) on a view before assigning any ko.computed properties which will access those fields (computed properties run at the moment of creation)
 - it's only possible to use Model.sync(...) on single records. Load existing lists with `Model.newList( data )` or `Model.newList().crud.read( parms )`
 - if you don't set the autoupdate flag to true on the model, remove/create operations are not immediately sent to the server
 - conflicts are not resolved intelligently (yet); updates are just applied blindly (the same as they would be if you did all the synchronizations yourself), but some day, some day
 - `create()` makes a new record, but if it is provided data with an ID, then it is considered an existing record and the dirty flag is not set
 - you can create() a record with invalid data, but cannot save it if it fails validation, if no validator exists, invalid data can be saved

# API

## Model (ko.sync.Model)

The model represents a bucket, path, or database table. It can be applied to  single Record or to a list of Records.

### Model.sync(target)

@param {Object} `target` a Knockout.js view or object to store the observables and values on
@param {Model} `model` an instance of ko.sync.Model to be bound to the view
@returns {ko.sync}

This method applies all the Model's fields to the `target` object, mapping observable fields as appropriate.

It also adds the special [crud](#crud) variable. When use(...) is applied to an observableArray, it gets a `crud` variables as well, although the behavior is [slightly different](#crudarray).

```javascript
   var model = new ko.sync.Model( {...} );

   // apply the model to a Knockout.js vew (something we will call `ko.applyBindings` on later)
   function View(model) {
      model.sync(this); // apply model definition
   }
   ko.applyBindings( new View(model) );

   // apply the model to an empty object
   var data = model.sync({}); // same as Model.newView();
```

### Model.newList( [data] )

@param {Array&lt;object&gt;} [data]
@returns {object} `ko.observableArray()` instance

Applies the `Crud.Array` methods to an observable Array object. Each element in the observable array represents one
Record of the type specified by our model. If an item is inserted into the array which is not a compatible Record,
an exception will be thrown.

If `data` is specified, then it is loaded into the new record using the same model as `Crud.create()` regarding
the dirty flag. However, autosave will not be run and save() must be called manually to apply any updates.

```javascript
   // apply the model to an observableArray
   var list = model.newList();
```

### Model.newView( [data] )

@param {Object} [data]
@returns {object} with `Crud` methods attached

Creates a view representing a single Record. This Record is suitable for use as a Knockout.js View or for just
about anything else an object with observable attributes might be useful for.

If `data` is specified, then it is loaded into the new record using the same behaviors as `Crud.create()`. However,
auto-save will not be triggered by data provided to this method (only if it changes later).

```javascript
   // apply the model to a plain object
   var view = model.newRecord();
```

## ko.sync

This is the static namespace for Knockout-Sync.

### ko.sync.handle( [scope, ] fx [, args..] )

@param {Object}   [scope] (optional) sets the `this` context while inside of `fx`
@param {Function} fx      the function to be invoked
@param {...*}     [args]  any additional arguments to be passed to `fx`
@return {Promise}

Runs a possibly asynchronous function which accepts a success callback (and optionally an error callback). Returns a
[Promise](#Promise) that will fulfill once the asynchronous function completes or throws an error.

The callback is prepended into position 0 by default. To put the value into another location in the arguments, just
 use the special ko.sync.handle.CALLBACK placeholder to specify the position.

```javascript
   // a simply async function with callback
   function getReply( callback ) {
      callback('hello');
   }

   ko.sync
        .handle( getReply )
        .then( function(reply) { console.log(reply); }); //hello

   // something a little more convoluted
   function smartReply( isLeaving, callback ) {
      var reply = isLeaving? 'goodbye' : hello;
      callback( reply );
   }

   ko.sync
       .handle( smartReply, true, ko.sync.handle.CALLBACK )
       .then( function(reply) { console.log(reply); }); //goodbye

   // with a scope context
   function smartAdd( callback, y ) {
      callback( this.x + y );
   }

   ko.sync.handle( {x: 3}, smartAdd, 2 )
          .then(function(sum) { console.log(sum); });  // 5
```

If the method throws an error or returns an error, it will be caught and the promise is rejected:

```javascript
    // thrown
    ko.sync.handle( function() { throw new Error('oops'); } )
           .then(...) // not called
           .fail(...) // gets Error('oops');

    // returned
    ko.sync.handle( function() { return new Error('double-oops'); } )
           .then(...) // not called
           .fail(...) // gets Error('double-oops');
```

Some methods have a success and failure callback (i.e. errback). If no arguments are added, the errback is
automatically passed after the callback function. Otherwise, simply add the errback placeholder to tell the lib
where to put it.

```javascript
   function errorCallback( a, callback, b, errback ) {
      errback( a + b );
   }

   // if there are no arguments, then errback function is passed after the callback
   ko.sync.handle( function(callback, errback) { errback('I work'); } );

   // but if arguments exist, then we must tell the lib where to put the errback (or it assumes we don't want one)
   ko.sync.handle( errorCallback, 'no', ko.sync.handle.CALLBACK, 'way!', ko.sync.handle.ERRBACK );
```

### ko.sync.when( [scope, ] fx [, args..] )

@param {Object}   [scope] (optional) sets the `this` context while inside of `fx`
@param {Function} fx      the function to be invoked
@param {...*}     [args]  any additional arguments to be passed to `fx`
@return {Promise}

Wraps a function to be invoked and returns a Promise ([jQuery.Deferred.promise][4]) that will fulfill once a value is returned. If the
method returns a promise, then that promise is returned directly. If the method throws an error, then it will
be caught and the promise will be rejected. Thus, this is a great way to handle errors, promises, and values synchronously.

```javascript
   ko.sync.when( function() { return 1 } )
          .then(...);  // 1

   ko.sync.when( function() { return $.Deferred().resolve('hello').promise(); } )
          .then(...);  // 'hello'

   ko.sync.when( function() { throw new Error('oops'); } )
          .then(...)  // not called
          .fail(...); // Error('oops')

   ko.sync.when( function() { return new Error('fail'); } )
          .then(...)  // not called
          .fail(...); // Error('fail')
```

<a name="crud" id="crud"></a>
## Crud

The .crud object is added to any observable after calling `Model.sync()` or `Model.newView()`. It provides a complete
set of CRUD methods for syncing data with the data store.

### Crud.isDirty()

@returns {boolean}

True if any data has been modified on the record since it was last synchronized with the server.

```javascript
   var model = ko.sync.Model({
      store: store,
      table: table,
      fields: {counter: 0}
   });

   var data = model.newView();
   data.crud.isDirty(); // false
   data.counter(1);
   data.crud.isDirty(); // true
```

### Crud.isDirty( newValue )

@param {boolean} newValue
@returns {boolean} old value

Force the isDirty flag to true or false (use this with care!)

```javascript
   var view = model.newView();
   view.crud.isDirty(); // false
   view.crud.isDirty(true);
   view.crud.isDirty(); // true
```

### Crud.create(fields)

@param {object} fields
@returns {Promise} fulfilled when the store returns a result

Creates a new Record for the given model and loads it into the view. If the `fields` object does not contain an ID (the
normal behavior) then the new record is marked as dirty so it will be saved to the database. If the record contains
an ID, then it assumed to already exist (i.e. loaded from an external source) and the dirty flag is not set. It
can be marked dirty manually with `record.crud.isDirty(true)`

When auto-update is true, new records are saved immediately after the dirty flag is triggered and the promise fufills
only upon their return. Otherwise, new records are marked dirty and the promise fulfills immediately (awaiting a
manual `update()` call later.

```javascript
   var model = ko.sync.Model({
      store: store,
      table: table,
      fields: {counter: 'int'}
   });

   var view = model.newView();
   view.create({counter: 10}).then(
      function(recordId) { /* runs after the store returns result */ },
      function(errors)   { /* runs if record was not valid */ }
   );

   view.counter(); // 10
```

### Crud.read(recordId)

@param {string} recordId
@returns {Promise} fulfilled when the store returns a result

Reads a record from the database and loads it into the view object. Overwrites any existing values.

```javascript
   var model = ko.sync.Model({
      store: store,
      table: table,
      key: 'id',
      fields: {counter: 'int'}
   });

   var view = model.newView();
   data.read( recordId ).then(
      function(result) { /* runs after the store returns result */ },
      function(errors) { /* runs if record could not be found */ }
   );
```

### Crud.update()

@returns {Promise} resolved after the data store returns results

Update (save) the record, assuming isDirty() is true. Resolves with the number of fields changed. If isDirty() is false,
then still fulfills promise with a count of 0.

If autoUpdate is true, then running this method will generally not have any effect (since any changes would already
have been committed).

```javascript
   function logCount(fieldsChanged) { console.log(fieldsChanged); }

   var record = model.newView( model );
   view.crud.update().then(logCount); // 0 - isDirty() == false

   view.counter(10);                // change a field
   view.favoriteColor('green');     // change another field
   view.crud.update().then(logCount); // 2
```

### Crud.delete()

@returns {Promise} which resolves with a boolean (did the record exist and was it deleted) and only fails if a database error occurs

```javascript
   var view = model.newView( {recordId: 'record123'} ); // create model with an existing record
   view.crud.delete();
```

### Crud.validate()

@returns {Promise} which resolves if data is valid or rejects if it is not

```javascript
   var view = model.newView( someData );
   view.crud.validate().then(
      function() { /* it is valid */ },
      function(errors) { /* an object of fields -> (string)error messages */ }
      );
```

## Crud.Array (applied when `Model.newList()` is invoked)

When `Model.newList()` is called, a Crud object with special array functionality is applied to the observable array.

### Crud.Array.isDirty()

@returns {boolean}

True if any data has been modified on any record in this list since it was last synchronized with the server.

```javascript
   var model = ko.sync.Model({
      store: store,
      table: table,
      fields: {counter: 0}
   });

   var data = model.newList();
   data.crud.isDirty(); // false
   data.counter(1);
   data.crud.isDirty(); // true
```

### Crud.Array.create( records )

@params {Array<object>} records things to put into our array model
@returns {Promise} resolved after store verifies the add (if autoUpdate is true) and contains the new record id

Load some JavaScript objects into our model. If autoUpdate is true, new records will be saved immediately.

When auto-update is true, the promise will be fulfilled after the save operation completes and contains the recordId.
Otherwise, it will fulfill immediately with a null value.

```javascript
   var list = ko.sync.newList(model, [ {id: 'record1', counter: 5}, {id: 'record2', counter: 10} ]);
   list.isDirty(); // false

   // add a record
   model.auto = false; // disable auto-updates
   list.crud.create( {counter: 2} );
   list.push( {counter: 2} ); // this works too!
   list.crud.isDirty(); // true

   // checkpoint the list, meaning erase isDirty history
   list.crud.checkpoint();
   list.crud.isDirty(); // false

   // add a new record
   model.auto = true; // enable auto-updates
   list.crud.create( {counter: 0} ).then(function(recordId) { list.crud.isDirty(); /* false! */ });
   list.crud.isDirty(); // true (this will run before create() returns!)
```

### Crud.Array.read( params )

@param {object}    [params]
@returns {Promise} resolved if limit is reached or if a failure occurs (does not contain the values fetched!)

Perform a query against the database. The `params` argument may contain:

- limit:   {int=100}         number of records to return, use 0 for all
- offset:  {int=0}           starting point in records, e.g.: {limit: 100, start: 101} would return records 101-200
- when:    {function|object} filter rows using key/value pairs or a function
- sort:    {array|string}    sort records by this field or fields (this could be costly and load all records!)

The results are synchronized into the observable array, which is bound to knockout, so there's normally nothing to
do with them, other than wait for them to load. However, the results can be accessed as they are received by the
Promise's `progress` method.

The Promise's `then`, `done`, and `fail` methods are only invoked if all records are returned or `limit` is reached.

```javascript
    // fetch records up to the default limit (100)
    list.crud.read();

    // fetch records up to the default limit and handle each record without bindings/knockout events
    list.crud.read()
        .progress(function(nextRecord) { /* called as each record is loaded */ })
        .done(function() { /* called when all records are loaded or limit is reached */ })
        .fail(function() { /* called if non-recoverable error occurs */ });
```

#### limit parameter
It is possible that the promise will never be fulfilled if there are fewer records available than `limit`. This
is an important consideration as code that waits on the promise to fulfill will be quite lonely.

```javascript
    // get the most recent 100 records (the default)
    list.crud.read({ limit: 100 });

    // get all the records
    list.crud.read({ limit: 0 });
```

#### when parameter
If `when` is a function, it is always applied after the results are returned. Thus, when used in conjunction
with `limit`, there may (and probably will) be less results than `limit` en toto. The function returns true for
records to keep and false for ones to discard. It receives the record data as a hash(object) and the record's ID as
a string.

If `when` is a hash (key/value pairs), the application of the parameters is left up to the discretion of
the store. For SQL-like databases, it may be part of the query. For data stores like Simperium, Firebase, or
other No-SQL types, it could require fetching all results from the table and filtering them on return. So
use this with discretion.

The keys are field names, and the values are a string or integer (equals match) or an object containing any
of the following:

```javascript
     // filter results using a function
     list.crud.read({
        when: function(recordData, recordId) { return data.color = 'purple' && data.priority > 5; }
     });

     // filter results using a hash
     list.crud.read({
        when: {color: 'purple', priority: {greaterThan: 5}}
     });
```

#### sort parameter
When `sort` is a string, it represents a single field name. If it is an array, each value may be a field name (sorted
ascending) or an object in format {field: 'field_name', desc: true}.

This may require that all records be loaded from the database to apply the sorting, depending on the capabilities of
the data store.

```javascript
   // get the most recent 100 records, sorted by priority (descending), last_name, then first_name
   list.crud.read({
      sort: [{field: 'priority', desc: true}, 'last_name', 'first_name']
   });
```

#### performance considerations
There are no guarantees on how a store will optimize a query. It may apply the constraints before or after
retrieving data, depending on the capabilities and structure of the data layer. To ensure high performance
for very large data sets, and maintain store-agnostic design, implementations should use some sort of
pre-built query data in an index instead of directly querying records (think NoSQL databases like
DynamoDB and Firebase, not MySQL queries)

Alternately, very sophisticated queries could be done external to the knockout-sync module and then
injected into the synced data after.

#### Crud.Array.update(id, fields)

@param {string} id      the id of the record to modify
@param {object} fields  a key/value hash of fields/values, respectively, to update
@returns {Promise} resolved after the data store returns results (when autoUpdate is false)

Update a record in the array. Normally, the records would be updated via knockout bindings. But they can be altered
directly with this call.

```javascript
   // update the counter on a record
   list.crud.update( 'record123', { counter: 25 } );
   list.crud.isDirty(); // true if autoUpdate == false (otherwise, it's been saved already)
```

#### Crud.Array.delete(id)

@param {string} id the id of the record to remove
@returns {Promise} resolved after the data store returns results

If autoUpdate is true, then the promise resolves after the save. Otherwise, this resolves immediately.

```javascript
   var list = ko.sync.newList( model, someData );
   list.crud.delete( deletedRecordId ).then( function() { /* record was deleted */ } );

   list.remove( record ); // this is also valid and still works with autoUpdate (but doesn't return a promise obviously)
```

<a id='Model' name='Model'></a>
## Model (ko.sync.Model)

The model represents a logical data component which can be shipped between client and the data layer. This is typically
representative of a table in a database or bucket in a NoSQL environment. In Firebase this is a single `path`.

### Model(options) <constructor>

@param {object} options see options below

#### options.store

{Store} Required. The data store which abstracts connections to the data layer. See the stores/ directory for examples.

#### options.table

{String} Required. The table/bucket/etc where this model is to be stored

#### options.key

{String or Array} Required. Key used to identify records in the database. If a composite ID is to be used, multiple field names may be specified using an array.

#### options.sort

{String or Array} If provided, records are sorted by the Store according to this field or fields. It is up to the store
how this is arranged. For instance, SQL databases may retrieve results using an ORDER BY clause.

The FirebaseStore converts the values to an integer equivalent and stores them with a priority to achieve sorting.

Some stores might (theoretically) have to retrieve the results as a whole and sort them manually, assuming they have
no way to enforce ordered data sets.

#### options.auto

{Boolean|Array=false} When true, records are automatically stored each time any value in the record/array
changes. When false, the `Crud.update()` method must be called manually.

#### options.validator

{Validator} If no validator is specified, then only required/not required validation is performed. To apply validation, just add a Validator instance (or roll your own) into the model:

```javascript
   var model = new ko.sync.Model({
      store: store,
      validator: ko.sync.Validator;
      ...
   });
```

#### options.defaults

{Object} Override any of the field properties' default values here (e.g. so that we don't have to type required: true
for every field)

#### options.fields

{Object} Required. The database fields. All field properties are optional.

##### fields.required

{Boolean=false} When true the field must be set to a truthy value. For integers, required means it must not be zero.

##### fields.persist

{Boolean=true} When false, this field is not sent to the data store during save operations. It is possible to observe
fields which are not persistent.

##### fields.observe

{Boolean=true} When false, the field is not wrapped in a Knockout.js observable. It is important to note than
fields which are not observed cannot trigger an auto-update (we aren't observing them). They can still be stored
when a save occurs.

##### fields.type

{String='string'} The type of field, one of: string, int, float, email, date

Dates can be UTC or local. When they are sent to the store, it will automagically convert them
to the preferred format for whatever protocol it will communicate them to the server. ISO 8601 dates are usually preferable
for ensuring concise communication of the date/time.

Emails are strings which must be in the format `address@domain.tld` or '"First Last" <address@domain.tld>'.

For int and float, invalid values will be the responsibility of the store to convert as needed.

##### fields.default

The initial value to set the field to (must pass validation). If a value is not specified, then the default is
based on the type:

 * boolean: false
 * int:     0
 * float:   0
 * string:  null
 * email:   null
 * date:    null

##### fields.minLength

{int=0} The minimum length of value (applies only to string, float, int)

##### fields.maxLength

{int=0} The maximum length of this value (0=no max). Does not apply to date or time.

##### fields.valid

{Function} Overrides the default validation function. Inside the function call, `this` will refer to the Record instance.

##### fields.format

{Function} Overrides the default formatting function. Inside the function call, `this` will refer to the Record instance

# Creating Data Stores

Read over src/classes/Store.js and implement each method according the purview of your particular needs and data storage device's capabilities.

# Testing

Browse to test/index.html and enjoy the pretty colors

# TODO

## Offline storage

Use HTML5 storage to track changes if the network connection is lost.

## Merge changes

Use http://code.google.com/p/google-diff-match-patch/ and some versioning (when offline), like update counters, to apply changes

  [1]: http://en.wikipedia.org/wiki/Futures_and_promises
  [2]: http://docs.jquery.com/Downloading_jQuery
  [3]: http://knockoutjs.com/documentation/installation.html
  [4]: http://api.jquery.com/promise/
  [5]: https://github.com/SteveSanderson/knockout.mapping/tree/master/build/output