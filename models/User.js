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
		subdivisions: [{ // this whole thing is going to get changed soon
			_id: { type: ObjectId, ref: "Subdivision" },
			team: String, // TODO: get rid of this; it is unnecessary
			accepted: Boolean
		}],
		team: { type: ObjectId, ref: "Team" },
		position: {
			type: String,
			enum: ["member", "leader", "mentor", "admin"]
		},
		scoutCaptain: { type: Boolean, default: false },
		bannedFromTeams: { type: [{ type: ObjectId, ref: "Team" }], default: [] }
	});

	userSchema.pre("save", function(next) {
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

	userSchema.path("position").set(function(newVal) {
		let user = this;
		var orignalVal = user.position;
		user.oldPosition = user.position;
	});//TODO: does this have to set the new value??????????????

	userSchema.pre("save", Promise.coroutine(function*(next) {
	    let user = this;

	    if (!user.isModified("position")) return next();

	    if (user.oldPosition) {
	    	let positionGroup = require("./additionGroup");
	    	let group = yield positionGroup.findOne({
	    		position: user.oldPosition,
	    		team: user.team
	    	});
	    	if (group) {
	    		group.updateMembers();
	    	}
	    }
	    if (user.position) { // TODO: needs refactoring
	    	let positionGroup = require("./additionGroup");
	    	let group = yield positionGroup.findOne({
	    		position: user.position,
	    		team: user.team
	    	});
	    	if (group) {
	    		group.updateMembers();
	    	}
	    }
	    next();
	}));

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
