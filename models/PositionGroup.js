"use strict";

module.exports = function() {

	let mongoose = require("mongoose");
	let Group = require("./Group");
	let User = require("./User");
	let Schema = mongoose.Schema;
	let ObjectId = Schema.Types.ObjectId;
	let Promise = require("bluebird");

	let positionGroupSchema = new Schema({

		position: [{
			type: String,
			enum: ["member", "leader", "mentor", "admin"]
		}],

		team: [{ type: ObjectId, ref: "Team" }]
	});

	Schema.methods.updateMembers = Promise.coroutine(function*() {
		let group = this;

		try {
			group.members = yield User.find({
				team: group.team,
				position: group.position
			});
			group.updateDependents();
		} catch(err) {
			console.error(err);
		}

	});

	let PositionGroup = Group.discriminator("PositionGroup", positionGroupSchema);

	return PositionGroup;

};
