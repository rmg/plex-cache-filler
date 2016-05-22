#!/usr/bin/env node
// Copyright Ryan Graham 2016. All Rights Reserved.
// Node module: plex-cache-filler
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var fs = require('fs');
var http = require('http');
var parse = require('xml-parser');
var req = {
  hostname: process.argv[2] || '127.0.0.1',
  port: 32400,
  path: '/status/sessions',
};

var jobs = {};

setImmediate(scanAndCache);
setInterval(scanAndCache, 15*1000);

function scanAndCache() {
  http.get(req, (res) => {
    var body = '';
    res.on('data', function(d) {
      body += d;
    }).on('end', function() {
      var xml = parse(body);
      var files = getFiles(xml);
      files.forEach(addJob);
      console.log('currently playing: ', files);
      console.log('currently caching: ', Object.keys(jobs));
    }).on('error', logErrors);
  });
}

function logErrors(err) {
  console.error('Error in caching:', err);
}

function addJob(path) {
  if (!(path in jobs)) {
    jobs[path] = fs.createReadStream(path)
                   .on('close', cleanup)
                   .on('error', cleanup)
                   .resume();
  }
}

function removeJob(path) {
  delete jobs[path];
}

function cleanup(err) {
  if (err) {
    console.error('error buffering %s: ', this.path, err);
  }
  setTimeout(removeJob, 30*1000, this.path);
}

// Yep, this is recursive, but we know our tree is limited in depth
function getFiles(t, acc) {
  acc = acc || [];
  if (t instanceof Array || t instanceof Object) {
    for (let k in t) {
      if (k === 'file') {
        acc.push(t[k]);
      } else {
        getFiles(t[k], acc);
      }
    }
  }
  return acc;
}
