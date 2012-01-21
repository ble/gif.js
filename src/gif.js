goog.require('ble.Reader');
goog.require('ble.LzwReader');

goog.provide('ble.Gif');



goog.scope(function() {

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {string} version
   * @param {ble.Gif.Screen} screen
   * @param {Array.<ble.Gif.Block>} blocks
   */
  ble.Gif = function(version, screen, blocks) {
    if(version.length != 3)
      throw "bad version";
    this.version = version;
    this.screen = screen;
    this.blocks = blocks;
  };

  var G = ble.Gif;
  var Gp = ble.Gif.prototype;

  Gp.decode = function(reader) {
    var tag = ble.b2s(reader.getBytes(3));
    if(tag != "GIF")
      throw "bad header";
    this.version = ble.b2s(reader.getBytes(3));
    this.screen = new Screen();
    this.screen.decode(reader);
  };

  /** @interface */
  G.Block = function() {};

  /** @param {ble.Reader} reader
   * @return {boolean} */
  G.Block.prototype.decode = function(reader) {};

  /** @param {ble.Writer} writer */
  G.Block.prototype.encode = function(writer) {};

  /** @constructor
   * @param {number} width
   * @param {number} height
   * @param {ble.Gif.Palette} gPalette
   * @param {number} cRes
   * @param {number} bgIndex
   * @param {number} aspect
   * @implements {ble.Gif.Block}
   * */
  ble.Gif.Screen = function(width, height, gPalette, cRes, bgIndex, aspect) {
    this.width = width;
    this.height = height;
    this.globalPalette = globalPalette;
    this.colorResolution = cRes;
    this.backgroundIndex = bgIndex;
    this.aspect = aspect;
  };

  ble.Gif.Screen.decode = function(reader) {
    this.width = reader.getByte() + (reader.getByte() << 8);
    this.height = reader.getByte() + (reader.getByte() << 8);
    var bits = new ble.BitReader(reader, true);
    var hasPalette = Boolean(bits.get(1));
    this.colorResolution = bits.get(3);
    var sort = Boolean(bits.get(1));
    var paletteSize = 2 << packed.get(3);
    this.aspect = reader.get();

    if(hasPalette) {
      var p = new Palette(sort, paletteSize, reader.readBytes(paletteSize));
      this.globalPalette = p;
    } else {
      this.globalPalette = null;
    }
    return true;
  };
});
