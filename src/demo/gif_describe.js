goog.require('ble.Gif');
goog.require('ble.ArrayReader');

goog.require('goog.fs');
goog.require('goog.net.XhrIo');
goog.require('goog.events');

goog.require('goog.testing.stacktrace');

goog.require('ble.Picker');
goog.require('ble.Gif.describeGif');

var console = window.console;
var gifPicker = new ble.Picker("../gifs/gifs.json", "../gifs");
var gifList = new ble.PickerList();
var lastGif;
gifList.setPicker(gifPicker);

gifPicker.loadFileList();
gifList.render(document.body);

var dh = gifList.getDomHelper();
var descriptionContainer = dh.createDom('div');
document.body.appendChild(descriptionContainer);

goog.events.listen(
    gifList,
    gifPicker.EventTypes.LOADED_FILE,
    function(event) {
      console.log(event);
      var gif = new ble.Gif();
      var reader = new ble.ArrayReader(event.buffer);
      console.log('decode success: ' + gif.decode(reader).toString());
      lastGif = gif;
      dh.removeChildren(descriptionContainer);
      dh.appendChild(descriptionContainer, dh.createDom('h1', null, event.path));
      dh.appendChild(descriptionContainer, ble.Gif.describeGif(gif));
    });
//
//goog.events.listen(
//    gifList,
//    goog.ui.Component.EventType.ACTION,
//    function(event) {
//      var menuItem = /** @type {goog.ui.MenuItem} */ event.target;
//      var model = menuItem.getModel();
//      console.log(model);
//    });
/*
var console = window.console;
var result = [];

var lastGif = null;
var lastResult = null;
var lastBuffer = null;

var testWithGif = function(uriOfGif, functionOfGif) {
  var decodeAndTest = function() {
    console.log("testing");
    try {
      var buf = this.getResponse();
      lastBuffer = buf;
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
    console.log("tested");
  };

  var xhr = new goog.net.XhrIo();
  xhr.setResponseType(goog.net.XhrIo.ResponseType.ARRAY_BUFFER);
  goog.events.listen(xhr, goog.net.EventType.COMPLETE, decodeAndTest);
  xhr.send(uriOfGif, 'GET');
};
*/

/*
 * Take the images out of the first 40 blocks of a gif and see if a roundtrip
 * (encode image, then decode image) produces an identical image.
 */
/*
var testEncodeImages = function(gif) {
  var Image = ble.Gif.Image;
  var isImage = function(x) { return x.constructor === Image; };
  var compareImages = function(i, j) {

    if(i.constructor !== Image || j.constructor !== Image)
      return false;
    if(!compareRects(i.rect, j.rect))
      return false;
    if(!comparePalettes(i.palette, j.palette))
      return false;
    if(i.reserved != j.reserved || i.codeSize != j.codeSize)
      return false;
    if(!comparePixels(i.pixels, j.pixels))
      return false;
    return true;
  };
  var comparePalettes = function(p, q) {
    return p === q ||
           p.sort == q.sort &&
           p.size == q.size &&
           compareBytes(p.values, q.values);
  };
  var compareBytes = function(a, b) {
    var differences = 0;
    if(a.length != b.length)
      return false;
    for(var i = 0; i < a.length; i++) {
      if(a[i] != b[i]) {
        differences++;
      }
    }
    console.log(Math.round(100 * differences / a.length));
    return differences == true;
  };
  var comparePixels = compareBytes;
  var compareRects = function(r, s) {
    return r.left == s.left &&
           r.top == s.top &&
           r.width == s.width &&
           r.height == s.height;
  };
  var testEncodeImage = function(image) {
      var writer = ble.ArrayWriter.ofCapacity(1024*1024);
      image.encode(ble.Writer.promote(writer));
      var encoded = writer.writtenSlice();
      var encodedBuf = encoded.buffer.slice(0, encoded.length);
      var reader = new ble.ArrayReader(encodedBuf);
      var newImage = new ble.Gif.Image();
      newImage.decode(ble.Reader.promote(reader));
      return {status: compareImages(image, newImage), i: image, j: newImage};
  };

  var images = goog.array.filter(gif.blocks.slice(0,40), isImage);
  var results = goog.array.map(images, testEncodeImage);
  return results;
};

var testWithBlobUrl = function(gif) {
  var buffer = new ArrayBuffer(1024*1024);
  var writer = new ble.ArrayWriter(buffer);
  gif.encode(writer);
  var partial = buffer.slice(0, writer.start);
  var blob = goog.fs.getBlob(partial);
  var url = window.webkitURL.createObjectURL(blob);
  document.write(url);
};
//testWithGif("../gifs/2BC.gif", testEncodeImages);
//testWithGif("../gifs/bwanim.gif", testEncodeImages);
testWithGif("../gifs/bwanim.gif", testWithBlobUrl);
*/
