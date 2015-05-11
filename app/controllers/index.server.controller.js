exports.render = function(req, res) {

    var tournamentJSON = require("../models/currentTournament.json"),
        Q = require("q"),
        request = require("request");

    function getAllScores(groups) {
        var promises = [];
        for (var a = 0; a < groups.length; a++) {
            var promise = getTeamScores(groups[a]);
            promises.push(promise);
        }
        return Q.all(promises);
    }

    function getTeamScores(group) {
        var promises = [];
        for (var b = 0; b < group.length; b++) {
            var scorecardURL = "http://www.pgatour.com/data/r/" + tournamentJSON.tournamentCode + "/scorecards/" + group[b] + ".json";
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
            "rnds": []
        };
        for (var i = 0; i < rounds; i++) {
            data.rnds.push({
                "eagles": 0,
                "trashBirdies": 0,
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

                var finalRound = scorecard.p.rnds[scorecard.p.rnds.length - 1];
                var finalHole = finalRound.holes[finalRound.holes.length - 1];
                data.finalScore = finalHole.pTot;
                data.id = scorecard.p.id;
                //loop through each round
                for (var i = 0; i < scorecard.p.rnds.length; i++) {
                    //loop through each hole of each round to check for birdie or eagle trash
                    for (var n = 0; n < scorecard.p.rnds[i].holes.length; n++) {
                        //is first hole of round? needs special logic
                        if (scorecard.p.rnds[i].holes[n].n == "1") {
                            //did you eagle the first hole?
                            if (scorecard.p.rnds[i].holes[n].pDay == "-2") {
                                data.rnds[i].eagles++;
                                //did you birdie a trash hole
                            } else if (isTrashHole(scorecard.p.rnds[i].holes[n].n)) {
                                if (scorecard.p.rnds[i].holes[n].pDay == "-1") {
                                    data.rnds[i].trashBirdies++;
                                }
                            }
                        } else {
                            //did you eagle - your current round score minus previous hole's current round score is -2 or less?
                            if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -2) {
                                data.rnds[i].eagles++;
                            } else if (isTrashHole(scorecard.p.rnds[i].holes[n].n)) {
                                if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) == -1) {
                                    data.rnds[i].trashBirdies++;
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
            } else {
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }

    getAllScores(tournamentJSON.teams).then(function(groupsAndScores){
        /*var overallWinner = {
            "id": "",
            "score": 99
        };
        var groupWinners = [];
        for (var i = 0; i < groupsAndScores.length; i++) {
            //each group
            for (var j = 0; j < groupsAndScores[i].length; j++) {
                //each player in group
                if (j == 0) {
                    //this means this is the first player in this group
                    groupWinners.push({
                        "id": groupsAndScores[i][j].id,
                        "score": Number(groupsAndScores[i][j].score)
                    });
                } else {
                    if (groupWinners[i].score > Number(groupsAndScores[i][j].score)) {
                        groupWinners[i].id = groupsAndScores[i][j].id;
                        groupWinners[i].score = Number(groupsAndScores[i][j].score);
                    }
                }

                //now check if this is overall winner
                if (overallWinner.score > Number(groupsAndScores[i][j].score)) {
                    overallWinner.id = groupsAndScores[i][j].id;
                    overallWinner.score = Number(groupsAndScores[i][j].score);
                }
            }
        }*/

        //logScores(groupWinners,overallWinner);
        res.json(groupsAndScores);
    });

    function logScores(groupWinners,overallWinner) {
        for (var i = 0; i < groupWinners.length; i++) {
            console.log("group " + i + " was won by " + groupWinners[i].id + " with a score of " + groupWinners[i].score);
        }
        console.log("the overall was won by " + overallWinner.id + " with a score of " + overallWinner.score);
    }
};