goog.require('ble.Reader');
goog.require('ble.LzwReader');
goog.require('goog.math.Rect');

goog.provide('ble.Gif');

/** @interface */
ble.Writer = function() {};

goog.scope(function() {

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {string=} version
   * @param {ble.Gif.Screen=} screen
   * @param {Array.<ble.Gif.Block>=} blocks
   */
  ble.Gif = function(version, screen, blocks) {
    this.version = version;
    this.screen = screen;
    this.blocks = blocks;
  };

  var G = ble.Gif;
  G.extensionSeparator = 0x21;
  G.imageSeparator = 0x2C;
  G.trailer = 0x3B;

  G.blockTypes = {};
  var Gp = ble.Gif.prototype;

  
  /** @param {ble.Reader} reader
   * @return {boolean} */
  Gp.decode = function(reader) {
    var tag = ble.b2s(reader.readBytes(3));
    if(tag != "GIF")
      throw new Error("bad header");
    this.version = ble.b2s(reader.readBytes(3));
    this.screen = new ble.Gif.Screen();
    this.screen.decode(reader);

    this.blocks = [];
    while(!reader.empty()) {
      var sep = reader.readByte();

      if(sep == G.imageSeparator) {
        var i = new G.Image();
        if(!i.decode(reader)) {
          throw new Error("bad image");
        }
        this.blocks.push(i);

      } else if(sep == G.extensionSeparator) {
        var label = reader.readByte();
        var blockT = G.blockTypes[label];
        if(!blockT)
          throw new Error("unknown extension label");
        var block = new blockT();
        block.decode(reader);
        this.blocks.push(block); 
      } else if(sep == G.trailer) {
        return true;
      } else {
        throw new Error("bad separator");
      }
    }
    return false;
  };

  /** @param {ble.Writer} writer */
  Gp.encode = function(writer) {};


  /** @interface */
  G.Block = function() {};

  /** @param {ble.Reader} reader
   * @return {boolean} */
  G.Block.prototype.decode = function(reader) {};

  /** @param {ble.Writer} writer */
  G.Block.prototype.encode = function(writer) {};

  /** @constructor
   * @param {boolean} sort
   * @param {number} size
   * @param {Uint8Array} values */
  ble.Gif.Palette = function(sort, size, values) {
    this.sort = sort;
    this.size = size;
    this.values = values; 
  };

  ble.Gif.Palette.prototype.getColor = function(ix) {
    var color = this.values.subarray(3*ix, 3*(ix+1));
    if(color.length != 3)
      throw new Error("bad color lookup");
    return color;
  };

  /** @constructor
   * @param {number=} width
   * @param {number=} height
   * @param {ble.Gif.Palette=} gPalette
   * @param {number=} cRes
   * @param {number=} bgIndex
   * @param {number=} aspect
   * @implements {ble.Gif.Block}
   * */
  G.Screen = function(width, height, gPalette, cRes, bgIndex, aspect) {
    this.width = width;
    this.height = height;
    this.globalPalette = gPalette;
    this.colorResolution = cRes;
    this.backgroundIndex = bgIndex;
    this.aspect = aspect;
  };

  G.readLeInt = function(reader) {
    return reader.readByte() + (reader.readByte() << 8);
  };

  G.Screen.prototype.decode = function(reader) {
    this.width = G.readLeInt(reader);
    this.height = G.readLeInt(reader);
    var bits = new ble.BitReader(reader, true);
    var hasPalette = Boolean(bits.read(1));
    this.colorResolution = bits.read(3);
    var sort = Boolean(bits.read(1));
    var paletteSize = 2 << bits.read(3);

    this.backgroundIndex = reader.readByte();
    this.aspect = reader.readByte();

    if(hasPalette) {
      var p = new ble.Gif.Palette(
        sort,
        paletteSize,
        reader.readBytes(3 * paletteSize));
      this.globalPalette = p;
    } else {
      this.globalPalette = null;
    }
    return true;
  };

  G.Screen.prototype.encode = goog.abstractMethod;

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {goog.math.Rect=} rect
   * @param {ble.Gif.Palette=} palette
   * @param {boolean=} interlace
   * @param {number=} reserved
   * @param {Array.<number> | Uint8Array=} pixels
   * @param {number=} codeSize
   */
  G.Image = function(rect, palette, interlace, reserved, pixels, codeSize) {
    this.rect = rect;
    this.palette = palette;
    this.interlace = interlace;
    this.reserved = reserved;
    this.pixels = pixels;
    this.codeSize = codeSize;
  };

  G.Image.prototype.decode = function(reader) {
    var L = G.readLeInt(reader);
    var T = G.readLeInt(reader);
    var W = G.readLeInt(reader);
    var H = G.readLeInt(reader);
    this.rect = new goog.math.Rect(L, T, W, H); 

    var bits = new ble.BitReader(reader, true);
    var localPalette = Boolean(bits.read(1));
    this.interlace = Boolean(bits.read(1));
    var sort = Boolean(bits.read(1));
    this.reserved = bits.read(2);
    var paletteSize = 2 << bits.read(3);
    if(localPalette) {
      this.palette = new ble.Gif.Palette(
        sort,
        paletteSize,
        reader.readBytes(3 * paletteSize));
    } else {
      this.palette = null;
    }

    this.codeSize = reader.readByte();
    this.decodePixels(new ble.BlockReader(reader));
    return true;
  };

  G.Image.prototype.decodePixels = function(reader) {
    var backing = new ArrayBuffer(this.rect.width * this.rect.height);
    this.pixels = new Uint8Array(backing);
    this.pixels.backing = backing;

    var decodeStream = new ble.LzwReader(reader, this.codeSize, false);
    var read = 0;
    do {
      var decode = decodeStream.decodeOne();
      for(var i = 0; i < decode.length; i++) {
        this.pixels[read + i] = decode[i];
      }
      read += decode.length;
    } while(decode.length > 0);

  };

  G.Image.prototype.encode = goog.abstractMethod;

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {number=} reserved
   * @param {number=} disposal
   * @param {boolean=} userInput
   * @param {number=} delayTime
   * @param {number=} transparentIndex
   */
  G.GraphicControl = function(
      reserved,
      disposal,
      userInput,
      delayTime,
      transparentIndex) {
    this.reserved = reserved;
    this.disposal = disposal;
    this.userInput = userInput;
    this.delayTime = delayTime;
    this.transparentIndex = transparentIndex;
  };

  G.GraphicControl.tag = 0xF9;

  G.GraphicControl.prototype.encode = goog.abstractMethod;

  G.GraphicControl.prototype.decode = function(r) {
    if(r.readByte() != 4)
      throw new Error("bad length for graphic control block");
    var bR = new ble.BitReader(r);
    this.reserved = bR.read(3);
    this.disposal = bR.read(3);
    this.userInput = Boolean(bR.read(1));
    this.transparent = Boolean(bR.read(1));
    this.delayTime = G.readLeInt(r);
    this.transparentIndex = r.readByte();
    if(r.readByte() != 0)
      throw new Error("missing block terminator");
    return true; 
  };

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {string} text */
  G.Comment = function(text) {
    this.text = text;
  };

  G.Comment.tag = 0xFE; 

  G.Comment.prototype.encode = goog.abstractMethod;

  G.Comment.prototype.decode = function(reader) {
    var b = new ble.BlockReader(reader);
    this.text = ble.b2s(b.readBytes(b.available()));
    return true;
  };

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {string=} identifier
   * @param {string=} auth
   * @param {Uint8Array=} data
   */
  G.AppExt = function(identifier, auth, data) {
    this.identifier = identifier;
    this.auth = auth;
    this.data = data;
  };

  G.AppExt.tag = 0xFF;

  G.AppExt.prototype.encode = goog.abstractMethod;

  G.AppExt.prototype.decode = function(reader) {
    if(reader.readByte() != 11)
      throw new Error("bad application extension");
    this.identifier = ble.b2s(reader.readBytes(8));
    this.auth = ble.b2s(reader.readBytes(3));
    var B = new ble.BlockReader(reader);
    this.data = B.readBytes(B.available());
    return true;
  };

  G.PlainText = function() {
    throw new Error("unimplemented");
  };

  G.PlainText.tag = 0x01;

  G.PlainText.prototype.encode = goog.abstractMethod;

  G.PlainText.prototype.decode = goog.abstractMethod;

  (function(){
    var cs = [
      G.GraphicControl,
      G.Comment,
      G.AppExt,
      G.PlainText
    ];
    for(var i = 0; i < cs.length; i++) {
      G.blockTypes[cs[i].tag] = cs[i];
    }
  })();

});
