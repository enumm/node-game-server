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
        rank: Number
	  }	  
	});

	userDB = mongoose.model('userDB', userSchema);
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
                    socket.emit('user_login_response',  {success: true, message: socket.clientId, uuid: socket.clientId});
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
        console.log('found:' + user.username);
        socket.emit('show_user_data', {username: user.username, statistics : user.statistics});    
    });
};

databaseEngine.add_friend = function(data, socket) {
    userDB.findOne({username: socket.username}, function (err, user) {
        var alreadyAdded = false;
        console.log(user.friends.length);
        for(var i = 0; i < user.friends.length; i++){
            console.log('a');
            if(user.friends[i].username == data.friendName){
                alreadyAdded = true;
                console.log('friend aldready added');
            }
        }
        if(!alreadyAdded){
           userDB.findOne({username: data.friendName}, function (err,foundFriend){
                if(err){
                    console.error(err);
                }else if(!foundFriend){
                    console.log("friend not found");
                }else{
                    user.friends.push({name: foundFriend.username});    
                    user.save(function(err, user){
                        console.log("friend added:" + foundFriend.username);
                    });
                    for(var i = 0; i < user.friends.length;i++){
                        console.log(user.friends[i].name);
                    }
                }
            });
        }
    });
};