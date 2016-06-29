"use strict";

// This is the glue.

let express = require("express");
let http = require("http");
let fs = require("fs");
let bodyParser = require("body-parser");
let mongoose = require("mongoose"); // MongoDB ODM
let session = require("express-session");
let MongoStore = require("connect-mongo")(session);
let ObjectId = mongoose.Types.ObjectId; // this is used to cast strings to MongoDB ObjectIds
let multer = require("multer"); // for file uploads
let vh = require("express-vhost");

let Promise = require("bluebird");
mongoose.Promise = Promise;

let config; // contains passwords and other sensitive info
if (fs.existsSync("config.json")) {
    config = require("./config.json");
} else {
    config = {
        "sessionSecret": "secret",
        "dbName": "MorNetwork",
        "host": "test.dev"
            // add the following line to /etc/hosts to make cookies work with subdomains
            // localhost test.dev
            // then navigate to www.test.dev:8080 in browser for testing
    };
    fs.writeFileSync("config.json", JSON.stringify(config, null, "\t"));
    console.log("Generated default config.json");
}
// create express application
let app = express();

// connect to mongodb server
mongoose.connect("mongodb://localhost:27017/" + config.dbName);

let User = require("./models/User.js")();
let Team = require("./models/Team.js")();
let Group = require("./models/Group.js")();
let NormalGroup = require("./models/NormalGroup.js")();
let AllTeamGroup = require("./models/AllTeamGroup.js")();
let PositionGroup = require("./models/PositionGroup.js")();

// start server
let port = process.argv[2] || 8080;
let io = require("socket.io").listen(app.listen(port));
console.log("server started on port %s", port);

// define imports for modules
// this has to be a function so that each module has a different imports object
function getImports() {
    return {
        modules: {
            mongoose: mongoose
        },
        models: {
            User: User,
            Team: Team,
            Group: Group,
            NormalGroup: NormalGroup,
            AllTeamGroup: AllTeamGroup,
            PositionGroup: PositionGroup
        },
        socketio: io
    };
};

// check for any errors in all requests
// TODO: does this actually do anything?
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send("Oops, something went wrong!");
});

// middleware to get request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

let sessionMiddleware = session({
    secret: config.sessionSecret,
    saveUninitialized: false,
    resave: false,
    cookie: {
        domain: "." + config.host
    },
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    })
});

// can now use session info (cookies) with socket.io requests
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});
// can now use session info (cookies) with regular requests
app.use(sessionMiddleware);

// load user info from session cookie into req.user object for each request
app.use(Promise.coroutine(function*(req, res, next) {
    if (req.session && req.session.userId) {
        try {

            let user = yield User.findOne({
                _id: req.session.userId
            });

            req.user = user;

            next();

        } catch (err) {
            // TODO: handle more cleanly the case where userId is not found for if the user is deleted or something
            console.error(err);
            res.end("fail");
        }
    } else {
        next();
    }
}));


let morteam = require("../morteam-server-website/server/server.js")(getImports());
vh.register(config.host, morteam);
vh.register("www." + config.host, morteam);

//let morscout = require("../morscout-server/server.js")(getImports());
//vh.register("scout." + config.host, morscout);
//vh.register("www.scout." + config.host, morscout);

//let testModule = require("./testModule/server.js")(getImports());
//vh.register("test." + config.host, testModule);
//vh.register("www.test." + config.host, testModule);

app.use(vh.vhost(app.enabled("trust proxy")));

// 404 handled by each application
// TODO: still put a 404 handler here though?