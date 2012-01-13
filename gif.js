var Gif = function(version, screen, blocks) {
  this.version = version;
  this.screen = screen;
  this.blocks = blocks;
};

var Palette = function(sorted, size, values) {
  this.sorted = sorted;
  this.size = size;
  this.values = values;
};

Palette.prototype.encodeEntries = function() {
  return octetsToString(this.values);
};

Palette.prototype.decodeEntries = function(stream) {
  this.values = stringToOctets(stream.getRaw(this.values * 3));
  return true;
};

Palette.prototype.logSize = function() {
  var i = 1;
  while(i <= 8 && (1 << i) != this.size)
    i++;
  if(this.size != (1 << i))
    throw "bad palette size " + this.size;
  return i;
};

var Screen = function(width, height, gPalette, cRes, bgIndex, aspect) {
  this.width = width;
  this.height = height;
  this.globalPalette = gPalette;
  this.colorResolution = cRes;
  this.backgroundIndex = bgIndex;
  this.aspect = aspect;
};

Screen.prototype._packedField = function() {
  var acc = new BitAccumulator(8);
  var p = this.globalPalette;
  if(p) { 
    acc.append(1, 1)[0];
    acc.append(this.colorResolution, 3);
    acc.append(p.sorted ? 1 : 0, 1);
    return acc.append(p.logSize() - 1, 3);
  } else {
    acc.append(0, 1);
    acc.append(this.colorResolution, 3);
    return acc.append(0, 4);
  }
};

Screen.prototype.encode = function() { 
  var items = [
    intToLeString(this.width, 2),
    intToLeString(this.height, 2),
    octetsToString([
        this._packedField(),
        this.backgroundIndex,
        this.aspect ? this.aspect : 0])];
  if(this.globalPalette)
    items.push(this.globalPalette.encodeEntries());
  return items.join("");
};

Screen.prototype.decode = function(stream) {
  this.width = leStringToInt(stream.getRaw(2));
  this.height = leStringToInt(stream.getRaw(2));
  var packed = new BitExtractor(stream.get());
  var hasPalette = packed.get();
  this.colorResolution = packed.get(3);
  var sort = packed.get();
  var paletteSize = 2 << packed.get(3);
  this.backgroundIndex = stream.get();
  this.aspect = stream.get();
  if(!this.aspect)
    this.aspect = null;
  else
    this.aspect = (aspect + 15) / 64.0;

  if(hasPalette) {
    var p = new Palette(Boolean(sort), paletteSize, []);
    p.decodeEntries(stream);
    this.globalPalette = p;
  } else {
    this.globalPalette = null;
  }
  return true;
};

var Image = function(rect, palette, interlace, reserved, pixels, codeSize) {
  this.rect = rect;
  this.palette = palette;
  this.interlace = interlace;
  this.reserved = reserved;
  this.pixels = pixels;
  this.codeSize = codeSize;
};

Image.prototype.encode = function() {
  var items = [
    intToLeString(this.rect.left, 2),
    intToLeString(this.rect.top, 2),
    intToLeString(this.rect.width, 2),
    intToLeString(this.rect.height, 2),
    this._packedFields()];
  if(this.palette)
    items.push(this.palette.encodeEntries());

  var encoder = new LzwEncoder(this.codeSize); 
  var lzw = encoder.encode(octetsToString(this.pixels));
  var block = new BlockWriter();
  block.append(lzw);
  var gifCompressed = lzw.flush();
  items.push(gifCompressed);

  //block terminator
  items.push(String.fromCharCode(0));
  return items.join("");
};

