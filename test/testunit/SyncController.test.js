
jQuery(function($) {
   "use strict";
   var undef;

   var BigData = ko.sync.TestData.bigData, RecordList = ko.sync.RecordList, TABLE = BigData.props.table,
       REF = new Firebase('');

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

