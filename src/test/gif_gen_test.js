goog.require('goog.fs');
goog.require('ble.Gif');
goog.require('goog.dom.DomHelper');
goog.require('goog.ui.Component');

window.gif = null;
var drawThing = function(scale, component) {
  var ctx = component.context();

  ctx.beginPath();
  ctx.fillStyle = "fff";
  ctx.fillRect(-0.5, -0.5, 1, 1);
  
  var range = [];
  for(var i = -1.0 - 1/14; i <= 1.0; i+= 1/7)
    range.push(i);

  var q = Math.PI;
  var uvFn = function(x,y) {
    return [x + scale * Math.sin(q*y) / 3, y - scale * Math.cos(q*x) / 8];
  }
  uvFn = function(x,y) {
    var th = Math.atan2(y, x);
    var r = Math.sqrt(x*x+y*y);
    th += Math.cos(10*r*scale) * scale;
    var unit = [-Math.sin(th) / 5, Math.cos(th) / 5];
    return [Math.cos(th)*r, Math.sin(th)*r];
  }
  pathUVs(ctx, range, range, 0.01, 1.0, uvFn);
  ctx.lineWidth *= 2;
  ctx.stroke();
  component.doneWithContext(ctx);

};

var pathUVs = function(ctx, us, vs, step, mag, uvFn) {
  ctx.beginPath();
  for(var i = 0; i < us.length; i++) {
    var u = us[i];
    var v = -mag;
    var xy = uvFn(u, v);
    ctx.moveTo(xy[0], xy[1]);
    for(v = v + step; v <= mag; v += step) {
      xy = uvFn(u, v);
      ctx.lineTo(xy[0], xy[1]);
    }
  }
  for(var i = 0; i < vs.length; i++) {
    var u = -mag;
    var v = vs[i];
    var xy = uvFn(u, v);
    ctx.moveTo(xy[0], xy[1]);
    for(u = u + step; u <= mag; u += step) {
      xy = uvFn(u, v);
      ctx.lineTo(xy[0], xy[1]);
    }
  }

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

var monochrome = function(imgData, imgIx, palOut, palIx) {
  palOut[palIx] =
    (imgData[imgIx + 0] == 255 &&
     imgData[imgIx + 1] == 255 &&
     imgData[imgIx + 2] == 255) ? 1 : 0;
};

var doStuff = function() {
  var component = new ble.TestDraw(500, 500);
  component.render(document.body);
  component.hide();
  var dh = component.getDomHelper();

  var phi;
  var steps = 10;

  var rect = new goog.math.Rect(0, 0, component.width, component.height);
  var palette = new ble.Gif.Palette(0, 2, new Uint8Array(6));
  var pVals = palette.values;
  pVals[0] = 0;   pVals[1] = 0;   pVals[2] = 0;
  pVals[3] = 255; pVals[4] = 255; pVals[5] = 255;

  var screen = new ble.Gif.Screen(
      component.width,
      component.height,
      palette,
      1,
      10,
      0);

  var gif = new ble.Gif('89a', screen, []);
  var interlace = false;
  var reserved = 0;
  var codeSize = 2;


  var loopBlock = new ble.Gif.AppExt('NETSCAPE', '2.0', new Uint8Array(3));
  loopBlock.data[0] = 1;
  gif.blocks.push(loopBlock);

  for(var i = 0; i < steps; i++) {
    phi = (2 * Math.PI) * i / steps;
    drawThing(Math.cos(phi), component);
    var imgData = component.getImageCopy();
    var pixels = new Uint8Array(rect.width * rect.height);
    var image = new ble.Gif.Image(
        rect,
        null,
        interlace,
        reserved,
        pixels,
        codeSize);
    imageDataToPixels(imgData.data, pixels, monochrome);

    var gc = new ble.Gif.GraphicControl(
      5,
      0,
      false,
      6,
      false,
      3);
    gif.blocks.push(gc);
    gif.blocks.push(image);
    window.console.log(i);
  };

  var buffer = new ArrayBuffer(1 << 22); //4 megabytes
  var writer = new ble.ArrayWriter(buffer);
  gif.encode(writer);
  var partial = buffer.slice(0, writer.start);
  var blob = goog.fs.getBlob(partial);
  var url = window.webkitURL.createObjectURL(blob);
  document.write(url);
  window.console.log('done.');
  window.gif = gif;
};


doStuff();