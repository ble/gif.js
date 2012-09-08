goog.require('goog.structs.Trie');

goog.provide('ble.lzwEncode');
goog.provide('ble.lzwDecode');

goog.provide('ble.lzwEncodeAndTable');
goog.provide('ble.lzwDecodeAndTable');

ble.lzwEncode = function(numLiterals, literals) {
  return ble.lzwEncodeAndTable(numLiterals, literals).codes;
};


ble.lzwDecode = function(literals, codes) {
  return ble.lzwDecodeAndTable(literals, codes).sequence;
};

/*
 * LZW encode pseudocode:
 * P <- <empty>
 * for C <- each literal in input
 *   if P + C in table
 *     P <- P + C
 *   else
 *     add P + C to dictionary
 *     write dictionary[P] to output
 *     P <- C
 * end for
 * write dictionary[P] to output
 */

ble.lzwEncodeAndTable = function(numLiterals, literals) {
  var encoder = new ble.LzwEncoder(numLiterals);
  var result = [];
  var enc;
  for(var i = 0 ; i < literals.length; i++) {
    enc = encoder._encodeOne(literals[i]);
    if(goog.isDefAndNotNull(enc))
      result.push(enc);
  }

  enc = encoder._finishEncode();
  if(goog.isDefAndNotNull(enc))
    result.push(enc);

  return {codes: result, table: encoder.table};
};

/**
 * @private
 * @constructor
 * @param {number} numLiterals
 */
ble.LzwEncoder = function(numLiterals) {
  this.numLiterals = numLiterals;
  this._initTable();
};

ble.LzwEncoder.prototype._initTable = function() {
  var trie = new goog.structs.Trie();
  for(var i = 0; i < this.numLiterals; i++) {
    trie.add(String.fromCharCode(i), i);
  }
  this.prefix = "";
  this.prefixCode = null;
  this.nextCode = this.numLiterals + 2;
  this.table = trie;
};

ble.LzwEncoder.prototype._encodeOne = function(literal) {
  if(0 > literal || literal >= this.numLiterals)
    throw new Error("bad literal");
  var nextString = this.prefix + String.fromCharCode(literal);
  var existingCode = this.table.get(nextString);
  if(goog.isDefAndNotNull(existingCode)) {
    this.prefix = nextString;
    this.prefixCode = existingCode;
    return undefined;
  } else {
    this.table.add(nextString, this.nextCode++);

    var returnedCode = this.prefixCode;
    this.prefix = String.fromCharCode(literal);
    this.prefixCode = literal;
    return returnedCode; 
  }
};

ble.LzwEncoder.prototype._finishEncode = function() {
  if(goog.isDefAndNotNull(this.prefixCode))
      return this.prefixCode;
  return undefined;
};


/*
 * LZW decode pseudocode:
 *
 * read literal code P
 * output literal P
 * C <- P
 * for N <- all remaining codes
 *   if N not in table
 *     W <- look up entry for P
 *     W <- W + C
 *   else
 *     W <- look up entry for N
 *   end if
 *   write string W to output
 *   C <- W[0]
 *   add string table[P] + C to table
 *   P <- N
 */

ble.lzwDecodeAndTable = function(literals, codes) {
  var decoder = new ble.LzwDecoder(literals);
  var result = [];
  for(var i = 0; i < codes.length; i++) {
    var decoded = decoder.decodeOne(codes[i]);

    if(decoded === decoder._eoi)
      break;

    if(decoded === decoder._clear)
      continue;

    result.push(decoded);
  };

  if(result.length == 0)
    return result;

  var concat = result.concat;
  return ({
    sequence: concat.apply(result[0], result.slice(1)),
    table: decoder.table
  });
};

/**
 * @private
 * @constructor
 * @param {Array} literals
 */
ble.LzwDecoder = function(literals) {
  this.literals = literals.slice();

  this._repeatChar = null;
  this._prefixCode = null;
  this._done = false;

  this.topCode = NaN;
  this.table = {};
  this._processClear();
};

ble.LzwDecoder.prototype.decodeOne = function(code) {
  if(this._done) {
    throw new Error("Read beyond end-of-information");
  }

  if(this._prefixCode === null) { 

    if(code >= this.literals.length)
      throw new Error("First code must be a literal");

    this._repeatChar = this.literals[code];
    this._prefixCode = code;
    return this.table[code];

  } else {
    var codeEntry;  

    //Special cases first:
    if(code < 0 || code > this.topCode) { //invalid input
      throw new Error("Invalid code");
    } else if(code == this.topCode) { //special case: x y z ... x code
      codeEntry = this.table[this._prefixCode].slice();
      codeEntry.push(this._repeatChar);
    } else if(code < this.topCode) { //(mostly) normal case

      codeEntry = this.table[code];

      if(codeEntry == this._clear) { //special clear code
        this._processClear();
        return this._clear;
      } else if(codeEntry == this._eoi) { //special EOI code
        this._processEoi();
        return this._eoi;
      } else { //plain ol' code
        codeEntry = codeEntry.slice();
      }

    } else {
      throw new Error("Value failed all comparisons; NaN input or poorly-written code.");
    }

    var newCodeString = this.table[this._prefixCode].slice();

    this._repeatChar = codeEntry[0];
    this._prefixCode = code;

    newCodeString.push(this._repeatChar);
    this.table[this.topCode++] = newCodeString;

    return codeEntry;
  }
};

ble.LzwDecoder.prototype._processClear = function() {
  this.table = {};
  this.topCode = 0;
  this._initLiteralCodes();
  this._initControlCodes();
  this._repeatChar = null;
  this._prefixCode = null; 
};

ble.LzwDecoder.prototype._processEoi = function() {
  this._done = true;
};

ble.LzwDecoder.prototype._initLiteralCodes = function() {
  for(var i = 0; i < this.literals.length; i++) {
    if(this.literals[i] === null)
      throw new Error("Null literals not allowed.");
    this.table[this.topCode++] = [this.literals[i]];
  }
};

ble.LzwDecoder.prototype._initControlCodes = function() {
  this.table[this.topCode++] = this._clear;
  this.table[this.topCode++] = this._eoi;
};

ble.LzwDecoder.prototype._clear = new Object();
ble.LzwDecoder.prototype._eoi = new Object();


