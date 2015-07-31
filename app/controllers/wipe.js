exports.render = function(req,res) {
    var Player = require('../models/player.js');


    Player.remove({}, function(err) {
        if (err) {
            res.status(500).send("error wiping data before new field import");
        } else {
            res.status(200).send("wiped DB");
        }
    });


};
