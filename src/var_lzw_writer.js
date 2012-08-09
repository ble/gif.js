goog.require('ble.BitWriter');
goog.require('goog.structs.Trie');

goog.provide('ble.Gif.LzwWriter');

/**
 * @constructor
 * @param {number} bitDepth
 * @param {ble.BitWriter} bitWriter
 */
ble.Gif.LzwWriter = function(bitDepth, bitWriter) {
  this.bitDepth = bitDepth;
  this.bitWriter = bitWriter;
  this.table = new ble.Gif.LzwWriterTable(bitDepth);
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
  var result = ({code: this.prefixCode, width: this.currentBits});
  this.table = null;
  return result;
};
