<html><head>
   <script>

var lzwEncode = function(roots, string) {
  var maxCodes = 4095;
  var codeCount = 0;
  codes = {};
  for(var i = 0; i < roots.length; i++) {
    codes[roots[i]] = i;
    codeCount++;
  }
  var result = [];
  var prefix = "";
  for(var i = 0; i < string.length; i++) {
    var nextPrefix = prefix + string[i];
    if(nextPrefix in codes) {
      prefix = nextPrefix;
      continue;
    }
    result.push(codes[prefix]);
    if(codeCount < maxCodes)
      codes[nextPrefix] = codeCount++;
    else throw "exceeded code count";
    prefix = string[i];

  }
  if(prefix.length > 0) {
    result.push(codes[prefix]);
  }
  return result;
};

var log2Ceil = function(n) {
  if(n < 2)
    return 1;
  for(var k = 0; n > 1; k++, n /= 2);
  return k;
};

var CodeTable = function(onEmit) {
  this.codeCount = 0;
  this.codes = {};
  this.decodes = [];
  this.bitLength = 0;
  this.onEmit = onEmit;
};

CodeTable.prototype.addCode = function(string) {
  if(string in this.codes)
    return;
  this.codes[string] = this.codeCount;
  this.decodes[this.codeCount] = string;
  this.codeCount++;
};

CodeTable.prototype.getCode = function(code) {
//  console.log("getcode " + code  + " -> " + this.codes[code]);
  return this.codes[code];
};

CodeTable.prototype.getCount = function() {
  return this.codeCount;
};

CodeTable.prototype.getBitLength = function() {
  if(this.onEmit)
    return this.bitLength;
  return 1 + log2Ceil(this.codeCount + 1);
};

CodeTable.prototype.preEmit = function(code) {
  var codeLength = 1 + log2Ceil(code + 1);
  if(this.bitLength < codeLength) 
    this.bitLength = codeLength;
};

CodeTable.prototype.clearCode = function() {
  return 1 << (this.getBitLength() - 1);
};

CodeTable.prototype.stopCode = function() {
  return this.clearCode() + 1;
};

var gifEncode = function(roots, string, onEmit) {
  var maxSize = 12;
  var table = new CodeTable(onEmit);
  for(var i = 0; i < roots.length; i++) {
    table.addCode(roots[i]);
    table.preEmit(table.getCode(roots[i]));
  }

  var results = [];
  var prefix = "";
  for(var i = 0; i < string.length; i++) {
//    console.log("<<" + prefix + ">>");
    var x = string[i];
    var nextPrefix = prefix + x;
    if(table.getCode(nextPrefix) != null) {
      prefix = nextPrefix;
      continue;
    } else {
      var code = table.getCode(prefix);
//      console.log("code " + code + " for " + prefix);
      table.preEmit(code);
      results.push(code, table.getBitLength());
      table.addCode(nextPrefix);
      prefix = x;
    }
  }
  if(prefix.length > 0) {
    var code = table.getCode(prefix);
    table.preEmit(code);
    results.push(code, table.getBitLength());
  }
  results.push(table.stopCode(), table.getBitLength());
  return results;
};

var gifCodesToBytes = function(codes) {
  if(codes.length % 2 != 0)
    throw "Invalid code sequence";
  var b = new BitAccumulator(8);
  var bytes = [];
  for(var i = 0; i < codes.length / 2; i++) {
    var code = codes[2*i];
    var length = codes[2*i+1];
    if(code < 0 || code > 4095)
      throw "Invalid code";
    if(code > (1 << length) + 1)
      throw "Invalid code for length";
    bytes = bytes.concat(b.append(length, code));
  }
  return bytes.concat(b.flush());
};

