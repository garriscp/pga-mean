exports.render = function(req, res) {

    var Tournament = require('../models/tournament.js');
    Tournament.find(function(err, tournaments) {
        if (err){
            res.send(err);
        } else {
            res.json(tournaments);
        }
    });

};