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




  socket.on('login', function (data) {
    console.log('log in for: ' + data.name );

    var userDetails = loginUser(data)
    if(userDetails){
      socket.emit('authenticated', userDetails);
    }else{
      socket.emit('unknowUser');
    }
  });
});