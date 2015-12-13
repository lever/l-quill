var Quill = require('quill');
var Range = Quill.require('range');

var LINE_FORMATS = {
  'align': true
};
var BINARY_FORMATS = {
  'bold': true
, 'italic': true
, 'strike': true
, 'underline': true
, 'link': true
};
var MIXED_FORMAT_VALUE = '*';

module.exports = DerbyQuill;
function DerbyQuill() {}
DerbyQuill.prototype.view = __dirname;

DerbyQuill.prototype.init = function() {
  this.quill = null;
  this.activeFormats = this.model.at('activeFormats');
  this.delta = this.model.at('delta');
  this.htmlResult = this.model.at('htmlResult');
  this.plainText = this.model.at('plainText');
};

DerbyQuill.prototype.create = function() {
  var self = this;
  // TODO: remove this
  window.Quill = Quill
  var quill = this.quill = new Quill(this.editor);
  quill.addModule('toolbar', {
    container: window.document.createElement('div')
  });
  window.toolbar = this.toolbar = quill.modules['toolbar']
  window.keyboard = this.keyboard = quill.modules['keyboard']

  this.model.on('all', 'delta.**', function(path, evtName, value, prev, passed) {
    // This change originated from this component so we
    // don't need to update ourselves
    if (passed && passed.source == quill.id) return;
    var delta = self.delta.getDeepCopy();
    if (delta) self.quill.setContents(delta);
  });

  quill.on('text-change', function(delta, source) {
    if (source === 'user') self._updateDelta()
    self.htmlResult.setDiff(quill.getHTML());
    self.plainText.setDiff(quill.getText());
    var range = quill.getSelection();
    self.updateActiveFormats(range);
  });
  quill.on('selection-change', function(range) {
    self.updateActiveFormats(range);
  });
  // HACK: Quill should provide an event here, but we wrap the method to
  // get a hook into what's going on instead
  var prepareFormat = quill.prepareFormat;
  quill.prepareFormat = function(name, value) {
    prepareFormat.call(quill, name, value);
    self.activeFormats.set(name, value);
  };
  // HACK: Quill added an `ignoreFocus` argument to Selection.getRange
  // that defaults to false and doesn't expose a way of setting
  // it to true from Quill.getSelection(). This will be rectified
  // once the latest develop branch of Quill has been published
  quill.getSelection = function(ignoreFocus) {
    this.editor.checkUpdate();
    return this.editor.selection.getRange(ignoreFocus);
  }
};

DerbyQuill.prototype._updateDelta = function() {
  var pass = {source: this.quill.id};
  this.delta.pass(pass).setDiffDeep(this.quill.editor.doc.toDelta());
}

DerbyQuill.prototype.clearFormatting = function() {
  this.quill.focus();
  var range = this.quill.getSelection(true);
  var formats = this.quill.editor.doc.formats
  for (type in formats) {
    this.setFormat(type, false);
  }
};

DerbyQuill.prototype.toggleFormat = function(type) {
  var value = !this.activeFormats.get(type);
  this.setFormat(type, value);
};

DerbyQuill.prototype.setFormat = function(type, value) {
  this.quill.focus();
  var range = this.quill.getSelection(true);
  this.toolbar._applyFormat(type, range, value);
};

DerbyQuill.prototype.updateActiveFormats = function(range) {
  var activeFormats = {}
  if (range) {
    activeFormats = this.getActiveFormats(range);
  }
  this.activeFormats.set(activeFormats);
};

// Formats that span the entire range
DerbyQuill.prototype.getActiveFormats = function(range) {
  return this.toolbar._getActive(range)
};

DerbyQuill.prototype.focus = function() {
  this.quil.focus();
}
