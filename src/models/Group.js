"use strict";

module.exports = function() {

    let mongoose = require("mongoose");
    let Promise = require("bluebird");
    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;

    let groupSchema = new Schema({
        members: {
            type: [{
                type: ObjectId,
                ref: "User"
            }],
            required: true
        },
        dependentGroups: {
            type: [{
                type: ObjectId,
                ref: "Group"
            }],
            required: true
        }
    });

    groupSchema.methods.updateDependentsMembers = Promise.coroutine(function*() {
        let group = this;
        for (let dependent of group.dependentGroups) {
            yield dependent.updateMembers();
        }
    });

    groupSchema.pre("save", function(next) {
        if (this.__t) {
            return next();
        }

        // __t is not defined for generic groups
        // a generic group should never be created, so it should not be saved
        throw new Error("A generic group document should never be created.");

    });

    let Group = mongoose.model("Group", groupSchema);

    return Group;

};
