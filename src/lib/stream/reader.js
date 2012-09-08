goog.provide('ble.Reader');
goog.provide('ble.ReaderPromoted');
goog.provide('ble.ArrayReader');
goog.provide('ble.ConcatReader');
goog.provide('ble.b2s');

goog.require('goog.array');
/** @param {Array.<number> | Uint8Array} octets
 * @return {string}
 */
ble.b2s = function(octets) {
  return goog.array.map(
      octets,
      function(x) { return String.fromCharCode(x); }).
    join("");
};

/**
 * @param {string} str
 * @return {Uint8Array}
 */
ble.as2b = function(str) {
  var result = new Uint8Array(str.length);
  for(var i = 0; i < str.length; i++) {
    result[i] = str.charCodeAt(i);
  }
  return result;
};

/**
 * @interface
 */
ble.Reader = function() {};

/** @return {number} */
ble.Reader.prototype.available = function() {};

/** @return {boolean} */
ble.Reader.prototype.empty = function() {};

/** @return {number} */
ble.Reader.prototype.readByte = function() {};

/** @param {number} bytes 
 * @return {Uint8Array} */
ble.Reader.prototype.readBytes = function(bytes) {};

/** @param {number} bytes
 * @return {ble.Reader} */
ble.Reader.prototype.subReader = function(bytes) {};

/** @return {ble.Reader} */
ble.Reader.prototype.slice = function() {};

//begin semi-dumb extension-method like thing
/**
 * @interface
 * @extends {ble.Reader}
 */
ble.ReaderPromoted = function() {};

/** @return {number} */
ble.ReaderPromoted.prototype.readShort_Le = function() {};

/** @param {ble.Reader} reader
 *  @return {ble.ReaderPromoted}
 */
ble.Reader.promote = function(reader) {
  reader.readShort_Le = ble.Reader.promote.readShort_Le;
  return /** @type {ble.ReaderPromoted} */ reader;
};

/** @type {function(this: ble.Reader) : number} */
ble.Reader.promote.readShort_Le = function() {
  var reader = /** @type {ble.Reader} */ this;
  return reader.readByte() + (reader.readByte() << 8);
};
//end semi-dumb extension-method like thing

/** @constructor
 * @implements {ble.Reader}
 * @param {ArrayBuffer} ary
 * @param {number=} opt_start
 * @param {number=} opt_length */
ble.ArrayReader = function(ary, opt_start, opt_length) {
  this.aBuf = ary;
  this.vStart = goog.isDefAndNotNull(opt_start) ? opt_start : 0;
  this.vEnd = goog.isDefAndNotNull(opt_length) ? this.vStart + opt_length : this.aBuf.byteLength;
  var length = this.vEnd - this.vStart;
  this.start = 0;
  this.end = length;
  this.octs = new Uint8Array(this.aBuf, this.vStart, length);
};