Image.prototype.decode = function(stream) { 
  var rect = {};
  rect.left = leStringToInt(stream.getRaw(2));
  rect.top = leStringToInt(stream.getRaw(2));
  rect.width = leStringToInt(stream.getRaw(2));
  rect.height = leStringToInt(stream.getRaw(2));
  this.rect = rect;

  var packed = new BitExtractor(stream.get());
  var localPalette = Boolean(bits.get());
  this.interlace = Boolean(bits.get());
  var sort = Boolean(bits.get());
  this.reserved = bits.get(2);
  var paletteSize = 2 << bits.get(3);
  if(localPalette) {
    this.palette = new Palette(Boolean(sort), paletteSize, []);
    this.palette.decodeEntries(stream);
  } else {
    this.palette = null;
  }

  var decoder = new LzwReader(new BlockReader(stream), true, this.codeSize);
  var tmp = [];
  var count;
  this.pixels = [];
  while( (count = decoder.read(tmp)) > 0) {
    this.pixels = this.pixels.concat(tmp);
  } 
  if(stream.get() != 0)
    console.log("image not null terminated?");
  return true;
};

Image.prototype._packedFields = function() {
  var acc = new BitAccumulator(8);
  var p = this.palette;
  acc.append(p ? 1 : 0, 1);
  acc.append(this.interlace ? 1 : 0, 1);
  acc.append(p && p.sorted ? 1 : 0, 1);
  acc.append(this.reserved, 2);
  return acc.append(p ? p.logSize() - 1 : 0, 3)[0];
};

