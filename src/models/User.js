"use strict";

let mongoose = require("mongoose");
let bcrypt = require("bcrypt");
let Schema = mongoose.Schema;
let ObjectId = Schema.Types.ObjectId;
let Promise = require("bluebird");
let PositionGroup = require("./PositionGroup");
let AllTeamGroup = require("./AllTeamGroup");
let coroutine = require("./coroutine");
let SALT_WORK_FACTOR = 10;

function createToken(size) {
    let token = "";
    for (let i = 0; i < size; i++) {
        let rand = Math.floor(Math.random() * 62);
        token += String.fromCharCode(rand + ((rand < 26) ? 97 : ((rand < 52) ? 39 : -4)));
    }
    return token;
}

var userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    parentEmail: String,
    phone: {
        type: Number,
        required: true,
        unique: true
    },
    created_at: Date,
    updated_at: Date,
    profpicpath: String,
    team: {
        type: ObjectId,
        ref: "Team"
    },
    position: {
        type: String,
        enum: ["member", "leader", "mentor", "alumnus"]
    },
    scoutCaptain: {
        type: Boolean,
        default: false
    },
    bannedFromTeams: {
        type: [{
            type: ObjectId,
            ref: "Team"
        }],
        default: []
    }
});

userSchema.pre("save", function(next) {
    let now = new Date();
    this.updated_at = now;
    if (!this.created_at) {
        this.created_at = now;
    }
    next();
});

userSchema.pre("save", function(next) {
    let user = this;

    if (!user.isModified("password")) return next();

    bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

userSchema.path("position").set(function(newPosition) {
    let user = this;
    user.oldPosition = user.position;
    return newPosition;
});

userSchema.pre("save", coroutine(function*(next) {
    let user = this;

    if (!user.isModified("position")) {
        return next();
    }

    if (user.oldPosition) {
        let group = yield PositionGroup.findOne({
            position: user.oldPosition,
            team: user.team
        });
        if (group) {
            group.updateMembers();
        }
    }

    if (user.position) { // TODO: needs refactoring
        let group = yield PositionGroup.findOne({
            position: user.position,
            team: user.team
        });
        if (group) {
            group.updateMembers();
        }
    }

    next();
}));

userSchema.path("team").set(function(newTeam) {
    let user = this;
    user.oldTeam = user.team || null;
    return newTeam;
});


userSchema.post("save", coroutine(function*() {
    let user = this;

    if (typeof user.oldTeam == "undefined") {
        return;
    }

    if (user.oldTeam) {
        let group = yield AllTeamGroup.findOne({
            team: user.oldTeam
        });
        if (group) {
            group.updateMembers();
        }
    }

    if (user.team) {
        let group = yield AllTeamGroup.findOne({
            team: user.team
        });
        if (group) { // TODO: this should always evaluate to true
            yield group.updateMembers();
            yield group.save();
        }
    }

}));

userSchema.methods.comparePassword = function(candidatePassword) {
    let password = this.password;
    return new Promise(function(resolve, reject) { // antipattern but whatever
        bcrypt.compare(candidatePassword, password, function(err, isMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(isMatch);
            }
        });
    });
};

userSchema.methods.assignNewPassword = function() {
    let user = this;
    let newPassword = createToken(8);
    user.password = newPassword;
    return Promise.resolve(newPassword);
};

let User = mongoose.model("User", userSchema);

module.exports = User;
