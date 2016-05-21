#!node

'use strict';

var fs = require('fs');
var pump = require('pump');
var PlexAPI = require('plex-api');
var client = new PlexAPI('127.0.0.1');

var jobs = {};

setInterval(scanAndCache, 15*1000);

function scanAndCache() {
  client.query('/status/sessions')
        .then(getFiles)
        .then(addJobs)
        .then(summarize)
        .catch(logErrors);
}

function summarize() {
  console.log('currently caching: ', Object.keys(jobs));
}
function logErrors(err) {
  console.error('Error in caching:', err);
}

function addJobs(files) {
  files.forEach(addJob);
}

function addJob(path) {
  if (!(path in jobs)) {
    jobs[path] = buffer(path);
  }
}

function removeJob(path) {
  delete jobs[path];
}

function buffer(path) {
  pump(fs.createReadStream(path), fs.createWriteStream('/dev/null'), cleanup);
  function cleanup(err) {
    if (err) {
      console.error('error buffering %s: ', path, err);
    }
    removeJob(path);
  }
}

// Yep, this is recursive, but we know our tree is limited in depth
function getFiles(t, acc = []) {
  if (t instanceof Array) {
    t.forEach(function(i) {
      getFiles(i, acc);
    });
  } else if (t instanceof Object) {
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
