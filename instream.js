goog.provide('ble.InStream');
goog.provide('ble.ArrayStream');
goog.provide('ble.ConcatStream');
goog.provide('ble.b2s');

goog.require('goog.array');
/** @param {Array.<number>} octets
 * @return {string}
 */
ble.b2s = function(octets) {
  return goog.array.map(
      octets,
      function(x) { return String.fromCharCode(x & 0xFF); }).
    join("");
};

/**
 * @interface
 */
ble.InStream = function() {};

/** @return {number} */
ble.InStream.prototype.available = function() {};

/** @return {number} */
ble.InStream.prototype.readByte = function() {};

/** @return {Uint8Array} */
ble.InStream.prototype.readBytes = function() {};

/** @param {number} bytes
 * @return {ble.InStream} */
ble.InStream.prototype.subStream = function(bytes) {};

/** @return {ble.InStream} */
ble.InStream.prototype.slice = function() {};

/** @constructor
 * @implements {ble.InStream}
 * @param {ArrayBuffer} ary
 * @param {number=} opt_start
 * @param {number=} opt_length */
ble.ArrayStream = function(ary, opt_start, opt_length) {
  this.aBuf = ary;
  this.vStart = opt_start ? opt_start : 0;
  this.vEnd = opt_length ? this.vStart + opt_length : this.aBuf.byteLength;
  var length = this.vEnd - this.vStart;
  this.start = 0;
  this.end = length;
  this.octs = new Uint8Array(this.aBuf, this.vStart, length);
};

ble.ArrayStream.fromAsciiString = function(str) {
  var backing = new ArrayBuffer(str.length);
  var view = new Uint8Array(backing);
  for(var i = 0; i < str.length; i++) {
    //no need to bother with masking; array can only store 8-bit values.
    view[i] = str.charCodeAt(i); 
  }
  return new ble.ArrayStream(backing);
};

ble.ArrayStream.prototype.available = function() {
  return this.end - this.start;
};

ble.ArrayStream.prototype.readByte = function() {
  if(this.start >= this.end)
    throw "read beyond end";
  var result = this.octs[this.start];
  this.start++;
  return result;
};

ble.ArrayStream.prototype.readBytes = function(bytes) { 
  if(this.start > this.end - bytes)
    throw "read beyond end";
  var result = this.octs.subarray(this.start, this.start + bytes);
  this.start += bytes;
  return result;
};

ble.ArrayStream.prototype.subStream = function(bytes) {
  if(this.start > this.end - bytes)
    throw "read beyond end";
  var result = new ble.ArrayStream(this.aBuf, this.vStart + this.start, bytes);
  this.start += bytes; 
  return result;
};

ble.ArrayStream.prototype.slice = function() { 
  return new ble.ArrayStream(this.aBuf, this.vStart + this.start, this.available());
};

/** @return {ArrayBuffer} */
ble.ArrayStream.prototype.underlying = function() { 
  return this.aBuf;
};

/** @return {Array.<number>} */
ble.ArrayStream.prototype.viewRange = function() {
  return [this.vStart, this.vEnd];
};

/** @constructor
 * @implements {ble.InStream}
 * @param {Array.<ble.InStream>} substreams */
ble.ConcatStream = function(substreams) {
    this.substreams = substreams.slice();
    this.subIx = 0;
    this._advance();
};

ble.ConcatStream.prototype._advance = function() {
  while(this._s() && this._s().available() == 0)
    this.subIx++;
};

ble.ConcatStream.prototype._s = function() {
  return this.substreams[this.subIx];
}

/** @return {number} */
ble.ConcatStream.prototype.available = function() {
  var sum = 0;
  for(var ix = this.subIx; ix < this.substreams.length; ix++) {
    sum += this._s().available();
  }
  return sum;
};

/** @return {number} */
ble.ConcatStream.prototype.readByte = function() {
  this._advance();
  if(this.subIx >= this.substreams.length)
    throw "read beyond end";
  return this._s().readByte();
};

/** @return {Uint8Array} */
ble.ConcatStream.prototype.readBytes = function(bytes) {
  var ss = this.subStream(bytes);
  var backing = new ArrayBuffer(bytes);
  var contiguous = new Uint8Array(backing);
  var offset = 0;
  while(ss.available()) {
    var chunk = this._s();
    var sz = chunk.available();
    contiguous.set(chunk.readBytes(sz), offset);
    offset += sz;
  }
  return contiguous;
};

/** @param {number} bytes
 * @return {ble.InStream} */
ble.ConcatStream.prototype.subStream = function(bytes) {
  if(this.available() < bytes)
    throw "read beyond end";
  var blocks = [];
  var sum = 0;
  while(sum < bytes) {
    var block = this._s();
    var fromBlock = Math.min(bytes, this._s().available());
    if(fromBlock == 0)
      continue;
    var ssBlock = block.subStream(fromBlock);
    blocks.push(ssBlock);
    sum += fromBlock;
    if(fromBlock == this._s().available())
      this.subIx++;
  }
  return new ble.ConcatStream(blocks);
};

/** @return {ble.InStream} */
ble.ConcatStream.prototype.slice = function() {
  var blocks = [];
  var ix = this.subIx;
  while(ix < this.substreams.length) {
    blocks.push(this._s().slice());
    ix++;
  }
  return new ble.ConcatStream(blocks);
};

