goog.require('ble.Gif');
goog.require('goog.dom.DomHelper');

goog.provide('ble.Gif.describeGif');

goog.scope(function() {

  ble.Gif.describeGif = function(gif) {
    return gif.describeMe(new goog.dom.DomHelper());
  };

  var labelledItem = function(dh, label, value) {
    return dh.createDom('div', null, label, ': ', value);
  };
  var labelledListItem = function(dh, label, value) { 
    return dh.createDom('li', null, label, ': ', value);
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
    return "asdf";
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



});
