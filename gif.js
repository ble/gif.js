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
  var decoder = new LzwReader(stream, true, minCodeSize); 

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

var decodeImageDataBlock = function(stream, iDecoder) {
  var size = stream.get();
  if(size < 0 || size > 255)
    throw "bad size for image data block";
  var data = stream.getUtf8(size);
  var codes = iDecoder.decode(data);
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
  throw "comments unimplemented";
};
decodeComment.label = 0xFE;

var decodePlainText = function(stream) {
  throw "plain text unimplemented";
};
decodePlainText.label = 0x01;

var decodeApplicationExtension = function(stream) {
  throw "application extension unimplemented";
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
