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
    
    c = require('./constants');

    //Start a physics loop, this is separate to the rendering
    //as this happens at a fixed frequency
    this.create_physics_simulation();
    //Start a fast paced timer for measuring time easier
    this.create_timer();
    this.server_time = 0;
    this.laststate = {};

    this.started = false;
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
    this.lastframetime = t;
    this.server_update();
};

game_core.prototype.create_timer = function(){
    setInterval(function(){
        this._dt = new Date().getTime() - this._dte;
        this._dte = new Date().getTime();
        this.local_time += this._dt/1000.0;
    }.bind(this), 4);
};

game_core.prototype.create_physics_simulation = function() {
    setInterval(function(){
        this._pdt = (new Date().getTime() - this._pdte)/1000.0;
        this._pdte = new Date().getTime();
        if(this.started){
            this.update_physics();
        }
    }.bind(this), 15);
};

game_core.prototype.server_update = function(){
    this.server_time = this.local_time;

    this.hostData = {money: 5, castleHp: 1000, buildings: [], units: [], buildingCount: 0, unitCount: 0};
    this.guestData = {money: 5, castleHp: 1000, buildings: [], units: [], buildingCount: 0, unitCount: 0};
    this.moneyUpdateTimer = 0;

    if(this.players.self) {
        this.players.self.emit('hello', {msg:'Starting server game loop'});
    }

    if(this.players.other) {
        this.players.other.emit('hello', {msg:'Starting server game loop'});
    }

    this.started = true;
};

game_core.prototype.handle_server_input = function(client, message){
    if(client.hosting){
        this.verifyData(this.hostData, message);
    }else{
        this.verifyData(this.guestData, message);
    }

    this.updateRequired = true;
};









game_core.prototype.verifyData = function( ourData , clientData) {
    clientData.buildings.forEach(function(item) {
        if(!item.old){
            if(c.BuildingTypes[item.buildingType]){
                if(clientData.money >= c.BuildingTypes[item.buildingType].cost && ourData.money >= c.BuildingTypes[item.buildingType].cost){
                    item.old = true;
                    item.productionTimer = 0;
                    item.hp = c.BuildingTypes[item.buildingType].life;
                    //item.unitType = c.BuildingTypes[item.buildingType].unitType;
                    
                    ourData.buildings.push(item);
                    ourData.buildingCount++;
                    clientData.money -= c.BuildingTypes[item.buildingType].cost;
                    ourData.money -= c.BuildingTypes[item.buildingType].cost;
                }
            }
        }
        ourData.buildings.forEach(function(el){
            if(el.name == item.name){
                el.kill = item.kill;
                el.producing = item.producing;
            }
        });
    });
};






game_core.prototype.update_physics = function() {
    var outer = this;
    var sendmsg = false;

    //simple money update 
    this.moneyUpdateTimer +=   this._pdt;

    if(this.moneyUpdateTimer >= 10)
    {
        this.hostData.money += 5;
        this.guestData.money += 5;
        this.moneyUpdateTimer  = 0;
    }

    //building units update
    // this.hostData.buildings.forEach(function(el){
    //     if(el.producing && !el.kill){
    //         el.productionTimer +=  outer._pdt;

    //         if(el.productionTimer >= el.buildingType.buildTime){
    //             el.productionTimer = 0;
    //             sendmsg = true;
                
    //             outer.hostData.units.push({name: 'hunit' + outer.hostData.unitCount});
    //             outer.hostData.unitCount++;
    //         }
    //     }else{
    //         el.productionTimer = 0;
    //     }
    // });

    // this.guestData.buildings.forEach(function(el){
    //     if(el.producing && !el.kill){
    //         el.productionTimer += delta;

    //         if(el.productionTimer >= el.buildingType.buildTime){
    //             el.productionTimer = 0;
    //             sendmsg = true;

    //             outer.guestData.units.push({name: 'hunit' + outer.guestData.unitCount});
    //             outer.guestData.unitCount++;
    //         }
    //     }else{
    //         el.productionTimer = 0;
    //     }
    // });

    //send data 
    if(this.updateRequired || sendmsg){
        
        //Send the snapshot to the 'host' player
        if(this.players.self) {
            this.players.self.emit('message', this.hostData, this.guestData);
        }

        //Send the snapshot to the 'client' player
        if(this.players.other) {
            this.players.other.emit('message', this.guestData, this.hostData);
        }

        this.updateRequired = false;
    }
};

