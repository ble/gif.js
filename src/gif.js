goog.require('ble.Reader');
goog.require('ble.LzwReader');

goog.require('ble.BitReader');
goog.require('ble.BitWriter');

goog.require('goog.math.Rect');

goog.require('ble.LzwWriter');
goog.provide('ble.Gif');

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

    reader = ble.Reader.promote(reader);

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

  Gp.version = "89a";

  /** @param {ble.Writer} writer */
  Gp.encode = function(writer) {
    writer = ble.Writer.promote(writer);

    writer.writeAsciiString("GIF");
    writer.writeAsciiString(this.version);
    this.screen.encode(writer);
    for(var i = 0; i < this.blocks.length; i++) {
      var block = this.blocks[i];
      var constructor = block.constructor;

      if(constructor === G.Image) {
        writer.write(G.imageSeparator);
      } else {
        writer.write(G.extensionSeparator);
        writer.write(constructor.tag);
      }
      block.encode(writer); 
    }
    writer.write(G.trailer);
  };


  /** @interface */
  G.Block = function() {};

  /** @param {ble.ReaderPromoted} reader
   * @return {boolean} */
  G.Block.prototype.decode = function(reader) {};

  /** @param {ble.WriterPromoted} writer */
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
    this.width = width || NaN;
    this.height = height || NaN;
    this.globalPalette = gPalette || NaN;
    this.colorResolution = cRes || NaN;
    this.backgroundIndex = bgIndex || NaN;
    this.aspect = aspect || NaN;
  };

  G.Screen.prototype.decode = function(reader) {
    this.width = reader.readShort_Le();
    this.height = reader.readShort_Le();
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

  G.Screen.prototype.encode = function(writer) {
    writer.writeShort_Le(this.width)
          .writeShort_Le(this.height);
    var bits = new ble.BitWriter(writer, true);
    var hasPalette = goog.isDefAndNotNull(this.globalPalette);
    bits.write(hasPalette, 1);
    bits.write(this.colorResolution, 3);
    bits.write(hasPalette ? this.globalPalette.sort : false, 1);
    bits.write(hasPalette ? this.globalPalette.size >> 1 : 0, 3);
    bits.flushClose();
    writer.write(this.backgroundIndex);
    writer.write(this.aspect);

    if(hasPalette) {
      writer.writeBytes(this.globalPalette.values);
    }
  };

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
    this.codeSize = codeSize || -1;
  };

  G.Image.prototype.decode = function(reader) {
    var L = reader.readShort_Le();
    var T = reader.readShort_Le();
    var W = reader.readShort_Le();
    var H = reader.readShort_Le();
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

  G.Image.prototype.encode = function(writer) {
    writer.writeShort_Le(this.rect.left)  
          .writeShort_Le(this.rect.top)
          .writeShort_Le(this.rect.width)
          .writeShort_Le(this.rect.height);
    var bits = new ble.BitWriter(writer, true);
    var hasPalette = this.palette != null;
    var paletteSort = hasPalette && this.palette.sort;
    var paletteBits = 0;
    if(hasPalette) {
      var paletteSize = this.palette.size;
      while(paletteSize > 2) {
        paletteBits++;
        paletteSize >>= 1;
      }
    }
    bits.write(hasPalette, 1)
        .write(this.interlace, 1)
        .write(paletteSort, 1)
        .write(this.reserved, 2)
        .write(paletteSize, 3);
    bits.flushClose();
    if(hasPalette) {
      writer.writeBytes(this.palette.values);
    }
    writer.write(this.codeSize);
    this.encodePixels(writer);
  };

  G.Image.prototype.encodePixels = function(writer) {
    var blocks = new ble.BlockWriter(writer);
    var bits = new ble.BitWriter(blocks);
    var lzw = new ble.LzwWriter(this.codeSize, bits);
    for(var i = 0; i < this.pixels.length; i++)
      lzw.write(this.pixels[i]);
    lzw.finish();
    bits.flushClose();
    blocks.flushClose();
  };

  /** @constructor
   * @implements {ble.Gif.Block}
   * @param {number=} reserved
   * @param {number=} disposal
   * @param {boolean=} userInput
   * @param {number=} delayTime
   * @param {boolean=} transparent
   * @param {number=} transparentIndex
   */
  G.GraphicControl = function(
      reserved,
      disposal,
      userInput,
      delayTime,
      transparent,
      transparentIndex) {
    this.reserved = reserved || NaN;
    this.disposal = disposal || NaN;
    this.userInput = userInput || NaN;
    this.delayTime = delayTime || NaN;
    this.transparent = transparent || NaN;
    this.transparentIndex = transparentIndex || NaN;
  };

  G.GraphicControl.tag = 0xF9;

  G.GraphicControl.prototype.encode = function(w){
    w.write(4);
    var bW = new ble.BitWriter(w);
    bW.write(this.reserved, 3);
    bW.write(this.disposal, 3);
    bW.write(this.userInput, 1);
    bW.write(this.transparent, 1);
    w.writeShort_Le(this.delayTime);
    w.write(this.transparentIndex);
    w.write(0);
  };

  G.GraphicControl.prototype.decode = function(r) {
    if(r.readByte() != 4)
      throw new Error("bad length for graphic control block");
    var bR = new ble.BitReader(r);
    this.reserved = bR.read(3);
    this.disposal = bR.read(3);
    this.userInput = Boolean(bR.read(1));
    this.transparent = Boolean(bR.read(1));
    this.delayTime = r.readShort_Le();
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

  G.Comment.prototype.encode = function(writer) {
    var blockW = new ble.BlockWriter(writer);
    blockW.writeBytes(ble.as2b(this.text)); 
  };

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

  G.AppExt.prototype.encode = function(writer) {
      writer.write(11);
      writer.writeAsciiString(this.identifier);
      writer.writeAsciiString(this.auth);
      var block = new ble.BlockWriter(writer);
      block.write(this.data);
      block.flushClose();
  };

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
