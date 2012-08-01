goog.provide('ble.Writer');
goog.provide('ble.ArrayWriter');

goog.scope(function() {

/** @interface */
ble.Writer = function() {};

/** @param {number} byt */
ble.Writer.prototype.write = function(byt) {};

var isDef = goog.isDefAndNotNull;
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
};

A.writtenSlice = function() {
  return this.octs.subarray(0, this.start);
};

});
