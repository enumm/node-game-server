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
                if(item.kill && item.sell){
                    ourData.money += c.BuildingTypes[item.buildingType].cost/2;
                }

                el.kill = item.kill;
                el.producing = item.producing;
            }
        });
    });
};


game_core.prototype.addUnit = function(host, buildingType){
    // this.players.self.emit('hello', {msg:'adding unit: ' + c.BuildingTypes[buildingType].unitType});

    // var tilePos = assets.screenToMap(this.x, this.y);
    //         var unitTilePos = assets.getFreeTilePOS(tilePos[0], tilePos[1], gameInstanceScreen.connectionData.host, this.ours);
    //         if(unitTilePos){
    //             var unitPos = assets.mapToScreen(unitTilePos[0], unitTilePos[1]);


    // var unit = {
    //     name: host ? 'hunit' + this.hostData.unitCount++: 'ounit' + this.guestData.unitCount++,
    //     x: unitPos[0],
    //     y: unitPos[1],
    //     unitType: BuildingTypes[this.buildingType].unitType
    // }


};






game_core.prototype.update_physics = function() {
    var outer = this;
    //simple money update 
    this.moneyUpdateTimer +=   this._pdt;

    if(this.moneyUpdateTimer >= 10)
    {
        this.hostData.money += 5;
        this.guestData.money += 5;
        this.moneyUpdateTimer  = 0;
    }

    //building units update
    this.hostData.buildings.forEach(function(el){
        if(el.producing && !el.kill){
            el.productionTimer +=  outer._pdt;

            if(el.productionTimer >= c.BuildingTypes[el.buildingType].buildTime){
                el.productionTimer = 0;
                outer.addUnit(true, el);
            }
        }else{
            el.productionTimer = 0;
        }
    });

    this.guestData.buildings.forEach(function(el){
        if(el.producing && !el.kill){
            el.productionTimer +=  outer._pdt;

            if(el.productionTimer >= c.BuildingTypes[el.buildingType].buildTime){
                el.productionTimer = 0;
                outer.addUnit(false, el);
            }
        }else{
            el.productionTimer = 0;
        }
    });

    //send data 
    if(this.updateRequired){
        
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



//tile height 64
//tilewidth 128
//helper functions
game_core.prototype.mapToScreen = function(x, y ){
    return [x * 64 - y * 64, y * 32 + x * 32];
};

game_core.prototype.screenToMap = function(x, y ){
    mapx = (x / 128 + y / 64);
    mapy = (y / 64 - (x / 128));
    return([mapx, mapy])
};

game_core.prototype.getFreeTilePOS =  function(tX, tY, host){
    var matrix = assets.getMapMatrix(host);
    //todo: review possitions...
    if(host){
        if(matrix[tY][tX + 1] == 0) return [tX + 1, tY];
        if(matrix[tY -1][tX] == 0) return [tX, tY - 1];
        if(matrix[tY + 1][tX] == 0) return [tX, tY + 1];
        if(matrix[tY][tX - 1] == 0) return [tX - 1, tY];    
    }else{
        if(matrix[tY + 1][tX] == 0) return [tX, tY + 1];
        if(matrix[tY][tX - 1] == 0) return [tX - 1, tY];
        if(matrix[tY][tX + 1] == 0) return [tX + 1, tY];
        if(matrix[tY -1 ][tX] == 0) return [tX, tY - 1];   
    }
    
    return null;
};

o.getMapMatrix = function(host){
    var mapMatrix = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
    [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
    [0,0,0,0,0,0,1,1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0,0],
    [0,0,0,0,0,1,1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,1,1,0,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];
    
    if(host){
        for (var i = 0, len = this.hostData.buildings.length; i < len; i++) {
            var pos = assets.screenToMap(this.hostData.buildings[i].x, this.hostData.buildings[i].y);
            mapMatrix[pos[1]][pos[0]] = 1; 
        }
    }else{
        for (var i = 0, len = this.guestData.buildings.length; i < len; i++) {
            var pos = assets.screenToMap(this.guestData.buildings[i].x, this.guestData.buildings[i].y);
            mapMatrix[pos[1]][pos[0]] = 1; 
        }
    }

    return mapMatrix;
};