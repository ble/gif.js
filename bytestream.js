      var asHex = function(str) {
        result = [];
        for(var i = 0; i < str.length; i++) {
          var hex = (str.charCodeAt(i) & 0xFF).toString(16);
          if(hex.length == 1)
            hex = "0" + hex;
          result.push(hex);
        }
        return result.join(" ");
      };

var toBytes = function(string) {
  var result = [];
  for(var i = 0; i < string.length; i++) {
    result.push(String.fromCharCode(string.charCodeAt(i) & 0xFF));
  }
  return result.join("");
};

var leStringToInt = function(str) {
  var accum = 0;
  for(var i = str.length - 1; i >= 0; i--) {
    accum = accum << 8;
    accum += str.charCodeAt(i) & 0xFF;
  }
  return accum;
};

var intToLeString = function(intv, bytes) {
  var accum = [];
  for(var i = 0; i < bytes; i++) {
    accum.push(String.fromCharCode(intv & 0xFF));
    intv = intv >> 8; 
  }
  return accum.join("");
};

var ByteStream = function(str) {
  this.str = str;
  this.start = 0;
  this.end = str.length;
};

ByteStream.prototype.getUtf8 = function(bytes) {
  if(this.start + bytes > this.end)
    throw "read beyond end";
  var result = this.str.substr(this.start, bytes);
  this.start += bytes;
  return result;
};

ByteStream.prototype.getRaw = function(bytes) {
  if(this.start + bytes > this.end)
    throw "read beyond end";
  if(bytes == null) {
    var result =
      String.fromCharCode(
        this.str.charCodeAt(this.start) & 0xFF);
    this.start++;
    return result;
  }
  var utf = this.getUtf8(bytes);
  return toBytes(utf);
};

ByteStream.prototype.unget = function(bytes) {
  if(bytes == null)
    bytes = 1;
  if(this.start < bytes)
    throw "unget beyond beginning";
  this.start -= bytes;
};

ByteStream.prototype.get = function(bytes) {
  var noArgs = bytes == null;
  bytes = noArgs ? 1 : bytes;
  if(this.start + bytes > this.end)
    throw "read beyond end";
  var result;
  if(!noArgs) {
    result = [];
    for(var i = 0; i < bytes; i++) {
      result.push(this.str.charCodeAt(this.start) & 0xFF);
      this.start++;
    }
  } else {
    result = this.str.charCodeAt(this.start) & 0xFF;
    this.start++;
  }
  return result;
};

ByteStream.prototype.remaining = function() {
  return Math.max(0, this.end - this.start);
}

ByteStream.prototype.get_littleEndian = function(bytes) {
  var result = 0;
  var vals = this.get(bytes);
  for(var i = bytes - 1; i > -1; i--) {
    result *= 256;
    result += vals[i];
  }
  return result;
}

//depends on bits.js
var BitStream = function(data) {
  this.bytes = new ByteStream(data);
  this.partialByte = null;
};

BitStream.prototype.remaining = function() {
  var bits = this.bytes.remaining() * 8;
  if(this.partialByte)
    bits += this.partialByte.remaining();
  return bits;
};

BitStream.prototype.get = function(bits) {
  if(bits == null) 
    bits = 1;
  var result = 0;
  var part = this.partialByte;
  if(part) {
    var bitsToTake = Math.min(part.remaining(), bits);
    result = part.get(bitsToTake);
    bits -= bitsToTake;
    if(!part.remaining())
      this.partialByte = null;
  }
  while(bits >= 8) {
    if(!this.bytes.remaining())
      throw "read beyond end";
    result *= 0x100;
    result += this.bytes.get();
    bits -= 8;
  }
  if(bits > 0) {
    if(!this.bytes.remaining())
      throw "read beyond end";
    part = this.partialByte = new BitExtractor(this.bytes.get());  
    result = result << bits;
    result += part.get(bits);
    if(!part.remaining())
      this.partialByte = null;
  }
  return result;
};

var BlockWriter = function() {
  this.block = [null];
  this.blocks = [];
  this.count = 0;
};

BlockWriter.prototype.append = function(data) {
  var take = Math.min(data.length, 255 - this.count);
  this.block.push(data.substr(0, take));
  this.count += take;
  if(this.count == 255) {
    this.block[0] = String.fromCharCode(0xFF);
    this.blocks.push(this.block.join(""));
    this.block = [null];
    this.count = 0;
  }
  if(take < data.length) {
    this.append(data.substr(take));
  }
};

BlockWriter.prototype.flush = function() {
  if(this.block.length > 1) { 
    this.block[0] = String.fromCharCode(this.count);
    this.blocks.push(this.block.join(""));
    this.block = [null];
    this.count = 0;
  }
  var result = this.blocks.join("");
  this.blocks = [];
  return result;
};

var BlockReader = function(stream) {
  this.stream = stream;
  this.block = null;
}

<<<<<<< HEAD
BlockReader.prototype.getBlock = function() { 
    var length = this.stream.get();
    return this.stream.getRaw(length);
}

=======
>>>>>>> master
BlockReader.prototype.get = function() {
  if(this.block === null || !this.block.remaining()) {
    var length = this.stream.get();
    this.block = new ByteStream(this.stream.getRaw(length));
  }
  if(!this.block.remaining()) {
    this.stream = null;
    return null;
  } else {
    var result = this.block.get();
    if(!this.block.remaining())
      this.block = null;
    return result;
<<<<<<< HEAD
  }
};

BlockReader.prototype.getUntilEmptyBlock = function() {
  var blocks = [];
  var block;
  while( (block = this.getBlock()) != "") {
    blocks.push(block);
=======
>>>>>>> master
  }
  return blocks.join(""); 
};
