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
    try {

        this.members = (yield User.find({
            team: this.team
        })).map(user => user._id);

        yield this.updateDependentsMembers();
    } catch (err) {
        console.error(err);
    }
});

let AllTeamGroup = Group.discriminator("AllTeamGroup", allTeamGroupSchema);

return AllTeamGroup;
