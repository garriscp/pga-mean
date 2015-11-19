var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var TournamentSchema   = new Schema({
    eaglePrice: Number,
    trashHoles: Array,
    trashPrice: Number,
    flightPayouts: Array,
    parOrWorsePayouts: Array,
    parOrWorsePayoutsAnti: Array,
    heaterPayouts: Array,
    tournamentCode: String,
    teams: [
        { user_id: String, players: Array }
    ],
    name: String,
    lowRoundPrice: Number
});

module.exports = mongoose.model('Tournament', TournamentSchema);