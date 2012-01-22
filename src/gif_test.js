goog.require('ble.Gif');
goog.require('ble.ArrayReader');

goog.require('goog.net.XhrIo');
goog.require('goog.events');

goog.require('goog.testing.stacktrace');

var console = window.console;
var result = [];
var test_decode = function() {
  var restOfTest = function(event) {
    try {
      var buf = event.target.getResponse();
      var reader = new ble.ArrayReader(buf);
      var gif = new ble.Gif();
      console.log(gif.decode(reader));
      console.log(gif);
      result = gif;
    } catch(err) {
      console.log(err.stack);
      console.log(goog.testing.stacktrace.parse_(err.stack));
    }
  };
  var io = new goog.net.XhrIo();
  io.setResponseType(goog.net.XhrIo.ResponseType.ARRAY_BUFFER);
  goog.events.listen(io, goog.net.EventType.COMPLETE, restOfTest);
  io.send('gifs/bwanim.gif', 'GET'); 
};

test_decode();
