var io = require('socket.io')();
var Const = require('./constants');
var database = require('./databaseEngine');
var lobby = require('./game.lobby.js');

io.listen(Const.Server.Port);
console.log('Game server starting');

database.init();

io.on('connection', function (socket) {
  socket.emit('hello', {msg:'hello, we are connected!!'});

  socket.on('message', function(m) {
    lobby.onMessage(socket, m);
  });

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

      socket.join('mainChatRoom');

      socket.on('mainChat', function(msg){
        io.to('mainChatRoom').emit('chatMessage' ,{user: socket.username, message: escapeHtml(msg.message)});
      });

      console.log('User: "' + socket.username + '" authenticated');
    }
  });

  socket.on('find_game', function (data) {
    if(socket.rdy && !socket.game){
      console.log('User: "' + socket.username + '" wants to play');
      socket.race = data.race; 
      lobby.findGame(socket, data.gameType);
    }
  });

  socket.on('end_game', function (data) {
    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username);
    }
  });

  socket.on('cancel_matchmaking', function (data) {
    if(socket.game && socket.game.id) {
      lobby.stopMatching(socket.game.id, socket.username);
    }
  });

  socket.on('get_user_statistics', function (data) {
    if(socket.rdy) {
      database.read_statistics(data, socket);
    }
  });

  socket.on('get_user_friends', function (data) {
    if(socket.rdy) {
      database.read_friends(data, socket);
    }
  });

  socket.on('add_friend', function (data) {
    if(socket.rdy) {
      if(socket.username != data.friendName){
        database.add_friend(data, socket);
      }else{
        console.log("can't add self");
      }
    }
  });

   socket.on('disconnect', function () {
    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username);
    }
  }); 
});

function escapeHtml(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}