module.exports = function(imports) {

    let express = imports.modules.express;
    let Promise = imports.modules.Promise;
    let User = imports.models.User;
    let util = imports.util;

    let router = express.Router();

    router.get("/", Promise.coroutine(function*(req, res) {
        /* User.findOne({
        	firstname: "Bob"
        }, function(err, user) {
        	if (err || !user) {
        		res.end("none");
        	} else {
        		
        		User.findOne({
        			lastname: "Jones"
        		}, function(err, user) {
        			if (err || !user) {
        				res.end("none")''
        			} else {
        				res.json(user);
        			}
        		})
        		res.json(user);
        	}
        }); */

        /* let user1;
		
		User.findOne ({
			firstname: "Bob"
		}).then(function (user) {
			user1 = user;
			return(User.findOne({
				lastname: "Jones"
			}));
		}).then(function (user) {
			res.json([user1, user])
	
		}).catch(function (err) {
			res.end("none");
		}) */
        try {
            let user1 = yield User.findOne({
                firstname: "Bob"
            });
            let user2 = yield User.findOne({
                lastname: "The All Mighty and the Glorious"
            });
            res.json([user1, user2]);
        } catch (err) {
            res.end("none");
        }
    }));

    router.post("/test", function(req, res) {
        res.end(util.getRandomNumber().toString());
    });

    return router;

};
