"use strict";

// This is the glue.

let express = require("express");
let http = require("http");
let fs = require("fs");
let bodyParser = require("body-parser");
let mongoose = require("mongoose"); //MongoDB ODM
let session = require("express-session");
let MongoStore = require("connect-mongo")(session);
let ObjectId = mongoose.Types.ObjectId; //this is used to cast strings to MongoDB ObjectIds
let multer = require("multer"); //for file uploads

let Promise = require("bluebird");

console.log = console.log.bind(console);

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
// let db = mongoose.createConnection("mongodb://localhost:27017/" + config.dbName);
mongoose.connect("mongodb://localhost:27017/" + config.dbName);
let db = mongoose;
// import mongodb schemas
let schemas = {
	User: require("./schemas/User.js")(db),
	Team: require("./schemas/Team.js")(db),
	Subdivision: require("./schemas/Subdivision.js")(db)
};

for (let name in schemas) {
	Promise.promisifyAll(schemas[name]);
}

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
	// store: new MongoStore({ mongooseConnection: db })
	store: new MongoStore({ mongooseConnection: mongoose.connection })
});

// can now use session info (cookies) with socket.io requests
io.use(function(socket, next) {
	sessionMiddleware(socket.request, socket.request.res, next);
});
// can now use session info (cookies) with regular requests
app.use(sessionMiddleware);

// load user info from session cookie into req.user object for each request
app.use(function(req, res, next) {
	if (req.session && req.session.user) {
		schemas.User.findOneAsync({
			username: req.session.user.username
		}).then(function(user) {
			delete user.password;
			req.user = user;
			req.session.user = user;
		}).then(next);
	} else {
		next();
	}
});

function requireSubdomain(name) { // TODO: rename this
	return function(req) {
		let host = req.headers.host;
		return host.startsWith(name + ".") || host.startsWith("www." + name + ".");
	};
}
// TODO: replace all of this junk with routers
function getWrapper(condition) { // wrap app to insert middleware
	let wrapper = {};
	for(let key in app) {
		wrapper[key] = app[key];
	}
	let wrapFunction = function(args) { // ignore this for your own sanity
		args = Array.prototype.slice.call(args);
		let func = args[args.length - 1];
		args[args.length - 1] = function(req, res, next) {
			if(condition(req)) {
				func(req, res, next);
			} else {
				next();
			}
		};
		return args;
	};
	wrapper.post = function() {
		app.post.apply(app, wrapFunction(arguments));
	};
	wrapper.get = function() {
		app.get.apply(app, wrapFunction(arguments));
	};
	wrapper.use = function() {
		app.use.apply(app, wrapFunction(arguments));
	};
	return wrapper;
}
let requireMorscout = requireSubdomain("scout"); // TODO: rename this
// let morscout = require("../morscout-server/server.js");
let morscout = require("../morscout-server/server.js");
morscout(getWrapper(requireMorscout), schemas, db);
app.use(function(req, res, next) { // only continue if request is for morteam
	if (!requireMorscout(req)) {
		next();
	}
});
let morteam = require("../morteam-server-website/server/server.js");
morteam(app, schemas, io, db); // put morteam at the end to handle all requests that fall through

// 404 handled by each application
