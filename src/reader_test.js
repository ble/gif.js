goog.require('ble.ArrayReader');
goog.require('ble.ConcatReader');
goog.require('ble.BitReader');


var test_roundtrip = function() {

  var strings = [
      "Now is the winter of our discontent ",
      "made glorious summer by this sun of York"];

  var make_instances = function() {
    var result = strings.map(ble.ArrayReader.fromAsciiString);
    result.push(new ble.ConcatReader(result));
    return result;
  };


  var i = make_instances();
  var x = i.map(function(x) {
    return ble.b2s(x.slice().readBytes(x.available()));
  });
  console.log(x);
  //assertEqual(x[0], strings[0]);
  //assertEqual(x[1], strings[1]);
  //assertEqual(x[2], strings[0] + strings[1]);
};

var test_blockread = function() {
  var strt = "Now is the time";
  var reader = ble.BlockReader.fromString(strt, [7,8]);
  var accum = [];
  while(!reader.empty()) {
    accum.push(String.fromCharCode(reader.readByte()));
    console.log(accum.join(""));
  }
};

var test_blockread2 = function() {
  var strt = "Now is the time";
  var reader = ble.BlockReader.fromString(strt, [7,8]);
  var accum = [];
  while(!reader.empty()) {
    var L = Math.min(4, reader.available());
    for(var i = 0; i < L; i++)
      accum.push(String.fromCharCode(reader.readByte()));
    console.log(accum.join(""));
  }
};

var test_bitread = function() {
  var grey4 = [0, 1, 3, 2, 6, 7, 5, 4, 12, 13, 15, 14, 10, 11, 9, 8];
  var acc = [];
  while(grey4.length > 0) {
    var c = grey4.shift() + (grey4.shift() << 4);
    acc.push(String.fromCharCode(c));
  }
  var binString = acc.join("");
  var readLsb = new ble.BitReader(ble.ArrayReader.fromString(binString));
  var readMsb = new ble.BitReader(ble.ArrayReader.fromString(binString), true);
  var asHex = function(r) {
    var acc = [];
    while(!r.empty())
      acc.push(r.read(4).toString(16));
    return acc.join("");
  };
  console.log(asHex(readLsb));
  console.log(asHex(readMsb));
};

var tests = [test_blockread, test_blockread2, test_bitread];

for(var i = 0; i < tests.length; i++)
  tests[i]();
