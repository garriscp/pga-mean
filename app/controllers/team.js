exports.render = function(req, res) {

    var Player = require('../models/player.js');
    var User = require('../models/user.js');
    var Tournament = require('../models/tournament.js');

    var _und = require("../../node_modules/underscore/underscore-min");

    var Q = require("q"),
        util = require("util"),
        request = require("request");

    var tournamentJSON = {};

    function getAllScores(tournament) {
        var promises = [];
        //get overall tournament scorecard and assign to var
        var tournamentPromise = tournamentCardPromise("http://www.pgatour.com/data/r/" + tournament.tournamentCode + "/leaderboard-v2.json");
        promises.push(tournamentPromise);
        for (var a = 0; a < tournament.teams.length; a++) {
            var promise = getTeamScores(tournament.teams[a]);
            promises.push(promise);
            var namePromise = getUserFromId(tournament.teams[a].user_id);
            promises.push(namePromise);
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
            "others": [],
            "heaters": [],
            "trains": [],
            "lowRoundCount": 0
        };
        for (var i = 0; i < rounds; i++) {
            data.rnds.push({
                "eagles": 0,
                "trashBirdies": 0,
                "tross": 0,
                "score": 0,
                "lowRound": false,
                "others": [],
                "heaters": [],
                "trains": [],
                "holesPlayed": 0
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
            for (var j = 0; j < groupsAndScores[i].players.length; j++) {
                //and rounds
                for (var k = 0; k < groupsAndScores[i].players[j].rnds.length; k++) {
                    if (Number(groupsAndScores[i].players[j].rnds[k].score) < lowScoresPerRound[k]) {
                        lowScoresPerRound[k] = Number(groupsAndScores[i].players[j].rnds[k].score);
                    }
                }
            }
        }

        for (var a = 0; a < groupsAndScores.length; a++) {
            //and players
            for (var b = 0; b < groupsAndScores[a].players.length; b++) {
                //and rounds
                for (var c = 0; c < groupsAndScores[a].players[b].rnds.length; c++) {
                    if (lowScoresPerRound[c] == Number(groupsAndScores[a].players[b].rnds[c].score)) {
                        groupsAndScores[a].players[b].rnds[c].lowRound = true;
                        //set this round in the user low rounds array to true if at least one of your players achieved low round
                        groupsAndScores[a].lowRounds[c] = true;
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
                                    } else if (Number(scorecard.p.rnds[i].holes[n].pDay) >= 2) {
                                        //looks like double bogey or worse
                                        data.rnds[i].others.push(Number(scorecard.p.rnds[i].holes[n].pDay));
                                        data.others.push(Number(scorecard.p.rnds[i].holes[n].pDay));
                                        //did you birdie a trash hole - make sure to use cNum in case player started on the back 9
                                    } else if (isTrashHole(scorecard.p.rnds[i].holes[n].cNum)) {
                                        if (scorecard.p.rnds[i].holes[n].pDay == "-1") {
                                            data.rnds[i].trashBirdies++;
                                            data.trashBirdies++;
                                        }
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
                                    } else if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)) >= 2) {
                                        //looks like double bogey or worse
                                        data.rnds[i].others.push(Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)));
                                        data.others.push(Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n-1].pDay)));
                                    } else if (isTrashHole(scorecard.p.rnds[i].holes[n].cNum)) {
                                        if (Number(scorecard.p.rnds[i].holes[n].pDay) - Number((scorecard.p.rnds[i].holes[n - 1].pDay)) == -1) {
                                            data.rnds[i].trashBirdies++;
                                            data.trashBirdies++;
                                        }
                                    }
                                }
                                //set your current score
                                data.rnds[i].score = scorecard.p.rnds[i].holes[n].pDay;
                                //you've finished all 18
                                data.rnds[i].holesPlayed = Number(scorecard.p.rnds[i].holes[n].n);
                            } else {
                                //if you haven't finished this hole, then the previous one is your most recently finished
                                data.rnds[i].holesPlayed = Number(scorecard.p.rnds[i].holes[n].n) - 1;
                                //your current score for this round
                                if (n > 0) {
                                    data.rnds[i].score = scorecard.p.rnds[i].holes[n-1].pDay;
                                } else {
                                    //if n is 0, you haven't started round
                                    //current rd score is 0
                                    data.rnds[i].score = 0;
                                }
                                //lets break out of this loop to stop checking each hole - we know this guy hasn't played any more holes
                                break;
                            }
                        }
                        //lets organize a little - go to a new function to calculate heaters and trains
                        data.rnds[i].heaters = getHeatersFromRound(scorecard.p.rnds[i]);
                        data.heaters.push(data.rnds[i].heaters);

                        data.rnds[i].trains = getTrainsFromRound(scorecard.p.rnds[i]);
                        data.trains.push(data.rnds[i].trains);
                    }
                    deferred.resolve(data);
                });
            } else {
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }

    function getHeatersFromRound(round) {

        var heaters = [];
        var potentialHeaterActive = false;
        var potentialHeaterStart = 0;
        var potentialHeaterCars = 0;
        var potentialHeater = [];

        var prevHoleRunningScore = 0;

        for (var n = 0; n < round.holes.length; n++) {

            //first lets calculate previous hole running score, to handle case when its the first hole
            if (round.holes[n].n == "1") {
                prevHoleRunningScore = 0;
            } else {
                prevHoleRunningScore = Number((round.holes[n-1].pDay));
            }

            //is your current hole score at least one less than the hole before?
            if (Number(round.holes[n].pDay) - prevHoleRunningScore <= -1) {
                if (!potentialHeaterActive) {
                    potentialHeaterActive = true;
                    potentialHeaterStart = round.holes[n].n;
                }
                potentialHeaterCars++;
            } else {
                //ok no more birdies - did we have a heater?
                if (potentialHeaterCars >= 3) {
                    for (var i = 0; i < potentialHeaterCars; i++) {
                        //add each hole of your heater to an array
                        potentialHeater.push(Number(potentialHeaterStart) + i);
                    }
                    //add that individual heater array of holes into the big array of heaters
                    heaters.push(potentialHeater);
                }
                //reset the heater vars - we'll start from scratch on the next hole
                potentialHeaterActive = false;
                potentialHeaterStart = 0;
                potentialHeaterCars = 0;
                potentialHeater = [];
            }
        }

        //if we ended on a heater, make sure we add it
        if (potentialHeaterCars >= 3) {
            for (var m = 0; m < potentialHeaterCars; m++) {
                //add each hole of your heater to an array
                potentialHeater.push(Number(potentialHeaterStart) + m);
            }
            //add that individual heater array of holes into the big array of heaters
            heaters.push(potentialHeater);
        }

        return heaters;
    }

    function getTrainsFromRound(round) {

        var trains = [];
        var potentialTrainActive = false;
        var potentialTrainStart = 0;
        var potentialTrainCars = 0;
        var potentialTrain = [];

        var prevHoleRunningScore = 0;

        for (var n = 0; n < round.holes.length; n++) {

            //first lets calculate previous hole running score, to handle case when its the first hole
            if (round.holes[n].n == "1") {
                prevHoleRunningScore = 0;
            } else {
                prevHoleRunningScore = Number((round.holes[n-1].pDay));
            }

            //is your current hole score at least one more than the hole before - you bogeyed?
            if (Number(round.holes[n].pDay) - prevHoleRunningScore >= 1) {
                if (!potentialTrainActive) {
                    potentialTrainActive = true;
                    potentialTrainStart = round.holes[n].n;
                }
                potentialTrainCars++;
            } else {
                //ok no more birdies - did we have a heater?
                if (potentialTrainCars >= 3) {
                    for (var i = 0; i < potentialTrainCars; i++) {
                        //add each hole of your heater to an array
                        potentialTrain.push(Number(potentialTrainStart) + i);
                    }
                    //add that individual heater array of holes into the big array of heaters
                    trains.push(potentialTrain);
                }
                //reset the heater vars - we'll start from scratch on the next hole
                potentialTrainActive = false;
                potentialTrainStart = 0;
                potentialTrainCars = 0;
                potentialTrain = [];
            }
        }

        //if we ended on a heater, make sure we add it
        if (potentialTrainCars >= 3) {
            for (var m = 0; m < potentialTrainCars; m++) {
                //add each hole of your heater to an array
                potentialTrain.push(Number(potentialTrainStart) + m);
            }
            //add that individual heater array of holes into the big array of heaters
            trains.push(potentialTrain);
        }

        return trains;
    }

    function getNameFromId(id) {
        return Player.findOne({"id":id}).exec();
    }

    function getUserFromId(id) {
        return User.findOne({"id":id}).exec();
    }

    function getTournamentFromId(id) {
        return Tournament.findOne({"tournamentCode":id}).exec();
    }

    function getHeaterMoney(heaters) {
        var money = 0;
        //loop through days of heaters
        for (var i = 0; i < heaters.length; i++) {
            //loop through heaters for each day
            for (var j = 0; j < heaters[i].length; j++) {
                money += tournamentJSON.heaterPayouts[heaters[i][j].length];
            }
        }

        return money;
    }

    function getTrainMoney(trains) {
        var money = 0;
        //loop through days of heaters
        for (var i = 0; i < trains.length; i++) {
            //loop through heaters for each day
            for (var j = 0; j < trains[i].length; j++) {
                money += (tournamentJSON.heaterPayouts[trains[i][j].length] * -1);
            }
        }

        return money;
    }

    function extractHeaterArrays(arr) {
        var heaters = 0;
        for (var i = 0; i < arr.length; i++) {
            for (var j = 0; j < arr[i].length; j++) {
                if (arr[i][j].length > 0) {
                    //here we convert from heater arrays to value
                    //a 3 car heater is a single heater, a 4 car heater is the same as 2 3 car heaters, etc.
                    heaters += (arr[i][j].length - 2);
                }
            }
        }
        return heaters;
    }

    function extractOthers(arr, isAnti) {
        var others = 0;
        for (var i = 0; i < arr.length; i++) {
            if (isAnti) {
                if (arr[i] - 2 >= 0) {
                    others -= (arr[i] - 2) + 1;
                }
            } else {
                if (arr[i] - 3 >= 0) {
                    others -= (arr[i] - 3) + 2;
                }
            }
        }
        return others;
    }

    function addFinalPlaceMoney(teams) {
        var totalMoney = 0;
        for (var i = 0; i < teams.length; i++) {
            //and players
            for (var j = 0; j < teams[i].players.length; j++) {
                var isAnti = (i === teams[i].players.length - 1);
                teams[i].tempMoney += getFinalScoreMoney(teams[i].players[j].position, isAnti);
            }
            totalMoney += teams[i].tempMoney;
        }
        for (var k = 0; k < teams.length; k++) {
            teams[k].money += (teams[k].tempMoney * (teams.length - 1)) - (totalMoney - teams[k].tempMoney);
            console.log(teams[k].money);
        }
        return teams;
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

    function setUserNamesToTeams(data) {

        var newData = [];

        for (var i = 0; i < data.length; i++) {
            if (!util.isArray(data[i])) {
                data[i-1].userName = data[i].name;
                //add names, default value for money, and players
                newData.push({
                    "name": data[i].name,
                    "money": 0,
                    "tempMoney": 0,
                    "lowRounds": [false,false,false,false],
                    "players": data[i-1],
                    "userId": data[i].id,
                    "trashBirdies": 0,
                    "eagles": 0,
                    "tross": 0,
                    "heaters": 0,
                    "trains": 0,
                    "others": 0
                })
            }
        }

        return newData;
    }

    function addMoneyToUsers(teams) {
        var totalBirdies = 0,
            totalEagles = 0,
            totalTross = 0,
            totalHeaters = 0,
            totalTrains = 0,
            totalOthers = 0,
            antiFactor = 1;
        var isAnti = false;
        for (var i = 0; i < teams.length; i++) {
            //and players
            for (var j = 0; j < teams[i].players.length; j++) {
                if (j === teams[i].players.length - 1) {
                    //if it's the last player, we are assuming anti
                    antiFactor = -1;
                    isAnti = true;
                } else {
                    antiFactor = 1;
                    isAnti = false;
                }
                //teams[i].money += teams[i].players[j].money;
                teams[i].trashBirdies += teams[i].players[j].trashBirdies * antiFactor;
                teams[i].eagles += teams[i].players[j].eagles * antiFactor;
                teams[i].tross += teams[i].players[j].tross * antiFactor;
                teams[i].heaters += extractHeaterArrays(teams[i].players[j].heaters) * antiFactor;
                teams[i].trains += extractHeaterArrays(teams[i].players[j].trains) * antiFactor;
                teams[i].others += extractOthers(teams[i].players[j].others, isAnti) * antiFactor;
            }
            totalBirdies += teams[i].trashBirdies;
            totalEagles += teams[i].eagles;
            totalTross += teams[i].tross;
            totalHeaters += teams[i].heaters;
            totalTrains += teams[i].trains;
            totalOthers += teams[i].others;
        }
        for (var k = 0; k < teams.length; k++) {
            teams[k].money += (teams[k].trashBirdies * (teams.length - 1) * tournamentJSON.trashPrice) - ((totalBirdies - teams[k].trashBirdies) * tournamentJSON.trashPrice);
            teams[k].money += (teams[k].eagles * (teams.length - 1) * tournamentJSON.eaglePrice) - ((totalEagles - teams[k].eagles) * tournamentJSON.eaglePrice);
            teams[k].money += (teams[k].others * (teams.length - 1) * tournamentJSON.parOrWorsePayoutsAnti[2]) - ((totalOthers - teams[k].others) * tournamentJSON.parOrWorsePayoutsAnti[2]);
            teams[k].money += (teams[k].heaters * (teams.length - 1) * tournamentJSON.heaterPayouts[3]) - ((totalHeaters - teams[k].heaters) * tournamentJSON.heaterPayouts[3]);
            teams[k].money += (teams[k].trains * (teams.length - 1) * tournamentJSON.heaterPayouts[3] * -1) - ((totalTrains - teams[k].trains) * tournamentJSON.heaterPayouts[3] * -1);
        }
        return teams;
    }

    function addLowRoundMoney(teams) {

        var lowRoundCount = [0,0,0,0];
        for (var i = 0; i < teams.length; i++) {
            //and low round array
            for (var j = 0; j < teams[i].lowRounds.length; j++) {
                if (teams[i].lowRounds[j]) {
                    //if you got low round for this round, add one to the total low round count across players
                    lowRoundCount[j]++;
                }
            }
        }
        for (var n = 0; n < teams.length; n++) {
            //and low round array
            for (var m = 0; m < teams[n].lowRounds.length; m++) {
                if (teams[n].lowRounds[m]) {
                    //if you got low round, we'll get the total low round payout and divide it by the number of teams
                    //if you didn't, we'll subtract the individual low round payout from the tournamentJSON
                    //total low round payout would be 15 bucks if there are 4 teams (5 from each player to a single winner in the most common scenario)
                    //first get number of teams that are paying (total teams minus teams splitting the pot) then multiply by low round price for total pot
                    //then divide pot by total number of winners
                    //if two tied for example, there would be 10 bucks available and then each winner would get 5
                    teams[n].money += ((teams.length - lowRoundCount[m]) * tournamentJSON.lowRoundPrice) / lowRoundCount[m];
                } else {
                    teams[n].money -= tournamentJSON.lowRoundPrice;
                }
            }
        }

        return teams;
    }

    function addFlightMoney(teams) {
        var sortedFlights = [];
        var flights = getFlightsFromTeams(teams);

        for (var i = 0; i < flights.length; i++) {
            if (i !== flights.length -1) {
                sortedFlights[i] = _und.sortBy( flights[i], "numericPosition");
            } else {
                //reverse order if we are the last group - assuming antis
                sortedFlights[i] = _und.sortBy( flights[i], "numericPosition").reverse();
            }

            for (var a = 0; a < sortedFlights[i].length; a++) {
                sortedFlights[i][a].money = tournamentJSON.flightPayouts[a];
                //console.log("user " + sortedFlights[i][a].userId + "   should get " + tournamentJSON.flightPayouts[a]);
            }

            sortedFlights[i] = adjustForTies(_und.groupBy(sortedFlights[i],"numericPosition"));

            for (var b = 0; b < sortedFlights[i].length; b++) {

                //we need to loop through original teams array to add the money now
                for (var n = 0; n < teams.length; n++) {
                    if (teams[n].userId === sortedFlights[i][b].userId) {
                        teams[n].money += sortedFlights[i][b].money;
                        console.log("to user " + teams[n].name + " adding " + sortedFlights[i][b].money);
                    }
                }

            }

        }

        return teams;

    }




    /* flight stuff */

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


    /* end flight stuff */

    getTournamentFromId(req.params.tournament_id).then(function(tournament){
        //set tournamentJSON globally so everyone can access
        tournamentJSON = tournament;
        getAllScores(tournament).then(function(groupsAndScores){
            //cut the leaderboard object out of the array to be sent to FE
            var leaderboard = groupsAndScores.splice(0,1);

            groupsAndScores = setUserNamesToTeams(groupsAndScores);

            groupsAndScores = calcLowRounds(groupsAndScores);

            //loop through teams
            for (var i = 0; i < groupsAndScores.length; i++) {
                //and players
                for (var j = 0; j < groupsAndScores[i].players.length; j++) {
                    //add team ID to each user to keep track later
                    groupsAndScores[i].players[j].userId = tournamentJSON.teams[i].user_id;

                    //check against players in leaderboard

                    for (var k = 0; k < leaderboard[0].leaderboard.players.length; k++) {
                        if (groupsAndScores[i].players[j].id == leaderboard[0].leaderboard.players[k].player_id) {
                            groupsAndScores[i].players[j].position = leaderboard[0].leaderboard.players[k].current_position ? leaderboard[0].leaderboard.players[k].current_position : "CUT";
                            //get the current score from the leaderboard json - we should rename from final score to current
                            groupsAndScores[i].players[j].finalScore = leaderboard[0].leaderboard.players[k].total;
                            groupsAndScores[i].players[j].numericPosition = getNumericPosition(groupsAndScores[i].players[j].position,groupsAndScores[i].players[j].finalScore);
                        }
                    }
                    var isAnti = (j == groupsAndScores[i].players.length - 1);
                }


            }
            groupsAndScores = addMoneyToUsers(groupsAndScores);
            groupsAndScores = addFinalPlaceMoney(groupsAndScores);
            //groupsAndScores = addLowRoundMoney(groupsAndScores);
            //groupsAndScores = addFlightMoney(groupsAndScores);
            res.json(groupsAndScores);

        }, function(rejection){
            console.log(rejection);
        });
    });

};