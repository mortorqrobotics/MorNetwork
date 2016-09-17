"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

let normalGroupSchema = new Schema({
    users: [{
        type: ObjectId,
        ref: "User",
        required: true,
    }],
    team: {
        type: ObjectId,
        ref: "Team",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
});

normalGroupSchema.statics.createGroup = Promise.coroutine(function*(obj) {
    let group = yield normalGroupCreate({
        users: obj.users,
        name: obj.name,
        team: obj.team,
    });
    yield require("./User").update({
        _id: {
            $in: obj.users,
        },
    }, {
        $push: {
            groups: group._id,
        },
    }, {
        multi: true,
    });
    return group;
});

normalGroupSchema.statics.addUsers = Promise.coroutine(function*(groupId, users) {
    yield normalGroupUpdate({
        _id: groupId,
    }, {
        $addToSet: {
            users: users,
        },
    });
    yield require("./User").update({
        _id: {
            $in: users,
        },
    }, {
        $addToSet: {
            groups: groupId,
        },
    }, {
        multi: true,
    });
});

normalGroupSchema.statics.removeUsers = Promise.coroutine(function*(groupId, users) {
    yield normalGroupUpdate({
        _id: groupId,
    }, {
        $pull: {
            users: users,
        },
    });
    yield require("./User").update({
        _id: {
            $in: users,
        },
    }, {
        $pull: {
            groups: groupId,
        },
    }, {
        multi: true,
    });
});

let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

// should this be a thing?
let normalGroupUpdate = NormalGroup.update.bind(NormalGroup);
delete NormalGroup.update;
let normalGroupCreate = NormalGroup.create.bind(NormalGroup);
delete NormalGroup.create;

module.exports = NormalGroup;
