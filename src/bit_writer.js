//goog.require('ble.Writer');

//goog.provide('ble.Writer');
goog.provide('ble.BitWriter');
goog.require('ble.ArrayWriter');
goog.provide('ble.ConsoleWriter');
goog.require('ble.b2s');

goog.scope(function() {
var b2s = ble.b2s;
/**
 * @constructor
 * @param {ble.Writer} writer
 * @param {boolean=} opt_msb
 */
ble.BitWriter = function(writer, opt_msb) {
  this.dst = writer;
  this.backing = new ArrayBuffer(4);
  this.bytes = new Uint8Array(this.backing);
  this.bits = new Uint32Array(this.backing);
  this.nBits = 0;
  this.msb = Boolean(opt_msb);
};

var B = ble.BitWriter.prototype;

B.bitCapacity = 32;
B.byteCapacity = B.bitCapacity >> 3;

B.bitsTillFull = function() {
  return this.bitCapacity - this.nBits;
};

B.bitsTillByte = function() {
  return (8 - this.nBits % 8) % 8;
};

B.flushClose = function() {
  var pad = this.bitsTillByte();
  if(pad > 0) {
    this.write(0, pad);
  }
  this._flushBytes();
  this.dst = null;
};

var info = function(x) {
  console.log("info: " + x.toString());
};
B.write = function(bits, n) {
  info("contents: " + this.nBits.toString() + " bits, value = '" + b2s(this.bytes) + "' == " + this.bits[0].toString());
  info("writing " + n.toString() + " bits, value = " + bits.toString());
  if(this.msb)
    this._writeMsb(bits, n);
  else
    this._writeLsb(bits, n);
};

B._writeMsb = function(bits, n) {
  bits = bits & ((1 << n) - 1);
  var space = this.bitsTillFull();
  if(n > space) {
    var leftover = n - space;
    var firstBits = bits >> leftover;
    this._writeMsb(firstBits, space);
    bits = bits & ((1 << leftover) - 1);
    n = leftover;
    this._writeMsb(bits, n);
  } else {
    var highBit = space; 
    var val = bits << (highBit - 1);
    this.bits[0] |= val;
    this.nBits += n;
    this._checkFull();
  }
};

B._writeLsb = function(bits, n) {
  bits = bits & ((1 << n) - 1);
  var space = this.bitsTillFull();
  if(n > space) {
    var leftover = n - space;
    var firstBits = bits & ((1 << space) - 1);
    this._writeLsb(firstBits, space);
    bits = bits >> space;
    n = leftover;
    this._writeLsb(bits, n);
  } else {
    var lowBit = this.nBits;
    var val = bits << lowBit;
    this.bits[0] |= val;
    this.nBits += n;
    this._checkFull();
  };
};

B._checkFull = function() {
  if(this.bitsTillFull() == 0) {
    this._flushBytes();
  }
};

B._flushBytes = function() {
  var bytes = this.nBits >> 3;
  if(this.msb) {
    for(var k = this.byteCapacity - 1; k > this.byteCapacity - 1 - bytes; k--) {
      this.dst.write(255 & (this.bits[0] >> (k << 3)));
    }
  } else {
    for(var k = 0; k < bytes; k++) {
      this.dst.write(255 & (this.bits[0] >> (k << 3)));
    }
  }
  this.bits[0] = 0;
  this.nBits = 0; 
};

ble.ConsoleWriter = function() {
  this.console = window.console;
};

ble.ConsoleWriter.prototype.write = function(byte) {
  console.log(byte & 255);
};


});
