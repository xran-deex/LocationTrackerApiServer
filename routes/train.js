var training = require('../training');
var r = require('rethinkdb');
var dbConfig = require('../config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};

var trainer_process;

/**
 *  Formats the source data set and returns the formatted data
 */
function format_training_set(source, numTrainingIds){
    var result = [];
    // sort by name
    source.sort(function(i, j){
        if(i.name < j.name){
            return -1;
        } else if (i.name > j.name){
            return 1;
        }
        return 0;
    });
    // map to a list of objects with an input array and an output array
    source.forEach(function(d, index){
        var temp = d.data.map(function(item){
            // create an array of length numTrainingIds and set it to all zeros
            var out = Array.apply(null, Array(numTrainingIds)).map(Number.prototype.valueOf,0);
            // now set this training id to 1.
            out[index] = 1;
            return {
                input: item,
                output: out
            };
        });
        temp.forEach(function(i){
            result.push(i);
        });
    });
    return result;
}

/**
 *  Training routes
 */
module.exports = {
    get_all: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').filter({apikey:req.query.apikey}).run(conn).then(function(cursor){
                    cursor.toArray().then(function(result){
                        res.json(result.map(function(item){
                            return {
                                ready: (item.network != null),
                                _default: item._default,
                                name: item.name,
                                id: item.id,
        			            error: item.info ? item.info.error : ''
                            };
                        }));
                    });
                }).error(function(err){res.json(err);});
            });
        }
    },
    get_one: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').get(req.params.id).run(conn).then(function(result){
                    res.json(result);
                }).error(function(err){res.json(err);});
            });
        }
    },
    delete: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').get(req.body.id).delete().run(conn).then(function(result){
                    res.json(result);
                }).error(function(err){res.json(err);});
            });
        }
    },
    update: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').update({apikey:req.query.apikey, '_default':false}).run(conn).then(function(){
                    r.table('trained_locations').get(req.body.id).update({'_default':true}).run(conn).then(function(result){
                            res.json(result);
                        }).error(function(err){res.json(err);});
                });
            });
        }
    },
    get_default: function(req, res){
        if(!req.query.apikey){
            res.json({error:'Missing apikey'});
        } else {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').filter({apikey:req.query.apikey, '_default':true}).run(conn).then(function(cursor){
                        cursor.next().then(function(item){
                            res.json(item);
                        });
                    }).error(function(err){res.json(err);});
            });
        }
    },
    train: function(req, res){
        if(!req.query.apikey) return res.json({success: false, error: 'Missing apikey'});
        r.connect(db_config).then(function(conn){
            r.table('locations').getAll(r.args(req.body.ids)).run(conn).then(function(cursor){
                // pull out the data
                cursor.toArray().then(function(location_array){
                    var numTrainingIds = req.body.ids.length;

                    var training_set = format_training_set(location_array, numTrainingIds);

                    // insert a new trained location using the location data
                    r.table('trained_locations').insert({
                        name: req.body.name,
                        network: null, // this becomes set after the training is finished
                        ids: req.body.ids,
                        locations: location_array,
                        //type: req.body.type,
                        preferedWifi: location_array[0].preferedWifi,
                        apikey: req.query.apikey
                    }).run(conn).then(function start_training(result){
                        // train the data using either a support vector machine, or a neural network
                        if(req.body.type == 'svm')
                            trainer_process = training.trainsvm({id: result.generated_keys[0], data: training_set}, this.wss);
                        else
                            trainer_process = training.train({id: result.generated_keys[0], data: training_set}, this.wss);
                        // after training has been started, send back success
                        res.json({success: true});
                    });

                });
            });
        });
    },
    kill_training_process: function(){
        if(trainer_process){
            trainer_process.kill('SIGKILL');
        }
    }
};
