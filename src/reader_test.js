goog.require('ble.ArrayReader');
goog.require('ble.ConcatReader');


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
