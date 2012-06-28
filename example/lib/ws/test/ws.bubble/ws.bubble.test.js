jQuery(function($) {

   if( typeof(window.console) === 'undefined' ) {
      window.console = {
         log: function() {},
         warn: function() {},
         info: function() {},
         error: function() {}
      }
   }

//   $('#box1').wsbubble().html('vanilla');
   var pos = 0;

   var tests = {
      defaults: {
         vanilla: null,
         'background only': {defaultOff: true, background: true},
         'border only':     {defaultOff: true, border:     true},
         'shadow only':     {defaultOff: true, shadow:     true},
         'radius only':     {defaultOff: true, radius:     true},
         'pointer only':    {defaultOff: true, pointer:    true}
      },
      'top/bottom pointers': {
         'top left':      {pointer: 'top left'},
         'top center':    {pointer: 'top center'},
         'top right':     {pointer: 'top right'},
         'bottom left':   {pointer: 'bottom left'},
         'bottom center': {pointer: 'bottom center'},
         'bottom right':  {pointer: 'bottom right'}
      },
      'left/right pointers': {
         'right top':     {pointer: 'right top'},
         'right center':  {pointer: 'right center'},
         'right bottom':  {pointer: 'right bottom'},
         'left top':      {pointer: 'left top'},
         'left center':   {pointer: 'left center'},
         'left bottom':   {pointer: 'left bottom'}
      },
      'radius/offsets': {
         'radius_lt+10_off-0':   {radius: 10,    pointer: {at: 'left top',     offset: 0}},
         'radius_br+10_off+250': {radius: 10,    border: false, pointer: {at: 'bottom right', offset: 250}},
         'radius_tc+5':          {radius:  5,    pointer: {at: 'top center',   offset: 0}},
         'radius_rb+20_off+10':  {radius: 20,    pointer: {at: 'right bottom', offset: 10}},
         'norad_off+0':          {radius: false, pointer: {at: 'left top',     offset: 0}},
         'norad_off+10':         {radius: false, pointer: {at: 'left top',     offset: 10}}
      },
      'borders': {
         'rad-10-red':  {radius:  5, border: '10px solid red',  pointer: {at: 'left top', offset: 0}},
         '10-red':      {radius: 20, border: {width: 20, color: 'red', style: 'dashed'}, pointer: {width: 20, at: 'bottom right', offset: 0}},
         'squeeze':     {radius: 30, border: {width: 10, color: 'red', style: 'dashed'}, pointer: {width: 20, at: 'left bottom', offset: -10}},
         '5-def':       {radius: 0, border: 5, pointer: {at: 'top center',   offset: 0}},
         'offset-20':   {radius: 10, border: 30, pointer: {at: 'bottom left', offset: 0, width: 40}}
      },
      'shadows': {
         'blue':     {shadow: {color: 'blue'}},
         'wide':     {shadow: {width: 25}},
         'thin-int': {shadow: 1},
         'string':   {shadow: '5px 5px 10px 6px green'}
      },
      'positions': {
         'top left':             {at: 'top left',             of: '#positions-parent-'+(++pos), pointer: {width: 5}},
         'bottom center':        {at: 'bottom center',        of: '#positions-parent-'+(++pos), pointer: {width: 5}},
         'left-10 top':          {at: 'left-10 top',          of: '#positions-parent-'+(++pos), pointer: {width: 5}},
         'bottom left inner':    {at: 'bottom left inner',    of: '#positions-parent-'+(++pos), pointer: {width: 5}},
         'right-5 center inner': {at: 'right-5 center inner', of: '#positions-parent-'+(++pos), pointer: {width: 5}},
         'center center':        {at: 'center center',        of: '#positions-parent-'+(++pos), pointer: {width: 5}}
      }
   };

   function renderSet(tests) {
      var counter=0, i, posCounter=0, txt, key, k, $f, c;
      for(key in tests) {
         i = 0;
         $f = $('<fieldset class="container" />').html('<legend>'+key+'</legend>').appendTo('body');
         for(k in tests[key]) {
            c = 'box';
            txt = k;
            if( key === 'positions' ) {
               c += ' box-small';
               $('<div id="positions-parent-'+(++posCounter)+'" class="positions-box"></div>').text(k).appendTo($f);
               txt = posCounter;
            }
            $('<div id="box'+(++counter)+'" class="'+c+'" />').text(txt).appendTo($f).wsbubble(tests[key][k]);
         }
      }
   }

   renderSet(tests);


});
