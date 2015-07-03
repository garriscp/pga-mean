var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var PlayerSchema   = new Schema({
    name: String,
    id: String
});

module.exports = mongoose.model('Player', PlayerSchema);
