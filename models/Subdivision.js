"use strict";

module.exports = function(mongoose) {

	let Schema = mongoose.Schema;
	let ObjectId = Schema.Types.ObjectId;

	let subdivisionSchema = new Schema({
		name:        { type: String, required: true },
		type:        { type: String, required: true },
		team:        { type: ObjectId, ref: "Team", required: true },
		created_at:  Date,
		updated_at:  Date,
	});

	subdivisionSchema.pre("save", function(next){
		let now = new Date();
		this.updated_at = now;
		if ( !this.created_at ) {
			this.created_at = now;
		}
		next();
	});

	let Subdivision = mongoose.model("Subdivision", subdivisionSchema);

	return Subdivision;

};
