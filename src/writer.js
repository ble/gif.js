goog.provide('ble.Writer');
goog.provide('ble.WriterPromoted');
goog.provide('ble.ArrayWriter');
goog.provide('ble.BlockWriter');

goog.scope(function() {

var isDef = goog.isDefAndNotNull;

/** @interface */
ble.Writer = function() {};

/**
 * @param {number} byt
 * @return {ble.Writer}
 */
ble.Writer.prototype.write = function(byt) {};

/**
 * @param {Uint8Array} bytes
 * @return {ble.Writer}
 */
ble.Writer.prototype.writeBytes = function(bytes) {};

/**
 * @interface
 * @extends {ble.Writer}
 */
ble.WriterPromoted = function() {};

/**
 * @param {number} shortI
 * @return {ble.WriterPromoted}
 */
ble.WriterPromoted.prototype.writeShort_Le = function(shortI) {};

/**
 * @param {number} byt
 * @return {ble.WriterPromoted}
 */
ble.WriterPromoted.prototype.write = function(byt) {};

/**
 * @param {ble.Writer} writer
 * @return {ble.WriterPromoted}
 */
ble.Writer.promote = function(writer) {
  writer.writeShort_Le = ble.Writer.promote.writeShort_Le;
  return /** @type {ble.WriterPromoted}*/ writer;
};

/** @type {function(this: ble.WriterPromoted, number) : ble.WriterPromoted} */
ble.Writer.promote.writeShort_Le = function(shortI) {
  var writer = this;
  writer.write( shortI       & ((1 << 8) - 1));
  writer.write((shortI >> 8) & ((1 << 8) - 1));
  return writer;
};
/**
 * @constructor
 * @param {ArrayBuffer} ary
 * @param {number=} opt_start
 * @param {number=} opt_length
 */
ble.ArrayWriter = function(ary, opt_start, opt_length) {
  this.aBuf = ary;
  this.vStart = isDef(opt_start) ? opt_start : 0;
  this.vEnd = isDef(opt_length) ? this.vStart + opt_length : this.aBuf.byteLength;
  var length = this.vEnd - this.vStart;
  this.start = 0;
  this.end = length;
  this.octs = new Uint8Array(this.aBuf, this.vStart, length);
};

ble.ArrayWriter.ofCapacity = function(size) {
  return new ble.ArrayWriter(new ArrayBuffer(size));
};

var A = ble.ArrayWriter.prototype;

A.write = function(octet) {
  if(this.start >= this.end)
    throw new Error("write beyond end of array");
  this.octs[this.start++] = octet;
  return this;
};

A.writeBytes = function(octets) {
  if(this.end - this.start < octets.length)
    throw new Error("write would overflow");
  for(var i = 0; i < octets.length; i++) {
    this.octs[i+this.start] = octets[i];
  }
  this.start += octets.length;
  return this;
};

A.writtenSlice = function() {
  return this.octs.subarray(0, this.start);
};

/**
 * @constructor
 * @implements {ble.Writer}
 * @param {ble.Writer} writer
 */
ble.BlockWriter = function(writer) {
  this.writer = writer;
  this.block = new Uint8Array(256);
  this.block[0] = 0;
};

var B = ble.BlockWriter.prototype;

B._resetBlock = function() {
  this.block[0] = 0;
};

B.write = function(byt) {
  var nextToFill = ++this.block[0];
  this.block[nextToFill] = byt;
  if(nextToFill == 255) {
    this.writer.writeBytes(this.block);
    this._resetBlock();
  }
  return this;
};

B.writeBytes = function(bytes) { 
  var start = this.block[0];
  var toFillBlock = 255 - start;
  var inBlock = Math.min(bytes.length, toFillBlock);
  var remaining = bytes.length - inBlock;
  for(var i = 0; i < inBlock; i++) {
    this.block[1 + start + i] = bytes[i];
  }
  this.block[0] += inBlock;
  if(this.block[0] == 255)
    this.writer.writeBytes(this.block);
  if(remaining > 0) {
    var bytesRemaining = /** @type {Uint8Array} */ bytes.subarray(inBlock);
    return this.writeBytes(bytesRemaining);
  }
  return this;
};

B.flushClose = function() {
  var bytesToWrite = /** @type {Uint8Array} */ this.block.subarray(0, this.block[0] + 1);
  this.writer.writeBytes(bytesToWrite);
  this.writer = null;
  this.block = null;
};

});
