"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

let positionGroupSchema = new Schema({

    position: {
        type: String,
        enum: ["member", "leader", "mentor", "alumnus"],
        required: true
    },

    team: {
        type: ObjectId,
        ref: "Team",
        required: true
    }
});

positionGroupSchema.methods.updateMembers = Promise.coroutine(function*() {
    try {

        // require is here to prevent circular dependency
        this.members = (yield require("./User").find({
            team: this.team,
            position: this.position,
        })).map(user => user._id);

        yield this.updateDependentsMembers();
    } catch (err) {
        console.error(err);
    }
    // TODO: should these all call this.save?
});

let PositionGroup = Group.discriminator("PositionGroup", positionGroupSchema);

module.exports = PositionGroup;
