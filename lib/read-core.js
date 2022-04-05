// read-core.js

// too many errors when using strict mode.
//'use strict';

let ExtBuffer = require("./ext-buffer").ExtBuffer;
let ExtUnpacker = require("./ext-unpacker");
let readUint8 = require("./read-format").readUint8;
let ReadToken = require("./read-token");
let CodecBase = require("./codec-base");

CodecBase.install({
  addExtUnpacker: addExtUnpacker,
  getExtUnpacker: getExtUnpacker,
  init: init
});

exports.preset = init.call(CodecBase.preset);

function getDecoder(options) {
  let readToken = ReadToken.getReadToken(options);
  return decode;

  function decode(decoder) {
    let type = readUint8(decoder);
    let func = readToken[type];
    if (!func) throw new Error("Invalid type: " + (type ? ("0x" + type.toString(16)) : type));
    return func(decoder);
  }
}

function init() {
  let options = this.options;
  this.decode = getDecoder(options);

  if (options && options.preset) {
    ExtUnpacker.setExtUnpackers(this);
  }

  return this;
}

function addExtUnpacker(etype, unpacker) {
  let unpackers = this.extUnpackers || (this.extUnpackers = []);
  unpackers[etype & 255] = CodecBase.filter(unpacker);
}

function getExtUnpacker(type) {
  let unpackers = this.extUnpackers || (this.extUnpackers = []);
  return unpackers[type & 255] || extUnpacker;

  function extUnpacker(buffer) {
    return new ExtBuffer(buffer, type);
  }
}
