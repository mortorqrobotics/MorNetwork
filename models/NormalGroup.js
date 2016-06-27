"use strict";

module.exports = function(){

	let mongoose = require("mongoose");
	let Group = require("./Group");
	let Schema = mongoose.Schema;
	let ObjectId = Schema.Types.ObjectId;
	let Promise = require("bluebird");

	let normalGroupSchema = new Schema({
		users: [{ type: ObjectId, ref: "User" }],
		groups: [{ type: ObjectId, ref: "Group" }]
	});

	function removeDuplicates(arr) {
		for (let i = 0; i < arr.length; i++) {
			if (i !== arr.indexOf(arr[i])) {
				arr.splice(i, 1);
				i--;
			}
		}
	}

	normalGroupSchema.methods.updateMembers = Promise.coroutine(function*(){
		let group = this;
		try {
			let userIds = group.users;
			for (let groupId of group.groups) {
				let oneGroup = yield Group.findOne({_id: groupId});
				Array.prototype.push.apply(userIds, oneGroup.members);
			}
			removeDuplicates(userIds);
			group.members = userIds;
			group.updateDependents();
		} catch(err) {
			console.error(err);
		}
	});

	let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

	return NormalGroup;

};
