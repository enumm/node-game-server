var databaseEngine = module.exports = {}
var mongoose = require('mongoose');
var Const = require('./constants');
var uuid = require('node-uuid');
var dataBase = false;
var userSchema = false;
var userDB = false;
var bcrypt = require('bcrypt');
var hashRounds = 12;
 

databaseEngine.init = function() {
	console.log('Connecting to database');
	mongoose.connect(Const.DataBase.Adress);

	dataBase = mongoose.connection;
	dataBase.on('error', console.error.bind(console, 'connection error:'));
	dataBase.once('open', function (callback) {
	  console.log('Connected to database');
	});

	userSchema = mongoose.Schema({
	  username:  String,
	  password: String,
	  friends: [{ username: String }],
	  statistics: {
	    wins: Number,
	    losses:  Number,
        ranked_wins: Number,
        rank: Number,
        win_streak: Number,
        win_rate: Number
	  }
	});

	userDB = mongoose.model('userDB', userSchema);
};

databaseEngine.update_statistics = function(won, username, gType){
    userDB.findOne({username: username}, function (err, user) {
        if (err){
            console.error(err);   
        }
        else if(user){
            //database update
            if(!user.statistics.player_win_rate){
                user.statistics.player_win_rate = 0;
            }
            if(!user.statistics.win_streak){
                user.statistics.win_streak = 0;
            }

            if(won){
                user.statistics.wins++;
                
                if(gType == 'ranked'){
                    user.statistics.ranked_wins++;
                    user.statistics.win_rate++;
                    user.statistics.rank++;
                    if(user.statistics.win_streak > 2){
                        user.statistics.rank++;
                        user.statistics.win_streak++;
                        if(user.statistics.win_streak > 3){
                            user.statistics.win_rate++;
                        }
                    }else{
                        user.statistics.win_streak++;
                    }
                }
            }else{
              user.statistics.losses++;

                if(gType == 'ranked'){
                    if(user.statistics.rank > 0){
                        user.statistics.rank--;
                    }

                    user.statistics.win_streak = 0;
                    user.statistics.win_rate--;
                } 
              }
              

            if(user.username == 'ttt1'){
                user.statistics.rank = 50;
                user.statistics.win_rate = 50;
            }
            
            user.save(function(err, user){
            });
        }
    });
    
    console.log(username + ' ' + (won? 'won' : 'lost') + ' gameType: ' +  gType);
};

databaseEngine.register_user = function(data, socket) {
	if(data.name.length < Const.DataBase.MinUserNameLenght){
		socket.emit('user_register_response',  {success: false, message: 'Username is too short'});
        return false;
    }
    if(data.pass.length <  Const.DataBase.MinPassLenght){
    	socket.emit('user_register_response',  {success: false, message: 'Password is too short'});
        return false;
    }

    userDB.findOne({username: data.name}, function (err, user) {
    	if (err){
    		console.error(err);
    		socket.emit('user_register_response',  {success: false, message: 'Database error :S'});	
    	}
    	else if(user){
    		socket.emit('user_register_response',  {success: false, message: 'User already exists', loginData: data});
    	}
    	else{
            bcrypt.genSalt(hashRounds, function(err, salt) {
                bcrypt.hash(data.pass, salt, function(err, hashed) {
                    var user = new userDB({ username: data.name, password: hashed ,friends: [], statistics: {wins: 0, losses: 0, ranked_wins:0, rank:0} });

                    user.save(function (err, user) {
                        if (err){
                            console.error(err);
                            socket.emit('user_register_response',  {success: false, message: 'Database error :S'}); 
                        }
                        else if(user){
                            console.log('user: "' + user.username + ' "created');
                            socket.emit('user_register_response',  {success: true, message: 'User: ' + user.username + ' created', loginData: data});    
                        }
                    });
                });
            });
    	}
    });
};

databaseEngine.login_user = function(data, socket) {
	userDB.findOne({username: data.name}, function (err, user) {
		if (err){
    		console.error(err);
    		socket.emit('user_login_response',  {success: false, message: 'Database error :S'});	
    	}
    	else if(user){
            bcrypt.compare(data.pass, user.password, function(err, res) {
                if(res){
                    socket.clientId = uuid();
                    socket.username = data.name;
                    socket.emit('user_login_response',  {success: true, message: socket.clientId, uuid: socket.clientId, username: socket.username});
                }else{
                    socket.emit('user_login_response',  {success: false, message: 'Invalid username/password'});
                }
            }); 
        }
    	else{
    		socket.emit('user_login_response',  {success: false, message: 'Invalid username/password'});
    	}
	});
};

databaseEngine.read_statistics = function(data, socket) {
    userDB.findOne({username: socket.username}, function (err, user) {
        if(!user.statistics.rank){
            user.statistics.rank = 0;
        }
        if(!user.statistics.win_streak){
            user.statistics.win_streak = 0;
        }
        if(!user.statistics.win_rate){
            user.statistics.win_rate = 0;
        }
        console.log('rank:' + user.statistics.rank);
        console.log('win_streak:' + user.statistics.win_streak);
        console.log('winrate:' + user.statistics.win_rate);
        user.save();
        socket.emit('show_user_data', {username: user.username, statistics : user.statistics});    
    });
};

databaseEngine.read_friends = function(data, socket) {
    userDB.findOne({username: socket.username}, function (err, user) {
        socket.emit('get_user_friends_response', user.friends);    
    });
};

databaseEngine.add_friend = function(data, socket) {
    userDB.findOne({username: socket.username}, function (err, user) {
        var alreadyAdded = false;

        for(var i = 0; i < user.friends.length; i++){
            if(user.friends[i].username == data.friendName){
                alreadyAdded = true;
                socket.emit('friend_add_responce', {msg: 'friend aldready added: ' + data.friendName, success: false});
            }
        }

        if(!alreadyAdded){
           userDB.findOne({username: data.friendName}, function (err,foundFriend){
                if(err){
                    console.error(err);
                }else if(!foundFriend){
                    socket.emit('friend_add_responce', {msg: 'user not found: ' + data.friendName, success: false});
                }else{
                    user.friends.push({username: foundFriend.username});
                    user.save(function(err, user){
                        socket.emit('friend_add_responce', {msg: 'friend added: ' + foundFriend.username, success: true});
                        socket.emit('get_user_friends_response', user.friends);    
                    });
                }
            });
        }
    });
};

databaseEngine.delete_friend = function(data, socket) {
    userDB.findOne({username: socket.username}, function (err, user) {
        if(err){
            console.error(err);
        }else{
            var exists = false;

            for(var i = 0; i < user.friends.length; i++){
                if(user.friends[i].username == data.friendName){
                    exists = true;
                }
            }

            if(exists){
                user.friends = user.friends.filter(function (el){
                    return el.username !== data.friendName;
                });

                user.save(function(err, user){
                    socket.emit('friend_add_responce', {msg: 'friend removed: ' + data.friendName, success: true});
                    socket.emit('get_user_friends_response', user.friends);
                });
            }else{
                socket.emit('friend_add_responce', {msg: 'Friend not found: ' + data.friendName, success: false});
            }

            
        }
    });
};