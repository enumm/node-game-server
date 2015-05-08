//# sourceURL=game.lobby.js
var lobby = module.exports = { games : {}, game_count:0 };
var uuid = require('node-uuid');
//var Const = require('./constants');
var verbose = true;

global.window = global.document = global;

require('./game.core.js');

lobby.log = function() {
    if(verbose) console.log.apply(this,arguments);
};


lobby.onMessage = function(client,message) {
    if(client && client.game && client.game.gamecore) {
        //console.log('data message from: ' + client.username);
        client.game.gamecore.handle_server_input(client, message);
    }
};

lobby.startGame = function(game) {
    //right so a game has 2 players and wants to begin
    //the host already knows they are hosting,
    //tell the other client they are joining a game
    //s=server message, j=you are joining, send them the host id

    // game.player_host.emit('notification', {message: 'joined a game with: ' + game.player_client.username });
    // game.player_client.emit('notification', {message: 'joined a game with: ' + game.player_host.username });

    game.player_host.emit('game_starting', {opponent: game.player_client.username, host: true, enemyRace: game.player_client.race});
    game.player_client.emit('game_starting', {opponent: game.player_host.username, host: false, enemyRace: game.player_host.race});
    
    game.player_client.game = game;
    game.gamecore.update( new Date().getTime() );

    //set this flag, so that the update loop can run it.
    game.active = true;
}; //game_server.startGame

lobby.createGame = function(player, gameType) {
    //Create a new game instance
    var thegame = {
        id : uuid(),                //generate a new id for the game
        player_host:player,         //so we know who initiated the game
        player_client:null,         //nobody else joined yet, since its new
        player_count:1,             //for simple checking of state
        game_type:gameType
    };

    this.games[thegame.id] = thegame;

    //Keep track
    this.game_count++;

    //Create a new game core instance, this actually runs the
    //game code like collisions and such.
    thegame.gamecore = new game_core(thegame);
    //Start updating the game loop on the server
    // thegame.gamecore.update( new Date().getTime() );

    //tell the player that they are now the host
    //s=server message, h=you are hosting

    //player.send('s.h.'+ String(thegame.gamecore.local_time).replace('.','-'));
    player.emit('notification', {message: 'You are hosting a game'});

    player.game = thegame;
    player.hosting = true;
        
    this.log('User "' + player.username + '" created a game with id ' + player.game.id);

    //return it

    return thegame;
}; 

lobby.findGame = function(player, gameType) {
    this.log('User: "' + player.username + '" is looking for a game, game count: ' + this.game_count);
    this.log('GameType: "' + gameType);

    if(gameType != 'private' && this.game_count) {
        var inGame = false;

        //Check the list of games for an open game
        for(var gameid in this.games) {
            //only care about our own properties.
            if(!this.games.hasOwnProperty(gameid)){
                continue;
            }

            //get the game we are checking against
            var game_instance = this.games[gameid];

            //If the game is a player short
            if(game_instance.game_type == gameType && game_instance.player_count < 2) {
                //someone wants us to join!
                inGame = true;
                //increase the player count and store
                //the player as the client of this game
                game_instance.player_client = player;
                game_instance.gamecore.players.other = player;
                game_instance.player_count++;

                //start running the game on the server,
                //which will tell them to respawn/start
                this.startGame(game_instance);
            } 
            //if less than 2 players
        } 
        //for all games
        //now if we didn't join a game,
        //we must create one
        if(!inGame) {
            this.createGame(player, gameType);
        } //if no join already
    } else { //if there are any games at all
        //no games? create one!
        
        this.createGame(player, gameType);
    }
}; //game_server.findGame

lobby.endGame = function(gameid, username) {

        var thegame = this.games[gameid];

        if(thegame) {

                //stop the game updates immediate
            //thegame.gamecore.stop_update();

            if(thegame.player_host){
                delete thegame.player_host.game;
                thegame.player_host.game = null;
                thegame.player_host.emit('game_ended', {msg: 'Game ended, player: "' + username + '" disconected'})
            }

            if(thegame.player_client){
                delete thegame.player_client.game;
                thegame.player_client.game = null;
                thegame.player_client.emit('game_ended', {msg: 'Game ended, player: "' + username + '" disconected'})
            }

            thegame.gamecore.sopAndDestroy();

            thegame.gamecore.players.other = null;
            thegame.gamecore.players.self = null;

            delete thegame.gamecore.players.other;
            delete thegame.gamecore.players.self;
            
            delete this.games[gameid];
            this.game_count--;

            this.log('game removed. there are now ' + this.game_count + ' games' );

        } else {
            this.log('that game was not found!');
        }
};

lobby.stopMatching = function(gameid, username) {

        var thegame = this.games[gameid];
        //TODO: DONT KNOW WHATS NEEDED HERE WHATS NOT
        if(thegame) {

            if(thegame.player_host){
                delete thegame.player_host.game;
                thegame.player_host.game = null;
                thegame.player_host.emit('matchmaking_canceled', {msg: 'Game ended, player: "' + username + '" disconected'})
            }

            if(thegame.player_client){
                delete thegame.player_client.game;
                thegame.player_client.game = null;
                thegame.player_client.emit('matchmaking_canceled', {msg: 'Game ended, player: "' + username + '" disconected'})
            }

            thegame.gamecore.players.other = null;
            thegame.gamecore.players.self = null;

            delete thegame.gamecore.players.other;
            delete thegame.gamecore.players.self;
            
            delete this.games[gameid];
            this.game_count--;

            this.log('game removed. there are now ' + this.game_count + ' games' );

        } else {
            this.log('that game was not found!');
        }
};