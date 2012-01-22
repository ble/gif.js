goog.require('ble.Reader');
goog.require('ble.BitReader');

goog.provide('ble.LzwReader');


/**
 * @constructor
 * @param {ble.Reader} reader
 * @param {number} bitDepth
 * @param {boolean=} opt_msb
 */
ble.LzwReader = function(reader, bitDepth, opt_msb) {
  this.bitReader = new ble.BitReader(reader, opt_msb);

  this.literalWidth = bitDepth; 
  this.clear = 1 << this.literalWidth;
  this.eof = this.clear + 1;

  this._reset();
};

ble.LzwReader.prototype._reset = function() {
  this.width = 1 + this.literalWidth;
  this.hi = this.eof;
  this.overflow = 1 << this.width;
  this.last = this.invalidCode;

  this.suffix = new Array(1 << this.maxWidth);
  this.prefix = new Array(1 << this.maxWidth);

};

ble.LzwReader.prototype.maxWidth = 16;
ble.LzwReader.prototype.invalidCode = 0xFFFF;

ble.LzwReader.prototype._readCode = function() {
  return this.bitReader.read(this.width);
};

ble.LzwReader.prototype.decodeOne = function() {
  var code = this._readCode();
  var result;
  if(code == this.eof) {
    return [];
  } else if(code == this.clear) {
    this._reset();
    return this.decodeOne();
  } else if(code < this.clear) {
    result = [code];
    if(this.last != this.invalidCode) {
      this.suffix[this.hi] = code;
      this.prefix[this.hi] = this.last;
    }
  } else if(code <= this.hi) {
    var c = code;
    result = [];
    if(c == this.hi) {
      c = this.last;
      while(c >= this.clear) {
        c = this.prefix[c];
      }
      result.unshift(c);
      c = this.last;
    }
    while(c >= this.clear) {
      result.unshift(this.suffix[c]);
      c = this.prefix[c];
    }
    result.unshift(c);
    if(this.last != this.invalidCode) {
      this.suffix[this.hi] = c;
      this.prefix[this.hi] = this.last;
    }
  } else {
    throw new Error("bad lzw code");
  }
  this.last = code;
  this.hi++;
  if(this.hi >= this.overflow) {
    if(this.width == this.maxWidth) {
      this.last = this.invalidCode;
    } else {
      this.width++;
      this.overflow = this.overflow << 1;
    }
  }
  return result;
};
