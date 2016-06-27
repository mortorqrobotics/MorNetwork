"use strict";

module.exports = function(mongoose) {

	let ObjectId = Schema.Types.ObjectId;
	let Shema = mongoose.Schema;
	let Promise = require("bluebird");

	let allTeamGroupSchema = new Schema({
		team: { type: ObjectId, ref: "Team" }
	});

	allTeamGroupSchema.methods.updateMembers = Promise.coroutine(function*() {
		let group = this;
		try {
			let group.members = yield User.find({
				team: this.team
			});
			this.updateDependence;
		} catch(err) {
			console.error(err);
		}
	});

	let AllTeamGroup = Group.discriminator("AllTeamGroup", allTeamGroupSchema);

	return AllTeamGroup;

};
