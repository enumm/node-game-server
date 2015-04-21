var io = require('socket.io')();
var Const = require('./constants');
var database = require('./databaseEngine');
var lobby = require('./game.lobby.js');

io.listen(Const.Server.Port);
console.log('Game server starting');

database.init();

io.on('connection', function (socket) {
  socket.emit('hello', {msg:'hello, we are connected!!'});

  socket.on('user_register', function (data) {
    console.log('Create acc request');
    database.register_user(data, socket);
  });

  socket.on('user_login', function (data) {
    database.login_user(data, socket);
  });

  socket.on('user_authenticated', function (data) {
    if(socket.clientId == data.uuid){
      socket.rdy = true;
      console.log('User: "' + socket.username + '" authenticated');
    }
  });

  socket.on('find_game', function (data) {
    if(socket.rdy && !socket.game){
      console.log('User: "' + socket.username + '" wants to play'); 
      lobby.findGame(socket);
    }
  });

  socket.on('message', function(m) {
    lobby.onMessage(socket, m);
  });

  socket.on('end_game', function (data) {
    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username);
    }
  });

   socket.on('disconnect', function () {
    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username);
    }
  }); 
});