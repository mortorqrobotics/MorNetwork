"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");
let Group = require("./Group");

let allTeamGroupSchema = new Schema({
    team: {
        type: ObjectId,
        ref: "Team",
        required: true
    }
});

allTeamGroupSchema.methods.updateMembers = Promise.coroutine(function*() {
    try {

        // I tried importing User at the top
        // but it is a circular dependency
        this.members = (yield require("./User").find({
            team: this.team
        })).map(user => user._id);

        yield this.updateDependentsMembers();

    } catch (err) {
        console.error(err);
    }
});

let AllTeamGroup = Group.discriminator("AllTeamGroup", allTeamGroupSchema);

module.exports = AllTeamGroup;
