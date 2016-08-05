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
        required: true,
    },
    team: {
        type: ObjectId,
        ref: "Team",
        required: true,
    },
});

positionGroupSchema.methods.updateMembers = Promise.coroutine(function*() {

    // require is here to prevent circular dependency
    let allUsers = yield require("./User").find();
    for (let user of allUsers) {
        let index = user.groups.indexOf(this._id);
        let hasGroup = index != -1;
        let needsGroup = user.team && user.team.toString() == this.team.toString()
            && user.position == this.position;
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

let PositionGroup = Group.discriminator("PositionGroup", positionGroupSchema);

module.exports = PositionGroup;
