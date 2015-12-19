#!/usr/bin/env node

var meow = require('meow'),
    io = require('socket.io-client'),
    MultiRTC = require('multi-rtc'),
    Snapshooter = require('../lib/snapshooter');

var cli = meow({
  pkg: require('../package.json'),
  help: [
    'Usage',
    '  camera-hub <stream-url> [options]',
    '',
    'Options:',
    '  -d, --domain     which name will you be sharing your camera',
    '',
  ]
});

if (!cli.input.length) {
  cli.showHelp();
}

var domain = Math.random().toString(32).split('.')[1];
if (cli.flags.d || cli.flags.domain) {
  domain = cli.flags.d || cli.flags.domain;
}

var peers = new MultiRTC({channel: true, wrtc: require('wrtc')});
var snapshooter = new Snapshooter(cli.input[0], function(frame) {
  console.log('FRAME:', frame);
});

var events = {
  frame: function(id) {
    if (!snapshooter.frame) {
      return;
    }

    peers.sendBlob(snapshooter.frame.toString('base64'));
  },
};

peers.on('connect', function(id) {
  console.log('connected to peer', id);
});

peers.on('data', function(id, data) {
  var func = events[data.type];
  func && func(id, data);
});

peers.on('disconnect', function(id) {
  console.log('disconnected to peer', id);
});

var connect = function() {
  var socket = io('ws://nihey.org:9091', {
    'force new connection': true,
    'max reconnection attempts': Infinity,
  });

  socket.on('connect', function() {
    console.log('connected to the signal server');
    socket.emit('join', domain);
  });

  socket.on('joined', function(id) {
    peers.add(id);
  });

  socket.on('signal', function(data) {
    peers.add(data.source, data.signal);
  });

  socket.on('disconnect', function() {
    console.log('disconnected to the signal server');
  });

  socket.on('error', function(error) {
    if (error.match(/ECONNREFUSED/)) {
      console.error('connection failed: trying again in 5 seconds');
      return setTimeout(connect, 5000);
    }
    console.error(error);
  });
};

connect();
