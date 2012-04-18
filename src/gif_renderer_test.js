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
      result = new ble.Gif.PSwapRenderer(gif);

      var canvas = document.createElement("canvas");
      canvas.setAttribute('width', result.width);
      canvas.setAttribute('height', result.height);
      document.body.appendChild(canvas);

      var theta = 0;
      var omega = Math.PI / 50;
      var palValues = new Uint8Array(6); 
      var palette = new ble.Gif.Palette(false, 2, palValues);
      step = function() {
        palValues[0] = 255;
        palValues[1] = 128 + 127 * Math.cos(theta);
        palValues[2] = palValues[1];
        palValues[3] = 0;
        palValues[4] = 0;
        palValues[5] = 128 + 127 * Math.sin(theta);
        theta += omega;
        result.setNextPalette(palette); 
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
  io.send('../gifs/bwanim.gif', 'GET'); 
};

test_decode();
