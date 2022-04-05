// encode-stream.js
'use strict';

exports.createEncodeStream = EncodeStream;

let util = require("util");
let Transform = require("stream").Transform;
let EncodeBuffer = require("./encode-buffer").EncodeBuffer;

// According to VS Code this should be replaced, but I don't know node.js
util.inherits(EncodeStream, Transform);

let DEFAULT_OPTIONS = {objectMode: true};

function EncodeStream(options) {
  if (!(this instanceof EncodeStream)) return new EncodeStream(options);
  if (options) {
    options.objectMode = true;
  } else {
    options = DEFAULT_OPTIONS;
  }
  Transform.call(this, options);

  let stream = this;
  let encoder = this.encoder = new EncodeBuffer(options);
  encoder.push = function(chunk) {
    stream.push(chunk);
  };
}

EncodeStream.prototype._transform = function(chunk, encoding, callback) {
  try {
    this.encoder.write(chunk);
  } catch(e) {
    return callback(e);
  }
  callback();
};

EncodeStream.prototype._flush = function(callback) {
  try {
    this.encoder.flush();
  } catch(e) {
    return callback(e);
  }
  callback();
};
