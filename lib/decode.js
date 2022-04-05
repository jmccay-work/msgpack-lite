// decode.js
'use strict';

exports.decode = decode;

let DecodeBuffer = require("./decode-buffer").DecodeBuffer;

function decode(input, options) {
  let decoder = new DecodeBuffer(options);
  decoder.write(input);
  return decoder.read();
}