ble.ArrayReader.fromString = function(str) {
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

ble.ArrayReader.prototype.empty = function() {
  return this.start >= this.end;
};

ble.ArrayReader.prototype.readByte = function() {
  if(this.start >= this.end)
    throw new Error("read beyond end");
  var result = this.octs[this.start];
  this.start++;
  return result;
};

ble.ArrayReader.prototype.readBytes = function(bytes) { 
  if(this.start > this.end - bytes)
    throw new Error("read beyond end");
  
  var result = this.octs.subarray(this.start, this.start + bytes);
  this.start += bytes;
  return /** @type Uint8Array */ result;
};

ble.ArrayReader.prototype.subReader = function(bytes) {
  if(this.start > this.end - bytes)
    throw new Error("read beyond end");
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
 * @implements {ble.Reader}
 * @param {Array.<ble.Reader>} substreams */
ble.ConcatReader = function(substreams) {
    this.substreams = substreams.slice();
    this.subIx = 0;
    this._s();
};

ble.ConcatReader.prototype._s = function() {
  var s = this.substreams[this.subIx];
  while(s && s.empty()) {
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

ble.ConcatReader.prototype.empty = function() {
  var s = this._s();
  return(!s || s.empty());
};

/** @return {number} */
ble.ConcatReader.prototype.readByte = function() {
  if(this.subIx >= this.substreams.length)
    throw new Error("read beyond end");
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
 * @return {ble.Reader} */
ble.ConcatReader.prototype.subReader = function(bytes) {
  if(this.available() < bytes)
    throw new Error("read beyond end");
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

/** @return {ble.Reader} */
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
 * @param{ble.Reader} reader
 */
ble.BlockReader = function(reader) {
  this.src = reader;
  this.block = null;
  this.done = false;
};

ble.BlockReader.fromString = function(str, blockLengths) {
  var parts = [];
  for(var i = 0; i < blockLengths.length; i++) {
    var L = blockLengths[i];
    if(L <= 0 || L > 255)
      throw new Error("bad block length");
    var part = str.substr(0, L);
    if(part.length != L)
      throw new Error("bad block length");
    parts.push(String.fromCharCode(L));
    parts.push(part);
    str = str.substr(L);
  }
  parts.push(String.fromCharCode(0));
  return new ble.BlockReader(ble.ArrayReader.fromString(parts.join("")));
};

ble.BlockReader.prototype._ready = function() {
  if(!this.done && (!this.block || this.block.empty()))
    this._nextBlock();
};

ble.BlockReader.prototype._nextBlock = function() {
  if(this.done)
    throw new Error("bad next block");
  var length = this.src.readByte();
  this.block = this.src.subReader(length);
  if(length == 0) {
    this.done = true;
    this.block = null;
    this.src = null;
  }
};

/** return {boolean} */
ble.BlockReader.prototype._ensure = function(bytes) {
  var walk = this.slice();
  if(walk.block == null)
    walk._nextBlock();
  var sum = 0;
  while(sum < bytes && !walk.done) {
    sum += walk.block.available();
    walk._nextBlock();
  }
  return sum >= bytes; 
};

ble.BlockReader.prototype.empty = function() {
  this._ready();
  return this.done;
};

/** @return {number} */
ble.BlockReader.prototype.available = function() {
  var walk = this.slice();
  if(walk.block == null)
    walk._nextBlock();
  var sum = 0;
  while(!walk.done) {
    sum += walk.block.available();
    walk._nextBlock();
  }
  return sum;
};

/** @return {number} */
ble.BlockReader.prototype.readByte = function() {
  this._ready();
  if(this.done)
    throw new Error("read beyond end");
  var ret = this.block.readByte();
  this._ready();
  return ret;
};

/** @param {number} bytes 
 * @return {Uint8Array} */
ble.BlockReader.prototype.readBytes = function(bytes) {
  if(!this._ensure(bytes))
    throw new Error("Read beyond end");
  var backing = new ArrayBuffer(bytes);
  var contiguous = new Uint8Array(backing);
  var offset = 0;
  while(offset < bytes) {
    if(this.block == null || this.block.empty())
      this._nextBlock();
    var toRead = Math.min(bytes - offset, this.block.available());
    contiguous.set(this.block.readBytes(toRead), offset);
    offset += toRead;
  }
  this._ready();
  return contiguous;
};

/** @param {number} bytes
 * @return {ble.Reader} */
ble.BlockReader.prototype.subReader = function(bytes) {
  var chunks = [];
  var size = 0;
  while(size < bytes) {
    if(this.block == null || this.block.empty())
      this._nextBlock();
    var toRead = Math.min(bytes - size, this.block.available());
    chunks.push(this.block.subReader(toRead));
    size += toRead;
  }
  this._ready();
  return new ble.ConcatReader(chunks);
};

/** @return {ble.BlockReader} */
ble.BlockReader.prototype.slice = function() {
  var slice = new ble.BlockReader(this.src.slice());
  if(this.block)
    slice.block = this.block.slice();
  slice.done = this.done;
  return slice;
};


