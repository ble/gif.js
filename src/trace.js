goog.provide('ble.trace');


/**
 * @constructor
 */
ble.Trace = function() {
  this.traces = {};
  this.tracing = null;
};

ble.Trace.prototype.trace = function(x) {
  if(goog.isDefAndNotNull(this.tracing)) {

    if(!goog.isDefAndNotNull(this.traces[this.tracing])) {
      this.traces[this.tracing] = [];
    }
    this.traces[this.tracing].push(x); 
  }
};

ble.Trace.prototype.start = function(tracing) {
  if(!goog.isDefAndNotNull(tracing))
    throw new Error();
  this.tracing = tracing;
};

ble.Trace.prototype.end = function() {
  var ret = this.traces[this.tracing];
  this.tracing = null;
  return ret;
};

ble.trace = new ble.Trace();
