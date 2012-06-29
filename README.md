
# KnockoutSync

KnockoutSync is a persistence layer that connects Knockout.js with a data Store (a RESTful server, Firebase, etc).

## Installation

Include the following in your html:

```html
    <script type="text/javascript" src="knockout-sync.min.js"></script>
    <script type="text/javascript" src="stores/{PICKONE}Store.js"></script>
```

If you plan to use the data validator, include that too:

```html
    <script type="text/javascript" src="knockout-sync.min.js"></script>
    <script type="text/javascript" src="stores/{PICKONE}Store.js"></script>
    <script type="text/javascript" src="validators/Validator.js"></script>
```

Alternately, you can include the minimized code containing all validators and stores:

```html
    <script type="text/javascript" src="knockout-sync.all.min.js"></script>
```

## Usage

### Create a data storage instance (a store):

```javascript
    // create a data store
    var store = new FirebaseStore('http://beta.firebase.com/database_name');
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

### Apply the model to a view, observableArray, or plain old object

Just call `ko.sync.use(...)` (usually from inside the view model)

```javascript
    // initialize a view model using the data model
    function View(model) {
        var self = this;

        // add all the fields from the data model
        ko.sync.use(this, model);

        // add a computed field
        // (we can only refer to the model's fields, name and address, after ko.sync.use() is called!)
        self.emailUrl = ko.computed(function() {
           'mailto: ' + self.name() + '<' + self.address() + '>';
        });
    };
    var view = new View(model);
    ko.applyBindings(view);

    // on an observableArray
    var users = ko.sync.observableArray( model );
    var users = ko.sync.use( ko.observableArray(), model );  // same thing

    // on a plain object
    var users = ko.sync.newView( model );
    var users = ko.sync.use( {}, model ); // same thing
```

### Perform CRUD operations on Knockout observables

Once `ko.sync.use()` is called on a view/object, it has its own CRUD methods:

```javascript
      var view = ko.sync.use({}, model);

      // load a user from the data store
      view.crud.load(userId);

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

                function(errors) { /* validation failed */ }
             );
         }
      };

      // delete the user
      view.deleteButtonClick = function() {
         view.crud.remove();
      };
```

### Applying a model to observable arrays

Arrays also get special `create()` and `remove()` methods (they are equivalent to ko.mapping create and remove).

Note that there is no need to use destroy() as removed items are automagically tracked by ko.sync.Model.

```javascript
    // generate an array that contains model objects
    var users = ko.observableArray();
    ko.sync.use(users, model);

    // or the shorthand
    var users = ko.crud.use(ko.observableArray(), model);

    // create a new user in the array
    users.push(model.new({name: 'John Smith', ...}));
    users.crud.create({name: 'John Smith', ...});    // same thing
    users.mappedCreate({name: 'John Smith', ...});   // same thing

    // or load some users from the database (all users created in the last hour)
    users.crud.load( {created: {greaterThan: new Date().valueOf() - 3600}} );

    // delete a user from the list
    users.remove(user);

    // or destroy using the user's id
    users.crud.remove( userId );
    users.mappedRemove( {userId: userId} ); // this works too

    // now save all of the changes manually
    users.crud.save();
```

# API

## ko.sync

This is the global namespace for KnockoutSync.

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

   // apply the model to an empty object
   var obj = ko.sync.use({}, model);

   // apply the model to an observableArray
   var list = ko.sync.use( ko.observableArray(), model );
```

This method applies all the Model's fields to the `target` object, mapping observable fields as appropriate.

It also adds the special `crud` member variable, which is a `Crud` instance (see `Crud` below).

If it is also an observableArray, then the options listed under `Crud.Array` are also available.

## Crud (target.crud)

Obtained by calling ko.sync.use(target)

### Crud.isDirty()

@returns {boolean}

True if any data has been modified on the record since it was last synchronized with the server

### Crud.create()

### Crud.load()

### Crud.save()

@returns {Promise} resolved after the data store returns results

Save the record the changes

#### Crud.validate()

@returns {Promise} resolved after the data store returns results

## Crud.Array (extends Crud)

When `ko.sync.use()` is applied to `ko.observableArray()`, it creates an extended Crud object which also has
some special array functionality.

### Crud.Array.create(json)

@param {Object} json a hash containing key/value pairs to be assigned to the new record
@returns {Promise} resolved after the data store returns results

#### Crud.Array.remove(id)

@param {string} id the id of the record to remove
@returns {Promise} resolved after the data store returns results

#### Crud.Array.load( params )

@param {object} params
@returns {Promise} resolved after the data store returns results



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

If set to an array, then records are automatically saved any time a field in the array changes, but not for others.

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

{Object} Override any of the field properties' default values here

#### options.fields

{Object} Required. The database fields. All field properties are optional.

##### fields.required

{Boolean=false} When true the field must be set to a truthy value. For integers, required means it must not be zero.

##### fields.persist

{Boolean=true} When false, this field is not sent to the data store during save operations.

##### fields.observe

{Boolean=true} When false, the field is not wrapped in a Knockout.js observable

##### fields.type

{String='string'} The type of field, one of: string, int, float, email, url, date, time

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