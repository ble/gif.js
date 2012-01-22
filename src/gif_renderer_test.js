goog.require('ble.Gif');
goog.require('ble.Gif.Renderer');
goog.require('ble.ArrayReader');

goog.require('goog.net.XhrIo');
goog.require('goog.events');

goog.require('goog.testing.stacktrace');

var console = window.console;
var result = [];
var step;

var test_decode = function() {
  var restOfTest = function(event) {
    try {
      var buf = event.target.getResponse();
      var reader = new ble.ArrayReader(buf);
      var gif = new ble.Gif();
      var start = Date.now();
      gif.decode(reader);
      var end = Date.now();
      console.log( (end - start) / 1000 );

      console.log(gif);
      result = new ble.Gif.Renderer(gif);

      var canvas = document.createElement("canvas");
      canvas.setAttribute('width', result.width);
      canvas.setAttribute('height', result.height);
      document.body.appendChild(canvas);
      step = function() {
        result.renderNext();
        canvas.getContext('2d').putImageData(result.getImage(), 0, 0);
      };
      var v = function() { step(); window.webkitRequestAnimationFrame(v); };
      v();
      //step();
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
