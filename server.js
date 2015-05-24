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
    
    if(data.psw == 'secretPassword'){
      clients.forEach(function(el){
            if(el.username == data.user){
              console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!gibKongo '+el.username  +' !!!!!!!!!!!!!!!!!!!');
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
    if(!socket.rdy){
      var connected = false;

      for(var i in clients){
        if(clients[i].username == data.name){
          connected = true;
          break;
        }
      }

      if(!connected){
        database.login_user(data, socket);  
      }
      else{
        socket.emit('user_login_response',  {success: false, message: 'User already logged on!'});
      }
    }
  });

  socket.on('user_authenticated', function (data) {
    if(socket.clientId == data.uuid && !socket.rdy){
      socket.rdy = true;
      
      clients.push(socket);
      
      socket.join('mainChatRoom');

      authenticatedUsers++;

      io.to('mainChatRoom').emit('usersConnected',authenticatedUsers);

      socket.on('mainChat', function(msg){
        if(msg.message == '/online'){
          var users ='</br>users online:</br>';
          for(var i in clients)
          {
            users += (clients[i].username + '</br>');
          }

          socket.emit('chatMessage' ,{user: 'skynet3000', message: users});
        }else{
          var message = escapeHtml(msg.message);
          message = replaceEmotes(message);
          io.to('mainChatRoom').emit('chatMessage' ,{user: socket.username, message: message});
        }
      });

      console.log('User: "' + socket.username + '" authenticated');
    }
  });

  socket.on('find_game', function (data) {
    if(socket.rdy && !socket.game){
      console.log('User: "' + socket.username + '" wants to play');
      socket.race = data.race; 
      if(data.gameType == 'private'){
        lobby.findGame(socket, data.gameType, data.friend, clients);  
      }else{
        lobby.findGame(socket, data.gameType, null, null, data.statistics);  
      }
      
    }
  });

  socket.on('end_game', function (data) {
    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username);
    }
  });

  socket.on('cancel_matchmaking', function (data) {
    if(socket.game && socket.game.id) {
      lobby.stopMatching(socket.game.id, socket.username, clients);
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
        socket.emit('friend_add_responce', {msg: 'Cant add self', success: false});
      }
    }
  });

  socket.on('delete_friend', function (data) {
    if(socket.rdy) {
      if(socket.username != data.friendName){
        database.delete_friend(data, socket);
      }else{
        socket.emit('friend_add_responce', {msg: 'Cant delete self', success: false});
      }
    }
  });

   socket.on('disconnect', function () {
    if(socket.rdy){
      authenticatedUsers--;
      io.to('mainChatRoom').emit('usersConnected',authenticatedUsers);
    }

    if(socket.game && socket.game.id) {
      lobby.endGame(socket.game.id, socket.username, database);
    }

    var index = clients.indexOf(socket);
    if (index != -1) {
        clients.splice(index, 1);
    }

  });

  socket.on('check_game_status', function(){
    if(socket.game && socket.game.id) {
      lobby.checkGameStatus(socket.game.id,  database);
    }
  }); 

  socket.on('get_online_user_list', function(){
    if(socket.rdy){
      var users = [];
      for(var i in clients)
      {
        users.push({username: clients[i].username, online: true});
      }
    }

    socket.emit('online_users', users);
  }); 

  socket.on('cancel_invite', function(data){
    if(socket.rdy) {
      lobby.privateGameRejected(data.gameId);
      //lobby.checkGameStatus(socket.game.id,  database);
    }
  }); 

  socket.on('accept_invite', function(data){
    if(socket.rdy) {
      lobby.privateGameAccepted(socket, data.gameId, data.race);
    }
  }); 

  socket.on('ingameChat', function(data){
    if(socket.rdy && socket.game) {
      var message = escapeHtml(data.message);
      message = replaceEmotes(message);
      var game = socket.game;

      if(game.player_client){
        game.player_client.emit('ingameChatMessage', {user: socket.username, message: message});  
      }
      if(game.player_host){
        game.player_host.emit('ingameChatMessage', {user: socket.username, message: message});  
      }
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
    {name: 'sadKanya', link:'<img src="assets/img/chatEmotes/sadKanya.png">'},
    {name: 'fedoraIntensifies', link:'<img src="assets/img/chatEmotes/fedoraIntensifies.png">'},
    {name: 'youWatm9', link:'<img src="assets/img/chatEmotes/youWatm9.png">'},
    {name: 'jonSnow', link:'<img src="assets/img/chatEmotes/jonSnow.png">'},
    {name: 'happyKanya', link:'<img src="assets/img/chatEmotes/happyKanya.png">'},
    {name: 'interpolMon', link:'<img src="assets/img/chatEmotes/interpolMon.png">'},
    {name: 'TriHard', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/171/1.0">'},
    {name: 'PogChamp', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/88/1.0">'},
    {name: '4Head', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/354/1.0">'},
    {name: 'BibleThump', link:'<img src="//static-cdn.jtvnw.net/emoticons/v1/86/1.0">'}
  ];
  
  for(var index = 0; index < emotesMap.length ;index++){
    text = text.replace(new RegExp(emotesMap[index].name, 'g'), emotesMap[index].link);
  }
  return text;
};