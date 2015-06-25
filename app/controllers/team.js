exports.render = function(req, res) {

    var Player = require('../models/player.js');
    var User = require('../models/user.js');

    var tournamentJSON = require("../models/travelersInsurance.json"),
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
            "tross": 0,
            "rnds": [],
            "others": []
        };
        for (var i = 0; i < rounds; i++) {
            data.rnds.push({
                "eagles": 0,
                "trashBirdies": 0,
                "tross": 0,
                "score": 0,
                "lowRound": false,
                "others": []
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
                            //have you finished this hole yet? if you haven't, you wont have a score yet
                            if (scorecard.p.rnds[i].holes[n].sc !== "") {
                                //is first hole of round? needs special logic
                                if (scorecard.p.rnds[i].holes[n].n == "1") {
                                    //did you eagle the first hole?
                                    if (scorecard.p.rnds[i].holes[n].pDay == "-3") {
                                        //nice albatross guy
                                        data.rnds[i].tross++;
                                        data.tross++;
                                    } else if (scorecard.p.rnds[i].holes[n].pDay == "-2") {
                                        data.rnds[i].eagles++;
                                        data.eagles++;
                                        //did you birdie a trash hole
                                    } else if (isTrashHole(scorecard.p.rnds[i].holes[n].n)) {
                                        if (scorecard.p.rnds[i].holes[n].pDay == "-1") {
                                            data.rnds[i].trashBirdies++;
                                            data.trashBirdies++;
                                        }
                                    } else if (Number(scorecard.p.rnds[i].holes[n].pDay) >= 2) {
                                        //looks like double bogey or worse
                                        data.rnds[i].others.push(Number(scorecard.p.rnds[i].holes[n].pDay));
                                        data.others.push(Number(scorecard.p.rnds[i].holes[n].pDay));
                                    }
                                } else {
                                    if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -3) {
                                        //nice albatross guy
                                        data.rnds[i].tross++;
                                        data.tross++;
                                    } else if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -2) {
                                        //did you eagle - your current round score minus previous hole's current round score is -2 or less?
                                        data.rnds[i].eagles++;
                                        data.eagles++;
                                    } else if (isTrashHole(scorecard.p.rnds[i].holes[n].n)) {
                                        if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -1) {
                                            data.rnds[i].trashBirdies++;
                                            data.trashBirdies++;
                                        }
                                    } else if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) >= 2) {
                                        //looks like double bogey or worse
                                        data.rnds[i].others.push(Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)));
                                        data.others.push(Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)));
                                    }
                                }
                                //if final hole, set your final score for the round
                                if (scorecard.p.rnds[i].holes[n].n == "18") {
                                    data.rnds[i].score = scorecard.p.rnds[i].holes[n].pDay;
                                }
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

    function getUserFromId(id) {
        return User.findOne({"id":id}).exec();
    }

    function getMoneyEarned(player,isAnti) {
        //any final place trash?
        var money = 0;
        money += player.eagles * tournamentJSON.eaglePrice;
        money += player.trashBirdies * tournamentJSON.trashPrice;
        if (isAnti) {
            //if anti, start with just do the opposite for eagles, trash birdies, and final score
            money *= -1;
            for (var i = 0; i < player.others.length; i++) {
                money += tournamentJSON.parOrWorsePayoutsAnti[player.others[i]];
            }
        } else {
            for (var j = 0; j < player.others.length; j++) {
                money += tournamentJSON.parOrWorsePayouts[player.others[j]];
            }
        }
        money += getFinalScoreMoney(player.position,isAnti);
        return money;
    }

    function getFinalScoreMoney(position,isAnti) {
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
        } else {
            if (isAnti) {
                //if cut and anti - you get 5 bucks
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
                        //get the current score from the leaderboard json - we should rename from final score to current
                        groupsAndScores[i][j].finalScore = leaderboard[0].leaderboard.players[k].total;
                    }
                }
                var isAnti = (j == groupsAndScores[i].length - 1);
                groupsAndScores[i][j].money = getMoneyEarned(groupsAndScores[i][j],isAnti);
            }
        }
        res.json(groupsAndScores);
    });
};