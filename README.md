
# KnockoutSync

KnockoutSync is a persistence layer that connects Knockout.js with a data Store (a RESTful server, Firebase, etc).

## Installation

Include the following in your html:

```html
    <script type="text/javascript" src="knockout-sync.min.js"></script>
    <script type="text/javascript" src="stores/{PICKONE}Store.js"></script>
```

If you plan to use the data validator, include that too (or grow your own):

```html
    <script type="text/javascript" src="src/Validator.js"></script>
```

Alternately, if you aren't worried about a few bytes, simply include the minimized code containing everything:

```html
    <script type="text/javascript" src="knockout-sync.all.min.js"></script>
```

## Usage

### Create a data storage instance (a store):

```javascript
    // create a data store
    var store = new FirebaseStore('http://beta.firebase.com/account_name', 'optional/root/path');
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
        ko.sync.use(this, model);

        // add a computed field
        // (we can only refer to the model's fields, name and address, after ko.sync.use() is called!)
        self.emailUrl = ko.computed(function() {
           'mailto: ' + self.name() + '<' + self.address() + '>';
        });
    };
    var view = new View(model);
    ko.applyBindings(view);

    // on an observableArray, which represents an array of Records
    var users = ko.sync.newList( model );
    var users = ko.sync.use( ko.observableArray(), model );  // same thing

    // on a plain object, which represents a single Record
    var users = ko.sync.newRecord( model );
    var users = ko.sync.use( {}, model ); // same thing
```

### Perform CRUD operations on Knockout observables

Once `ko.sync.use()` is called on a view/object, it has its own CRUD methods:

```javascript
      var view = ko.sync.use({}, model);

      // create a user from some json data we got elsewhere
      // if there is an ID field, then it's an existing record, otherwise it's a new one
      view.crud.create( {data...} );

      // or get a user from the database
      view.crud.load userId );

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

### ko.sync.newRecord( model [, data] )

@param {Model} model
@param {Object} [data]
@returns {object} with `Crud` methods attached

Creates an object representing a single Record. This Record is suitable for use as a Knockout.js View or for just
about anything else an object with observable attributes might be useful for.

If `data` is specified, then it is loaded into the new record using the same behaviors as `Crud.create()` regarding
the dirty flag. However, autosave will not be run and save() must be called manually to apply any updates.

```javascript
   // apply the model to a plain object
   var rec = ko.sync.newRecord( model );
   var rec = ko.sync.use( {}, model });  // same thing
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

{String='string'} The type of field, one of: string, int, float, email, date, time

##### fields.default

The initial value to set the field to (must pass validation). If a value is not specified, then the default is
based on the type:

 * boolean: false
 * int:     0
 * float:   0
 * string:  null
 * email:   null
 * date:    0
 * time:    '00:00'

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