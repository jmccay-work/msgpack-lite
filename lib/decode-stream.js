// decode-stream.js
'use strict';

exports.createDecodeStream = DecodeStream;

let util = require("util");
let Transform = require("stream").Transform;
let DecodeBuffer = require("./decode-buffer").DecodeBuffer;

// According to VS Code this should be replaced, but I don't know node.js
util.inherits(DecodeStream, Transform);

let DEFAULT_OPTIONS = {objectMode: true};

function DecodeStream(options) {
  if (!(this instanceof DecodeStream)) return new DecodeStream(options);
  if (options) {
    options.objectMode = true;
  } else {
    options = DEFAULT_OPTIONS;
  }
  Transform.call(this, options);
  let stream = this;
  let decoder = this.decoder = new DecodeBuffer(options);
  decoder.push = function(chunk) {
    stream.push(chunk);
  };
}

DecodeStream.prototype._transform = function(chunk, encoding, callback) {
  try {
    this.decoder.write(chunk);
    this.decoder.flush();
  } catch(e) {
    return callback(e);
  }
  callback();
};
