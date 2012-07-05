
(function(ko) {
   "use strict";

   ko.sync.TestData = {};

   ko.sync.TestData.genericModelProps = {
      dataTable: 'TableKeyed',
      primaryKey: 'id',
      fields: {
         id:             { required: true,  persist: true, type: 'string' },
         stringOptional: { required: false, persist: true, type: 'string' },
         stringRequired: { required: true,  persist: true, type: 'string' },
         dateOptional:   { required: false, persist: true, type: 'date' },
         dateRequired:   { required: true,  persist: true, type: 'date' },
         intOptional:    { required: false, persist: true, type: 'int' },
         intRequired:    { required: true,  persist: true, type: 'int' },
         boolOptional:   { required: false, persist: true, type: 'boolean' },
         boolRequired:   { required: true,  persist: true, type: 'boolean' },
         floatOptional:  { required: false, persist: true, type: 'float' },
         floatRequired:  { required: true,  persist: true, type: 'float' },
         emailOptional:  { required: false, persist: true, type: 'email' },
         emailRequired:  { required: true,  persist: true, type: 'email' }
      }
   };

   ko.sync.TestData.genericModelWithSort = ko.utils.extend(
      {sortField: 'intRequired'}, ko.sync.TestData.genericModelProps);

   ko.sync.TestData.genericData = {
      stringRequired: 'required',
      dateRequired:   new Date(),
      intRequired:    -25,
      boolRequired:   true,
      floatRequired:  2.5,
      emailRequired:  'two@five.com'
   };

   ko.sync.TestData.genericDataWithId = ko.utils.extend(
      {id: 'record123'}, ko.sync.TestData.genericData);


})(ko);

