goog.require('ble.Reader');

goog.provide('ble.BitReader');

/**
 * @constructor
 * @param {ble.Reader} reader
 * @param {boolean=} opt_msb
 */
ble.BitReader = function(reader, opt_msb) {
  this.src = reader;
  this.bits = 0;
  this.nBits = 0;
  this.msb = Boolean(opt_msb);
};

ble.BitReader.prototype.empty = function() {
  return !this.nBits && this.src.empty();
};

ble.BitReader.prototype.available = function() {
  return this.src.available() * 8 + this.nBits;
};

ble.BitReader.prototype.read = function(n) {
  var result = this.msb ? this._readMsb(n) : this._readLsb(n);
  return result;
};

ble.BitReader.prototype._readLsb = function(n) {
  while(this.nBits < n) {
    this.bits = this.bits | (this.src.readByte() << this.nBits);
    this.nBits += 8;
  }
  var bits = this.bits & ((1 << n) - 1);
  this.bits = this.bits >> n;
  this.nBits -= n;
  return bits;
};

ble.BitReader.prototype._readMsb = function(n) {
  while(this.nBits < n) {
    this.bits = this.bits | (this.src.readByte() << (24 - this.nBits));
    this.nBits += 8;
  }
  var bits = (this.bits >> (32 - n)) & ((1 << n) - 1);
  this.bits = this.bits << n;
  this.nBits -= n;
  return bits;
};
