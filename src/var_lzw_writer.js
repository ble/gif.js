goog.require('ble.BitWriter');
goog.require('goog.structs.Trie');

goog.provide('ble.LzwWriter');

/**
 * @constructor
 * @param {number} bitDepth
 * @param {ble.BitWriter} bitWriter
 */
ble.LzwWriter = function(bitDepth, bitWriter) {
  if(bitDepth > 8)
    throw new Error('bit depth cannot exceed 8');
  this.bitDepth = bitDepth;
  this.bitWriter = bitWriter;
  this.table = new ble.LzwWriterTable(bitDepth);
  this.clear = (1 << bitDepth);
  this.eoi = this.clear + 1;

  this.bitWriter.write(this.clear, this.table.currentBits);
};


ble.LzwWriter.prototype.write = function(literal) {
  var emitted = this.table._nextCode(literal);

  if(goog.isDefAndNotNull(emitted)) {
    this.bitWriter.write(emitted.code, emitted.width);
    ble.trace.trace({code: emitted.code, width: emitted.width});
  }

  if(this.table.currentBits >= 13) {
    this.bitWriter.write(this.clear, 12);
    this.table._reset();
  }
};

ble.LzwWriter.prototype.finish = function() {
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
ble.LzwWriterTable = function(bitDepth) {
  this.bitDepth = bitDepth;
  this._reset();
};

ble.LzwWriterTable.prototype._reset = function() {
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

ble.LzwWriterTable.prototype._nextCode = function(literal) {
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
    if(this.nextCode > (1 << this.currentBits))
      this.currentBits++;

    return ({code: returnedCode, width: returnedWidth});
  }
};

ble.LzwWriterTable.prototype._finish = function() { 
  this.table = null;
  if(goog.isDefAndNotNull(this.prefixCode)) {
    return ({code: this.prefixCode, width: this.currentBits});
  } else {
    return null;
  }
};

/**
 * @constructor
 */
ble.LzwTrie = function(bitSize) {
  this.bitSize = bitSize;
  this._reset();
};

ble.LzwTrie.prototype.invalidCode = -1;


ble.LzwTrie.prototype._reset = function() {
  this.codeTable = new Int16Array(1 << 20);
  for(var i = 0; i < this.codeTable.length; i++) {
    this.codeTable[i] = this.invalidCode;
  }
  for(var i = 0; i < (1 << this.bitSize); i++) {
    this._addCode(this.invalidCode, i);    
  }
  this.prefix = [];
  this.prefixCode = this.invalidCode;
  this.nextCode = (1 << this.bitDepth) + 2;
  this.currentBits = 1 + this.bitSize;
};

ble.LzwTrie

/*
  LZW encoding requires a map from literal sequences to code values.  
  The mapping will be provided by a trie. 
  
  Each trie node corresponds to one literal sequence to code value mapping,
  from S to C; the code value, C, is stored in the node and the literal sequence,
  S, is encoded in the path from the root to the node.

  Each node has N children, where N is the number of literals; the Kth child
  of a node (S, C) points to the node (S | K, C'), where S | K is the sequence
  S with literal K appended to the end and C' is the code for that sequence.

  The root node corresponds to an empty sequence and an invalid code; all
  sequences start at the root and all valid LZW codes represent non-empty
  sequences.

  When the trie is first initialized, all the N children of the root node are
  initialized, as the code for a sequence consisting of a single literal is
  always that literal value.

  The trie is represented by a table storing the edges of the trie.
  The edges are stored as a mapping from (C, K) to C', where C and C' are the
  codes of the parent and child nodes and K is the final literal in the child
  node's sequence.
*/
