goog.require('ble.Gif.LzwWriter');



var log = function(x) {
  if(typeof x == "object") 
    x = window.JSON.stringify(x);
  var d = document.createElement("div");
  var t = document.createTextNode(x);
  d.appendChild(t);
  document.body.appendChild(d);
};

/**
 * @constructor
 * @param {function(number, number)} debugFn
 **/
var DebugBitWriter = function(debugFn) {
  this.f = debugFn;
};

/**
 * @param {number} bits
 * @param {number} n
 */
DebugBitWriter.prototype.write = function(bits, n) {
  this.f(bits, n);
};

/**
 * @constructor
 */
var Case = function(literalBits, literalSequence) {
  this.bits = literalBits;
  this.seq = literalSequence;
};

Case.prototype.codes = function() {
  var table = new ble.Gif.LzwWriterTable(this.bits);
  var emits = goog.array.map(this.seq, function(x) {
    var code = table._nextCode(x);
    if(goog.isDefAndNotNull(code))
      code.topCode = table.nextCode;
    return code;
  });
  emits.push(table._finish());
  return emits;
};

Case.prototype.run = function() {
  var debugWriter = new DebugBitWriter(function(val, n) {
    log({code: val, bits: n});
  });

  var lzw = new ble.Gif.LzwWriter(this.bits, debugWriter);
  for(var i = 0; i < this.seq.length; i++) {
    var literal = this.seq[i];
    log("Writing '" + literal + "'");
    lzw.write(this.seq[i]);
  }
  log("Finishing");
  lzw.finish();
};

var case0 = new Case(2, [0, 0, 0, 1, 1, 2, 0, 1, 2, 0, 3]);
//goog.array.forEach(case0.codes(), log);
case0.run();



