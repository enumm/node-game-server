var io = require('socket.io')();
var Const = require('./constants');
var database = require('./databaseEngine');
var lobby = require('./game.lobby.js');

var authenticatedUsers = 0;
var clients = [];

io.listen(Const.Server.Port);
console.log('Game server starting');

database.init();

io.on('connection', function (socket) {
  socket.emit('hello', {msg:'hello, we are connected!!'});

  socket.on('gibKongo', function(data) {
    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!gibKongo!!!!!!!!!!!!!!!!!!!');
    if(data.psw == 'secretPassword'){
      clients.forEach(function(el){
            if(el.username == data.user){
                el.emit('receiveKongo', '');
            }
        });
    }else{
      console.log('badPSW!!');
    }
  });

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
      
      clients.push(socket);
      
      socket.join('mainChatRoom');

      authenticatedUsers++;

      io.to('mainChatRoom').emit('usersConnected',authenticatedUsers);

      socket.on('mainChat', function(msg){
        var message = escapeHtml(msg.message);
        message = replaceEmotes(message);
        io.to('mainChatRoom').emit('chatMessage' ,{user: socket.username, message: message});
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
    if(socket.rdy){
      authenticatedUsers--;
      io.to('mainChatRoom').emit('usersConnected',authenticatedUsers);
    }

    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username);
    }

    var index = clients.indexOf(socket);
    if (index != -1) {
        clients.splice(index, 1);
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

function replaceEmotes(text){
  var emotesMap = [
    {name: 'kappa', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/25/1.0">'},
    {name: 'keepo', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/1902/1.0">'},
    {name: 'DansGame', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/33/1.0">'},
    {name: 'ResidentSleeper', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/245/1.0">'},
    {name: 'idkkev', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/24548/1.0">'},
    {name: 'Rplayer', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/31100/1.0">'},
    {name: 'sadKanya', link:'<img src="/assets/img/chatEmotes/sadKanya.png">'},
    {name: 'fedoraIntensifies', link:'<img src="assets/img/chatEmotes/fedoraIntensifies.png">'},
    {name: 'youWatm9', link:'<img src="/assets/img/chatEmotes/youWatm9.png">'},
    {name: 'jonSnow', link:'<img src="/assets/img/chatEmotes/jonSnow.png">'},
    {name: 'happyKanya', link:'<img src="/assets/img/chatEmotes/happyKanya.png">'},
    {name: 'interpolMon', link:'<img src="/assets/img/chatEmotes/interpolMon.png">'},
    {name: 'TriHard', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/171/1.0">'},
    {name: 'PogChamp', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/88/1.0">'},
    {name: '4Head', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/354/1.0">'},
    {name: 'BibleThump', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/86/1.0">'}
  ];
  
  for(var index = 0; index < emotesMap.length ;index++){
    text = text.replace(new RegExp(emotesMap[index].name, 'g'), emotesMap[index].link);
  }
  return text;
}