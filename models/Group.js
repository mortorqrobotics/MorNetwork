"use strict";

module.exports = function(mongoose) {
    
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
    
    groupSchema.pre("save", function(next) {
	    let now = new Date();
		this.updated_at = now;
		if ( !this.created_at ) {
			this.created_at = now;
		}
		next();
	});
    
    let Group = mongoose.model("Group", groupSchema);
    
    return Group;
    
};

