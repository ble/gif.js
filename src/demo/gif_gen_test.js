goog.require('ble.Gif');
goog.require('ble.palette');

goog.require('goog.fs');
goog.require('goog.dom.DomHelper');
goog.require('goog.ui.Component');

window.gif = null;
var drawThing = function(scale, component) {
  var ctx = component.context();
  var luminance = Math.round(scale);
  ctx.fillStyle = 'rgb(' + [luminance, luminance, luminance].toString() + ')';
  ctx.beginPath();
  ctx.fillRect(-0.5, -0.5, 1, 1);

  var h = (scale / 255) - 0.5;
  luminance = 255 - luminance;
  ctx.strokeStyle = 'rgb(' + [luminance, luminance, luminance].toString() + ')';
  ctx.lineWidth *= 5;
  ctx.beginPath();
  ctx.moveTo(-0.5, h);
  ctx.lineTo(0.5, h);
  ctx.stroke();
  component.doneWithContext(ctx);
};
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {number} w
 * @param {number} h
 */
ble.TestDraw = function(w, h) {
  this.width = w;
  this.height = h;
  goog.ui.Component.call(this, new goog.dom.DomHelper());
};
goog.inherits(ble.TestDraw, goog.ui.Component);

ble.TestDraw.prototype.createDom = function() {
  var dh = this.getDomHelper();
  this.setElementInternal(
      dh.createDom(
        'canvas',
        {'width': this.width,
         'height': this.height}));
};

ble.TestDraw.prototype.canDecorate = function(element) { return false; };

ble.TestDraw.prototype.rawContext = function() {
  return this.getElement().getContext('2d');
}

ble.TestDraw.prototype.context = function() {
  var ctx = this.rawContext();
  var w = this.width;
  var h = this.height;
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.scale(w, h);
  ctx.lineWidth /= Math.sqrt(w*w+h*h);
  return ctx;
};

ble.TestDraw.prototype.doneWithContext = function(ctx) {
  ctx.restore();
};

ble.TestDraw.prototype.getImageCopy = function() {
  return this.rawContext()
             .getImageData(0, 0, this.width, this.height);
};

ble.TestDraw.prototype.hide = function() {
  var el = this.getElement();
  el.style['display'] = 'none';
};

var imageDataToPixels = function(dataIn, pixelsOut, inversePalette) {
  var count = {};
  for(var i = 0; i < (dataIn.length >> 2); i++) {
    inversePalette(dataIn, i << 2, pixelsOut, i);
    var pv = pixelsOut[i];
    if(!goog.isDefAndNotNull(count[pv]))
      count[pv] = 0;
    count[pv]++;
  }
  window.console.log(count);
};

var doStuff = function() {
  var component = new ble.TestDraw(100, 100);
  component.render(document.body);
  component.hide();
  var dh = component.getDomHelper();

  var phi;
  var steps = 100;

  var rect = new goog.math.Rect(0, 0, component.width, component.height);

  var pVals = new Uint8Array(768);
  for(var i = 0; i < pVals.length / 3; i++) {
    pVals[3 * i]     = i;
    pVals[3 * i + 1] = i;
    pVals[3 * i + 2] = i;
  } 
  var palette = new ble.Gif.Palette(0, pVals.length / 3, pVals);
  var screen = new ble.Gif.Screen(
      component.width,
      component.height,
      palette,
      0,
      0,
      0);


  var log2Ceil = function(x) {
    var n = 0;
    while(x > 1) { x /= 2; n++; }
    return n;
  };
  var gif = new ble.Gif('89a', screen, []);
  var interlace = false;
  var reserved = 0;
  var codeSize = log2Ceil(palette.size);


  var loopBlock = new ble.Gif.AppExt('NETSCAPE', '2.0', new Uint8Array(3));
  loopBlock.data[0] = 1;
  gif.blocks.push(loopBlock);

  for(var i = 0; i < steps; i++) {
    phi = Math.PI * i / steps;
    var z = Math.cos(phi) * Math.cos(phi);
    drawThing(255 * z, component);
    var imgData = component.getImageCopy();
    var pixels = new Uint8Array(rect.width * rect.height);
    var image = new ble.Gif.Image(
        rect,
        null,
        interlace,
        reserved,
        pixels,
        codeSize);
    ble.palette.imageDataToPixels(
        imgData.data,
        pixels,
        ble.palette.inverseGreyscale);

    var gc = new ble.Gif.GraphicControl(
      0,
      1,
      false,
      2,
      false,
      0);
    gif.blocks.push(gc);
    gif.blocks.push(image);
    window.console.log(i);
    var preview = document.createElement('img');
//    preview.src = component.getElement().toDataURL();
    preview.width = 50;
    preview.height = 50;
    preview.style['display'] = 'inline-block';
//    document.body.appendChild(preview);
  };

  var buffer = new ArrayBuffer(1 << 22); //4 megabytes
  var writer = new ble.ArrayWriter(buffer);
  gif.encode(writer);
  var partial = buffer.slice(0, writer.start);
  var blob = goog.fs.getBlob(partial);
  var url = window.webkitURL.createObjectURL(blob);
  document.write('<img src="'+url+'"/>');
  window.console.log('done.');
  window.gif = gif;
};


doStuff();
