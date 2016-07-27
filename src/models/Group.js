"use strict";

let mongoose = require("mongoose");
let Promise = require("bluebird");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;

let groupSchema = new Schema({
    members: [{
        type: ObjectId,
        ref: "User"
    }],
    dependentGroups: [{
        type: ObjectId,
        ref: "Group" // TODO: should this be normalgroup?
    }],
});

groupSchema.methods.updateDependentsMembers = Promise.coroutine(function*() {
    // TODO: this assumes dependentGroups is populated
    // check if it is populated and if not do something else
    for (let dependent of this.dependentGroups) {
        yield dependent.updateMembers();
        yield dependent.save();
    }
});

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
