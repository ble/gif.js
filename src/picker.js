goog.provide('ble.Picker');
goog.provide('ble.PickerList');

goog.require('goog.events.EventTarget');
goog.require('goog.events.Event');

goog.require('goog.ui.Component');
goog.require('goog.ui.Menu');
goog.require('goog.ui.MenuItem');

goog.require('goog.net.XhrIo');
/**
 * @constructor
 * @extends {goog.events.EventTarget}
 * @param {string} pathToFileList
 * @param {string} basePath
 */
ble.Picker = function(pathToFileList, basePath) {
  goog.events.EventTarget.call(this);
  this.pathToFileList = pathToFileList;
  this.basePath = basePath;
  this.paths = null;
  this.buffers = null;
};
goog.inherits(ble.Picker, goog.events.EventTarget);

/** @enum {string} */
ble.Picker.EventTypes = {LOADED_FILELIST: 'LOADED_FILELIST', LOADED_FILE: 'LOADED_FILE'};

ble.Picker.prototype.EventTypes = ble.Picker.EventTypes;

ble.Picker.prototype.loadFileList = function() {
  var xhr = new goog.net.XhrIo();
  var listener = goog.bind(this._xhrFileListComplete, this);
  goog.events.listenOnce(xhr, goog.net.EventType.COMPLETE, listener);
  xhr.send(this.pathToFileList, 'GET');
};

ble.Picker.prototype._xhrFileListComplete = function(event) {
  var target = /** @type {goog.net.XhrIo} */ event.target;
  var json = /** @type {Array.<string>} */ target.getResponseJson();
  var basePath = this.basePath;
  this.paths = json.slice();
  target.dispose();
  this.dispatchEvent(new goog.events.Event(this.EventTypes.LOADED_FILELIST, this));
};

ble.Picker.prototype.getPaths = function() {
  return this.paths;
}

ble.Picker.prototype.fullPath = function(index) {
  return this.basePath + '/' + this.paths[index];
}

ble.Picker.prototype.fileIsReady = function(index) {
  return goog.isDefAndNotNull(this.buffers)
      && goog.isDefAndNotNull(this.buffers[index]);
};

ble.Picker.prototype.readyFile = function(index) {
  var already = this.fileIsReady();
  if(!already) {
    var xhr = new goog.net.XhrIo();
    xhr.setResponseType(goog.net.XhrIo.ResponseType.ARRAY_BUFFER);
    var listener = goog.bind(this._xhrFileComplete, this);
    goog.events.listenOnce(xhr, goog.net.EventType.COMPLETE, listener);
    xhr.send(this.fullPath(index));
    xhr._pickerIndex = index;
  }
  return already;
};

ble.Picker.prototype._xhrFileComplete = function(event) {
  var target = /** @type {goog.net.XhrIo} */ event.target;
  var buffer = target.getResponse();
  var index = target._pickerIndex;
  this.buffers = this.buffers || {};
  this.buffers[index] = buffer;
  var eventOut = new goog.events.Event(this.EventTypes.LOADED_FILE, this);

  eventOut.path = this.fullPath(index);
  eventOut.pickerIndex = index;
  eventOut.buffer = buffer;

  this.dispatchEvent(eventOut);
}

ble.Picker.prototype.loadFile = function(index) {
  this.buffers = this.buffers || {};
  if(!goog.isDefAndNotNull(this.buffers[index])) {

  }
};

/**
 * @constructor
 * @extends {goog.ui.Component}
 */
ble.PickerList = function() {
  goog.ui.Component.call(this, new goog.dom.DomHelper());
  this.currentPaths = null;
  this.picker = null;
  this.menu = new goog.ui.Menu();
  this.addChild(this.menu, true);
};
goog.inherits(ble.PickerList, goog.ui.Component);

ble.PickerList.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  if(goog.isDefAndNotNull(this.picker)) {
    var listener = goog.bind(this.dispatchEvent, this);
    goog.events.listen(
        this.picker,
        this.picker.EventTypes.LOADED_FILE,
        listener);
    var listener = goog.bind(this._processAction, this);
    goog.events.listen(
        this,
        goog.ui.Component.EventType.ACTION,
        listener);
  }
};

ble.PickerList.prototype._processAction = function(event) {
  var menuItem = /** @type {goog.ui.MenuItem} */ event.target;
  var model = menuItem.getModel();
  if(goog.isDefAndNotNull(model)) {
    if(this.picker.readyFile(model)) {
      var event = new goog.events.Event(this.picker.EventTypes.LOADED_FILE, this.picker);
      event.pickerIndex = model;
      event.path = this.picker.fullPath(index);
      event.buffer = buffer;
      this.dispatchEvent(event);
    }
  }
}

ble.PickerList.prototype.setPicker = function(picker) {
  this.picker = picker;
  var listener = goog.bind(this._processLoadedFileList, this);
  goog.events.listenOnce(picker, picker.EventTypes.LOADED_FILELIST, listener);
  var paths = picker.getPaths();
  if(goog.isDefAndNotNull(paths)) {
    goog.events.unlisten(picker, picker.EventTypes.LOADED_FILELIST, listener);
    this.processPaths(paths);
  }
};

ble.PickerList.prototype.processPaths = function(paths) {
  this.currentPaths = paths;
  this._updateDom();
};

ble.PickerList.prototype._processLoadedFileList = function(event) {
  var picker = /** @type {ble.Picker} */ event.target;
  this.processPaths(picker.getPaths());
};

ble.PickerList.prototype._updateDom = function() {
  var dh = this.getDomHelper();
  this.menu.removeChildren(true);
  for(var i = 0; i < this.currentPaths.length; i++) {
    var path = this.currentPaths[i];
    var mItem = new goog.ui.MenuItem(path, i);
    this.menu.addChild(mItem, true);
  }
};

