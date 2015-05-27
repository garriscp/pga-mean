exports.render = function(req,res) {
    var Player = require('../models/player.js');
    var _und = require("../../node_modules/underscore/underscore-min");

    var tournamentJSON = require("../models/currentTournament.json"),
        Q = require("q"),
        request = require("request");

    function getAllScores(tournament) {
        var flights = getFlightsFromTeams(tournament.teams);
        var promises = [];
        for (var a = 0; a < flights.length; a++) {
            var promise = getFlightScores(flights[a]);
            promises.push(promise);
        }
        return Q.all(promises);
    }

    function getFlightScores(team) {
        var promises = [];
        for (var b = 0; b < team.length; b++) {
            var scorecardURL = "http://www.pgatour.com/data/r/" + tournamentJSON.tournamentCode + "/scorecards/" + team[b] + ".json";
            var promise = requestp(scorecardURL);
            promises.push(promise);
        }
        return Q.all(promises);
    }

    function getBlankGolferData(rounds) {
        var data = {
            "id": "",
            "finalScore": 99,
            "rnds": []
        };
        for (var i = 0; i < rounds; i++) {
            data.rnds.push({
                "score": 0
            })
        }
        return data;
    }

    function requestp(url) {
        var data;
        var deferred = Q.defer();
        request(url, function (error, response, body) {
            if (!error) {

                var scorecard = JSON.parse(body);

                data = getBlankGolferData(scorecard.p.rnds.length);

                getNameFromId(scorecard.p.id).then(function(player){
                    var finalRound = scorecard.p.rnds[scorecard.p.rnds.length - 1];
                    var finalHole = finalRound.holes[finalRound.holes.length - 1];
                    data.finalScore = finalHole.pTot;
                    data.id = scorecard.p.id;
                    data.name = player.name;

                    //loop through each round
                    for (var i = 0; i < scorecard.p.rnds.length; i++) {
                        //loop through each hole of each round to check for birdie or eagle trash
                        data.rnds[i].score = scorecard.p.rnds[i].holes[scorecard.p.rnds[i].holes.length - 1].pDay;
                    }
                    deferred.resolve(data);
                });
            } else {
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }

    function getNameFromId(id) {
        return Player.findOne({"id":id}).exec();
    }

    function getFlightsFromTeams(teams) {
        var flights = [];
        //assume everyone has the same amount of players
        for (var i = 0; i < teams[0].players.length; i++) {
            flights[i] = [];
        }
        for (var j = 0; j < flights.length; j++) {
            for (var n = 0; n < teams.length; n++) {
                flights[j].push(teams[n].players[j])
            }
        }
        return flights;
    }

    function adjustForTies(sortedFlights) {
        _und.each(sortedFlights,function(flight){
            var totalMoney = 0;
            _und.each(flight,function(playerPair){
                totalMoney += Number(playerPair.money);
            });
            _und.each(flight,function(playerPair){
                playerPair.money = (totalMoney / flight.length);
            });
        });
        return _und.sortBy(_und.flatten(_und.values(sortedFlights)), "finalScore");
    }

    getAllScores(tournamentJSON).then(function(groupsAndScores){
        var sortedFlights = [];
        for (var i = 0; i < groupsAndScores.length; i++) {
            for (var n = 0; n < groupsAndScores[i].length; n++) {
                groupsAndScores[i][n].finalScore = parseInt(groupsAndScores[i][n].finalScore);
                groupsAndScores[i][n].userId = tournamentJSON.teams[n].user_id;
            }
            sortedFlights[i] = _und.sortBy( groupsAndScores[i], "finalScore");
            for (var k = 0; k < sortedFlights[i].length; k++) {
                sortedFlights[i][k].money = tournamentJSON.flightPayouts[k];
            }
            sortedFlights[i] = adjustForTies(_und.groupBy(sortedFlights[i],"finalScore"));
        }
        res.json(sortedFlights);
    });
};