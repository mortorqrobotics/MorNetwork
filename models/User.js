"use strict";

module.exports = function(mongoose) {

	let bcrypt = require("bcrypt");
	let Schema = mongoose.Schema;
	let ObjectId = Schema.Types.ObjectId;
	let Promise = require("bluebird");
	let SALT_WORK_FACTOR = 10;

	function createToken(size) {
		let token = "";
		for (let i = 0; i < size; i++) {
			let rand = Math.floor(Math.random() * 62);
			token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
		}
		return token;
	}

	var userSchema = new Schema({
		username:     { type: String, required: true, unique: true },
		password:     { type: String, required: true, select: false },
		firstname:    { type: String, required: true },
		lastname:     { type: String, required: true },
		email:        { type: String, required: true, unique: true },
		parentEmail:  String,
		phone:        { type: Number, required: true, unique: true },
		created_at:   Date,
		updated_at:   Date,
		profpicpath:  String,
		teams:        [{
			_id: { type: ObjectId, ref: "Team" },
			position: String
		}], // Array of ids of teams of which said user is a member. IMPORTANT: id != _id (for "teams" a non-random id is used as opposed to an _id)
		subdivisions: [{
			_id: { type: ObjectId, ref: "Subdivision" },
			team: String, // TODO: get rid of this; it is unnecessary
			accepted: Boolean
		}],
		current_team: {
			_id: { type: ObjectId, ref: "Team" },
			position: String,
			scoutCaptain: { type: Boolean, default: false }
		},
		bannedFromTeams: [{ type: ObjectId, ref: "Team" }] // Array of ids of teams from which said user is banned
	});

	userSchema.pre("save", function(next){
		if (this.isModified("current_team")) return next();

		let now = new Date();
		this.updated_at = now;
		if ( !this.created_at ) {
			this.created_at = now;
		}
		next();
	});
	userSchema.pre("save", function(next) {
		let user = this;

		if (!user.isModified("password")) return next();

		bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
			if (err) return next(err);

			bcrypt.hash(user.password, salt, function(err, hash) {
				if (err) return next(err);

				user.password = hash;
				next();
			});
		});
	});

	userSchema.methods.comparePassword = function(candidatePassword) {
		let password = this.password;
		return new Promise(function(resolve, reject) { // antipattern but whatever
			bcrypt.compare(candidatePassword, password, function(err, isMatch) {
				if (err) {
					reject(err);
				} else {
					resolve(isMatch);
				}
			});
		});
	};

	// userSchema.methods.assignNewPassword = function(cb) {
	//   var user = this;
	//   var new_password = createToken(8);
	//   bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
	//       if (err) return cb(err, null);
	//       bcrypt.hash(new_password, salt, function(err, hash) {
	//           if (err) return cb(err, null);
	//           user.password = hash;
	//           cb(null, new_password)
	//       });
	//   });
	// }

	userSchema.methods.assignNewPassword = function() {
		let user = this;
		let newPassword = createToken(8);
		user.password = newPassword;
		return Promise.resolve(newPassword);
	};

	let User = mongoose.model("User", userSchema);

	return User;

};
