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
		"dbName": "MorNetwork"
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
var db = mongoose.createConnection('mongodb://localhost:27017/' + config.dbName);
//import mongodb schemas
var schemas = {
  User: require('./schemas/User.js')(db),
  Team: require('./schemas/Team.js')(db)
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
    User.findOne({
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

function requireSubdomain(name) {
	return function(req, res, next) {
		var host = req.headers.host;
		if(host.startsWith(name + ".")) {
			next();
		}
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
	var insertArg = function(list, index) {
		var args = Array.prototype.slice.call(list, 0, index);
		args.push(condition);
		args = args.concat(Array.prototype.slice.call(list, index));
		return args;
	};
	wrapper.post = function(path) {
		app.post.apply(self, insertArg(arguments, 1));
	};
	wrapper.get = function(path) {
		app.get.apply(self, insertArg(arguments, 1));
	};
	wrapper.use = function(path) {
		app.use.apply(self, insertArg(arguments, 0));
	};
	return wrapper;
}
var requireMorscout = requireSubdomain("scout");
// var morscout = require("../morscout-server/server.js");
var morscout = require("./testModule.js");
morscout(getWrapper(requireMorscout), schemas);
app.use(function(req, res, next) { // only continue if request is for morteam
	if(!req.headers.host.startsWith("scout.")) { // bad... but need to release
		next();
	}
});
var morteam = require("../morteam-server-website/server/server.js");
morteam(app, schemas, io); // put morteam at the end to handle all requests that fall through

// 404 handled by each application
