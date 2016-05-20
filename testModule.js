module.exports = function(imports) {

	let express = imports.modules.express;
	let User = imports.models.User;

	let router = express.Router();

	router.get("/", function(req, res) {
		User.findOne({
			firstname: "Bob"
		}, function(err, user) {
			if (err || !user) {
				res.end("none");
			} else {
				res.json(user);
			}
		});
	});

	router.post("/test", function(req, res) {
		res.end("test");
	});

	return router;

};
