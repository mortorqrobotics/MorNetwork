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
            group.updateDependentsMembers();
        } catch (err) {
            console.error(err);
        }
    });

    normalGroupSchema.pre("save", Promise.coroutine(function*(next) {
        let group = this;

        if (group.isModified("users")) {
            group.updateMembers();
        }

        next();
    }));
    normalGroupSchema.path("groups").set(function(){ // TODO: cause trigger on push from server
        let group = this;
        group.oldGroups = group.groups;
    });
    
    normalGroupSchema.pre("save", Promise.coroutine(function*(next){
        let group = this;
        
        if(!group.isModified("groups")){
            return next();
        }
        for(let i = 0; i < group.groups.length; i++){

               if(group.oldGroups.indexOf(group.groups[i]) === -1){
                   let groups = yield Group.find({_id: group.groups[i]});
                   for(let j of groups){
                   j.dependentGroups.push(group.groups[i]);
                   j.save();
                   }
               }
        }
          for(let i = 0; i < group.oldGroups.length; i++){   
               
               if(group.groups.indexOf(group.oldGroups[i]) === -1){
                    let groups = yield Group.find({_id: group.oldGroups[i]});
                    for(let iteratedGroup of groups){
                    iteratedGroup.dependentGroups.splice(group.oldGroups.indexOf(group.oldGroups[i]),1);
                    iteratedGroup.save();
                    }
            }
        }
      next();
    }));

    let NormalGroup = Group.discriminator("NormalGroup", normalGroupSchema);

    return NormalGroup; 

};
