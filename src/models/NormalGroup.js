"use strict";

module.exports = function() {

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
        let self = this;

        try {
            let userIds = self.users;
            for (let groupId of self.groups) {
                let group = yield Group.findOne({
                    _id: groupId
                });
                Array.prototype.push.apply(userIds, group.members);
            }
            removeDuplicates(userIds);
            self.members = userIds;
            self.updateDependentsMembers();
        } catch (err) {
            console.error(err);
        }
    });

    normalGroupSchema.pre("save", Promise.coroutine(function*(next) {
        let self = this;

        if (self.isModified("users")) {
            self.updateMembers();
        }

        next();
    }));

    normalGroupSchema.path("groups").set(function() {
        // TODO: this is not called when an element is pushed to the array
        let self = this;

        // make sure they do not share a reference
        self.oldGroups = [];
        for (let groupId of self.groups) {
            self.oldGroups.push(groupId);
        }
    });

    normalGroupSchema.pre("save", Promise.coroutine(function*(next) {
        let self = this;

        if (!self.isModified("groups")) {
            return next();
        }

        for (let newGroupId of self.groups) {
            if (self.oldGroups.indexOf(newGroupId) === -1) {
                yield Group.findOneAndUpdate({
                    _id: newGroupId
                }, {
                    $push: {
                        dependentGroups: self._id
                    }
                });
            }

        }
        for (let oldGroupId of self.oldGroups) {
            if (self.groups.indexOf(oldGroupId) === -1) {
                yield Group.findOneAndUpdate({
                    _id: oldGroupId
                }, {
                    $pull: {
                        dependentGroups: self._id
                    }
                });
            }
        }

        next();
    }));

    let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

    return NormalGroup;

};
