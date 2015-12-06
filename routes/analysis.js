var r = require('rethinkdb');
var dbConfig = require('../config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};

var synaptic = require('synaptic');

var Network = synaptic.Network;
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;

function get_default_network(key, ids, cb){
    r.connect(db_config).then(function(conn){
        r.table('trained_locations')
        .filter({
            apikey:key,
            '_default':true
        }).run(conn).then(function(cursor){
            cursor.next().then(function(network){
                restore_network(conn, network, ids, cb);
            });
        });
    });
}

function restore_network(conn, json, ids, cb){
    network = Network.fromJSON(json.network);
    r.table('locations')
	.getAll(r.args(ids))
	.run(conn).then(function(cursor){
        cursor.toArray().then(function(result){
            run_test_data(network, format_training_set(result), result, cb);
        });
    });
}

function run_test_data(network, data, _result, cb){

    var result = data.map(function(result, idx){
        var start_arr = Array.apply(null, new Array(data.length)).map(Number.prototype.valueOf,0);
        var items = result.map(function(item){
            return network.activate(item.input);
        }).reduce(function(prev, item){
            var count = item.map(function(e){
                if(e > 0.9) return 1;
                return 0;
            });
            return count.map(function(x, idx2){
                return x + prev[idx2];
            });
        }, start_arr);

        return {
            items: items.map(function(item, i){
                return {
                    value: item,
                    name: _result[i].name
                };
            }),
            name: _result[idx].name,
            percents: items.map(function(val, i){
                return {
                    value: val / items.reduce(function(x, y){
                        return x + y;
                    }),
                    name: _result[i].name
                };
            })
        };
    });

    cb(result);
}

/**
 *  Formats the source data set and returns the formatted data
 */
function format_training_set(source){
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
            var out = Array.apply(null, Array(source.length)).map(Number.prototype.valueOf,0);
            // now set this training id to 1.
            out[index] = 1;
            return {
                input: item,
                output: out
            };
        });

        result.push(temp);
    });
    return result;
}

module.exports = {
    test: function(req, res){
        if(!req.query.apikey) return res.json({success: false, error: 'Missing apikey'});
        get_default_network(req.query.apikey, req.body.ids, function(result){
            res.json(result);
        });
    },
};
