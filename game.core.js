var game_core = function(game_instance){

    //Store the instance, if any
    this.instance = game_instance;

    this.players = {
        self : this.instance.player_host,
        other : this.instance.player_client
    };

    //Set up some physics integration values
    this._pdt = 0.0001;                 //The physics update delta time
    this._pdte = new Date().getTime();  //The physics update last delta time
        //A local timer for precision on server and client
    this.local_time = 0.016;            //The local timer
    this._dt = new Date().getTime();    //The local timer delta
    this._dte = new Date().getTime();   //The local timer last frame time

    //Start a physics loop, this is separate to the rendering
    //as this happens at a fixed frequency
    this.create_physics_simulation();

    //Start a fast paced timer for measuring time easier
    this.create_timer();

       
    this.server_time = 0;
    this.laststate = {};
};

module.exports = global.game_core = game_core;

 var game_player = function( game_instance, player_instance ) {
    //Store the instance, if any
    this.instance = player_instance;
    this.game = game_instance;

    this.inputs = [];
};

game_core.prototype.update = function(t) {
    
    //Work out the delta time
    this.dt = this.lastframetime ? ( (t - this.lastframetime)/1000.0).fixed() : 0.016;
        //Store the last frame time
    this.lastframetime = t;
    //Update the game specifics
    this.server_update();
    //schedule the next update
    //this.updateid = window.requestAnimationFrame( this.update.bind(this), this.viewport );
}; //game_core.update

game_core.prototype.create_timer = function(){
    setInterval(function(){
        this._dt = new Date().getTime() - this._dte;
        this._dte = new Date().getTime();
        this.local_time += this._dt/1000.0;
    }.bind(this), 4);
}

game_core.prototype.handle_server_input = function(client, message){
    if(client.hosting){
        this.verifyData(this.hostData, message);
        //if(this.verifyData(this.hostData, message)){
            //console.log('<<-----setting host data ' + message.buildings.length);
            //this.hostData  = message;
        //}
    }else{
        //if(this.verifyData(this.guestData, message)){
            this.verifyData(this.guestData, message);
            //console.log('<<-----setting guest data ' + message.buildings.length);
            //this.guestData  = message;
        //}
    }

    this.updateRequired = true;
};

game_core.prototype.verifyData = function(good, fuckingBad) {
    fuckingBad.buildings.forEach(function(item) {
        if(!item.old){
            if(fuckingBad.money >= item.price && good.money >= item.price){
                item.old = true;
                good.buildings.push(item);
                fuckingBad.money -= item.price;
                good.money -= item.price;
            }
        }
    });

    fuckingBad.units.forEach(function(item) {
        if(!item.old){
            item.old = true;
            good.units.push(item);
        }
    });

    if(good.money >= fuckingBad.money){
        return true;
    }else{
        return false;
    }
};

game_core.prototype.create_physics_simulation = function() {
    setInterval(function(){
        this._pdt = (new Date().getTime() - this._pdte)/1000.0;
        this._pdte = new Date().getTime();
        this.update_physics();
    }.bind(this), 15);
};

game_core.prototype.update_physics = function() {
    //this.instance.player_host.emit('hello', {msg:'physics loop'});
    //this.instance.player_client.emit('hello', {msg:'physics loop'});

    this.moneyUpdateTimer +=  this._pdt;
    if(this.moneyUpdateTimer >= 10)
    {
            this.hostData.money += 5;
            this.guestData.money += 5;
            this.moneyUpdateTimer  = 0;
    }

    if(this.updateRequired){
        
        //Send the snapshot to the 'host' player
        if(this.players.self) {
            //console.log('--->sending host data ' + this.hostData.buildings.length);
            this.players.self.emit('message', this.hostData, this.guestData);
        }

        //Send the snapshot to the 'client' player
        if(this.players.other) {
            //console.log('--->sending guest data ' + this.guestData.buildings.length);
            this.players.other.emit('message', this.guestData, this.hostData);
        }

        this.updateRequired = false;
    }
};

game_core.prototype.server_update = function(){

    //Update the state of our local clock to match the timer
    this.server_time = this.local_time;

    this.hostData = {money: 5, buildings: [], units: []};
    this.guestData = {money: 5, buildings: [], units: []};
    this.moneyUpdateTimer = 0;
    //Make a snapshot of the current state, for updating the clients
    // this.laststate = {
    //     hp  : this.players.self.pos,                //'host position', the game creators position
    //     cp  : this.players.other.pos,               //'client position', the person that joined, their position
    //     his : this.players.self.last_input_seq,     //'host input sequence', the last input we processed for the host
    //     cis : this.players.other.last_input_seq,    //'client input sequence', the last input we processed for the client
    //     t   : this.server_time                      // our current local time on the server
    // };

        //Send the snapshot to the 'host' player
    if(this.players.self) {
        this.players.self.emit('hello', {msg:'update loop'});
    }

        //Send the snapshot to the 'client' player
    if(this.players.other) {
        this.players.other.emit('hello', {msg:'update loop'});
    }
}; //game_core.server_update