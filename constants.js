exports.Server = {
    Port: 3003
};

exports.DataBase = {
    Adress: 'mongodb://localhost/users',
    MinUserNameLenght: 3,
    MinPassLenght: 4
};

exports.UnitTypes = {
    Pleb: {name: 'Pleb', type: 'ground', damage: 10, armor: 10, movementSpeed: 60},
    RangedPleb: {name: 'RangedPleb', type: 'ranged', damage: 8, armor: 5, movementSpeed: 60}
};

exports.BuildingTypes = {
    PlebHut : {name: 'PlebHut', cost: 2, hframe: 56, oframe: 57, life: 200, armor: 20, buildTime: 10, unitType: 'Pleb'},
    OtherHut : {name: 'OtherHut', cost: 5, hframe: 58, oframe: 59, life: 500, armor: 20, buildTime: 15, unitType: 'RangedPleb'}
};