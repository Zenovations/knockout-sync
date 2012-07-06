
# KnockoutSync

KnockoutSync is a persistence, validation, and synchronization library that connects Knockout.js with a data Store (a RESTful server, Firebase, etc).

## Installation
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/katowulf/knockout-sync/master/dist/knockout-sync.min.js
[max]: https://raw.github.com/katowulf/knockout-sync/master/dist/knockout-sync.js

In your web page, you need to have [jQuery][2], [Knockout.js][3], and [Knockout-mapping][5]!

```html
   <script type="text/javascript" src="jquery.js"></script>
   <script type="text/javascript" src="knockout.js"></script>
   <script type="text/javascript" src="knockout.mapping.js"></script>
```

Then include knockout-sync:

```html
    <script type="text/javascript" src="knockout-sync.all.min.js"></script>
```

Alternately, if you want to include your own data store or validator:

```html
    <!-- just the basic lib -->
    <script type="text/javascript" src="knockout-sync.min.js"></script>
    <!-- my validator -->
    <script type="text/javascript" src="assets/js/MyValidator.js"></script>
    <!-- my data store -->
    <script type="text/javascript" src="stores/{PICKONE}Store.js"></script>
```

## Usage

### Create a data storage instance (a store):

```javascript
    // create a data store
    var store = new ko.sync.stores.FirebaseStore('http://beta.firebase.com/account_name', 'path/to/store');
```

### Create a data model

```javascript
    // create a data model
    var model = new ko.sync.Model({
        dataStore:  store,
        dataTable:  'user',
        primaryKey: 'userId',
        validator:  ko.sync.Validator,
        fields: {
            userId:       { observe: false },                       // primary key for this record
            name:         {}                ,                       // required string
            email:        { type: 'email' },                        // required email
            created:      { type: 'date' },                         // required date
            status:       { persist: false, required: false },      // optional string, not stored in database
            counter:      { type: 'int', observe: false },          // required counter, not observed by knockout
            fiveDigitNum: { type: 'int', minLen: 5, maxLen: 5 },    // required 5 digit number
            customFormat: { format: formatFxn, valid: validateFxn } // custom field with custom formatting and validation
        }
    });
```

### Apply the model to a view, observableArray, array, or plain old object

Just call `ko.sync.use(...)` (usually from inside the view model)

```javascript
    // initialize a view model using the data model
    function View(model) {
        var self = this;

        // add all the fields from the data model
        // this view now represents a single Record
        ko.sync.use(model, this);

        // add a computed field
        // (we can only refer to the model's fields, name and address, after ko.sync.use() is called!)
        self.emailUrl = ko.computed(function() {
           'mailto: ' + self.name() + '<' + self.address() + '>';
        });
    };
    var view = new View(model);
    ko.applyBindings(view);

    // on an observableArray, creates an array of Records
    var users = ko.sync.newList( model );
    var users = ko.sync.use( model, ko.observableArray() );  // same thing

    // on an object, creates a single Record
    var view = ko.sync.newView( model );
    var view = ko.sync.use( model, {} ); // same thing
```

### Perform CRUD operations on Knockout observables

Once `ko.sync.use()` is called on a view/object, it has its own CRUD methods:

```javascript
      var view = ko.sync.newView(model);

      // create a user from some json data we got elsewhere
      // if there is an ID field, then it's an existing record, otherwise it's a new one
      view.crud.create( {data...} );

      // or get a user from the database
      view.crud.load( userId );

      // update the user
      view.saveButtonClick = function() {

         // see if the record has changed
         if( view.crud.isDirty() ) {

             // validate the user
             view.crud.validate().then(

                // save the user
                function() {
                   view.crud.save().then(function() { console.log('saved!'); });
                },

                // validation failed
                function(errors) { }
             );
         }
      };

      // delete the user
      view.deleteButtonClick = function() {
         view.crud.remove();
      };
```

### Applying a model to observable arrays

Arrays also get special `create()` and `remove()` methods

Note that there is no need to use destroy() as removed items are automagically tracked by ko.sync.Model.

```javascript
    // generate an array that contains model objects
    var users = ko.observableArray();
    ko.sync.use(users, model);

    // or the shorthand
    var users = ko.sync.newList(model);

    // create a new user in the array
    users.crud.create({name: 'John Smith', ...});
    users.push(model.new({name: 'John Smith', ...})); // same thing

    // or load some users from the database (all users created in the last hour)
    users.crud.load( {created: {greaterThan: new Date().valueOf() - 3600}} );

    // delete a user from the list
    users.crud.remove( userId );
    users.remove(user); // this works too

    // now save all of the changes manually
    users.crud.save();
```

# Some Mistakes to Avoid

Why make the same ones everyone else does? Be original!

