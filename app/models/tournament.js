var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var TournamentSchema   = new Schema({
    eaglePrice: Number,
    trashHoles: Array,
    trashPrice: Number,
    flightPayouts: Array,
    parOrWorsePayouts: Array,
    parOrWorsePayoutsAnti: Array,
    tournamentCode: String,
    teams: [
        { user_id: String, players: Array }
    ],
    name: String
});

module.exports = mongoose.model('Tournament', TournamentSchema);