// write-unit8.js
'use strict';

let constant = exports.uint8 = new Array(256);

for (let i = 0x00; i <= 0xFF; i++) {
  constant[i] = write0(i);
}

function write0(type) {
  return function(encoder) {
    let offset = encoder.reserve(1);
    encoder.buffer[offset] = type;
  };
}
