var octetsToString = function(octets) {
  var result = [];
  for(var i = 0; i < octets.length; i++) {
    result.push(String.fromCharCode(octets[i] & 0xFF));
  }
  return result.join(""); 
};
var stringToOctets = function(string) {
  var result = [];
  for(var i = 0; i < string.length; i++)
    result.push(string.charCodeAt(i) & 0xFF);
  return result;
}

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
  this.clear = 1 << (this.bitLength - 1);
  this.stop = this.clear + 1;
  this.overflow = 1 << this.bitLength;
  this._addRoots();
};

CodeTable.prototype._addRoots = function() {
  for(var i = 0; i < this.nRoots; i++) {
    var sample = String.fromCharCode(i);
    this.codes[sample] = i;
    this.decodes[i] = sample;
  }
  this.nextCode = this.stop + 1;
};

CodeTable.prototype.clear = function() {
  this.codes = {};
  this.decodes = [];
  this.bitLength = log2Ceil(this.nRoots) + 1; 
  this._addRoots();
 
}

CodeTable.prototype.newCode = function(sampleString) {
  if(this.nextCode == this.overflow) {
    if(this.bitLength > 12)
      throw "over length";
    this.bitLength++;
    this.overflow = 1 << this.bitLength;
  }
 //console.log([asHex(sampleString), this.nextCode]);
  this.codes[sampleString] = this.nextCode;
  this.decodes[this.nextCode] = sampleString;
  this.nextCode++;
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

var LzwEncoder = function(minCodeSize) {
  this.table = new CodeTable(1 << minCodeSize);
}

LzwEncoder.prototype.encode = function(string) {
  var codes = this.generateCodes(new ByteStream(string));
  console.log(codes);
  return octetsToString(this.codesToOctets(codes));
};

LzwEncoder.prototype.generateCodes = function(stream) {
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
  codes.push(table.stop, table.bits());
  return codes;
};

LzwEncoder.prototype.codesToOctets = function(codes) {
  if(codes.length % 2 != 0)
    throw "Invalid code sequence";
  var push = Array.prototype.push;
  var b = new BitAccumulatorBE(8);
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
