console.log("foo");
var log2Ceil = function(n) {
  if(n < 2)
    return 1;
  for(var k = 0; n > 1; k++, n = n>>1);
  return k;
}; 

var CodeTable = function(nRoots) {
  this.nRoots = nRoots;
  this.codes = {};
  this.decodes = [];
  this.bitLength = log2Ceil(nRoots) + 1; 
  this._addRoots();
};

CodeTable.prototype._addRoots = function() {
  for(var i = 0; i < this.nRoots; i++) {
    var sample = String.fromCharCode(i);
    this.codes[sample] = i;
    this.decodes[i] = sample;
  }
  this.nextCode = this.stopCode() + 1;
};

CodeTable.prototype.clear = function() {
  this.codes = {};
  this.decodes = [];
  this.bitLength = log2Ceil(this.nRoots) + 1; 
  this._addRoots();
 
}

CodeTable.prototype.clearCode = function() {
  return 1 << (this.bitLength - 1);
};

CodeTable.prototype.stopCode = function() {
  return this.clearCode() + 1;
};

CodeTable.prototype.newCode = function(sampleString) {
  if( (stop - 1) << 1 <= this.nextCode) {
    this.bitLength++;
    if(this.bitLength > 12)
      throw "over length";
    this.nextCode = this.stopCode() + 1;
  }
 //console.log([asHex(sampleString), this.nextCode]);
  this.codes[sampleString] = this.nextCode;
  this.decodes[this.nextCode] = sampleString;
  var stop = this.stopCode();
  if(this.nextCode < stop) {
    this.nextCode = stop + 1;
  } else {
    this.nextCode++;
  }
  //console.log(this.bitLength);
};

CodeTable.prototype.encode = function(sampleString) {
  return this.codes[sampleString];
};

CodeTable.prototype.decode = function(code) {
  return this.decodes[code];
};

CodeTable.prototype.bits = function() {
  return this.bitLength;
};

var ImageDecoder = function(minCodeSize) {
  this.table = new CodeTable(1 << minCodeSize);
}

ImageDecoder.prototype.encode = function(string) {
  var codes = this.generateCodes(new ByteStream(string));
  return this.codesToOctets(codes);
};

ImageDecoder.prototype.generateCodes = function(stream) {
  var table = this.table;
  var codes = [];
  var prefix = "";
  while(stream.remaining()) {
    var x = stream.getRaw();
    var extended = prefix + x;
    if(table.encode(extended) != null) {
      prefix = extended;
      continue;
    }
    code = table.encode(prefix);
    codes.push(code, table.bits());
    table.newCode(extended);
    prefix = x;
  }
  if(prefix.length > 0) {
    codes.push(table.encode(prefix), table.bits());
  }
  codes.push(table.stopCode(), table.bits());
  return codes;
};

ImageDecoder.prototype.codesToOctets = function(codes) {
  if(codes.length % 2 != 0)
    throw "Invalid code sequence";
  var push = Array.prototype.push;
  var b = new BitAccumulator(8);
  var bytes = [];
  for(var i = 0; i < codes.length / 2; i++) {
    var code = codes[2*i];
    var length = codes[2*i+1];
    if(code < 0 || code > 4095)
      throw "Invalid code";
    if(code >= (1 << length))
      throw "Invalid code for length";
    push.apply(bytes, b.append(length, code));
  }
  push.apply(bytes, b.flush());
  return bytes;
};

ImageDecoder.prototype.decode = function(stream) {
  var table = this.table;
  var samples = [];
  var old = null;
  out: while(true) {
    var blockSize = stream.get();
    if(blockSize < 0 || blockSize > 255)
      throw "bad block size";
    var bits = new BitStream(stream.getRaw(blockSize));
    while(bits.remaining() >= table.bits()) {
      var code = bits.get(table.bits());
      console.log([code, table.bits()]);
      if(code == table.clearCode()) {
        table.clear();
        old = null;
      } else if(code == table.stopCode()) {
        break out;
      } else {
        var chunk = table.decode(code);
        if(chunk == null)
          throw "bad decode";
        samples.push(chunk);
        if(old != null) {
          var newEntry = table.decode(old) + chunk.charAt(0);
          if(!table.encode(newEntry))
            table.newCode(newEntry);
        }
        old = code;
      }
    }
  }
  return samples.join("");
}; 
