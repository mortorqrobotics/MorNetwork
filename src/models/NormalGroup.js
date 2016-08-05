"use strict";

let mongoose = require("mongoose");
let Group = require("./Group");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");
let coroutine = require("./coroutine");

let normalGroupSchema = new Schema({
    users: [{
        type: ObjectId,
        ref: "User"
    }],
    groups: [{
        type: ObjectId,
        ref: "Group"
    }],
    isPublic: {
        type: Boolean,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
});

// TODO: make sure circular groups are never created!!!
// if A depends on B and B depends on A it will be a bad time
// also add checks to updateMembers in case circular groups are created for some reason
// so that the whole thing does not die if there is a mistake

function removeDuplicates(arr) {
    let seen = {};
    let result = [];
    for (let i = 0; i < arr.length; i++) {
        let item = arr[i];
        if (!seen[item]) {
            seen[item] = true;
            result.push(item);
        }
    }
    return result;
}

normalGroupSchema.methods.updateMembers = Promise.coroutine(function*() {

    // have to create a copy of the array instead of copying the reference
    // otherwise the users property would be the same as members
    let userIds = Array.prototype.slice.call(this.users);

    let allUsers = yield require("./User").find();
    for (let user of allUsers) {
        let index = user.groups.indexOf(this._id);
        let hasGroup = index != -1;
        let needsGroup = this.users.indexOf(user._id) != -1 || user.groups.some(g => this.groups.indexOf(g) != -1);
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

normalGroupSchema.pre("save", coroutine(function*(next) {
    if (this.isNew) {
        let a = yield Group.update({
            _id: {
                $in: this.groups
            }
        }, {
            $push: {
                dependentGroups: this._id
            }
        });
    }
    next();
}));

normalGroupSchema.pre("update", function(next, done) {

    /*
       updating group members requires having the group object in memory
       update just passes the query to mongodb
       so the original group is never in memory
       and middleware for updating group members cannot run
       instead, use find and save for NormalGroups
    */

    if ("users" in this._compiledUpdate.$set ||
        "groups" in this._compiledUpdate.$set ||
        "$push" in this._compiledUpdate ||
        "$pull" in this._compiledUpdate) {
        throw new Error("do not use NormalGroup.update like that");
    }

    next();
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

normalGroupSchema.pre("save", function(next) {
    // for the post("save")
    this.wasGroupsModified = this.isModified("groups");
    this.wasUsersModified = this.isModified("users");
    next();
});

normalGroupSchema.post("save", Promise.coroutine(function*() {

    if (this.wasGroupsModified) {

        for (let newGroupId of this.groups) {
            if (this.oldGroups && this.oldGroups.indexOf(newGroupId) === -1) {
                yield Group.findOneAndUpdate({
                    _id: newGroupId
                }, {
                    $push: {
                        dependentGroups: this._id
                    }
                });
            }

        }

        if (this.oldGroups) {
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
    }

    // isModified does check for deep equality
    // it will detect stuff like elements pushed to an array
    // instead of just comparing references
    if (this.wasGroupsModified || this.wasUsersModified) {
        yield this.updateMembers();
    }

//    next();
}));

let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

module.exports = NormalGroup;
