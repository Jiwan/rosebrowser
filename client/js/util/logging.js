'use strict';

function DebugLogger(name, enabled) {
  this.name = name;
  this.enabled = enabled;
}

DebugLogger.prototype.enable = function() {
  this.enabled = true;
};

DebugLogger.prototype.disable = function() {
  this.enabled = false;
};

DebugLogger.prototype.group = function() {
  if (this.enabled) {
    console.group.apply(console, arguments);
  }
};

DebugLogger.prototype.groupCollapsed = function() {
  if (this.enabled) {
    console.groupCollapsed.apply(console, arguments);
  }
};

DebugLogger.prototype.groupEnd = function() {
  if (this.enabled) {
    console.groupEnd.apply(console, arguments);
  }
};

DebugLogger.prototype.debug = function() {
  if (this.enabled) {
    console.debug.apply(console, arguments);
  }
};

var netConsole = new DebugLogger('net', !config.disableNetLog);
var gomConsole = new DebugLogger('lua', !config.disableGomLog);
var luaConsole = new DebugLogger('lua', !config.disableLuaLog);
var qsdConsole = new DebugLogger('qsd', !config.disableQsdLog);
