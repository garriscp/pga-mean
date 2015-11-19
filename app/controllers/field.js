exports.render = function(req,res) {
    var request = require("request");
    var fs = require("fs");
    var Player = require('../models/player.js');
    var Q = require("q");

    function updatePlayers() {
        var promises = [];
        return urlPromise("http://www.pgatour.com/data/r/" + req.params.tournament_id + "/2016/field.json");
    }

    function updatePlayer(newPlayer) {
        return Player.findOneAndUpdate(
            { 'id': newPlayer.id },
            { 'id': newPlayer.id, 'name': newPlayer.name },
            { 'upsert': true, 'new': true }
        ).exec();
    }

    function urlPromise(url) {
        var deferred = Q.defer();
        request(url, function (error, response, body) {
            if (!error) {
                var scorecard = JSON.parse(body);
                deferred.resolve(scorecard);
            } else {
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }

    updatePlayers().then(function(fieldJson){
        var promises = [];
        for (var i = 0; i < fieldJson.Tournament.Players.length; i++) {
            var newPlayer = {};
            newPlayer = {
                "name": fieldJson.Tournament.Players[i].PlayerName,
                "id": fieldJson.Tournament.Players[i].TournamentPlayerId,
            };
            var newPromise = updatePlayer(newPlayer);
            promises.push(newPromise);
        }
        Q.all(promises).then(function(data){
            res.json(data);
        },function(err){
            res.json(err);
        });
    });

};