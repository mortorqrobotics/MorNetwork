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
        let group = this;
        try {
            let userIds = group.users;
            for (let groupId of group.groups) {
                let otherGroup = yield Group.findOne({
                    _id: groupId
                });
                Array.prototype.push.apply(userIds, otherGroup.members);
            }
            removeDuplicates(userIds);
            group.members = userIds;
            group.updateDependents();
        } catch (err) {
            console.error(err);
        }
    });

    normalGroupSchema.path("users").set(function(newUsers){
        let normalGroup = this;
        normalGroup.oldUsers = normalGroup.users; 
        // TODO: Should set a new value?
    });
    
    normalGroupSchema.pre("save", Promise.coroutine(function*(next){
        let normalGroup = this;
        
        if(!normalGroup.isModified("users")){
            return next();
        }
        
        if(normalGroup.oldUsers){
            let group = yield normalGroupSchema.findOne({
                users: normalGroup.oldUsers
            })
            
            if(group){
                group.updateMembers();
            }
        }
        
            if(normalGroup.users){
            let group = yield normalGroupSchema.findOne({
                users: normalGroup.users
            })
            
            if(group){
                group.updateMembers();
            }
        }
        next();
    }));
    
    let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

        return NormalGroup;
    
   
    
    
};