//todo look these over

 - fields which are not observable may be persistent, but they will not trigger autoupdates (we aren't observing them after all)
 - you must call ko.sync.use(...) on a view before assigning any ko.computed properties which will access those fields
 - if you don't set the autoupdate flag to true on the model, remove/create operations are not immediately sent to the server
 - `create()` makes a new record, but if it has an ID, then it's not considered an add operation (it is considered an existing record) and the dirty flag is not set
 - you can create() a record with invalid data, but cannot save it (assuming a validator is active)

# API

## ko.sync

This is the root namespace for KnockoutSync methods

### ko.sync.use(target, model)

@param {Object} `target` a Knockout.js view or object to store the observables and values on
@param {Model} `model` an instance of ko.sync.Model to be bound to the view
@returns {ko.sync}

```javascript
   var model = new ko.sync.Model( {...} );

   // apply the model to a Knockout.js vew (something we will call `ko.applyBindings` on later)
   function View(model) {
      ko.sync.use(this, model); // apply model definition
   }
   ko.applyBindings( new View(model) );

   // apply the model to an empty object
   var data = ko.sync.use({}, model);

   // apply the model to an observableArray
   var list = ko.sync.use( ko.observableArray(), model );
```

This method applies all the Model's fields to the `target` object, mapping observable fields as appropriate.

It also adds the special `crud` member variable, which is a `Crud` instance (see `Crud` below).

If it is also an observableArray, then the options listed under `Crud.Array` are also available.

### ko.sync.newList( model [, data] )

@param {Model} model
@param {Array<object>} [data]
@returns {object} `ko.observableArray()` instance

Applies the `Crud.Array` methods to an observable Array object. Each element in the observable array represents one
Record of the type specified by our model. If an item is inserted into the array which is not a compatible Record,
an exception will be thrown.

If `data` is specified, then it is loaded into the new record using the same behaviors as `Crud.create()` regarding
the dirty flag. However, autosave will not be run and save() must be called manually to apply any updates.

```javascript
   // apply the model to an observableArray
   var list = ko.sync.newList( model );
   var list = ko.sync.use( ko.observableArray(), model ); // same thing
```

### ko.sync.newView( model [, data] )

@param {Model} model
@param {Object} [data]
@returns {object} with `Crud` methods attached

Creates a view representing a single Record. This Record is suitable for use as a Knockout.js View or for just
about anything else an object with observable attributes might be useful for.

If `data` is specified, then it is loaded into the new record using the same behaviors as `Crud.create()` regarding
the dirty flag. However, autosave will not be run and save() must be called manually to apply any updates.

```javascript
   // apply the model to a plain object
   var rec = ko.sync.newRecord( model );
   var rec = ko.sync.use( {}, model });  // same thing
```

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

## Crud (target.crud)

Obtained by calling `ko.sync.use()` on an object or `ko.sync.newRecord()`

### Crud.isDirty()

@returns {boolean}

True if any data has been modified on the record since it was last synchronized with the server.

```javascript
   var model = ko.sync.Model({
      dataStore: store,
      dataTable: table,
      fields: {counter: 0}
   });

   var data = ko.sync.use({}, model);
   data.crud.isDirty(); // false
   data.counter(1);
   data.crud.isDirty(); // true
```

### Crud.isDirty( newValue )

@param {boolean} newValue
@returns {boolean} old value

Force the isDirty flag to true or false (use this with care!)

### Crud.create(fields)

@param {object} fields
@returns {Promise} fulfilled when the store returns a result

Creates a new Record for the given model. If the record contains an ID, then it assumed to be up to date. If it is
to be marked dirty, this can be done manually with `record.crud.isDirty(true)`

When auto-update is true, new records are saved immediately and the promise fufills upon their return. Otherwise, new
records are marked dirty and the promise fulfills immediately.

```javascript
   var model = ko.sync.Model({
      dataStore: store,
      dataTable: table,
      fields: {counter: 0}
   });

   var data = ko.sync.use({}, model);
   data.counter(10);

   data.create().then(
      function(result) { /* runs after the store returns result */ },
      function(errors) { /* runs if record was not valid */ }
   );
```

### Crud.load()

@param {string} recordId
@returns {Promise} fulfilled when the store returns a result

```javascript
   var model = ko.sync.Model({
      dataStore: store,
      dataTable: table,
      primaryKey: 'id',
      fields: {counter: 0}
   });

   var data = ko.sync.newRecord(model);
   data.load( recordId ).then(
      function(result) { /* runs after the store returns result */ },
      function(errors) { /* runs if record could not be found */ }
   );
```

### Crud.save()

@returns {Promise} resolved after the data store returns results

Save the record, assuming isDirty() is true. Resolves with the number of fields changed. If isDirty() is false,
then still fulfills promise with a count of 0.

```javascript
   function logCount(fieldsChanged) { console.log(fieldsChanged); }

   var record = ko.sync.newRecord( model, loadedData );
   record.crud.save().then(logCount); // 0 - isDirty() == false

   record.counter(10);                // change a field
   record.favoriteColor('green');     // change another field
   record.crud.save().then(logCount); // 2
```

#### Crud.validate()

@returns {Promise} which resolves if data is valid or rejects if it is not

```javascript
   var record = ko.sync.newRecord( model, someData );
   record.validate().then(
      function() { /* it is valid */ },
      function(errors) { /* an object of fields -> (string)error messages */ }
      );
```

## Crud.Array (extends Crud)

When `ko.sync.use()` is applied to `ko.observableArray()`, it creates an extended Crud object which also has
some special array functionality.

#### Crud.Array.remove(id)

@param {string} id the id of the record to remove
@returns {Promise} resolved after the data store returns results

```javascript
   var list = ko.sync.newList( model, someData );
   list.crud.remove( deletedRecordId ).then( function() { /* record was deleted */ } );
```

#### Crud.Array.create( records )

@params {Array<object>} records things to put into our array model
@returns

Load some JavaScript objects into our model. If the objects contain keys that already exist, they are marked as
existing and **the dirty flag is not set** (they are assumed to be clean and up-to-date). If auto-update is true,
new records will be sent immediately. Otherwise, flips the dirty flag on new records.

When auto-update is true, the promise will be fulfilled after the save operation completes. Otherwise, it will fulfill
immediately.

#### Crud.Array.load( params )

@param {object} params
@returns {Promise} resolved after the data store returns results

The params object may contain any of the following keys:

  - limit:  {int=100} number of records to return, use 0 for all
  - filter: {function} filter returned results (after query) using this function (true=include, false=exclude)
  - sort:   {array|string} either a field to sort results by or an array of fields
            (some stores, like Firebase, may choose to sort the results after they return)
  - desc:   {boolean} return records from beginning instead of the end of the list

<a id='Model' name='Model'></a>
## Model (ko.sync.Model)

The model represents a logical data component which can be shipped between client and the data layer. This is typically
representative of a table in a database or bucket in a NoSQL environment.

### Model(options) <constructor>

@param {object} options see options below

#### options.dataStore

{Store} Required. The data store which abstracts connections to the data layer. See the stores/ directory for examples.

#### options.dataTable

{String} Required. The table/bucket/etc where this model is to be stored

#### options.primaryKey

{String or Array} Required. Key used to identify records in the database. If a composite ID is to be used, multiple field names may be specified using an array.

#### options.sortField

{String or Array} If provided, records are sorted by the Store according to this field or fields. It is up to the store
how this is arranged. For instance, SQL databases may retrieve results using an ORDER BY clause.

The FirebaseStore converts the values to an integer equivalent and stores them with a priority to achieve sorting.

Some stores might (theoretically) have to retrieve the results as a whole and sort them manually, assuming they have
no way to enforce ordered data sets.

#### options.autosave

{Boolean|Array=false} When true, records are automatically stored each time any value in the record
changes. When false, the save() method must be called manually.

For arrays, this applies both to the elements of the array (delete/add operations) as well as the observable fields on each element.

#### options.validator

{Validator} If no validator is specified, then only required/not required validation is performed. To apply validation, just add a Validator instance (or roll your own) into the model:

```javascript
   var model = new ko.sync.Model({
      store: dataStore,
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

### Model.new()

@returns {Model}

The new function creates a new record. If a json hash is passed into the method, the attributes are added into the model.

Note that newly created objects are not saved to the data store unless they pass all validation tests!

# Testing

Browse to test/index.html and enjoy the pretty colors

# TODO

## Offline storage

Use HTML5 storage to track changes if the network connection is lost.

## Merge changes

Use http://code.google.com/p/google-diff-match-patch/ and some versioning (when offline), like update counters, to apply changes

## Where clauses for Crud.Array.load()?

```javascript
   // find the last ten book reviews in the sci-fi genre, sorted by ranking
   data.crud.load( {limit: 10, desc: true, sort: 'rank', where: {genre: 'sci-fi'}} );
```

Where clauses contain a list of key/value pairs, where the key is a field name and the value is a string representing
an exact match, or an object containing one or more of the following:

  - greaterThan: {int|Date}
  - lessThan:    {int|Date}
  - contains:    {string}
  - beginsWith:  {string}
  - endsWith:    {string}
  - equals:      {*}
  - in:          {Array} of possible values

And of course we can do logical negation (i.e. "not")

  - notGreaterThan:   {int|Date}
  - notLessThan:      {int|Date}
  - notContaining:    {string}
  - notBeginningWith: {string}
  - notEndingWith:    {string}
  - notEquals:        {*}
  - notIn:            {Array} of possible values

  [1]: http://en.wikipedia.org/wiki/Futures_and_promises
  [2]: http://docs.jquery.com/Downloading_jQuery
  [3]: http://knockoutjs.com/documentation/installation.html
  [4]: http://api.jquery.com/promise/
  [5]: https://github.com/SteveSanderson/knockout.mapping/tree/master/build/output