"use strict";

module.exports = function() {

	let mongoose = require("mongoose");
	let Promise = require("bluebird");
	let Schema = mongoose.Schema;
	let ObjectId = Schema.Types.ObjectId;

	let groupSchema = new Schema({
		members: { type: [{ type: ObjectId, ref: "User" }], required: true },
		dependentGroups: { type: [{ type: ObjectId, ref: "Group" }], required: true }
	});

	groupSchema.methods.updateDependents = Promise.coroutine(function*() {
		let group = this;
		for (let dependent of group.dependentGroups) {
			yield dependent.updateMembers();
		}
	});

	let Group = mongoose.model("Group", groupSchema);

	return Group;

};
