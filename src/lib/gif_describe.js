goog.require('ble.Gif');
goog.require('goog.dom.DomHelper');

goog.provide('ble.gif.describeGif');

var labelledItem = function(dh, label, value) {
  return dh.createDom('div', null, label, ': ', value);
};
var labelledListItem = function(dh, label, value) { 
  return dh.createDom('li', null, label, ': ', value);
};

goog.scope(function() {

  ble.gif.describeGif = function(gif) {
    return gif.describeMe(new goog.dom.DomHelper());
  };

  var Gif = ble.Gif;
  Gif.prototype.describeMe = function(dh) {
    var v = labelledListItem(dh, 'version', this.version);
    var s = labelledListItem(dh, 'screen', this.screen.describeMe(dh));
    var b = labelledListItem(dh, 'blocks', this.describeBlocks(dh, this.blocks));
    var container = labelledItem(dh, 'GIF', dh.createDom('ul', null, v, s, b));
    return container;
  };

  Gif.prototype.describeBlocks = function(dh, blocks) {
    var argArray = ['ol', null];
    for(var i = 0; i < blocks.length; i++) {
      argArray.push(blocks[i].describeMe(dh));
    }
    return dh.createDom.apply(dh, argArray);
  }

  var Screen = Gif.Screen;
  Screen.prototype.describeMe = function(dh) {
    var dims = labelledListItem(dh, 'dimensions', this.width + ' x ' + this.height);
    var pal = labelledListItem(dh, 'palette', goog.isDefAndNotNull(this.globalPalette) ? this.globalPalette.describeMe(dh) : 'null');
    var cR = labelledListItem(dh, 'color resolution', this.colorResolution.toString());
    var bI = labelledListItem(dh, 'background index', this.backgroundIndex.toString());
    var aspect = labelledListItem(dh, 'aspect', this.aspect.toString());
    return dh.createDom('ul', null, dims, pal, cR, bI, aspect);
  };

  var Palette = Gif.Palette;
  Palette.prototype.describeMe = function(dh) {
    var sorted = labelledListItem(dh, 'sorted', this.sort.toString());
    var size = labelledListItem(dh, 'size', this.size.toString());
    var colors = labelledListItem(dh, 'colors', this.swatches(dh));
    return dh.createDom('ul', null, sorted, size, colors);
  };

  Palette.prototype.swatches = function(dh) {
    var argArray = ['ol', null]; 
    for(var i = 0; i < this.size; i++) {
      var color = 'rgb(' + [this.values[3*i], this.values[3*i+1], this.values[3*i+2]].join(',') + ')';
      var props = {
        'style': 'width: 30px; height: 30px; background-color: ' + color + ';'
      };
      argArray.push(dh.createDom('li', props));
    }

    return dh.createDom.apply(dh, argArray);
  };

  ble.Gif.Image.prototype.describeMe = function(dh) {
    var topLeft = labelledListItem(dh, 'left, top', this.rect.left + ', ' + this.rect.top);
    var size = labelledListItem(dh, 'size', this.rect.width + ' x ' + this.rect.height);
    var rect = dh.createDom('ul', null, topLeft, size);
    var palette = labelledListItem(dh, 'palette', goog.isDefAndNotNull(this.palette) ? this.palette.describeMe(dh) : 'null');
    var interlace = labelledListItem(dh, 'interlace', this.interlace.toString());
    var reserved = labelledListItem(dh, 'reserved', this.reserved.toString());
    var codeSize = labelledListItem(dh, 'codeSize', this.codeSize.toString());
    var pixels = labelledListItem(dh, 'pixels.length', this.pixels.length.toString());
    var desc = dh.createDom('ul', null, rect, palette, interlace, reserved, codeSize, pixels);
    return dh.createDom('li', null, 'Image', desc);
  };

  ble.Gif.GraphicControl.prototype.describeMe = function(dh) {
    var props = ['reserved', 'disposal', 'userInput', 'delayTime', 'transparent', 'transparentIndex'];
    var items = ['ul', null];
    for(var i = 0; i < props.length; i++) {
      items.push(labelledListItem(dh, props[i], this[props[i]].toString()));
    }
    var desc = dh.createDom.apply(dh, items);
    return dh.createDom('li', null, 'GraphicControl', desc);
  };

  ble.Gif.Comment.prototype.describeMe = function(dh) {
    return dh.createDom('li', null, 'Comment: ', this.text);
  };

  ble.Gif.AppExt.prototype.describeMe = function(dh) {
    var id = labelledListItem(dh, 'identifier', this.identifier);
    var au = labelledListItem(dh, '"authentication"', this.auth);
    var data = labelledListItem(dh, 'data', goog.array.map(this.data, function(x) { return x.toString(); }).join(', '));
    return dh.createDom('li', null, 'AppExt', dh.createDom('ul', null, id, au, data));
  };



});
