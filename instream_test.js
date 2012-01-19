goog.require('ble.ArrayStream');
goog.require('ble.ConcatStream');


var make_instances = function() {
  var strings = [
    "Now is the winter of our discontent ",
    "made glorious summer by this sun of York"];
  var result = strings.map(ble.ArrayStream.fromAsciiString);
  result.push(new ble.ConcatStream(result));
  return result;
};

var test_roundtrip = function() {
  var i = make_instances();
  return i.map(function(x) {
    return ble.b2s(x.slice().readBytes(x.available()));
  });
};

