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

let Promise = require("bluebird");
mongoose.Promise = Promise;

let config; // contains passwords and other sensitive info
if (fs.existsSync("config.json")) {
	config = require("./config.json");
}
else {
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

String.prototype.contains = function(arg) {
	return this.indexOf(arg) > -1;
};

// connect to mongodb server
mongoose.connect("mongodb://localhost:27017/" + config.dbName);
// import mongodb schemas
let schemas = {
	User: require("./schemas/User.js"),
	Team: require("./schemas/Team.js"),
	Subdivision: require("./schemas/Subdivision.js"),
};

// start server
let port = process.argv[2] || 8080;
let io = require("socket.io").listen(app.listen(port));
console.log("server started on port %s", port);

// check for any errors in all requests
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
	store: new MongoStore({ mongooseConnection: mongoose.connection })
});

// can now use session info (cookies) with socket.io requests
io.use(function(socket, next) {
	sessionMiddleware(socket.request, socket.request.res, next);
});
// can now use session info (cookies) with regular requests
app.use(sessionMiddleware);

// load user info from session cookie into req.user object for each request
app.use(Promise.coroutine(function*(req, res, next) {
	if (req.session && req.session.user) {
		try {

			let user = schemas.User.findOne({
				_id: req.session.user._id
			});

			req.user = user;

		} catch (err) {
			console.error(err);
			res.end("fail");
		}
	}
	next();
}));

function requireSubdomain(name) { // TODO: rename this
	return function(req) {
		let host = req.headers.host;
		return host.startsWith(name + ".") || host.startsWith("www." + name + ".");
	};
}
function requireMorteam(req) {
	let host = req.headers.host;
	return /^(www\.)?[^\.]+\.[^\.]+$/.test(host);
}

let requireMorscout = requireSubdomain("scout"); // TODO: rename this
let morscoutRouter = require("../morscout-server/server.js")(schemas, db);
app.use("/", requireMorscout, morscoutRouter);

let morteamRouter = require("../morteam-server-website/server/server.js")(schemas, db, io);
app.use("/", requireMorteam, morteamRouter);

// 404 handled by each application
// still put a 404 handler here though?
