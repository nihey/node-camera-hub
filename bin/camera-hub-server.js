#!/usr/bin/env node

var http = require('http').Server(),
    io = require('socket.io')(http);

io.on('connection', function(socket) {
  console.log(socket.id, 'connected');

  // Camera-only room
  socket.on('join-camera', function(room) {
    console.log(socket.id, 'joined', room + '-camera');

    // Tell the other peers that someone joined the room
    io.to(room).emit('joined', socket.id);
    socket.join(room + '-camera');
  });

  // Browser only room
  socket.on('join', function(room) {
    console.log(socket.id, 'joined', room);

    // Tell the other peers that someone joined the room
    io.to(room + '-camera').emit('joined', socket.id);
    socket.join(room);
  });

  socket.on('signal', function(data) {
    io.to(data.dest).emit('signal', {
      source: socket.id,
      signal: data.signal,
    });
  });
});

http.listen(9091, function() {
  console.log('listening on *:9091');
});
