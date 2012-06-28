
# Knockout Sync

Knockout Sync is a persistence layer that connects Knockout.js with a data Store (a RESTful server, Firebase, etc).

## Installation

Include the following in your html:

```html
    <script type="text/javascript" src="knockout-sync.js"></script>
    <script type="text/javascript" src="stores/PICK_ONEStore.test.js"></script>
```

## Usage

### Create a data storage instance (a store):

```javascript
    // create a data store
    var store = new FirebaseStore('http://beta.firebase.com/database_name');
```

### Create a data model

Just call `ko.sync.Model`:

```javascript
    // create a data model
    var model = new ko.sync.Model({
        dataStore:  store,
        dataTable:  'user',
        primaryKey: 'userId',
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

### Apply the model to a view

Just call `ko.sync.use(...)` (usually from inside the view model)

```javascript
    // initialize a view model using the data model
    function View(model) {
        var self = this;

        // add all the fields from the data model
        ko.sync.use(this, model);

        // add a computed field
        self.emailUrl = ko.computed(function() {
           'mailto: ' + self.name() + '<' + self.address() + '>';
        });

        // update the record
        self.saveButtonClick = function() {
           if( model.isDirty() ) {
               self.counter++; // not a wrapped observable!
               model.validate(self).then(
                  function()       {
                    model.save().then(function() { console.log('saved!'); });
                  },
                  function(errors) { /* validation failed */ }
               );
           }
        };

        // delete the record
        self.deleteButtonClick = function() {
           model.destroy();  // the model already has CRUD methods
        };
    };

    var view = new View(model);

    ko.applyBindings(view);
```

### Applying a model to observable arrays

Note that there is no need to use destroy() as removed items are automagically tracked by the KnockoutSyncModel.

```javascript
    // generate an array that contains model objects
    var users = ko.observableArray().use(model);

    // create a new user in the array
    users.push(model.new({name: 'John Smith', ...}));
    users.sync.push({name: 'John Smith', ...}); // same thing

    // or load lots of users from the database
    store.load( users, { created: { greaterThan: new Date().valueOf() - 3600 } } ); // load all users created in the last hour

    // delete a user from the list
    users.remove(user);

    // or destroy using the user's id
    users.sync.remove( userId );
    users.mappedRemove( {userId: userId} ); // this works too

    // now save all of the changes (assuming autosave is off)
    users.sync.save();
```

## API

### ko.sync



### ko.observable.sync instance



### Model

#### Properties

##### dataStore

{Store} Required. The data store which abstracts connections to the data layer. See the stores/ directory for examples.

##### dataTable

{String} Required. The table/bucket/etc where this model is to be stored

##### primaryKey

{String or Array} Required. Key used to identify records in the database. If a composite ID is to be used, multiple field names may be specified using an array.

##### autosave

{Boolean|Array=false} When true, records are automatically stored each time any value in the record
changes. When false, the save() method must be called manually.

If set to an array, then records are automatically saved any time a field in the array changes, but not for others.

##### defaults

{Object} Override any of the field properties' default values here

##### fields

{Object} Required. The database fields, see `Fields Object` below

### Fields Object

#### Properties

All field properties are optional.

##### required

{Boolean=false} When true the field must be set to a truthy value. For integers, required means it must not be zero.

##### persist

{Boolean=true} When false, this field is not sent to the data store during save operations.

##### observe

{Boolean=true} When false, the field is not wrapped in a Knockout.js observable

##### type

{String='string'} The type of field, one of: string, int, float, email, url, date, time

##### minLength

{int=0} The minimum length of value (applies only to string, float, int)

##### maxLength

{int=0} The maximum length of this value (0=no max). Does not apply to date or time.

##### valid

{Function} Overrides the default validation function. Inside the function call, `this` will refer to the Record instance.

##### format

{Function} Overrides the default formatting function. Inside the function call, `this` will refer to the Record instance