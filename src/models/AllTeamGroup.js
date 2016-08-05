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
        required: true,
    },
});

allTeamGroupSchema.methods.updateMembers = Promise.coroutine(function*() {

    // I tried importing User at the top
    // but it is a circular dependency
    let allUsers = yield require("./User").find();
    for (let user of allUsers) {
        let index = user.groups.indexOf(this._id);
        let hasGroup = index != -1;
        let needsGroup = user.team && user.team.toString() == this.team.toString();
        if (!hasGroup && needsGroup) {
            user.groups.push(this._id);
            yield user.save();
        } else if (hasGroup && !needsGroup) {
            user.groups.splice(index, 1);
            yield user.save();
        }
    }

    yield this.updateDependentsMembers();

});

let AllTeamGroup = Group.discriminator("AllTeamGroup", allTeamGroupSchema);

module.exports = AllTeamGroup;
