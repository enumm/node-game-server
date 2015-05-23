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

lobby.createGame = function(player, gameType, friend, sockets, hostStats) {
    //Create a new game instance
    var thegame = {
        id : uuid(),                //generate a new id for the game
        player_host:player,         //so we know who initiated the game
        player_client:null,         //nobody else joined yet, since its new
        player_count:1,             //for simple checking of state
        game_type:gameType,
        host_statistics: hostStats
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

    if(friend && sockets){
        console.log('sending game invite to: ' + friend);
        
        for(var i in sockets){
            if(sockets[i].username == friend)
            {
                thegame.friend = friend;
                sockets[i].emit('game_invite', {user:player.username, gameId: player.game.id});
                break;
            }
        }
    }

    //return it

    return thegame;
}; 

lobby.findGame = function(player, gameType, friend, sockets, statistics) {
    this.log('User: "' + player.username + '" is looking for a game, game count: ' + this.game_count);
    this.log('GameType: "' + gameType + '"');

    if(gameType != 'private' && this.game_count) {
        var inGame = false;
        var iteration = 0;
        var iterationLimitMultiplier = 10;

        while(iteration < this.game_count * iterationLimitMultiplier){
            console.log('MatchMaking Iteration: '+ iteration);
            if(gameType == 'casual'){
            var filteredGames = filterGameType(this.games, gameType);
            }else{
            var filteredGames = filterGames(this.games, statistics, gameType, iteration);    
            }
            
            for(var gameid in filteredGames){
                //get the game we are checking against
                //only care about our own properties.
                if(!filteredGames.hasOwnProperty(gameid)){
                    continue;
                }

                var game_instance = this.games[gameid];
                if(game_instance.player_count < 2){
                    //someone wants us to join!
                    inGame = true;
                    player.hosting = false;
                    game_instance.player_client = player;
                    game_instance.gamecore.players.other = player;
                    game_instance.player_count++;

                    this.startGame(game_instance);
                }
            }
            iteration++;
        }
        if(!inGame){
            this.createGame(player, gameType, null, null, statistics);    
        }

        function filterGameType(games, type){
            var filtered = {};
            
            for(var gameid in games){
                var game_instance = games[gameid];
                if(game_instance.game_type == type){
                    filtered[gameid] = game_instance;
                }
            }
            return filtered;
        }

        function filterStats(games, rank , winRate, iteration){
            var filtered = {};
            var internalIteration = 0;
            
            while(internalIteration < iteration+1){
                for(var gameid in games){
                    var game_instance = games[gameid];
                    // console.log(game_instance.host_statistics.rank +'=='+rank+'+'+internalIteration+'||'+game_instance.host_statistics.rank+'=='+game_instance.host_statistics.rank+'+'+rank+'-'+internalIteration);
                    // var match = game_instance.host_statistics.rank == rank+internalIteration || game_instance.host_statistics.rank == rank-internalIteration;
                    // if(match){
                        // console.log('rank');
                        // console.log('i:' + iteration + ':match');    
                    // }
                    
                    if(game_instance.host_statistics.rank == rank + internalIteration){
                        filtered[gameid] = game_instance;
                    }
                    
                    if(game_instance.host_statistics.rank == rank - internalIteration){
                        filtered[gameid] = game_instance;
                    }
                }
                internalIteration++;
            }
            // console.log('filtering games by winrate: '+winRate);
            filtered = filterWinRate(filtered, winRate, iteration);
            return filtered;
        }

        // function filterRank(games, rank, iteration){
        //     var filtered = {};
        //     var internalIteration = 0;
            
        //     while(internalIteration < iteration+1){
        //         for(var gameid in games){
        //             var game_instance = games[gameid];
        //             console.log(game_instance.host_statistics.rank +'=='+rank+'+'+iteration+'||'+game_instance.host_statistics.rank+'=='+game_instance.host_statistics.rank+'+'+rank+'-'+iteration);
        //             var match = game_instance.host_statistics.rank == rank+iteration || game_instance.host_statistics.rank == rank-iteration;
        //             if(match){
        //                 console.log('rank');
        //                 console.log('i:' + iteration + ':match');    
        //             }
                    
        //             if(game_instance.host_statistics.rank == rank + iteration){
        //                 filtered[gameid] = game_instance;
        //             }
                    
        //             if(game_instance.host_statistics.rank == rank - iteration){
        //                 filtered[gameid] = game_instance;
        //             }
        //         }
        //         internalIteration++;
        //     }
        //     filtered = filterWinRate(filtered, winRate, iteration);
        //     return filtered;
        // }

        function filterWinRate(games, rate, iteration){
            var filtered = {};
            var internalIteration = 0;
            
            while(internalIteration < 50){
                for(var gameid in games){
                    var game_instance = games[gameid];
                    // console.log(game_instance.host_statistics.win_rate +'=='+rate+'+'+internalIteration+'||'+game_instance.host_statistics.win_rate+'=='+game_instance.host_statistics.win_rate+'+'+rate+'-'+internalIteration);
                    var match = game_instance.host_statistics.win_rate == rate + internalIteration || game_instance.host_statistics.win_rate == rate - internalIteration;
                    if(match){
                        console.log('rate');
                        console.log('i:' + iteration + ':match');    
                    }
                    if(game_instance.host_statistics.win_rate == rate + internalIteration){
                        filtered[gameid] = game_instance;
                    }
                    if(game_instance.host_statistics.win_rate == rate - internalIteration){
                        filtered[gameid] = game_instance;
                    }
                }
                internalIteration++;
            }

            return filtered;
        }

        function filterGames(games, statistics, gameType, iteration){
            var rank = statistics.rank;
            var winStreak = statistics.win_streak;
            var winRate = statistics.win_rate;
            var filtered = games;

            filtered = filterGameType(filtered, gameType);
            // console.log('filtering games by rank: '+rank);
            filtered = filterStats(filtered, rank , winRate, iteration);

            return filtered;
        }
        //Oldsen
        // //Check the list of games for an open game
        // for(var gameid in this.games) {
        //     //only care about our own properties.
        //     if(!this.games.hasOwnProperty(gameid)){
        //         continue;
        //     }

        //     //get the game we are checking against
        //     var game_instance = this.games[gameid];

        //     //If the game is a player short
        //     if(game_instance.game_type == gameType && game_instance.player_count < 2) {
        //         //someone wants us to join!
        //         inGame = true;
        //         //increase the player count and store
        //         //the player as the client of this game
        //         player.hosting = false;
        //         game_instance.player_client = player;
        //         game_instance.gamecore.players.other = player;
        //         game_instance.player_count++;

        //         //start running the game on the server,
        //         //which will tell them to respawn/start
        //         this.startGame(game_instance);
        //     }
        //     //if less than 2 players
        // } 
        // //for all games
        // //now if we didn't join a game,
        // //we must create one
        // if(!inGame) {
        //     this.createGame(player, gameType);
        // } //if no join already
        //Oldsen
    } else { //if there are any games at all
        //no games? create one!
        this.createGame(player, gameType, friend, sockets, statistics);
    }
}; //game_server.findGame

lobby.endGame = function(gameid, username, database) {

        var thegame = this.games[gameid];

        if(thegame) {
            if(thegame.player_host){
                delete thegame.player_host.game;
                thegame.player_host.game = null;
                thegame.player_host.emit('game_ended', {msg: 'Game ended, player: "' + username + '" disconected'});

                if(thegame.player_host.username == username){
                    database.update_statistics(false, username, thegame.game_type);     
                }
                else{
                    database.update_statistics(true, thegame.player_host.username, thegame.game_type);  
                }
            }

            if(thegame.player_client){
                delete thegame.player_client.game;
                thegame.player_client.game = null;
                thegame.player_client.emit('game_ended', {msg: 'Game ended, player: "' + username + '" disconected'})

                if(thegame.player_client.username == username){
                    database.update_statistics(false, username, thegame.game_type);     
                }
                else{
                    database.update_statistics(true, thegame.player_client.username, thegame.game_type);  
                }
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

lobby.checkGameStatus = function(gameid, database) {
    var thegame = this.games[gameid];
    if(thegame){
        if(thegame.gamecore.hostData.castleHp <= 0){
            if(thegame.player_host){
                delete thegame.player_host.game;
                thegame.player_host.game = null;
                thegame.player_host.emit('game_ended', {msg: 'you lost omg omg!'});
                database.update_statistics(false,  thegame.player_host.username, thegame.game_type);
            }

            if(thegame.player_client){
                delete thegame.player_client.game;
                thegame.player_client.game = null;
                thegame.player_client.emit('game_ended', {msg: 'you won omg omg!'});
                database.update_statistics(true, thegame.player_client.username, thegame.game_type);  
            }

            thegame.gamecore.sopAndDestroy();

            thegame.gamecore.players.other = null;
            thegame.gamecore.players.self = null;

            delete thegame.gamecore.players.other;
            delete thegame.gamecore.players.self;
            
            delete this.games[gameid];
            this.game_count--;

            this.log('game removed. there are now ' + this.game_count + ' games' );
        }
        if(thegame.gamecore.guestData.castleHp <= 0){
            if(thegame.player_host){
                delete thegame.player_host.game;
                thegame.player_host.game = null;
                thegame.player_host.emit('game_ended', {msg: 'you won omg omg!'});
                database.update_statistics(true,  thegame.player_host.username, thegame.game_type);
            }

            if(thegame.player_client){
                delete thegame.player_client.game;
                thegame.player_client.game = null;
                thegame.player_client.emit('game_ended', {msg: 'you lost omg omg'});
                database.update_statistics(false, thegame.player_client.username, thegame.game_type);
            }

            thegame.gamecore.sopAndDestroy();

            thegame.gamecore.players.other = null;
            thegame.gamecore.players.self = null;

            delete thegame.gamecore.players.other;
            delete thegame.gamecore.players.self;
            
            delete this.games[gameid];
            this.game_count--;

            this.log('game removed. there are now ' + this.game_count + ' games' );
        }
    }else{
        this.log('that game was not found!');
    }
};

lobby.stopMatching = function(gameid, username, clients) {

        var thegame = this.games[gameid];
        //TODO: DONT KNOW WHATS NEEDED HERE WHATS NOT
        if(thegame) {

            if(thegame.friend && clients){
                for(var i in clients){
                    if(clients[i].username == thegame.friend){
                        clients[i].emit('game_invite_revoked');
                        break;
                    }
                }
            }

            if(thegame.player_host){
                delete thegame.player_host.game;
                thegame.player_host.game = null;
                thegame.player_host.emit('matchmaking_canceled', {msg: 'Game ended, player: "' + username + '" disconected'});
            }

            if(thegame.player_client){
                delete thegame.player_client.game;
                thegame.player_client.game = null;
                thegame.player_client.emit('matchmaking_canceled', {msg: 'Game ended, player: "' + username + '" disconected'});
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

lobby.privateGameRejected = function(gameId){

    var thegame = this.games[gameId];
    if(thegame) {
        if(thegame.player_host){
            delete thegame.player_host.game;
            thegame.player_host.game = null;
            thegame.player_host.emit('game_invite_revoked',{});
        }

        if(thegame.player_client){
            delete thegame.player_client.game;
            thegame.player_client.game = null;
            thegame.player_client.emit('game_invite_revoked', {});
        }

        thegame.gamecore.players.other = null;
        thegame.gamecore.players.self = null;

        delete thegame.gamecore.players.other;
        delete thegame.gamecore.players.self;
        
        delete this.games[gameId];
        this.game_count--;

        this.log('game removed. there are now ' + this.game_count + ' games' );

    } else {
        this.log('that game was not found!');
    }
};

lobby.privateGameAccepted = function(player, gameId, race){
    var thegame = this.games[gameId];

    if(thegame) {
        if(thegame.game_type == 'private' && thegame.player_count < 2) {
            player.hosting = false;
            thegame.player_client = player;
            thegame.player_client.race = race;
            thegame.gamecore.players.other = player;
            thegame.player_count++;
            this.startGame(thegame);
        } 
    }
};