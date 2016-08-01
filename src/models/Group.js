"use strict";

let mongoose = require("mongoose");
let Promise = require("bluebird");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;

let groupSchema = new Schema({
    members: [{
        type: ObjectId,
        ref: "User",
    }],
    dependentGroups: [{
        type: ObjectId,
        ref: "NormalGroup",
    }],
});

/*
   important info (idk where else to put it)
   updateMembers() does not save the group automatically
   so always call save() after updateMembers() if necessary
   is it ok for updateMembers() to automatically call save()?
   I am not sure, but if it is possible, it should be done
*/

groupSchema.methods.updateDependentsMembers = function() {
    return Promise.all(this.dependentGroups.map(Promise.coroutine(function*(dependent) {
        if (!dependent._id) {
            dependent = yield Group.findOne({
                _id: dependent
            });
        }
        yield dependent.updateMembers();
        yield dependent.save();
    })));
};

groupSchema.pre("save", function(next) {

    if (this.__t) {
        return next();
    }

    // __t is not defined for generic groups
    // a generic group should never be created, so it should not be saved
    throw new Error("A generic group document should never be created.");
    // I do not think this error will actually do anything though

});

let Group = mongoose.model("Group", groupSchema);

module.exports = Group;
