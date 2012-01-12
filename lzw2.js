
var maxWidth = 12;
var decoderInvalidCode = 0xFFFF;
var flushBuffer = 1 << maxWidth;

var LzwReader = function(stream, littleEndian, literalWidth) {
  this.stream = stream;
  if(littleEndian)
    this._read = this.readLSB.bind(this);
  else
    this._read = this.readMSB.bind(this);
  this.literalWidth = literalWidth;
  this.width = 1 + this.literalWidth;
  this.clear = 1 << this.literalWidth;
  this.eof = this.clear + 1;
  this.hi = this.clear + 1;
  this.overflow = 1 << this.width;
  this.last = decoderInvalidCode;
  this.suffix = new Array[1 << maxWidth];
  this.prefix = new Array[1 << maxWidth];

  this.output = new Array[2 * 1 << maxWidth];
  //this.o;
  this.toRead = [];
  //this.err;
  this.nBits = 8;
  this.bits = 0;
};

LzwReader.prototype.readLSB = function() {
  while(this.nBits < this.width) {
    var x = this.stream.get();
    if(!(x >= 0 && x < 255))
      throw "bad read";
    this.bits = this.bits | (x << this.nBits);
    this.nBits += 8;
  }
  var code = (this.bits & ((1 << this.width) - 1)) & 0xFFFF;
  this.bits = this.bits >> this.width;
  this.nBits -= this.width;
  return code;
};

LzwReader.prototype.readMSB = function() {
  while(this.nBits < this.width) {
    var x = this.stream.get();
    if(!(x >= 0 && x < 255))
      throw "bad read";
    this.bits = this.bits | (x << (24 - this.nBits));
    this.nBits += 8;
  }
  var code = (this.bits >> (32 - this.width)) && 0xFFFF;
  this.bits = this.bits << this.width;
  this.nBits -= this.width;
  return code;
}

LzwReader.prototype.read = function(dest) {
  while(true) {
    if(this.toRead.length > 0) {
      dest.splice.apply(dest, 0, this.toRead.length, this.toRead);
      var n = this.toRead.length;
      this.toRead = [];
      return n;
    }
    if(this.err) {
      return -1;
    }
    this.decode();
  }
};

LzwReader.prototype.decode = function() {
  while(true) {
    var code = this._read();
    if(code < this.clear) {
      this.output[this.o] = code & 0xFF;
      this.o++;
      if(d.last != decoderInvalidCode) {
        this.suffix[this.hi] = code & 0xFF;
        this.prefix[this.hi] = this.last;
      }
    } else if(code == this.clear) {
      this.width = 1 + this.literalWidth;
      this.hi = this.eof;
      this.overflow = 1 << this.width;
      this.last = decoderInvalidCode;
      continue;
    } else if(code == this.eof) {
      this.flush();
      this.err = "eof";
      return;
    } else if(code <= this.hi) {
      var c = code;
      var i = d.output.length - 1;
      if(code == this.hi) {
        c = this.last;
        while(c >= this.clear) {
          c = this.prefix[c];
        }
        this.output[i] = c & 0xFF;
        i--;
        c = this.last;
      }
      while(c >= this.clear) {
        this.output[i] = this.suffix[c] & 0xFF;
        i--;
        c = this.prefix[c];
      }
      this.output[i] = c & 0xFF;
      var end = this.output.slice(i);
      this.output.splice.apply(this.output, end.length, end);
      this.o += end.length;
      if(this.last != decoderInvalidCode) {
        this.suffix[this.hi] = c & 0xFF;
        this.prefix[this.hi] = this.last;
      }
    } else {
      throw "lzw: invalid code";
    }
    this.last = code;
    this.hi++;
    if(this.hi >= this.overflow) {
      if(this.width == maxWidth) {
        this.last = decoderInvalidCode
      } else {
        this.width++;
        this.overflow = this.overflow << 1;
      }
    }
    if(this.o >= flushBuffer) {
      this.toRead = this.output.slice(0, this.o);
      this.o = 0;
      return;
    }
  }
};