var GraphicControl = function(
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

GraphicControl.prototype.encode = function() {
  items = [
    String.fromCharCode(4),
    this._packedField(),
    leIntToString(this.delayTime),
    String.fromCharCode(this.transparentIndex),
    String.fromCharCode(0)];
  return items.join("");
};

GraphicControl.prototype._packedField = function() {
  var acc = new BitAccumulator(8);
  acc.append(this.reserved, 3);
  acc.append(this.disposal, 3);
  acc.append(this.userInput, 1);
  return acc.append(this.transparent, 1)[0];
};

GraphicControl.prototype.decode = function(stream) {
  var blockSize = stream.get();
  if(blockSize != 4)
    throw "unexpected length for graphic control block";
  var bits = new BitExtractor(stream.get());
  this.reserved = bits.get(3);
  this.disposal = bits.get(3);
  this.userInput = Boolean(bits.get());
  this.transparent = Boolean(bits.get());
  this.delayTime = stream.get_littleEndian(2);
  this.transparentIndex = stream.get();
  if(stream.get() != 0)
    throw "missing block terminator";
  return true;
}

var Comment = function(text) {
  this.text = text;
};

Comment.prototype.encode = function() {
  var w = new BlockWriter();
  w.append(this.text);
  return w.flush();
};

Comment.prototype.decode = function(stream) {
  var blocks = [];
  var r = new BlockReader(stream);
  var block;
  while(block = r.get() != null) {
    blocks.push(block);
  }
  this.text = blocks.join("");
};

var PlainText = function() {
  throw "unimplemented";
};

var ApplicationExtension = function(extName, extId, data) {

};
var decodeGif = function(gifData) {
  var stream = new ByteStream(gifData);
  var gif = {};
  if(stream.getUtf8(3) != "GIF")
    throw "bad header";
  gif.version = stream.getUtf8(3);
  gif.blocks = [];
  var lsd = decodeLogicalScreenDescriptor(stream);
  gif.lsd = lsd;
  gif.blocks.push(lsd);
  if(lsd.globalPalette) {
    var gp = decodePalette(stream, lsd.globalPaletteSize);
    gif.gp = gp;
    gif.blocks.push(gp);
  }
  while(stream.remaining()) {
    var sep = stream.get();
    if(sep == extensionSeparator) {
      var label = stream.get();
      var decoder = decoders[label];
      if(!decoder)
        throw "unknown extension label";
      gif.blocks.push(decoder(stream));
    } else if(sep == imageSeparator) {
      var descriptor = decodeImageDescriptor(stream);
      gif.blocks.push(descriptor);
      var pixels = decodeImageTable(stream, descriptor.width*descriptor.height);
      gif.blocks.push(pixels);
    }
  }
  return gif;
};

var decodeLogicalScreenDescriptor = function (stream) {
  var lsd = {};
  lsd.width = stream.get_littleEndian(2);
  lsd.height = stream.get_littleEndian(2);

  var tmp = new BitExtractor(stream.get());
  lsd.globalPalette = Boolean(tmp.get(1));
  lsd.bitsPerColor = 1 + tmp.get(3);

  var sF = Boolean(tmp.get(1));
  lsd.sortedPalette = lsd.globalPalette ? sF : null;

  var pSize = 1 << (1 + tmp.get(3));
  lsd.globalPaletteSize = lsd.globalPalette ? pSize : null;

  var bgIx = stream.get();
  lsd.backgroundIndex = lsd.globalPalette ? bgIx : null;

  var aspect = stream.get();
  lsd.pixelAspect = aspect == 0 ? null : (aspect + 15) / 64.0;

  return lsd; 
};

var decodePalette = function(stream, entries) {
  var palette = stream.get(entries * 3);
  return palette;
};

var imageSeparator = 0x2C;
var decodeImageDescriptor = function(stream) {
  var id = {};
  id.left = stream.get_littleEndian(2);
  id.top = stream.get_littleEndian(2);
  id.width = stream.get_littleEndian(2);
  id.height = stream.get_littleEndian(2);
  var bits = new BitExtractor(stream.get());
  var localPalette = bits.get();
  id.interlace = Boolean(bits.get());
  id.sort = Boolean(bits.get());
  id.reserved = bits.get(2);
  var localPaletteSize = 2 << (1 + bits.get(3));
  if(localPalette)
    id.palette = decodePalette(stream, localPaletteSize);
  else
    id.palette = null;
  return id;
};

var decodeImageTable = function(stream, pixelCount) {
  var minCodeSize = stream.get();
  var lzw = "";
  var destination = []
  var result = [];
  var decoder = new LzwReader(new BlockReader(stream), true, minCodeSize); 

  var pixels = [];
  var tmp = [];
  var count = 0;
  while(count = decoder.read(tmp) > 0) {
    pixelCount -= count;
    pixels = pixels.concat(tmp);
    tmp = []; 
//    if(pixelCount <= 0)
//      break;
  }
  return pixels;
};


var extensionSeparator = 0x21;
var decodeGraphicControl = function(stream) {
  var gc = {};
  var blockSize = stream.get();
  if(blockSize != 4)
    throw "unexpected length for graphic control block";
  var bits = new BitExtractor(stream.get());
  gc.reserved = bits.get(3);
  gc.disposal = bits.get(3);
  gc.userInput = Boolean(bits.get());
  gc.transparent = Boolean(bits.get());
  gc.delayTime = stream.get_littleEndian(2);
  gc.transparentIndex = stream.get();
  if(stream.get() != 0)
    throw "missing block terminator";
  return gc;
};
decodeGraphicControl.label = 0xF9;

var decodeComment = function(stream) {
  var length;
  var comment = "";
  while(length = stream.get()) {
    comment += stream.getRaw(length);
  }
  return comment;
};
decodeComment.label = 0xFE;

var decodePlainText = function(stream) {
  throw "plain text unimplemented";
};
decodePlainText.label = 0x01;

var decodeApplicationExtension = function(stream) {
  var length = stream.get();
  var appIdCode = stream.getRaw(length);
  console.log("Application extension <<" + appIdCode + ">>");
  length = stream.get();
  while(length > 0) {
    var dataSkip = stream.getRaw(length);
    length = stream.get();
  };
  return appIdCode;
};
decodeApplicationExtension.label = 0xFF; 

var decoders = (function() {
  var list = [
    decodeGraphicControl,
    decodeComment,
    decodePlainText,
    decodeApplicationExtension];
  var decoders = {};
  for(var i = 0; i < list.length; i++) {
    var decoder = list[i];
    var label = decoder.label;
    if(!label)
      throw "missing label";
    if(label in decoders)
      throw "duplicate label";
    decoders[label] = decoder;
  };
  return decoders;
})();
