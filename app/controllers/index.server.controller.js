exports.render = function(req, res) {

    var Player = require('../models/player.js');

    var tournamentJSON = require("../models/currentTournament.json"),
        Q = require("q"),
        request = require("request");

    function getAllScores(tournament) {
        var promises = [];
        //get overall tournament scorecard and assign to var
        var tournamentPromise = tournamentCardPromise("http://www.pgatour.com/data/r/" + tournament.tournamentCode + "/leaderboard-v2.json");
        promises.push(tournamentPromise);
        for (var a = 0; a < tournament.teams.length; a++) {
            var promise = getTeamScores(tournament.teams[a]);
            promises.push(promise);
        }
        return Q.all(promises);
    }

    function getTeamScores(team) {
        var promises = [];
        for (var b = 0; b < team.players.length; b++) {
            var scorecardURL = "http://www.pgatour.com/data/r/" + tournamentJSON.tournamentCode + "/scorecards/" + team.players[b] + ".json";
            var promise = requestp(scorecardURL);
            promises.push(promise);
        }
        return Q.all(promises);
    }

    function isTrashHole(holeNum) {
        var trashHole = false;
        for (var a = 0; a < tournamentJSON.trashHoles.length; a++) {
            if (Number(holeNum) == Number(tournamentJSON.trashHoles[a])) {
                trashHole = true;
            }
        }
        return trashHole;
    }

    function getBlankGolferData(rounds) {
        var data = {
            "id": "",
            "finalScore": 99,
            "trashBirdies": 0,
            "eagles": 0,
            "rnds": []
        };
        for (var i = 0; i < rounds; i++) {
            data.rnds.push({
                "eagles": 0,
                "trashBirdies": 0,
                "score": 0,
                "lowRound": false
            })
        }
        return data;
    }

    function calcLowRounds(groupsAndScores) {
        //need to figure out a better way here than looping through twice
        var lowScoresPerRound = [99,99,99,99];
        //loop through teams
        for (var i = 0; i < groupsAndScores.length; i++) {
            //and players
            for (var j = 0; j < groupsAndScores[i].length; j++) {
                //and rounds
                for (var k = 0; k < groupsAndScores[i][j].rnds.length; k++) {
                    if (Number(groupsAndScores[i][j].rnds[k].score) < lowScoresPerRound[k]) {
                        lowScoresPerRound[k] = Number(groupsAndScores[i][j].rnds[k].score);
                    }
                }
            }
        }

        for (var a = 0; a < groupsAndScores.length; a++) {
            //and players
            for (var b = 0; b < groupsAndScores[a].length; b++) {
                //and rounds
                for (var c = 0; c < groupsAndScores[a][b].rnds.length; c++) {
                    if (lowScoresPerRound[c] == Number(groupsAndScores[a][b].rnds[c].score)) {
                        groupsAndScores[a][b].rnds[c].lowRound = true;
                    }
                }
            }
        }
        return groupsAndScores;
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
                        for (var n = 0; n < scorecard.p.rnds[i].holes.length; n++) {
                            //is first hole of round? needs special logic
                            if (scorecard.p.rnds[i].holes[n].n == "1") {
                                //did you eagle the first hole?
                                if (scorecard.p.rnds[i].holes[n].pDay == "-2") {
                                    data.rnds[i].eagles++;
                                    data.eagles++;
                                    //did you birdie a trash hole
                                } else if (isTrashHole(scorecard.p.rnds[i].holes[n].n)) {
                                    if (scorecard.p.rnds[i].holes[n].pDay == "-1") {
                                        data.rnds[i].trashBirdies++;
                                        data.trashBirdies++;
                                    }
                                }
                            } else {
                                //did you eagle - your current round score minus previous hole's current round score is -2 or less?
                                if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -2) {
                                    data.rnds[i].eagles++;
                                    data.eagles++;
                                } else if (isTrashHole(scorecard.p.rnds[i].holes[n].n)) {
                                    if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -1) {
                                        data.rnds[i].trashBirdies++;
                                        data.trashBirdies++;
                                    }
                                }
                            }
                            //if final hole, set your final score for the round
                            if (scorecard.p.rnds[i].holes[n].n == "18") {
                                data.rnds[i].score = scorecard.p.rnds[i].holes[n].pDay;
                            }
                        }
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

    function getMoneyEarned(player) {
        //any final place trash?
        var money = 0;
        money += getFinalScoreMoney(player.position);
        money += player.eagles * tournamentJSON.eaglePrice;
        money += player.trashBirdies * tournamentJSON.trashPrice;
        return money;
    }

    function getFinalScoreMoney(position) {
        var money = 0;
        if (position !== "CUT") {
            //remove T from number if player is tied
            position = position.replace("T","");
            //convert to number
            position = parseInt(position);
            if (position === 1) {
                money = 20;
            } else if (position <= 3) {
                money = 10;
            } else if (position <=10) {
                money = 5;
            }
        }
        return money;
    }

    getAllScores(tournamentJSON).then(function(groupsAndScores){
        //cut the leaderboard object out of the array to be sent to FE
        var leaderboard = groupsAndScores.splice(0,1);

        groupsAndScores = calcLowRounds(groupsAndScores);

        //loop through teams
        for (var i = 0; i < groupsAndScores.length; i++) {
            //and players
            for (var j = 0; j < groupsAndScores[i].length; j++) {
                groupsAndScores[i][j].userId = tournamentJSON.teams[i].user_id;
                //check against players in leaderboard
                for (var k = 0; k < leaderboard[0].leaderboard.players.length; k++) {
                    if (groupsAndScores[i][j].id == leaderboard[0].leaderboard.players[k].player_id) {
                        groupsAndScores[i][j].position = leaderboard[0].leaderboard.players[k].current_position ? leaderboard[0].leaderboard.players[k].current_position : "CUT";
                        groupsAndScores[i][j].money = getMoneyEarned(groupsAndScores[i][j]);
                    }
                }
            }
        }
        res.json(groupsAndScores);
    });
};