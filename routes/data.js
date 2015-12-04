var r = require('rethinkdb');
var dbConfig = require('../config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};
/**
 *  Data collection routes
 */
module.exports = {
    post: function(req, res){
        if(!req.body.apikey){
            res.json({error:'Missing apikey'});
        } else {
            r.connect(db_config).then(function(conn){
                r.table('locations')
    				.insert({apikey: req.body.apikey, name: req.body.name, data: req.body.data, preferedWifi: req.body.preferedWifi})
    				.run(conn).then(function(result){
                        res.json(result);
                    });
            });
        }
    },
    get: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else
        r.connect(db_config).then(function(conn){
            r.table('locations').filter({apikey:req.query.apikey}).run(conn).then(function(cursor){
                cursor.toArray().then(function(result){
                    res.json(result.map(function(item){
                        return {
                            name: item.name,
                            id: item.id
                        };
                    }));
                });
            }).error(function(err){res.json(err);});
        });
    },
    delete: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else
        r.connect(db_config).then(function(conn){
            r.table('locations').get(req.body.id).delete().run(conn).then(function(result){
                return res.json({success: true});
            }).error(function(err){res.json(err);});
        });
    }
};
