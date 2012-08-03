goog.require('ble.ArrayReader');
goog.require('ble.ArrayWriter');
goog.require('ble.BitReader');
goog.require('ble.BitWriter');
goog.require('ble.LzwTable');
goog.require('ble.lzwDecodeAndTable');
goog.require('ble.lzwEncodeAndTable');

var console = window.console;
var JSON = window.JSON;

var test = function(isMsb, maxBitsPerWrite, workText) {
  var source = ble.ArrayReader.fromString(workText); 
  var bitReader = new ble.BitReader(source, isMsb);

  var sink = ble.ArrayWriter.ofCapacity(source.available());
  var bitWriter = new ble.BitWriter(sink, isMsb);

  while(bitReader.available() > 0) {
    var bitsToRead = Math.round(Math.random() * 16);
    bitsToRead = Math.min(bitsToRead, bitReader.available());
    bitWriter.write(bitReader.read(bitsToRead), bitsToRead);
  }

  bitWriter.flushClose();
  var result = ble.b2s(sink.writtenSlice());
  return workText == result;
};


var testText = "<<Lorem ipsum dolor sit amet>>";

var cases = [
  [true, 24, testText],
  [false, 24, testText]
];

(function(){
for(var i = 0; i < cases.length; i++) {
  var result = test.apply(this, cases[i]);
  console.log(i.toString() + ' ' + (result ? 'PASSED' : 'FAILED'))
};

var lzwDecodeCases = [
  //this case works the resets, causing code 6 to mean 0-0, 1-1, 2-2, and 3-3.
  [[0, 1, 2, 3], [0, 6, 4, 1, 6, 4, 2, 6, 4, 3, 6, 4]],

  //this case works some non-literal codes and works the eoi code; no 3s
  //should appear in the output.
  [[0, 1, 2, 3], [0, 6, 2, 7, 1, 9, 8, /* reset! */ 4, 1, 6, /* eoi! */ 5, 3]],

  //vanilla case
  [[0, 1, 2, 3], [0, 6, 2, 7, 1, 9, 8]]
];

for(var i = 0; i < lzwDecodeCases.length; i++) {
  var literals = lzwDecodeCases[i][0];
  var codes = lzwDecodeCases[i][1];
  var result = ble.lzwDecodeAndTable(literals, codes);
  console.log("input literals: " + literals.toString());
  console.log("input codes: " + codes.toString());
  console.log("output sequence: " + result.sequence.toString());
  console.log("generated code table: " + JSON.stringify(result.table));
};
})();

var encAndTable = ble.lzwEncodeAndTable(4, [0,0,0,2,0,0,2,1,0,0,2,1,2,0]);
console.log(encAndTable.codes.toString());
console.log(JSON.stringify(encAndTable.table));
