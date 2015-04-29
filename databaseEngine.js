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
	    win: Number,
	    loss:  Number
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
    		socket.emit('user_register_response',  {success: false, message: 'User already exists'});
    	}
    	else{
            bcrypt.genSalt(hashRounds, function(err, salt) {
                bcrypt.hash(data.pass, salt, function(err, hashed) {
                    var user = new userDB({ username: data.name, password: hashed ,friends: [], statistics: {win: 0, loss: 0} });

                    user.save(function (err, user) {
                        if (err){
                            console.error(err);
                            socket.emit('user_register_response',  {success: false, message: 'Database error :S'}); 
                        }
                        else if(user){
                            console.log('user: "' + user.username + ' "created');
                            socket.emit('user_register_response',  {success: true, message: 'User: ' + user.username + ' created'});    
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