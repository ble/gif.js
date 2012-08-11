goog.require('ble.Gif');
goog.require('ble.ArrayReader');

goog.require('goog.net.XhrIo');
goog.require('goog.events');

goog.require('goog.testing.stacktrace');

var console = window.console;
var result = [];

var lastGif = null;
var lastResult = null;
var testWithGif = function(uriOfGif, functionOfGif) {
  var decodeAndTest = function() {
    try {
      var buf = this.getResponse();
      var reader = new ble.ArrayReader(buf);
      var gif = new ble.Gif();
      console.log("Decode success: " + gif.decode(reader).toString());
      console.log(gif);
      lastGif = gif;
      lastResult = functionOfGif(gif);
    } catch(err) {
      console.log(err.stack);
      console.log(goog.testing.stacktrace.parse_(err.stack)); 
    }
  };

  var xhr = new goog.net.XhrIo();
  xhr.setResponseType(goog.net.XhrIo.ResponseType.ARRAY_BUFFER);
  goog.events.listen(xhr, goog.net.EventType.COMPLETE, decodeAndTest);
  xhr.send(uriOfGif, 'GET');
};

testWithGif("../gifs/2BC.gif", function(gif){ return testEncode(gif.blocks[1]); });


var testEncode = function(block) {
  var writer = ble.ArrayWriter.ofCapacity(1024*1024);
  writer = ble.Writer.promote(writer);
  block.encode(writer);
  var encoded = writer.writtenSlice();
  var encodedBuf = encoded.buffer.slice(0, encoded.length);
  var reader = new ble.ArrayReader(encodedBuf);
  reader = ble.Reader.promote(reader);
  var newBlock = new (block.constructor)();
  newBlock.decode(reader);
  return {writer: writer, reader: reader, decoded: newBlock};
};
