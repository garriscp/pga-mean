var request = require("request");
var fs = require("fs");

request("http://www.pgatour.com/data/r/034/2015/field.json", function (error, response, body) {
    if (!error) {
        var fieldJson = JSON.parse(body);
        var revisedField = [];
        for (var i = 0; i < fieldJson.Tournament.Players.length; i++) {
            revisedField.push({
                "name": fieldJson.Tournament.Players[i].PlayerName,
                "id": fieldJson.Tournament.Players[i].TournamentPlayerId,
            });
        }
        var field = utility.unescapeQuotes(JSON.stringify(revisedField, null, 4));
        fs.writeFile("./app/models/field.json", field, function(err) {
            if(err) {
                console.log(err);
            } else {
                console.log("JSON saved");
            }
        });
    }
});

var utility = {
    unescapeQuotes: function(string) {
        return string.replace(/\\"/g, '"');
    }
};