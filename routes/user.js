var r = require('rethinkdb');
var dbConfig = require('../config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};
/**
 *  User routes
 */
module.exports = {
    user: function(req, res){
        res.json({success:true, result:req.user||{}});
    },
    login: function(req, res, err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.json({success: false, err: info}); }
        req.login(user, function(err) {
            if (err) { return next(err); }
            return res.json({success: true, result: user});
        });
    },
    logout: function(req,res){
        req.logout();
        res.json({success:true});
    },
    signup: function(req, res, err, newUser){
        if(err) res.json({success:false, error: err});
        else {
            req.login(newUser.data, function(err){
                if(err) res.json({success:false});
                else res.json({success: true, result: newUser.data});
            });
        }
    },
    check_api_key: function(req, res){
        r.connect(db_config).then(function(conn){
            r.table('clients').filter({apikey: req.query.apikey}).run(conn).then(function(cursor){
                cursor.toArray().then(function(result){
                    res.json(result);
                });
            });
        });
    }
};
