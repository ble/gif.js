goog.require('ble.Gif');

goog.require('goog.dom.DomHelper');

goog.provide('ble.Gif.Renderer');

/** @constructor
 * @param {ble.Gif} gif */
ble.Gif.Renderer = function(gif) {
  var s = gif.screen;
  this.blocks = gif.blocks;
  this.width = s.width;
  this.height = s.height;
  this.palette = s.globalPalette;
  this.bgIndex = s.backgroundIndex;
  this.lastDisposal = null;

  this.image = this._makeImage(this.width, this.height);
  if(this.palette) {
    var color = this.palette.getColor(this.bgIndex);
    for(var i = 0; i < this.width * this.height; i++) {
      var o = 4 * i;
      this.image.data[o]     = color[0];
      this.image.data[o + 1] = color[1];
      this.image.data[o + 2] = color[2];
      this.image.data[o + 3] =      255;
    }
  }
  this.nextBlock = 0;
};

/** @type {HTMLCanvasElement|null} */
ble.Gif.Renderer.prototype._canvas = null;

ble.Gif.Renderer.prototype._makeImage = function(w, h) {
  if(!ble.Gif.Renderer.prototype._canvas) {
    var dh = new goog.dom.DomHelper();
    ble.Gif.Renderer.prototype._canvas =
      /** @type {HTMLCanvasElement} */ dh.createElement("canvas");
  }
  return this._canvas.getContext("2d").createImageData(this.width, this.height);
};

ble.Gif.Renderer.prototype.getImage = function() {
  return this.image;
};

ble.Gif.Renderer.prototype.renderNext = function() {
  var control = null;
  for(var i = this.nextBlock; i < this.blocks.length; i++) {
    var block = this.blocks[i];
    if(block instanceof ble.Gif.GraphicControl) {
      control = block;
    } else if(block instanceof ble.Gif.Image) {
      this._render(control, block);
      this.nextBlock = i + 1;
      return;
    }
  }
  throw new Error("no next image");
};

/** @param {ble.Gif.GraphicControl} control
 * @param {ble.Gif.Image} image */
ble.Gif.Renderer.prototype._render = function(control, image) {
  var disposal = this.lastDisposal;
  var transparent = null;
  if(control) {
    this.lastDisposal = control.disposal;
    if(control.transparent) {
      transparent = control.transparentIndex;
    }
  }
  var palette = image.palette ? image.palette : this.palette;
  this._renderPalette(transparent, palette, image);
};

ble.Gif.Renderer.prototype._renderPalette = function(transparent, palette, image) { 
  var r = image.rect;
  var idat = this.image.data;
  for(var y = 0; y < r.height; y++) {
    for(var x = 0; x < r.width; x++) {
      var ixSrc = x + y * r.width;
      var colorIx = image.pixels[ixSrc];
      var color = palette.getColor(colorIx);

      var ixDest = (x + r.left) + (y + r.top) * this.width;
      var o = ixDest * 4;
      idat[o]     = color[0];
      idat[o + 1] = color[1];
      idat[o + 2] = color[2];
      idat[o + 3] = (colorIx == transparent) ? 0 : 255;
    }
  }
};

/** @constructor
 * @param {ble.Gif} gif
 * @extends {ble.Gif.Renderer} */
ble.Gif.PSwapRenderer = function(gif) {
  ble.Gif.Renderer.call(this, gif);
  this.nextPal = null;
};
goog.inherits(ble.Gif.PSwapRenderer, ble.Gif.Renderer);

ble.Gif.PSwapRenderer.prototype.setNextPalette = function(palette) {
  this.nextPal = palette;
};

ble.Gif.PSwapRenderer.prototype._render = function(control, image) {
  var disposal = this.lastDisposal;
  var transparent = null;
  if(control) {
    this.lastDisposal = control.disposal;
    if(control.transparent) {
      transparent = control.transparentIndex;
    }
  }
  var palette;
  if(this.nextPal) {
    palette = this.nextPal;
    this.nextPal = null;
  } else if(image.palette) {
    palette = image.palette;
  } else {
    palette = this.palette;
  }
  this._renderPalette(transparent, palette, image);
};
