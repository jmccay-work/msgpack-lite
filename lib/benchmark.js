#!/usr/bin/env node
'use strict';

let msgpack_node = try_require("msgpack");
let msgpack_lite = try_require("../index");
let msgpack_js = try_require("msgpack-js");
let msgpack_js_v5 = try_require("msgpack-js-v5");
let msgpack5 = try_require("msgpack5");
let msgpack_unpack = try_require("msgpack-unpack");
let msgpack_codec = try_require("msgpack.codec");
let notepack = try_require("notepack");

msgpack5 = msgpack5 && msgpack5();
msgpack_codec = msgpack_codec && msgpack_codec.msgpack;

let pkg = require("../package.json");
let data = require("../test/example");
let packed = msgpack_lite.encode(data);
let expected = JSON.stringify(data);

let argv = Array.prototype.slice.call(process.argv, 2);

if (argv[0] === "-v") {
  console.warn(`${pkg.name} ${pkg.version}`);
  process.exit(0);
}

let limit = 5;
if (argv[0] - 0) limit = argv.shift() - 0;
limit *= 1000;

let COL1 = 57;
let COL2 = 6;
let COL3 = 5;
let COL4 = 6;

console.log(rpad("operation", COL1), "|", "  op  ", "|", "  ms ", "|", " op/s ");
console.log(rpad("", COL1, "-"), "|", lpad(":", COL2, "-"), "|", lpad(":", COL3, "-"), "|", lpad(":", COL4, "-"));

let buf, obj;

if (JSON) {
  buf = bench('buf = Buffer(JSON.stringify(obj));', JSON_stringify, data);
  obj = bench('obj = JSON.parse(buf);', JSON.parse, buf);
  test(obj);
}

if (msgpack_lite) {
  buf = bench('buf = require("msgpack-lite").encode(obj);', msgpack_lite.encode, data);
  obj = bench('obj = require("msgpack-lite").decode(buf);', msgpack_lite.decode, packed);
  test(obj);
}

if (msgpack_node) {
  buf = bench('buf = require("msgpack").pack(obj);', msgpack_node.pack, data);
  obj = bench('obj = require("msgpack").unpack(buf);', msgpack_node.unpack, buf);
  test(obj);
}

if (msgpack_codec) {
  buf = bench('buf = Buffer(require("msgpack.codec").msgpack.pack(obj));', msgpack_codec_pack, data);
  obj = bench('obj = require("msgpack.codec").msgpack.unpack(buf);', msgpack_codec.unpack, buf);
  test(obj);
}

if (msgpack_js_v5) {
  buf = bench('buf = require("msgpack-js-v5").encode(obj);', msgpack_js_v5.encode, data);
  obj = bench('obj = require("msgpack-js-v5").decode(buf);', msgpack_js_v5.decode, buf);
  test(obj);
}

if (msgpack_js) {
  buf = bench('buf = require("msgpack-js").encode(obj);', msgpack_js.encode, data);
  obj = bench('obj = require("msgpack-js").decode(buf);', msgpack_js.decode, buf);
  test(obj);
}

if (msgpack5) {
  buf = bench('buf = require("msgpack5")().encode(obj);', msgpack5.encode, data);
  obj = bench('obj = require("msgpack5")().decode(buf);', msgpack5.decode, buf);
  test(obj);
}

if (notepack) {
  buf = bench('buf = require("notepack").encode(obj);', notepack.encode, data);
  obj = bench('obj = require("notepack").decode(buf);', notepack.decode, buf);
  test(obj);
}

if (msgpack_unpack) {
  obj = bench('obj = require("msgpack-unpack").decode(buf);', msgpack_unpack, packed);
  test(obj);
}

function JSON_stringify(src) {
  return Buffer(JSON.stringify(src));
}

function msgpack_codec_pack(data) {
  return Buffer(msgpack_codec.pack(data));
}

function bench(name, func, src) {
  if (argv.length) {
    let match = argv.filter(function(grep) {
      return (name.indexOf(grep) > -1);
    });
    if (!match.length) return SKIP;
  }
  let ret, duration;
  let start = new Date() - 0;
  let count = 0;
  while (1) {
    let end = new Date() - 0;
    duration = end - start;
    if (duration >= limit) break;
    while ((++count) % 100) ret = func(src);
  }
  name = rpad(name, COL1);
  let score = Math.floor(count / duration * 1000);
  count = lpad(count, COL2);
  duration = lpad(duration, COL3);
  score = lpad(score, COL4);
  console.log(name, "|", count, "|", duration, "|", score);
  return ret;
}

function rpad(str, len, chr) {
  if (!chr) chr = " ";
  while (str.length < len) str += chr;
  return str;
}

function lpad(str, len, chr) {
  if (!chr) chr = " ";
  str += "";
  while (str.length < len) str = chr + str;
  return str;
}

function test(actual) {
  if (actual === SKIP) return;
  actual = JSON.stringify(actual);
  if (actual === expected) return;
  console.warn(`expected: ${expected}`);
  console.warn(`actual:   ${actual}`);
}

function SKIP() {
}

function try_require(name) {
  try {
    return require(name);
  } catch (e) {
    // ignore
  }
}