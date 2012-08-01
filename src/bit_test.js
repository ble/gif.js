goog.require('ble.ArrayReader');
goog.require('ble.ArrayWriter');
goog.require('ble.BitReader');
goog.require('ble.BitWriter');

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

var console = window.console;
for(var i = 0; i < cases.length; i++) {
  var result = test.apply(this, cases[i]);
  console.log(i.toString() + ' ' + (result ? 'PASSED' : 'FAILED'))
};




