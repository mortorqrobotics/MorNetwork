"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");

let normalGroupSchema = new Schema({
    users: {
        type: [{
            type: ObjectId,
            ref: "User"
        }],
        required: true
    },
    groups: {
        type: [{
            type: ObjectId,
            ref: "Group"
        }],
        required: true
    }
});

function removeDuplicates(arr) {
    // TODO: make this faster
    for (let i = 0; i < arr.length; i++) {
        if (arr.indexOf(arr[i]) !== 1) {
            arr.splice(i, 1);
            i--;
        }
    }
}

normalGroupSchema.methods.updateMembers = Promise.coroutine(function*() {
    try {

        let userIds = this.users;
        for (let groupId of this.groups) {
            let group = yield Group.findOne({
                _id: groupId
            });
            Array.prototype.push.apply(userIds, group.members);
        }
        removeDuplicates(userIds);
        this.members = userIds;

        yield this.updateDependentsMembers();
    } catch (err) {
        console.error(err);
    }
});

normalGroupSchema.path("groups").get(function(value) {

    if (!("oldGroups" in this)) {
        this.oldGroups = Array.prototype.slice.call(value);
    }

    return value;
});

normalGroupSchema.path("groups").set(function(value) {

    // yes, this does something
    // it calls the getter
    // the old value is recorded if the getter was not called before
    this.groups;

    return value;
});

normalGroupSchema.pre("save", Promise.coroutine(function*(next) {

    if (this.isModified("groups")) {

        for (let newGroupId of this.groups) {
            if (this.oldGroups.indexOf(newGroupId) === -1) {
                yield Group.findOneAndUpdate({
                    _id: newGroupId
                }, {
                    $push: {
                        dependentGroups: this._id
                    }
                });
            }

        }

        for (let oldGroupId of this.oldGroups) {
            if (this.groups.indexOf(oldGroupId) === -1) {
                yield Group.findOneAndUpdate({
                    _id: oldGroupId
                }, {
                    $pull: {
                        dependentGroups: this._id
                    }
                });
            }
        }
    }

    // isModified does check for deep equality
    // it will detect stuff like elements pushed to an array
    // instead of just comparing references
    if (this.isModified("groups") || this.isModified("users")) {
        yield this.updateMembers();
    }

    next();
}));

let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

return NormalGroup;
