"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let Promise = require("bluebird");

let coroutine = require("./coroutine");
let AllTeamGroup = require("./AllTeamGroup");
let PositionGroup = require("./PositionGroup");

let teamSchema = new Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    number: {
        type: Number,
        required: true
    },
    currentRegional: {
        type: String,
        required: false
    },
    isPrivate: {
        type: Boolean,
        required: false,
        default: false
    },
    created_at: Date,
    updated_at: Date,
});

teamSchema.pre("save", function(next) {
    let now = new Date();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }

    this.wasNew = this.isNew; // for the post hook

    next();
});

teamSchema.post("save", coroutine(function*() {
    if (!this.wasNew) {
        return;
    }

    try {
        yield AllTeamGroup.create({
            team: this._id,
            members: [],
            dependentGroups: [],
        });
        const positions = ["member", "leader", "mentor", "alumnus"];
        yield Promise.all(positions.map(position => (
            PositionGroup.create({
                team: this._id,
                position: position,
                members: [],
                dependentGroups: [],
            })
        )));
    } catch (err) {
        // TODO: deal with this
        console.log(err)
    }

}));

let Team = mongoose.model("Team", teamSchema);

module.exports = Team;
