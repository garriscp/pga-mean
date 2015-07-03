module.exports = function(app) {
    var team = require('../controllers/team');
    var flight = require('../controllers/flight');
    var Player = require('../models/player.js');
    var User = require('../models/user.js');

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


    app.route('/users')

    // get all the users
    .get(function(req, res) {
        User.find(function(err, players) {
            if (err){
                res.send(err);
            } else {
                res.json(players);
            }
        });
    });

    app.route('/users/:user_id')

        // get user with id
        .get(function(req, res) {
            User.findOne({"id":req.params.user_id}, function(err, user) {
                if (err) {
                    res.send(err);
                } else {
                    res.json(user);
                }
            });
        });


    app.route('/team/:tournament_id')

        .get(team.render);

    app.route('/flight/:tournament_id')

        .get(flight.render);

    app.get('/:tournament_id', function(req,res){
        res.sendfile('public/index.html');
    });
};