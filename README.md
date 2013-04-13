
# KnockoutSync

<span style="color: red">**This is alpha software (unstable)**</span>

KnockoutSync is a persistence library that connects Knockout.js with a data layer.

When updates occur on the server, observed fields are automatically updated and knockout bindings are triggered.
When knockout updates variables, they automatically update the server.

This library does not use the [mapping plugin][mplug]; it's superfluous to the functionality provided here.

## Examples

### <a target="_blank" href="http://zenovations.github.com/knockout-sync">See some live examples here</a>.

### Syncing an observable to an existing record

```javascript
    // loads recordXYZ and creates two-way sync
    var obs = ko.observable().extend({sync: store});
    obs.read('recordXYZ');

    // or in one step
    var obs = ko.observable().extend({sync: {store: store, key: 'recordXYZ'});
```

### Create a new record and synchronize

```javascript
    // creates record and establishes two-way sync
    var obs = ko.observable().extend({sync: store});
    obs({name: 'Rydia', email: 'summoner@ff2.tld'});
    obs.crud.create();

    // or in one step
    var obs = ko.observable({name: 'Rydia', email: 'summoner@ff2.tld'}).extend({sync: store});
```

### Syncing an observable array to a list of records

```javascript
    // loads last ten records into list and starts two-way sync
    var list = ko.observableArray().extend({sync: store});
```

## Installation
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/zenovations/knockout-sync/master/dist/knockout-sync.js
[max]: https://raw.github.com/zenovations/knockout-sync/master/dist/knockout-sync.dev.js

In your web page, you need to have [Knockout.js][3], and Knockout-sync. Underscore is optional, but makes
things a bit more stable and performant.

```html
   <script type="text/javascript" src="underscore.js"></script> <!-- optional -->
   <script type="text/javascript" src="knockout.js"></script>
   <script type="text/javascript" src="dist/knockout-sync.js"></script>
```

## Usage

### Create a Store (a connection to your database):

```javascript
    // create a Store
    var store = new ko.sync.stores.FirebaseStore('http://YOUR_ACCOUNT.firebaseio.com/path/to/data');
```

### Synchronizing observables

How we call `sync` depends on whether we are creating a new record or loading an existing one:

Synchronizing to an existing record:

    // using the read method
    var model = ko.observable().extend('sync', store);
    model.crud.read('recordXYZ');

    // this is the same thing, but in one step
    var model = ko.observable().extend('sync', {store: store, key: 'recordXYZ'});

Creating a new record:

    // using the create method
    var model = ko.observable().extend('sync', store);
    model({name: 'Smith', email: 'smith@domain.tld'});
    model.crud.create();

    // doing it in one step
    var model = ko.observable({name: 'Smith', email: 'smith@domain.tld'}).extend('sync', store); // automatically created!

### Synchronizing observableArrays

Unlike `observable`, arrays are always synchronized as soon as they load. So there is no need to call read() to get
 the data locally.

    // synchronized automatically
    var list = ko.observableArray().extend('sync', store);

### Perform CRUD operations on an observable

Once an object is synced by calling `.extend('sync', store)`, it has a `crud` member which can be
used to perform standard CRUD operations:

```javascript
    var model = ko.observable().extend('sync', store);

    // create a new record and sync
    model({name: 'Smith', email: 'smith@domain.tld'});
    model.crud.create(); // now we are synced

    // read a remote record and sync
    model.crud.read( 'recordXYZ' );

    // update and sync
    model.crud.update( {name: 'Pinky'} );

    // delete the record, we are no longer synced
    model.crud.delete();

    // crud actions automagically queue and run in sequence, so there
    // is never any need to worry about async ops running out of order!
    model.crud.read( 'recordXYZ' ).update({name: 'John Smith'}).delete()
        .ready.done(function() { /* no race conditions here */ });
```

### Perform CRUD operations on observableArray

`observableArray` works almost exactly like `observable`. One notable difference is that an `observableArray`
is immediately synchronized.

Note that there is no need to wrestle with `destroy()` and `_destroy` as deleted items are
automagically tracked and handled internally!

```javascript
    // sync an array with the Store and load all the records
    var users = ko.observableArray().extend({sync: store});

    users.crud.read(); // valid, but does nothing because it has already been called

    // add a new record
    users.push({name: 'John Smith', ...});
    users.crud.create({name: 'John Smith', ...}); // same thing

    // modify a record
    users()[5].name('Alf');
    users.crud.update('record123', {name: 'Alf'}); // same thing, but using the key

    // delete a user from the list; also deletes from database
    users.splice(2, 1);
    users.crud.delete( 'record123' ); // same thing, but using the key

    // just like crud ops on observables, these can be chained too
    users.crud.update('record123', {name: 'John Smith'}).delete( 'recordXYZ' ).create( {name: 'Jim Campbell'} )
        .ready.done(function() { /* all operations completed and saved */ });
```

### Using Factories

You can create custom objects in an `observableArray` by creating a factory, which allows you to specify how new
 records get initialized.

```javascript
   // create a factory
   var RecordFactory = ko.sync.Factory.extend({
      // optional constructor
      //init: function() {},

      // called every time a new row is received from the store
      make: function(key, data) {
         return {
            name: ko.observable(data.name), // no problem here, it will get updated as you would hope
            email: data.email,
            computed: ko.computed() {...} // this will be left alone because it's not part of the store's fields
            key: key,
         }
      }
   });

   var list = ko.observableArray().extend({sync: {
      store: store,
      factory: new RecordFactory();
   });

   list()[0].name('Happy Joy!'); // synchronized to the Store, like magic!
```

# Missing Stuff (TODO)

 - sorting is left up to knockout logic and the Store to negotiate; assumes you'll transfer sort data with the records

# Creating Your own Data Store

Read over src/classes/Store.js and implement each method according the purview of your particular needs and data storage device's capabilities.

Test the store by using the generac StoreTester. See test/testunit/TestStore.test.js (example) and test/lib/StoreTester.js (standard tests)

Please contribute stores/improvements back to the project!

# Testing

Browse to test/index.html and enjoy the pretty colors (hopefully they are green)

# Contributing

Use the pull request feature in GitHub to contribute changes. Please provide or modify unit tests in test/testunit as needed
