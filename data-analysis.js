var r = require('rethinkdb');
var config = require('./config');
var db_config = {
    db: config.db,
    host: config.host
};
var synaptic = require('synaptic');

var Network = synaptic.Network;
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;

var APIKEY = '98e3de68-af67-4007-8a34-26fc9a445679';

var args = process.argv;
if(args.length < 3){
    console.log('Usage: node data-analysis.js [test-prefix]');
    return;
}

var prefix = args[2];

r.connect(db_config).then(function(conn){
    r.table('trained_locations')
    .filter({
        apikey:APIKEY,
        '_default':true
    }).run(conn).then(function(cursor){
        cursor.next().then(function(network){
            restore_network(conn, network);
        });
    });
});

function restore_network(conn, json){
    network = Network.fromJSON(json.network);
    r.table('locations')
	.filter(function(doc){
        return doc('name').match('^'+prefix);
    })
	.run(conn).then(function(cursor){
        cursor.toArray().then(function(result){
            //console.log(result);
            //console.log(format_training_set(result, result.length));
            run_test_data(network, format_training_set(result, result.length), result);
            conn.close();
        });
    });
}

function run_test_data(network, data, _result){
    //console.log(data);
    data.forEach(function(result, idx){
        var start_arr = Array.apply(null, new Array(data.length)).map(Number.prototype.valueOf,0);
        var items = result.map(function(item){
            return network.activate(item.input);
        }).reduce(function(prev, item){
            var count = item.map(function(e){
                if(e > 0.9) return 1;
                return 0;
            });
            return count.map(function(x, idx){
                return x + prev[idx];
            });
        }, start_arr);
        console.log(items, _result[idx].name);
        console.log(items.map(function(i){
            return i / items.reduce(function(x, y){
                return x + y;
            });
        }));
    });
}

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
        // temp.forEach(function(i){
        //     result.push(i);
        // });
        result.push(temp);
    });
    return result;
}
