goog.require('ble.BitWriter');
goog.require('goog.structs.Trie');

goog.provide('ble.Gif.LzwWriter');

/**
 * @constructor
 * @param {number} bitDepth
 * @param {ble.BitWriter} bitWriter
 */
ble.Gif.LzwWriter = function(bitDepth, bitWriter) {
  if(bitDepth > 8)
    throw new Error('bit depth cannot exceed 8');
  this.bitDepth = bitDepth;
  this.bitWriter = bitWriter;
  this.table = new ble.Gif.LzwWriterTable(bitDepth);
  this.clear = (1 << bitDepth);
  this.eoi = this.clear + 1;
};


ble.Gif.LzwWriter.prototype.write = function(literal) {
  var emitted = this.table._nextCode(literal);

  if(goog.isDefAndNotNull(emitted)) {
    this.bitWriter.write(emitted.code, emitted.width);
  }

  if(this.table.currentBits >= 13) {
    this.bitWriter.write(this.clear, 12);
    this.table._reset();
  }
};

ble.Gif.LzwWriter.prototype.finish = function() {
  var emitted = this.table._finish();

  if(goog.isDefAndNotNull(emitted)) {
    this.bitWriter.write(emitted.code, emitted.width);
  }

  this.bitWriter.write(this.eoi, this.table.currentBits);
};

/**
 * @constructor
 * @param {number} bitDepth
 */
ble.Gif.LzwWriterTable = function(bitDepth) {
  this.bitDepth = bitDepth;
  this._reset();
};

ble.Gif.LzwWriterTable.prototype._reset = function() {
  var trie = new goog.structs.Trie();
  for(var i = 0; i < (1 << this.bitDepth); i++) {
    trie.add(String.fromCharCode(i), i);
  }
  this.prefix = "";
  this.prefixCode = null;
  this.nextCode = (1 << this.bitDepth) + 2;
  this.table = trie;
  this.currentBits = 1 + this.bitDepth;
};

ble.Gif.LzwWriterTable.prototype._nextCode = function(literal) {
  if(literal >= (1 << this.bitDepth))
    throw new Error("Illegal literal code");
  var nextString = this.prefix + String.fromCharCode(literal);
  var existingCode = this.table.get(nextString);
  if(goog.isDefAndNotNull(existingCode)) {
    this.prefix = nextString;
    this.prefixCode = existingCode;
    return null;
  } else {
    //what to return and the table's next prefix state
    var returnedCode = this.prefixCode;
    var returnedWidth = this.currentBits;

    this.prefix = String.fromCharCode(literal);
    this.prefixCode = literal;
    //add code
    this.table.add(nextString, this.nextCode++);
    if(this.nextCode >= (1 << this.currentBits))
      this.currentBits++;

    return ({code: returnedCode, width: returnedWidth});
  }
};

ble.Gif.LzwWriterTable.prototype._finish = function() { 
  this.table = null;
  if(goog.isDefAndNotNull(this.prefixCode)) {
    return ({code: this.prefixCode, width: this.currentBits});
  } else {
    return null;
  }
};
