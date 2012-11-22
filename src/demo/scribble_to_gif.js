
goog.require('ble.util.log2Ceil');
goog.require('ble.Gif');
goog.require('ble.palette');

goog.require('ble.scribble.UI');
goog.require('ble.scribble.Canvas');
goog.require('ble.interval.Gapless');
goog.require('ble.scribble.Drawing');

goog.require('goog.dom.DomHelper');
goog.require('goog.ui.Component');
goog.require('goog.ui.Button');

goog.scope(function() {
/**
 * @constructor
 * @extends {goog.ui.Component}
 * @implements {ble._2d.DrawSurface}
 * @param {number} width
 * @param {number} height
 * @param {goog.dom.DomHelper=} opt_domHelper
 */
ble.PxCanvas = function(width, height, opt_domHelper) {
  this.width = width;
  this.height = height;
  goog.ui.Component.call(this, opt_domHelper);
};
goog.inherits(ble.PxCanvas, goog.ui.Component);

ble.PxCanvas.prototype.createDom = function() {
  this.setElementInternal(
      this.getDomHelper().createDom(
        'canvas',
        {   'width': this.width,
            'height': this.height}));
};

ble.PxCanvas.prototype.canDecorate = function(element) { return false; };

ble.PxCanvas.prototype.getContext = function() {
  return this.getElement().getContext('2d');
};

ble.PxCanvas.prototype.withContext = function(f) {
  f(this.getContext());
};

ble.PxCanvas.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  this.getContext().save();
};



ble.monochromeGif = function(w, h) {
  var rect = new goog.math.Rect(0, 0, w, h);
  var paletteValues = new Uint8Array(6);
  for(var i = 0; i < 6; i++)
    paletteValues[i] = i > 2 ? 255 : 0;
  var palette = new ble.Gif.Palette(0, 2, paletteValues);
  var screen = new ble.Gif.Screen(w, h, palette, 0, 0, 0);
  var gif = new ble.Gif('89a', screen, []);
  return gif;
};

ble.loopBlock = function() {
  var block = new ble.Gif.AppExt('NETSCAPE', '2.0', new Uint8Array(3));
  block.data[0] = 1;
  return block;
};

/**
 * @param {ble.scribble.Canvas} sCanvas
 * @param {number} frames
 */
ble.saveDrawing = function(sCanvas, frames) {
  var drawing = sCanvas.drawing;
  drawing = new ble.scribble.Drawing(
      drawing.start(), /*start time*/
      (new ble.interval.Gapless()).tweakedIntervals(drawing.byStart) /*items*/);

  var millisPerFrame = drawing.length() / frames;
  if(millisPerFrame <= 0)
    throw new Error();

  var rect = new goog.math.Rect(0, 0, sCanvas.width_px, sCanvas.height_px);
  var drawSurface = new ble.PxCanvas(rect.width, rect.height);
  drawSurface.render(document.body);
  drawSurface.getElement().style['display'] = 'none';

  var length = drawing.length();
  var start = drawing.start();
  var ctx = drawSurface.getContext();

  var gif = ble.monochromeGif(rect.width, rect.height);
  var blocks = gif.blocks;
  blocks.push(ble.loopBlock());

  var dh = new goog.dom.DomHelper();

  var graphicControl = function(delayTime) { 
    var reserved=0,
        disposal=1,
        userInput=false,
        transparent=false,
        transparentIndex=0;
    return new ble.Gif.GraphicControl(
        reserved,
        disposal,
        userInput,
        delayTime,
        transparent,
        transparentIndex);
  };
  var palette = gif.screen.globalPalette;
  for(var position = 0; position < length; position += millisPerFrame) {
    console.log(position);

    var isLast = position + millisPerFrame >= length;
    blocks.push(graphicControl(isLast ? 200 : 2));

    ctx.fillStyle='rgb(255,255,255)';
    ctx.fillRect(0, 0, drawSurface.width, drawSurface.height);
    
    drawing.at(start+position).draw(ctx);

    var pixels = new Uint8Array(rect.width * rect.height);
    ble.palette.imageDataToPixels(
        ctx.getImageData(rect.left, rect.top, rect.width, rect.height).data,
        pixels,
        ble.palette.inverseMonochrome);
    
    //can't have a code size of 1...
    var codeSize = Math.max(2, ble.util.log2Ceil(palette.size));
    var image = new ble.Gif.Image(
        rect,
        null, //palette
        false, //interlace
        0, //reserved,
        pixels,
        codeSize);
   
    blocks.push(image);
/*
    var url = drawSurface.getElement().toDataURL();
    dh.appendChild(
        document.body,
        dh.createDom(
          'img',
          {   'src': url,
              'width': rect.width / 4,
              'height': rect.height / 4 }));
              */
  }
  var buffer = new ArrayBuffer(1 << 22); //4 megs
  var writer = new ble.ArrayWriter(buffer);
  window.console.log("encoding...");
  gif.encode(writer);
  var partial = new Uint8Array(buffer.slice(0, writer.start));
  var blob = new Blob([partial], {'type': 'image\/gif'});
  var url = window.webkitURL.createObjectURL(blob);
  document.write('<img src="'+url+'"/>');
  window.console.log("done encoding.");
};

var ui = new ble.scribble.UI(320, 240);
var button = new goog.ui.Button("make a gif!");

ui.render(document.body);
button.render(document.body);

goog.events.listen(
    button,
    goog.ui.Component.EventType.ACTION,
    function() {
      ble.saveDrawing(ui.canvas, 100);
    });
});
