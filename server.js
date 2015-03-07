var io = require('socket.io')();
var Const = require('./constants');
var database = require('./databaseEngine');

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
      console.log('User: "' + socket.username + '" authenticated');
      //add user to room or smth...
    }
  });
});