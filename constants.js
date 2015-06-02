exports.Server = {
    Port: 3003
};

exports.CastleHost = {
    x: -1170, 
    y: 1450,
    range: 70
};

exports.CastleOpponent= {
    x: 1200,
    y: 1460,
    range: 70
};


exports.DataBase = {
    Adress: 'mongodb://localhost/users',
    MinUserNameLenght: 3,
    MinPassLenght: 4
};

exports.Races = {
    Plebs: {name :'Plebs', buildings: ['PlebHut','PlebHut2', 'PlebRanger', 'PlebRanger2', 'PlebFlying', 'PlebFlying2']},
    BlaBlas: {name :'BlaBlas', buildings: ['BlaHut','BlaHut2', 'BlaRanger','BlaRanger2', 'BlaFlying','BlaFlying2']}
};

exports.UnitTypes = {
    Pleb: {        name: 'Pleb',       type: 'ground',  damage: 3, armor: 6,  movementSpeed: 50,   life: 50,  attackSpeed: 1,   range: 15},
    Pleb2: {        name: 'Pleb2',      type: 'ground', damage: 5, armor: 10, movementSpeed: 45,  life: 120, attackSpeed: 1,   range: 15},
    RangedPleb: {  name: 'RangedPleb', type: 'ranged',  damage: 10, armor: 5,  movementSpeed: 70,   life: 70,   attackSpeed: 2,   range: 120},
    RangedPleb2: { name: 'RangedPleb2',type: 'ranged',  damage: 15, armor: 7,  movementSpeed: 60,   life: 60,   attackSpeed: 2.5, range: 120},
    FlyingPleb: {  name: 'FlyingPleb', type: 'flying',  damage: 25, armor: 4,  movementSpeed: 75,   life: 75,  attackSpeed: 2,   range: 100},
    FlyingPleb2: { name: 'FlyingPleb2',type: 'flying',  damage: 30, armor: 4,  movementSpeed: 80,  life: 80,   attackSpeed: 2.5,   range: 100},

    Bla: {         name: 'Bla',        type: 'ground', damage: 3, armor: 6, movementSpeed: 50, life: 50, attackSpeed: 1,  range: 15},
    Bla2: {        name: 'Bla2',       type: 'ground', damage: 5, armor: 10, movementSpeed: 45, life: 120, attackSpeed: 1,  range: 15},
    RangedBla: {   name: 'RangedBla',  type: 'ranged', damage: 10, armor: 5, movementSpeed: 70, life: 60,  attackSpeed: 2,  range: 120},
    RangedBla2: {  name: 'RangedBla2', type: 'ranged', damage: 15, armor: 7, movementSpeed: 60, life: 60,  attackSpeed: 2.5,range: 120},
    FlyingBla: {   name: 'FlyingBla',  type: 'flying', damage: 25, armor: 4, movementSpeed: 75, life: 75, attackSpeed: 2,  range: 100},
    FlyingBla2: {  name: 'FlyingBla2', type: 'flying', damage: 30, armor: 4, movementSpeed: 80, life: 80, attackSpeed: 2.5,  range: 100}
};

exports.BuildingTypes = {
    PlebHut : {    name: 'PlebHut',    cost: 5, frame: 3, life: 200, armor: 20, buildTime: 12, unitType: 'Pleb'},
    PlebHut2 : {   name: 'PlebHut2',   cost: 12, frame: 8, life: 200, armor: 20, buildTime: 10, unitType: 'Pleb2'},
    PlebRanger : { name: 'PlebRanger', cost: 10, frame: 2, life: 200, armor: 20, buildTime: 10, unitType: 'RangedPleb'},
    PlebRanger2 : {name: 'PlebRanger2',cost: 20, frame: 7, life: 200, armor: 20, buildTime: 10, unitType: 'RangedPleb2'},
    PlebFlying : { name: 'PlebFlying', cost: 25, frame: 4, life: 200, armor: 20, buildTime: 12, unitType: 'FlyingPleb'},
    PlebFlying2 : {name: 'PlebFlying2',cost: 30, frame: 9, life: 200, armor: 20, buildTime: 14, unitType: 'FlyingPleb2'},

    BlaHut : {     name: 'BlaHut',     cost: 5, frame: 3, life: 200, armor: 20, buildTime: 12, unitType: 'Bla'},
    BlaHut2 : {    name: 'BlaHut2',    cost: 12, frame: 8, life: 200, armor: 20, buildTime: 10, unitType: 'Bla2'},
    BlaRanger : {  name: 'BlaRanger',  cost: 10, frame: 2, life: 200, armor: 20, buildTime: 10, unitType: 'RangedBla'},
    BlaRanger2 : { name: 'BlaRanger2', cost: 20, frame: 7, life: 200, armor: 20, buildTime: 10, unitType: 'RangedBla2'},
    BlaFlying : {  name: 'BlaFlying',  cost: 25, frame: 4, life: 200, armor: 20, buildTime: 12, unitType: 'FlyingBla'},
    BlaFlying2 : { name: 'BlaFlying2', cost: 30, frame: 9, life: 200, armor: 20, buildTime: 14, unitType: 'FlyingBla2'}
};