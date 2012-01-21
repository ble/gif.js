goog.require('ble.Reader');

goog.provide('ble.BitReader');

/**
 * @constructor
 * @param {ble.Reader} reader
 */
ble.BitReader = function(reader) {
  this.src = reader;
  this.bits = 0;
  this.nBits = 0;
};

ble.BitReader.prototype.empty = function() {
  return !this.nBits && this.src.empty();
};

ble.BitReader.prototype.read = function(n) {
  while(this.nBits < n) {
    this.bits = this.bits | (this.src.readByte() << this.nBits);
    this.nBits += 8;
  }
  var bits = this.bits & ((1 << n) - 1);
  this.bits = this.bits >> n;
  this.nBits -= n;
  return bits;
};
