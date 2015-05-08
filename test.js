var tournamentJSON = require("./app/models/currentTournament.json"),
    Q = require("q"),
    request = require("request");


// Usage
   /* var a = 0;
    var overallWinner = {
        "id": "",
        "score": 99
    };

    var winners = [];
    promiseWhile(function () { return a < tournamentJSON.groups.length; }, function () {
        for (a = 0; a < tournamentJSON.groups.length; a++) {
            console.log("this is group " + a);
            for (var b = 0; b < tournamentJSON.groups[a].length; b++) {
                var scorecardURL = "http://www.pgatour.com/data/r/" + tournamentJSON.tournamentCode + "/scorecards/" + tournamentJSON.groups[a][b] + ".json";
                request(scorecardURL, function (error, response, body) {
                    if (!error) {
                        var scorecard = JSON.parse(body);
                        var finalRound = scorecard.p.rnds[scorecard.p.rnds.length - 1];
                        var finalHole = finalRound.holes[finalRound.holes.length - 1];
                        var finalScore = finalHole.pTot;
                        console.log("this is player id " + scorecard.p.id);
                        console.log("he shot " + finalScore);
                        if (finalScore < overallWinner.score) {
                            overallWinner.id = scorecard.p.id;
                            overallWinner.score = finalScore;
                        }
                        if (winners.length <= a) {
                            winners.push({
                                "id": scorecard.p.id,
                                "score": finalScore
                            });
                        } else {
                            if (finalScore < winners[a].score) {
                                winners[a].score = finalScore;
                                winners[a].id = scorecard.p.id;
                            }
                        }
                    } else {
                        console.log("We’ve encountered an error: " + error);
                    }
                });
            }
        }
        return Q.delay(500); // arbitrary async
    }).then(function () {
        for (var z = 0; z < winners.length; z++) {
            console.log("group " + z + " was won by " + winners[z].id + " with a score of " + winners[z].score);
        }
        console.log("the whole tournament was won by " + overalWinner.id + " with a final score of " + overalWinner.score);
    }).done();*/

function getAllScores(groups) {
    var promises = [];
    for (var a = 0; a < groups.length; a++) {
        var promise = getGroupScores(groups[a]);
        promises.push(promise);
    }
    return Q.all(promises);
}

function getGroupScores(group) {
    var promises = [];
    for (var b = 0; b < group.length; b++) {
        var scorecardURL = "http://www.pgatour.com/data/r/" + tournamentJSON.tournamentCode + "/scorecards/" + group[b] + ".json";
        var promise = requestp(scorecardURL);
        promises.push(promise);
    }
    return Q.all(promises);
}

function requestp(url) {
    var winners = {
        "id": "",
        "score": 99
    };
    var deferred = Q.defer();
    request(url, function (error, response, body) {
        if (!error) {
            var scorecard = JSON.parse(body);
            var finalRound = scorecard.p.rnds[scorecard.p.rnds.length - 1];
            var finalHole = finalRound.holes[finalRound.holes.length - 1];
            var finalScore = finalHole.pTot;
            winners.score = finalScore;
            winners.id = scorecard.p.id;
            deferred.resolve(winners);
        } else {
            deferred.reject(error);
        }
    });
    return deferred.promise;
}

getAllScores(tournamentJSON.groups).then(function(groupsAndScores){
    var overallWinner = {
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
    }

    logScores(groupWinners,overallWinner);
});

function logScores(groupWinners,overallWinner) {
    for (var i = 0; i < groupWinners.length; i++) {
        console.log("group " + i + " was won by " + groupWinners[i].id + " with a score of " + groupWinners[i].score);
    }
    console.log("the overall was won by " + overallWinner.id + " with a score of " + overallWinner.score);
}