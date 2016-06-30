"use strict";

let mongoose = require("mongoose");
let Schema = mongoose.Schema;

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
    next();
});

let Team = mongoose.model("Team", teamSchema);

return Team;
