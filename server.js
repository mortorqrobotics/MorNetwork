var express = require('express');
var http = require('http');
var fs = require('fs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose'); //MongoDB ODM
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var ObjectId = mongoose.Types.ObjectId; //this is used to cast strings to MongoDB ObjectIds
var multer = require('multer'); //for file uploads

var config; // contains passwords and other sensitive info
if(fs.existsSync("config.json")) {
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
//create express application
var app = express();

String.prototype.contains = function(arg) {
  return this.indexOf(arg) > -1;
};

//connect to mongodb server
// var db = mongoose.createConnection('mongodb://localhost:27017/' + config.dbName);
mongoose.connect("mongodb://localhost:27017/" + config.dbName);
var db = mongoose;
//import mongodb schemas
var schemas = {
  User: require('./schemas/User.js')(db),
  Team: require('./schemas/Team.js')(db),
  Subdivision: require("./schemas/Subdivision.js")(db)
};

//start server
var port = process.argv[2] || 8080;
var io = require("socket.io").listen(app.listen(port));
console.log('server started on port %s', port);

//check for any errors in all requests
app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Oops, something went wrong!');
});

//middleware to get request body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var sessionMiddleware = session({
  secret: config.sessionSecret,
  saveUninitialized: false,
  resave: false,
  cookie: {
	  domain: "." + config.host
  },
  // store: new MongoStore({ mongooseConnection: db })
  store: new MongoStore({ mongooseConnection: mongoose.connection })
});

//can now use session info (cookies) with socket.io requests
io.use(function(socket, next){
  sessionMiddleware(socket.request, socket.request.res, next);
});
//can now use session info (cookies) with regular requests
app.use(sessionMiddleware);

//load user info from session cookie into req.user object for each request
app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    schemas.User.findOne({
      username: req.session.user.username
    }, function(err, user) {
      if (user) {
        req.user = user;
        delete req.user.password;
        req.session.user = user;
      }
      next();
    });
  } else {
    next();
  }
});

function requireSubdomain(name) { // TODO: rename this
	return function(req) {
		var host = req.headers.host;
		return host.startsWith(name + ".");
	};
}
// TODO: replace all of this junk with routers
app.getSelf = function() { // yes, this has to exist
	return this;
};
var self = app.getSelf();
function getWrapper(condition) { // wrap app to insert middleware
	var wrapper = {};
	for(var key in app) {
		wrapper[key] = app[key];
	}
	var wrapFunction = function(args) { // ignore this for your own sanity
		args = Array.prototype.slice.call(args);
		var func = args[args.length - 1];
		args[args.length - 1] = function(req, res, next) {
			if(condition(req)) {
				func(req, res, next);
			}
			else {
				next();
			}
		};
		return args;
	};
	wrapper.post = function() {
		app.post.apply(self, wrapFunction(arguments));
	};
	wrapper.get = function() {
		app.get.apply(self, wrapFunction(arguments));
	};
	wrapper.use = function() {
		app.use.apply(self, wrapFunction(arguments));
	};
	return wrapper;
}
var requireMorscout = requireSubdomain("scout"); // TODO: rename this
// var morscout = require("../morscout-server/server.js");
var morscout = require("../morscout-server/server.js");
morscout(getWrapper(requireMorscout), schemas, db);
app.use(function(req, res, next) { // only continue if request is for morteam
	if(!requireMorscout(req)) { // bad... but need to release
		next();
	}
});
var morteam = require("../morteam-server-website/server/server.js");
morteam(app, schemas, io, db); // put morteam at the end to handle all requests that fall through

// 404 handled by each application
