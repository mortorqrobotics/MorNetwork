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
		"dbName": "mornetwork"
	};
	fs.writeFileSync("config.json", JSON.stringify(config, null, "\t"));
	console.log("Generated default config.json");
}

var util = require("./util.js")(); //contains functions and objects that are used across all the modules

//create express application
var app = express();;

//connect to mongodb server
var db = mongoose.createConnection('mongodb://localhost:27017/' + config.dbName);
//import mongodb schemas
var schemas = {
  User: require('./schemas/User.js')(db),
  Team: require('./schemas/Team.js')(db),
  Subdivision: require('./schemas/Subdivision.js')
};

//assign variables to imported util functions(and objects) and database schemas (example: var myFunc = util.myFunc;)
for(key in util){
  eval("var " + key + " = util." + key + ";");
}
for(key in schemas){
  eval("var " + key + " = schemas." + key + ";");
}

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

//check to see if user is logged in before continuing any further
//allow browser to receive images, css, and js files without being logged in
//allow browser to receive some pages such as login.html, signup.html, etc. without being logged in
app.use(function(req, res, next) {
  var exceptions = ["/login.html", "/signup.html", "/fp.html", "/favicon.ico"];
  if (req.method == "GET") {
    if (req.path.contains("/css/") || req.path.contains("/js/") || req.path.contains("/img/")) {
      next();
    } else if ( exceptions.indexOf(req.url) > -1 ) {
      next();
    } else if (req.url == "/void.html") {
      if (req.user) {
        if (req.user.teams.length > 0) {
          if(!req.user.current_team){
            req.session.user.current_team.id = req.user.teams[0].id;
            req.session.user.current_team.position = req.user.teams[0].position;
            req.user.current_team.id = req.user.teams[0].id;
            req.user.current_team.position = req.user.teams[0].position;
          }
          res.redirect("/");
        } else {
          next();
        }
      } else {
        res.redirect("/");
      }
    } else {
      if (req.user) {
        if (req.user.teams.length > 0) {
          next();
        } else {
          res.redirect("/void");
        }
      } else {
        res.redirect("/login");
      }
    }
  } else {
    next();
  }
});

//load any file in /website/public (aka publicDir)
app.use(express.static(publicDir));

function requireSubdomain(name) {
	return function(req, res, next) {
		var host = req.headers.host;
		if(host.startsWith(name + ".")) {
			next();
		}
	};
}
function MorServerLoader(condition) { // wrap app to insert middleware
	var insertArg = function(list, index) {
		var args = Array.prototype.slice(list, 0, index);
		args.push(condition);
		args = args.concat(Array.prototype.slice(list, index));
		return args;
	};
	this.post = function(path) {
		app.post.apply(null, insertArg(arguments, 1));
	};
	this.get = function(path) {
		app.get.apply(null, insertArg(arguments, 1));
	};
	this.use = function(path) {
		app.use.apply(null, insertArg(arguments, 0));
	};
}
var requireMorscout = requireSubdomain("scout");
var morscout = require("../morscout-server/server.js");
morscout(new MorServerLoader(requireMorscout), schemas);
app.use(requireMorscout, function(req, res, next) {
	// do not proceed if request sent to morscout
});
var morteam = require("../morteam-server-website/server/server.js");
morteam(app, schemas); // put morteam at the end to handle all requests that fall through

// 404 handled by each application
