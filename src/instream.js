goog.provide('ble.Reader');
goog.provide('ble.ArrayReader');
goog.provide('ble.ConcatReader');
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
ble.Reader = function() {};

/** @return {number} */
ble.Reader.prototype.available = function() {};

/** @return {number} */
ble.Reader.prototype.readByte = function() {};

/** @return {Uint8Array} */
ble.Reader.prototype.readBytes = function() {};

/** @param {number} bytes
 * @return {ble.Reader} */
ble.Reader.prototype.subReader = function(bytes) {};

/** @return {ble.Reader} */
ble.Reader.prototype.slice = function() {};

/** @constructor
 * @implements {ble.Reader}
 * @param {ArrayBuffer} ary
 * @param {number=} opt_start
 * @param {number=} opt_length */
ble.ArrayReader = function(ary, opt_start, opt_length) {
  this.aBuf = ary;
  this.vStart = opt_start ? opt_start : 0;
  this.vEnd = opt_length ? this.vStart + opt_length : this.aBuf.byteLength;
  var length = this.vEnd - this.vStart;
  this.start = 0;
  this.end = length;
  this.octs = new Uint8Array(this.aBuf, this.vStart, length);
};

ble.ArrayReader.fromAsciiString = function(str) {
  var backing = new ArrayBuffer(str.length);
  var view = new Uint8Array(backing);
  for(var i = 0; i < str.length; i++) {
    //no need to bother with masking; array can only store 8-bit values.
    view[i] = str.charCodeAt(i); 
  }
  return new ble.ArrayReader(backing);
};

ble.ArrayReader.prototype.available = function() {
  return this.end - this.start;
};

ble.ArrayReader.prototype.readByte = function() {
  if(this.start >= this.end)
    throw "read beyond end";
  var result = this.octs[this.start];
  this.start++;
  return result;
};

ble.ArrayReader.prototype.readBytes = function(bytes) { 
  if(this.start > this.end - bytes)
    throw "read beyond end";
  var result = this.octs.subarray(this.start, this.start + bytes);
  this.start += bytes;
  return result;
};

ble.ArrayReader.prototype.subReader = function(bytes) {
  if(this.start > this.end - bytes)
    throw "read beyond end";
  var result = new ble.ArrayReader(this.aBuf, this.vStart + this.start, bytes);
  this.start += bytes; 
  return result;
};

ble.ArrayReader.prototype.slice = function() { 
  return new ble.ArrayReader(this.aBuf, this.vStart + this.start, this.available());
};

/** @return {ArrayBuffer} */
ble.ArrayReader.prototype.underlying = function() { 
  return this.aBuf;
};

/** @return {Array.<number>} */
ble.ArrayReader.prototype.viewRange = function() {
  return [this.vStart, this.vEnd];
};

/** @constructor
 * @implements {ble.InReader}
 * @param {Array.<ble.InReader>} substreams */
ble.ConcatReader = function(substreams) {
    this.substreams = substreams.slice();
    this.subIx = 0;
    this._s();
};

ble.ConcatReader.prototype._s = function() {
  var s = this.substreams[this.subIx];
  while(s && s.available() == 0) {
    this.subIx++;
    s = this.substreams[this.subIx]; 
  }
  return s;
}

/** @return {number} */
ble.ConcatReader.prototype.available = function() {
  var sum = 0;
  for(var ix = this.subIx; ix < this.substreams.length; ix++) {
    sum += this.substreams[ix].available();
  }
  return sum;
};

/** @return {number} */
ble.ConcatReader.prototype.readByte = function() {
  if(this.subIx >= this.substreams.length)
    throw "read beyond end";
  return this._s().readByte();
};

/** @return {Uint8Array} */
ble.ConcatReader.prototype.readBytes = function(bytes) {
  var ss = this.subReader(bytes);
  var backing = new ArrayBuffer(bytes);
  var contiguous = new Uint8Array(backing);
  var offset = 0;
  while(ss.available()) {
    var chunk = ss._s();
    var sz = chunk.available();
    contiguous.set(chunk.readBytes(sz), offset);
    offset += sz;
  }
  return contiguous;
};

/** @param {number} bytes
 * @return {ble.InReader} */
ble.ConcatReader.prototype.subReader = function(bytes) {
  if(this.available() < bytes)
    throw "read beyond end";
  var blocks = [];
  var sum = 0;
  while(sum < bytes) {
    var block = this._s();
    var fromBlock = Math.min(bytes, this._s().available());
    if(fromBlock == 0) {
      continue;
    }
    var ssBlock = block.subReader(fromBlock);
    blocks.push(ssBlock);
    sum += fromBlock;
  }
  return new ble.ConcatReader(blocks);
};

/** @return {ble.InReader} */
ble.ConcatReader.prototype.slice = function() {
  var blocks = [];
  var ix = this.subIx;
  while(ix < this.substreams.length) {
    blocks.push(this.substreams[ix].slice());
    ix++;
  }
  return new ble.ConcatReader(blocks);
};

/**
 * @constructor
 *
 */
ble.Reader = function() {};

/** @return {number} */
ble.Reader.prototype.available = function() {};

/** @return {number} */
ble.Reader.prototype.readByte = function() {};

/** @return {Uint8Array} */
ble.Reader.prototype.readBytes = function() {};

/** @param {number} bytes
 * @return {ble.Reader} */
ble.Reader.prototype.subReader = function(bytes) {};

/** @return {ble.Reader} */
ble.Reader.prototype.slice = function() {};


