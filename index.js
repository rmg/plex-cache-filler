#!/usr/bin/env node
// Copyright Ryan Graham 2016. All Rights Reserved.
// Node module: plex-cache-filler
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const fs = require('fs');
const http = require('http');
const parse = require('xml-parser');
const bufKey = Symbol();
const jobs = new Set();
const req = {
  hostname: process.argv[2] || '127.0.0.1',
  port: 32400,
  path: '/status/sessions',
};

setImmediate(http.get, req, handleResponse);
setInterval(http.get, 15*1000, req, handleResponse);

function handleResponse(res) {
  res[bufKey] = '';
  res.on('data', accumulate);
  res.on('end', parseResponse);
  res.on('error', logErrors);
}

function accumulate(d) {
  this[bufKey] += d;
}

function parseResponse() {
  const xml = parse(this[bufKey]);
  const files = getFiles(xml, []);
  files.forEach(addJob);
  console.log('currently playing: ', files);
  console.log('currently caching: ', Array.from(jobs));
}

function logErrors(err) {
  console.error('Error in caching:', err);
}

function addJob(path) {
  if (!jobs.has(path)) {
    jobs.add(path);
    fs.createReadStream(path)
      .on('close', cleanup)
      .on('error', cleanup)
      .resume();
  }
}

function removeJob(path) {
  jobs.delete(path);
}

function cleanup(err) {
  if (err) {
    console.error('error buffering %s: ', this.path, err);
  }
  setTimeout(removeJob, 30*1000, this.path);
}

// Yep, this is recursive, but we know our tree is limited in depth
function getFiles(t, acc) {
  if (t !== null && typeof t === 'object') {
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
