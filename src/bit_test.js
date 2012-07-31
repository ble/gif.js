goog.require('ble.ArrayReader');
goog.require('ble.ArrayWriter');
goog.require('ble.BitReader');
goog.require('ble.BitWriter');

var isMsb = false;
var text = ble.ArrayReader.fromString("<<Lorem ipsum dolor sit amet>>"); 
var bitReader = new ble.BitReader(text, isMsb);


var receptacle = ble.ArrayWriter.ofCapacity(text.available());
var bitWriter = new ble.BitWriter(receptacle, isMsb);

while(bitReader.available() > 0) {
  var bitsToRead = Math.round(Math.random() * 7);
  bitsToRead = Math.min(bitsToRead, bitReader.available());
  bitWriter.write(bitReader.read(bitsToRead), bitsToRead);
}

bitWriter.flushClose();
var result = ble.b2s(receptacle.writtenSlice());
console.log(result);

/*
//Ascii A = 0x41
//        = 0b01000001
//

var aBits = [0, 1, 0, 0, 0, 0, 0, 1];
var leftWrite = function(writer, bitArray, bits) {
  var value = 0;
  for(var n = 0; n < bits; n++) {
    value = (value << 1) + bitArray.shift();
  }
  writer.write(value, bits);
};

var rightWrite = function(writer, bitArray, bits) {
  var value = 0;
  for(var n = 0; n < bits; n++) {
    value += bitArray.pop() << n;
  };
  writer.write(value, bits);
};

var w = new ble.ConsoleWriter();

var times = function(n, f, g) {
  for(var i = 0; i < n; i++) {
    f();
  }
  return g();
};

var timesArray = function(n, fs) {
  return times(n, fs[0], fs[1]);
};

var runLsb = function(bitArray, atATime) {
  bitArray = bitArray.slice();
  var w = new ble.ArrayWriter(new ArrayBuffer(1));
  var bw = new ble.BitWriter(w, false);
  return [function() {
    leftWrite(bw, bitArray, Math.min(atATime, bitArray.length));
  }, function(){

    bw.flushClose();
    console.log(ble.b2s(w.writtenSlice()));
  }];
};

var runMsb = function(bitArray, atATime) {
  bitArray = bitArray.slice();
};

timesArray(4, runLsb(aBits.slice(), 2));
*/
/*
var x = aBits.slice();
var bw = new ble.BitWriter(w, true);
while(x.length > 0)
  bw.write(x.shift(), 1);
bw.flushClose();


x = aBits.slice();
bw = new ble.BitWriter(w, false);
while(x.length > 0)
  bw.write(x.pop(), 1);

bw.flushClose();
*/
