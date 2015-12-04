var r = require('rethinkdb');
var dbConfig = require('../config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};
/**
 *  Wifi routes
 */
module.exports = {
    post: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else
        r.connect(db_config).then(function(conn){
        	r.table('wifi_data').insert(req.body).run(conn).then(function(result){
                res.json(result);
            });
        });
    },
    put: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else
        r.connect(db_config).then(function(conn){
        	r.table('wifi_data').get(req.body.id).update(req.body).run(conn).then(function(result){
                res.json(result);
            });
        });
    },
    get: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else
        r.connect(db_config).then(function(conn){
            r.table('wifi_data').run(conn).then(function(result){
                result.toArray().then(function(arr){
                    res.json(arr);
                });
    	    });
        });
    },
    delete: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else
        r.connect(db_config).then(function(conn){
            r.table('wifi_data').delete().run(conn).then(function(result){
                res.json(result);
    	    });
        });

    }
};
