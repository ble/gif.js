goog.require('ble.Gif');
goog.require('ble.ArrayReader');
goog.require('goog.net.XhrIo');
goog.require('goog.events');

var console = window.console;

var test_decode = function() {
  var restOfTest = function(event) {
    try {
      var buf = event.target.getResponse();
      var reader = new ble.ArrayReader(buf);
      var gif = new ble.Gif();
      console.log(gif.decode(reader));
      console.log(gif);
    } catch(err) {
      console.log(err);
    }
  };
  var io = new goog.net.XhrIo();
  io.setResponseType(goog.net.XhrIo.ResponseType.ARRAY_BUFFER);
  goog.events.listen(io, goog.net.EventType.COMPLETE, restOfTest);
  io.send('gifs/2BC.gif', 'GET'); 
};

test_decode();
