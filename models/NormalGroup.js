"use strict";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

module.exports = function(mongoose){
    
    let Group = require("./Group");
    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;
    let Promise = require("bluebird");
    
    let normalGroupSchema = new Schema({
        users: [{type: ObjectId, ref: "User"}],
        groups: [{type: ObjectId, ref: "Group"}]
    });
    
    normalGroupSchema.pre("save", function(next){
	    let now = new Date();
		this.updated_at = now;
		if ( !this.created_at ) {
			this.created_at = now;
		}
		next();
    });
    
    function removeDuplicates(arr) {
        for(let i = 0; i<arr.length; i++) {
            if(i !== Array.indexOf(arr)) {
                Array.splice(i,1);
                i--;
            }
        }
    }
    
    normalGroupSchema.methods.updateMembers = Promise.coroutine(function*(){
        let group = this;
        try {
            let userIds = group.users;
            for(let groupId of group.groups) {
                let oneGroup = yield Group.findOne({_id: groupId});
                Array.prototype.push.apply(userIds, oneGroup.members);
            }
            removeDuplicates(userIds);
            group.members = userIds;
            group.updateDependents();   
        } catch(err) {
            console.error(err);
        }
    });
   
    let NormalGroup = Group.discriminator("Group", normalGroupSchema)    
}