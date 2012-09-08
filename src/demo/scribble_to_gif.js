
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

/**
 * @param {ble.scribble.Canvas} sCanvas
 * @param {number} millisPerFrame
 */
ble.saveDrawing = function(sCanvas, millisPerFrame) {

  window.console.log("hello thar");
  if(millisPerFrame <= 0)
    throw new Error();

  var rect = new goog.math.Rect(0, 0, sCanvas.width_px, sCanvas.height_px);
  var drawSurface = new ble.PxCanvas(rect.width, rect.height);
  drawSurface.render(document.body);
  drawSurface.getElement().style['display'] = 'none';

  var drawing = sCanvas.drawing;
  drawing = new ble.scribble.Drawing(
      0, /*start time*/
      (new ble.interval.Gapless()).tweakedIntervals(drawing.byStart) /*items*/);
  window.d = drawing;
  var length = drawing.length();
  var start = drawing.start();
  var ctx = drawSurface.getContext();


  var pVals = new Uint8Array(6);
  pVals[0] = 0;
  pVals[1] = 0;
  pVals[2] = 0;
  pVals[3] = 255;
  pVals[4] = 255;
  pVals[5] = 255;

  var palette = new ble.Gif.Palette(0, pVals.length/3, pVals);
  var dh = new goog.dom.DomHelper();

  for(var position = 0; position < length; position += millisPerFrame) {
    window.console.log(position);
    ctx.fillStyle='rgb(255,255,255)';
    ctx.fillRect(0, 0, drawSurface.width, drawSurface.height);
    
    drawing.at(start+position).draw(ctx);

    var pixels = new Uint8Array(rect.width * rect.height);
    var image = new ble.Gif.Image(
        rect,
        null, //palette
        false, //interlace
        0, //reserved,
        pixels,
        ble.util.log2Ceil(palette.size) /* code size */);
    ble.palette.imageDataToPixels(
        ctx.getImageData(rect.left, rect.top, rect.width, rect.height).data,
        pixels,
        ble.palette.inverseMonochrome);

    var url = drawSurface.getElement().toDataURL();
    dh.appendChild(
        document.body,
        dh.createDom(
          'img',
          {   'src': url,
              'width': rect.width / 4,
              'height': rect.height / 4 }));
  };
};

var ui = new ble.scribble.UI(320, 240);
var button = new goog.ui.Button("make a gif!");

ui.render(document.body);
button.render(document.body);

goog.events.listen(
    button,
    goog.ui.Component.EventType.ACTION,
    function() {
      ble.saveDrawing(ui.canvas, 50);
    });
});