var lzwDecode = function(roots, codes) {
  var decodes = [];
  var encodes = {};
  var maxCodes = 4095;
  var codeCount = 0;
  for(var i = 0; i < roots.length; i++) {
    decodes[i] = roots[i];
    encodes[roots[i]] = i;
    codeCount++;
  }
  var result = [];
  var code0 = codes[0];
  result.push(decodes[code0]);
  var oldCode = code0;
  for(var i = 1; i < codes.length; i++) {
    var code = codes[i];
    if(code < codeCount) {
      var decode = decodes[code];
      result.push(decode);
      var newDecode = decodes[oldCode] + decode[0];
      if(!(newDecode in encodes)) {
        console.log("Storing " + newDecode + " in " + codeCount);
        decodes.push(newDecode);
        encodes[newDecode] = codeCount;
        codeCount++;
      }
    } else {
      var decodeOld = decodes[oldCode];
      var decodeChunk = decodeOld + decodeOld[0];
      result.push(decodeChunk);
      if(!(decodeChunk in encodes)) {
        console.log("Storing " + decodeChunk + " in " + codeCount);
        decodes.push(decodeChunk);
        encodes[decodeChunk] = codeCount;
        codeCount++;
      }
    }
    oldCode = code;
  }
  return result;
};

var BitAccumulator = function(maxBits) {
  this.maxBits = maxBits;
  this.clear();
};

BitAccumulator.prototype.clear = function() {
  this.value = 0;
  this.n = 0;
};

BitAccumulator.prototype.append = function(n, value) {
  if(this.n + n <= this.maxBits) {
    this.value = this.value << n;
    this.value = this.value | (value & ((1 << n) - 1));
    this.n += n;
    return [];
  } else {
    var fillBits = this.maxBits - this.n;
    var excessBits = n - fillBits;
    var fillValue = value >> excessBits;
    var excessValue = value & ((1 << excessBits) - 1)
    this.append(fillBits, fillValue);
    var emitted = [this.value];
    this.clear();
    return emitted.concat(this.append(excessBits, excessValue));
  }
};

BitAccumulator.prototype.flush = function() {
  if(this.n == 0)
    return [];
  var fillBits = this.maxBits - this.n;
  var result = this.value << fillBits;
  this.clear();
  return [result];
};

BitAccumulator.prototype.asArrayMsbFirst = function() {
  var result = [];
  for(var i = this.n - 1; i >= 0; i--) {
    result.push( (this.value & (1 << i)) >> i );
  }
  return result;
};


var BitExtractor = function(string) {
  this.string = string;
  this.nb = 0;
  this.nB = 0;
};


BitExtractor.prototype.extract = function(n) {
  var result = 0;
  while(n > 0) {
    if(this.nB >= this.string.length)
      throw "extract beyond length";
    var curByte = this.string.charCodeAt(this.nB);
    var bitsRemaining = 8 - this.nb;

    var bitsToRead = Math.min(bitsRemaining, n);
    //mask out bits that have already been read.
    var remainingMask = (1 << bitsRemaining) - 1;
    curByte = curByte & remainingMask;

    //appropriately adjust for bits not read in this byte.
    var downshift = bitsRemaining - bitsToRead;
    curByte = curByte >> downshift;
    result = (result << bitsToRead) | curByte;
     
    this.nb += bitsToRead;
    if(this.nb > 8) throw "state error";
    if(this.nb == 8) {
      this.nb = 0;
      this.nB++;
    } 
    n -= bitsToRead;
  }
  return result;
}
/*
BitExtractor.prototype.extract = function(n) {
  var result = 0;
  while(n > 0) {
    var toGrab = n > 8 - this.nb ? 8 - this.nb : n;
    var grabValue = this.string.charCodeAt(this.nB) >> (8 - this.nb - toGrab);
    result = (result << toGrab) | grabValue; 
    n -= toGrab;
    this.nb += toGrab;
    if(this.nb > 8)
      throw "bad state";
    if(this.nb == 8) {
      this.nb = 0;
      this.nB++;
    }
  }
  return result;
};
*/

var test = function() {
  s1 = "abracadabra, alakazam";
  alpha = " ,abcdlkmrz";
  codes = gifEncode(alpha, s1);
  bytes = gifCodesToBytes(codes);
  result = "";
  for(var i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i]);
  }
  console.log(bytes);
  extractor = new BitExtractor(result);
  extracted = [];
  for(var i = 0; i < codes.length / 2; i++) {
    var length = codes[2*i+1];
    extracted.push(extractor.extract(length));
    extracted.push(length);
  }
};

test();

</script></head></html>
