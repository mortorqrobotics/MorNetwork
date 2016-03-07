var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var teamSchema = new Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  number:      { type: Number, required: true },
  created_at:  Date,
  updated_at:  Date,
});

teamSchema.pre('save', function(next){
  var now = new Date();
  this.updated_at = now;
  if ( !this.created_at ) {
    this.created_at = now;
  }
  next();
});

module.exports = function(db) {
	var Team = db.model('Team', teamSchema);
	return Team;
};
