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


exports.create = function(req, res) {
    var Tournament = require('../models/tournament.js');

    var newTournament = new Tournament(req.body);

    newTournament.save(function(err, tournament) {
        if (err){
            res.send(err);
        } else {
            res.json(tournament);
        }
    });
};