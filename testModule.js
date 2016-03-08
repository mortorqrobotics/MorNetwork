module.exports = function(app, schemas) {

	app.get("/", function(req, res) {
		schemas.User.findOne({
			firstname: "Bob"
		}, function(err, user) {
			if(err) {
				res.end("none");
			}
			else {
				delete user.password;
				res.end(JSON.stringify(user));
			}
		});
	});

	app.post("/test", function(req, res) {
		res.end("test");
	});

};
