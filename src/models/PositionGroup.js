"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let User = require("./User");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

let positionGroupSchema = new Schema({

    position: {
        type: String,
        enum: ["member", "leader", "mentor", "admin"],
        required: true
    },

    team: {
        type: ObjectId,
        ref: "Team",
        required: true
    }
});

positionGroupSchema.methods.updateMembers = Promise.coroutine(function*() {
    let group = this;

    try {
        group.members = yield User.find({
            team: group.team,
            position: group.position
        });
        yield group.updateDependentsMembers();
    } catch (err) {
        console.error(err);
    }
    // TODO: should these all call this.save?
});

let PositionGroup = Group.discriminator("PositionGroup", positionGroupSchema);

return PositionGroup;
