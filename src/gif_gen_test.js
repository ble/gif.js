
goog.require('ble.Gif');
goog.require('goog.dom.DomHelper');
goog.require('goog.ui.Component');

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

ble.TestDraw.prototype.getImageCopy = function() {
  return this.rawContext()
             .getImageData(0, 0, this.width, this.height);
};

ble.TestDraw.prototype.hide = function() {
  var el = this.getElement();
  el.style['display'] = 'none';
};

var doStuff = function() {
  var component = new ble.TestDraw(500, 500);
  component.render(document.body);
  component.hide();
  var dh = component.getDomHelper();

  var phi;
  var steps = 40;
  var scale = 4;
  var imgUrl;
  for(var i = 0; i < steps; i++) {
    phi = (2 * Math.PI) * i / steps;
    drawThing(Math.cos(phi), component);
    imgUrl = component.getElement().toDataURL();
    var image = dh.createDom(
        'img',
        { 'src': imgUrl,
          'height': component.height / scale,
          'width': component.width / scale,
          'style': 'display:block;' });
    dh.appendChild(document.body, image);
  };
  window.console.log('done.');
};

doStuff();
