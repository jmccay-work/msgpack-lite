// encode.js
'use strict';

exports.encode = encode;

let EncodeBuffer = require("./encode-buffer").EncodeBuffer;

function encode(input, options) {
  let encoder = new EncodeBuffer(options);
  encoder.write(input);
  return encoder.read();
}
