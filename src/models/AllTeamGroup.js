"use strict";

let mongoose = require("mongoose");
let ObjectId = Schema.Types.ObjectId;
let Schema = mongoose.Schema;
let Promise = require("bluebird");

let allTeamGroupSchema = new Schema({
    team: {
        type: ObjectId,
        ref: "Team",
        required: true
    }
});

allTeamGroupSchema.methods.updateMembers = Promise.coroutine(function*() {
    let group = this;
    try {
        let group.members = yield User.find({
            team: group.team
        });
        yield group.updateDependentsMembers();
    } catch (err) {
        console.error(err);
    }
});

let AllTeamGroup = Group.discriminator("AllTeamGroup", allTeamGroupSchema);

return AllTeamGroup;
