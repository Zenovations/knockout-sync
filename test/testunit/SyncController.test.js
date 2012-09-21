
jQuery(function($) {
   "use strict";
   var undef;

   var FIREBASE_URL = 'http://gamma.firebase.com/wordspot';
   var FIREBASE_TEST_URL = 'GitHub/firebase-sync';

   var BigData = ko.sync.TestData.bigData, RecordList = ko.sync.RecordList, TABLE = BigData.props.table,
       REF = new Firebase(FIREBASE_URL+'/'+FIREBASE_TEST_URL);

   module('SyncController');

   test('#pushUpdates', function() {});

   test('pull added',   function() {});

   test('push added',   function() {});

   test('pull updated', function() {});

   test('push updated', function() {});

   test('pull deleted', function() {});

   test('push deleted', function() {});

   test('pull moved',   function() {});

   test('push moved',   function() {});

   test('auto-sync off', function() {});

   test('hasTwoWay off', function() {});

});

