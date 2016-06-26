"use strict";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

module.exports = function(mongoose) {
    
    let Schema = mongoose.Schema;
    let ObjectId = Schema.Types.ObjectId;
    
    let groupSchema = new Schema({
        members: [{type: ObjectId, ref: "User"}]
    });
    
    groupSchema.pre("save", function(next){
	    let now = new Date();
		this.updated_at = now;
		if ( !this.created_at ) {
			this.created_at = now;
		}
		next();
	});
    
    let Group = mongoose.model("Group", groupSchema);
    
    return Group;
    
};

