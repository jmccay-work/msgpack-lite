#!/usr/bin/env node
'use strict';

let PassThrough = require("stream").PassThrough;
let async = require("async");

let msgpack = require("../");
let Encoder = require("./encoder").Encoder;
let Decoder = require("./decoder").Decoder;
let notepack = require("notepack");

let pkg = require("../package.json");

// a sample fluentd message
let data = ["tag", [[1440949922, {"message": "hi there"}]]];
let packed = msgpack.encode(data); // 30 bytes per message
let packsize = packed.length;
let opcount = 1000000;
let joincount = 100;
let packjoin = repeatbuf(packed, joincount); // 3KB per chunk
let limit = 2;

let argv = Array.prototype.slice.call(process.argv, 2);

if (argv[0] === "-v") {
  console.warn(`${pkg.name} ${pkg.version}`);
  process.exit(0);
}

if (argv[0] - 0) limit = argv.shift() - 0;

let list = [
  ['stream.write(msgpack.encode(obj));', encode1],
  ['stream.write(notepack.encode(obj));', encode4],
  ['msgpack.Encoder().on("data",ondata).encode(obj);', encode2],
  ['msgpack.createEncodeStream().write(obj);', encode3],
  ['stream.write(msgpack.decode(buf));', decode1],
  ['stream.write(notepack.decode(buf));', decode4],
  ['msgpack.Decoder().on("data",ondata).decode(buf);', decode2],
  ['msgpack.createDecodeStream().write(buf);', decode3]
];

function encode1(callback) {
  let stream = new PassThrough();
  let cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  for (let j = 0; j < opcount; j++) {
    stream.write(msgpack.encode(data));
  }
  stream.end();
}

function encode2(callback) {
  let stream = new PassThrough();
  let cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  let encoder = Encoder();
  encoder.on("data", function(chunk) {
    stream.write(chunk);
  });
  encoder.on("end", function() {
    stream.end();
  });
  for (let j = 0; j < opcount; j++) {
    encoder.encode(data);
  }
  encoder.end();
}

function encode3(callback) {
  let stream = msgpack.createEncodeStream();
  let cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  for (let j = 0; j < opcount; j++) {
    stream.write(data);
  }
  stream.end();
}

function encode4(callback) {
  let stream = new PassThrough();
  let cnt = counter(callback);
  stream.on("data", cnt.buf);
  stream.on("end", cnt.end);
  for (let j = 0; j < opcount; j++) {
    stream.write(notepack.encode(data));
  }
  stream.end();
}

function decode1(callback) {
  let stream = new PassThrough({objectMode: true});
  let cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (let j = 0; j < opcount; j++) {
    stream.write(msgpack.decode(packed));
  }
  stream.end();
}

function decode2(callback) {
  let stream = new PassThrough({objectMode: true});
  let cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  let decoder = Decoder();
  decoder.on("data", function(chunk) {
    stream.write(chunk);
  });
  decoder.on("end", function() {
    stream.end();
  });
  for (let j = 0; j < opcount / joincount; j++) {
    decoder.decode(packjoin);
  }
  decoder.end();
}

function decode3(callback) {
  let stream = msgpack.createDecodeStream();
  let cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (let j = 0; j < opcount / joincount; j++) {
    stream.write(packjoin);
  }
  stream.end();
}

function decode4(callback) {
  let stream = new PassThrough({objectMode: true});
  let cnt = counter(callback);
  stream.on("data", cnt.inc);
  stream.on("end", cnt.end);
  for (let j = 0; j < opcount; j++) {
    stream.write(notepack.decode(packed));
  }
  stream.end();
}

function rpad(str, len, chr) {
  if (!chr) chr = " ";
  str += "";
  while (str.length < len) str += chr;
  return str;
}

function lpad(str, len, chr) {
  if (!chr) chr = " ";
  str += "";
  while (str.length < len) str = chr + str;
  return str;
}

function repeatbuf(buf, cnt) {
  let array = [];
  for (let i = 0; i < cnt; i++) {
    array.push(buf);
  }
  return Buffer.concat(array);
}

function counter(callback) {
  let cnt = 0;
  return {buf: b, inc: i, end: e};

  function b(buf) {
    cnt += buf.length / packsize;
  }

  function i() {
    cnt++;
  }

  function e() {
    cnt = Math.round(cnt);
    callback(null, cnt);
  }
}

function run() {
  // task filter
  if (argv.length) {
    list = list.filter(function(pair) {
      let name = pair[0];
      let match = argv.filter(function(grep) {
        return (name.indexOf(grep) > -1);
      });
      return match.length;
    });
  }

  // run tasks repeatedly
  let tasks = [];
  for (let i = 0; i < limit; i++) {
    tasks.push(oneset);
  }
  async.series(tasks, end);

  // run a series of tasks
  function oneset(callback) {
    async.eachSeries(list, bench, callback);
  }

  // run a single benchmark
  function bench(pair, callback) {
    process.stdout.write(".");
    let func = pair[1];
    let start = new Date() - 0;
    func(function(err, cnt) {
      let end = new Date() - 0;
      let array = pair[2] || (pair[2] = []);
      array.push(end - start);
      pair[3] = cnt;
      setTimeout(callback, 100);
    });
  }

  // show result
  function end() {
    let title = `operation (${opcount} x ${limit})`;
    process.stdout.write("\n");

    // table header
    let COL1 = 48;
    console.log(rpad(title, COL1), "|", "  op   ", "|", " ms  ", "|", " op/s ");
    console.log(rpad("", COL1, "-"), "|", "------:", "|", "----:", "|", "-----:");

    // table body
    list.forEach(function(pair) {
      let name = pair[0];
      let op = pair[3];
      let array = pair[2];
      array = array.sort(function(a, b) {
        return a > b;
      });
      let fastest = array[0];
      let score = Math.floor(opcount / fastest * 1000);
      console.log(rpad(name, COL1), "|", lpad(op, 7), "|", lpad(fastest, 5), "|", lpad(score, 6));
    });
  }
}

run();
