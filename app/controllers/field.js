exports.render = function(req,res) {
    var request = require("request");
    var fs = require("fs");
    var Player = require('../models/player.js');

    request("http://www.pgatour.com/data/r/" + req.params.tournament_id + "/2015/field.json", function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(response);
            var fieldJson = JSON.parse(body);
            var revisedField = [];
            for (var i = 0; i < fieldJson.Tournament.Players.length; i++) {
                revisedField.push({
                    "name": fieldJson.Tournament.Players[i].PlayerName,
                    "id": fieldJson.Tournament.Players[i].TournamentPlayerId,
                });
            }
            /*var field = utility.unescapeQuotes(JSON.stringify(revisedField, null, 4));
            fs.writeFile("./app/models/field.json", field, function(err) {
                if(err) {
                    console.log(err);
                } else {
                    console.log("JSON saved");
                }
            });*/
            //res.json(revisedField);
            Player.create(revisedField, function (err, field) {
                if (err) {
                    res.status(500).send("error importing data");
                } else {
                    res.json(field);
                }
            });
        } else {
            res.status(500).send("Error connecting to the pga field data");
        }
    });

    var utility = {
        unescapeQuotes: function(string) {
            return string.replace(/\\"/g, '"');
        }
    };
};