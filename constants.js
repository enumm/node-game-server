exports.Server = {
    Port: 3003
};

exports.DataBase = {
    Adress: 'mongodb://localhost/users',
    MinUserNameLenght: 3,
    MinPassLenght: 4
};

exports.BuildingTypes = {
    PlebHut : {name: 'PlebHut', cost: 2, hframe: 56, oframe: 57, life: 200},
    OtherHut : {name: 'OtherHut', cost: 5, hframe: 58, oframe: 59, life: 500}
};