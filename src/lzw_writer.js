goog.require('ble.BitWriter');
goog.provide('ble.LzwTable');
goog.scope(function() {

  /** @typedef { {code: number} } */
  ble.lzwTableNode;
  /** @constructor */
  ble.LzwTable = function(literalWidth) {
    //constant
    this.literalWidth = literalWidth;
    this.clear = 1 << this.literalWidth;
    this.eoi = this.clear + 1;

    //varying
    this.codeWidth = 1 + this.literalWidth; 
    this.boundaryCode = 1 << this.codeWidth;
    this.nextCodeV = this.eoi + 1;

    this.rootTable = /** @type {ble.lzwTableNode} */ {code: undefined};

    for(var i = 0; i < 1 << this.literalWidth; i++) {
      this.rootTable[i] = {code: i};
    }
    /** @type {ble.lzwTableNode} */
    this.tableCursor = this.rootTable;
  };

  ble.LzwTable.prototype.nextCode = function() {
    var code = this.nextCodeV;
    this.nextCodeV++;
    if(this.nextCodeV == this.boundaryCode)
      this.codeWidth++;
    return code;
  };
  
  ble.LzwTable.prototype.encode = function(literal) {
    if(literal in this.tableCursor) {
      this.tableCursor = /** @type {ble.lzwTableNode} */ this.tableCursor[literal];
    
      return [0, null];
    } else {
      var code = this.tableCursor.code;
      var w = this.codeWidth;
      var newTable = {code: this.nextCode()};
      this.tableCursor[literal] = /** @type {ble.lzwTableNode} */ newTable;
      this.tableCursor = this.rootTable[literal];
      return [w, code];
    }
  };

  ble.LzwTable.prototype.enumerateCodes = function() {
    var itemStart = [[], this.rootTable];
    var queue = [itemStart];
    var result = {};
    while(queue.length > 0) {
      var item = queue.shift();
      var prefix = item[0];
      var table = item[1];
      if(goog.isDefAndNotNull(table.code))
        result[table.code] = prefix.toString();
      for(var literal in table) {
        if(literal !== "code" && !table.hasOwnProperty(literal))
          continue;
        var nextPrefix = prefix.slice();
        nextPrefix.push(literal);
        queue.push([nextPrefix, table[literal]]);
      }
    }
    return result;
  };
});
