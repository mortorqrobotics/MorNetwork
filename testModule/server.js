module.exports = function(imports) {

	imports.modules.express = require("express");
	imports.util = require("./util.js")(imports);
	// put util last so it can access the other imports

	let express = imports.modules.express;

	let app = express();

	app.use("/test", require("./routes.js")(imports));

	return app;

};
