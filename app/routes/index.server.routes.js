module.exports = function(app) {
    var index = require('../controllers/index.server.controller');
    var Player = require('../models/player.js');

    app.use(function(req,res,next){
        next();
    });

    app.route('/players')

    // get all the players (accessed at GET http://localhost:1337/players)
    .get(function(req, res) {
        Player.find(function(err, players) {
            if (err){
                res.send(err);
            } else {
                res.json(players);
            }
        });
    });

    app.route('/players/:player_id')

    // get the bear with that id (accessed at GET http://localhost:1337/players/:player_id)
    .get(function(req, res) {
        Player.findOne({"id":req.params.player_id}, function(err, player) {
            if (err) {
                res.send(err);
            } else {
                res.json(player);
            }
        });
    });



    app.route('/test')

        .get(index.render);
};