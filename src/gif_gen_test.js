
goog.require('ble.Gif');
goog.require('goog.dom.DomHelper');
goog.require('goog.ui.Component');

var doStuff = function() {
  var component = new ble.TestDraw(500, 500);
  component.render(document.body);
  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
  var callback;
  var lastStart = Date.now();
  var lastTime = Date.now();
  callback = function(time) {
    raf(callback);
    if(time - lastTime < 45)
      return;
    lastTime = time;
    var omega = Math.PI / 1000;
    var phi = omega * (time - lastStart);

    if(phi >= 2 * Math.PI) {
      lastStart = time;
      phi = 0;
    }

    var alpha = Math.cos(phi);
    drawThing(alpha, component);
    
  };
  callback(Date.now());
};

var drawThing = function(scale, component) {
  var ctx = component.context();
  ctx.clearRect(-0.5, -0.5, 1, 1);
  var range = [];
  for(var i = -1.0 - 1/14; i <= 1.0; i+= 1/7)
    range.push(i);

  var q = Math.PI;
  var uvFn = function(x,y) {
    return [x + scale * Math.sin(q*y) / 3, y - scale * Math.cos(q*x) / 8];
  }
//  var sign = function(x) { return x > 0 ? 1 : (x == 0 ? 0 : -1);
  uvFn = function(x,y) {
    var th = Math.atan2(y, x);
    var r = Math.sqrt(x*x+y*y);
    th += Math.cos(10*r*scale) * scale;
    var unit = [-Math.sin(th) / 5, Math.cos(th) / 5];
    return [Math.cos(th)*r, Math.sin(th)*r];
  }
  pathUVs(ctx, range, range, 0.01, 1.0, uvFn);
  ctx.lineWidth *= 2;
  ctx.stroke();
  component.doneWithContext(ctx);

};

var pathUVs = function(ctx, us, vs, step, mag, uvFn) {
  ctx.beginPath();
  for(var i = 0; i < us.length; i++) {
    var u = us[i];
    var v = -mag;
    var xy = uvFn(u, v);
    ctx.moveTo(xy[0], xy[1]);
    for(v = v + step; v <= mag; v += step) {
      xy = uvFn(u, v);
      ctx.lineTo(xy[0], xy[1]);
    }
  }
  for(var i = 0; i < vs.length; i++) {
    var u = -mag;
    var v = vs[i];
    var xy = uvFn(u, v);
    ctx.moveTo(xy[0], xy[1]);
    for(u = u + step; u <= mag; u += step) {
      xy = uvFn(u, v);
      ctx.lineTo(xy[0], xy[1]);
    }
  }

};

/**
 * @constructor
 * @extends {goog.ui.Component}
 * @param {number} w
 * @param {number} h
 */
ble.TestDraw = function(w, h) {
  this.width = w;
  this.height = h;
  goog.ui.Component.call(this, new goog.dom.DomHelper());
};
goog.inherits(ble.TestDraw, goog.ui.Component);

ble.TestDraw.prototype.createDom = function() {
  var dh = this.getDomHelper();
  this.setElementInternal(
      dh.createDom(
        'canvas',
        {'width': this.width,
         'height': this.height}));
};

ble.TestDraw.prototype.canDecorate = function(element) { return false; };

ble.TestDraw.prototype.rawContext = function() {
  return this.getElement().getContext('2d');
}

ble.TestDraw.prototype.context = function() {
  var ctx = this.rawContext();
  var w = this.width;
  var h = this.height;
  ctx.save();
  ctx.translate(w/2, h/2);
  ctx.scale(w, h);
  ctx.lineWidth /= Math.sqrt(w*w+h*h);
  return ctx;
};

ble.TestDraw.prototype.doneWithContext = function(ctx) {
  ctx.restore();
};

doStuff();
