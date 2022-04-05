// write-core.js

// too many errors when using strict mode.
//'use strict';

let ExtBuffer = require("./ext-buffer").ExtBuffer;
let ExtPacker = require("./ext-packer");
let WriteType = require("./write-type");
let CodecBase = require("./codec-base");

CodecBase.install({
  addExtPacker: addExtPacker,
  getExtPacker: getExtPacker,
  init: init
});

exports.preset = init.call(CodecBase.preset);

function getEncoder(options) {
  let writeType = WriteType.getWriteType(options);
  return encode;

  function encode(encoder, value) {
    let func = writeType[typeof value];
    if (!func) throw new Error(`Unsupported type \"${typeof value}\": ${value}`);
    func(encoder, value);
  }
}

function init() {
  let options = this.options;
  this.encode = getEncoder(options);

  if (options && options.preset) {
    ExtPacker.setExtPackers(this);
  }

  return this;
}

function addExtPacker(etype, Class, packer) {
  packer = CodecBase.filter(packer);
  let name = Class.name;
  if (name && name !== "Object") {
    let packers = this.extPackers || (this.extPackers = {});
    packers[name] = extPacker;
  } else {
    // fallback for IE
    let list = this.extEncoderList || (this.extEncoderList = []);
    list.unshift([Class, extPacker]);
  }

  function extPacker(value) {
    if (packer) value = packer(value);
    return new ExtBuffer(value, etype);
  }
}

function getExtPacker(value) {
  let packers = this.extPackers || (this.extPackers = {});
  let c = value.constructor;
  let e = c && c.name && packers[c.name];
  if (e) return e;

  // fallback for IE
  let list = this.extEncoderList || (this.extEncoderList = []);
  let len = list.length;
  for (let i = 0; i < len; i++) {
    let pair = list[i];
    if (c === pair[0]) return pair[1];
  }
}
