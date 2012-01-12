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


var BitExtractor = function(data, length) {
  this.data = data;
  this.length = length ? length : 8;
  this.n = 0;
};


BitExtractor.prototype.get = function(bits) {
  if(bits == null)
    bits = 1;
  if(this.n + bits > this.length)
    throw "get beyond length";
  var remaining = this.length - this.n - bits;
  var mask = ((1 << bits) - 1) << remaining;
  var result = (this.data & mask) >> remaining;
  this.n += bits;
  return result;
}

BitExtractor.prototype.remaining = function() {
  return this.length - this.n;
}

var BitAccumulatorBE = function(maxBits) {
  this.maxBits = maxBits;
  this.clear();
};

BitAccumulatorBE.prototype.clear = function() {
  this.value = 0;
  this.n = 0;
};

BitAccumulatorBE.prototype.append = function(n, value) {
  if(this.n + n <= this.maxBits) {
    var shift = this.n;
    value = value & ((1 << n)-1);
    this.value = this.value | (value << shift);
    this.n += n;
    return [];
  } else {
    var fillBits = this.maxBits - this.n;
    var excessBits = n - fillBits;
    var fillValue = value & ((1 << fillBits) - 1);
    var excessValue = value >> fillBits; 
    this.append(fillBits, fillValue);
    var emitted = [this.value];
    this.clear();
    return emitted.concat(this.append(excessBits, excessValue));
  }
};

BitAccumulatorBE.prototype.flush = function() {
  if(this.n == 0)
    return [];
  var result = this.value;
  this.clear();
  return [result];
};

var BitExtractor = function(data, length) {
  this.data = data;
  this.length = length ? length : 8;
  this.n = 0;
};


BitExtractor.prototype.get = function(bits) {
  if(bits == null)
    bits = 1;
  if(this.n + bits > this.length)
    throw "get beyond length";
  var remaining = this.length - this.n - bits;
  var mask = ((1 << bits) - 1) << remaining;
  var result = (this.data & mask) >> remaining;
  this.n += bits;
  return result;
}

BitExtractor.prototype.remaining = function() {
  return this.length - this.n;
}
