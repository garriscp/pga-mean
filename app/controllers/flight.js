exports.render = function(req,res) {
    var Player = require('../models/player.js');
    var _und = require("../../node_modules/underscore/underscore-min");
    var Tournament = require('../models/tournament.js');

    var Q = require("q"),
        request = require("request");

    var tournamentJSON = {};

    function getAllScores(tournament) {
        var flights = getFlightsFromTeams(tournament.teams);
        var promises = [];
        var tournamentPromise = tournamentCardPromise("http://www.pgatour.com/data/r/" + tournament.tournamentCode + "/leaderboard-v2.json");
        promises.push(tournamentPromise);
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

    function tournamentCardPromise(url) {
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

    function getTournamentFromId(id) {
        return Tournament.findOne({"tournamentCode":id}).exec();
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
        return _und.sortBy(_und.flatten(_und.values(sortedFlights)), "numericPosition");
    }

    function getNumericPosition(position,score) {
        var numericPosition = 0;
        score = Number(score);
        //if CUT - give position of 9999 + final score so that we rank correctly
        //assuming one cut per tournament
        if (position === "CUT") {
            numericPosition = 1000 + score;
        } else {
            //remove T if there for tie, then turn into number
            numericPosition = Number(position.replace("T",""));
        }
        return numericPosition;
    }

    getTournamentFromId(req.params.tournament_id).then(function(tournament){
        //set tournamentJSON globally so everyone can access
        tournamentJSON = tournament;
        getAllScores(tournament).then(function(groupsAndScores){
            //cut the leaderboard object out of the array to be sent to FE
            var leaderboard = groupsAndScores.splice(0,1);

            var sortedFlights = [];
            for (var i = 0; i < groupsAndScores.length; i++) {
                for (var n = 0; n < groupsAndScores[i].length; n++) {
                    groupsAndScores[i][n].finalScore = parseInt(groupsAndScores[i][n].finalScore);
                    groupsAndScores[i][n].userId = tournamentJSON.teams[n].user_id;


                    //add some stuff from the leaderboard json
                    for (var k = 0; k < leaderboard[0].leaderboard.players.length; k++) {
                        if (groupsAndScores[i][n].id == leaderboard[0].leaderboard.players[k].player_id) {
                            groupsAndScores[i][n].position = leaderboard[0].leaderboard.players[k].current_position ? leaderboard[0].leaderboard.players[k].current_position : "CUT";
                            groupsAndScores[i][n].numericPosition = getNumericPosition(groupsAndScores[i][n].position,groupsAndScores[i][n].finalScore);
                        }
                    }
                }
                if (i !== groupsAndScores.length -1) {
                    sortedFlights[i] = _und.sortBy( groupsAndScores[i], "numericPosition");
                } else {
                    //reverse order if we are the last group - assuming antis
                    sortedFlights[i] = _und.sortBy( groupsAndScores[i], "numericPosition").reverse();
                }

                for (var a = 0; a < sortedFlights[i].length; a++) {
                    sortedFlights[i][a].money = tournamentJSON.flightPayouts[a];
                }
                sortedFlights[i] = adjustForTies(_und.groupBy(sortedFlights[i],"numericPosition"));
                if (i === groupsAndScores.length -1) {
                    //reverse order if we are the last group - assuming antis
                    sortedFlights[i] = sortedFlights[i].reverse();
                }
            }
            res.json(sortedFlights);
        });

    });
};