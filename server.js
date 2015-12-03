var r = require('rethinkdb');
var redis = require("redis"),
client = redis.createClient();
var express = require('express');
var bodyParser = require('body-parser')
var synaptic = require('synaptic');
var cors = require('cors');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var Network = synaptic.Network;
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;
var app = express();
var passport = require('passport')
, LocalStrategy = require('passport-local').Strategy;
app.use(cors());
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    store: new RedisStore({client: client}),
    secret: 'keyboard cat',
    resave: true, saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

var dbConfig = require('./config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};
var Auth = require('./auth');
var auth = new Auth();

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    r.connect(db_config).then(function(conn){
        r.table('clients').get(id).run(conn).then(function(user) {
            done(null, user);
        });
    }).error(function(err){done(err);});
});

passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    function(username, password, done) {
        auth.login({email:username, password:password}, function(err, data){
            if(err) return done(err);
            else {
                if(data.success)
                done(null, data.data);
                else done(null, false);
            }
        });
    }
));

// spawn a new training process and listen for messages.
// messages will be broadcast to connected websockets
var cp = require('child_process');
var trainer_process;
var train = function(data){
    trainer_process = cp.fork(__dirname+'/trainer.js');
    trainer_process.on('message', function(m){

        if(m.result) {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').get(m.id).update({
                    network: m.result.network,
		            info: m.result.result,
                    type: 'nn'
                }).run(conn);
            });
            wss.broadcast(JSON.stringify({'result': m.result}));
        }
        try{
            if(m.log) {
                wss.broadcast(JSON.stringify({'log': m.log}));
            }
        } catch(e){
            console.log(e);
            trainer_process.kill('SIGKILL');
        }
    });
    trainer_process.send(data);
};

var trainsvm = function(data){
    var trainer_process = cp.fork(__dirname+'/trainer-svm.js');
    trainer_process.on('message', function(m){

        if(m.result) {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').get(m.id).update({
                    network: m.result.network,
		            info: m.result.result,
                    type: 'svm'
                }).run(conn);
            });
            if(!ws) return;
            ws.send(JSON.stringify({'result': m.result}));
        }
        try{
            if(m.log) {
                if(!ws) return;
                ws.send(JSON.stringify({'log': m.log}));
            }
        } catch(e){
            console.log(e);
            trainer_process.kill('SIGKILL');
        }
    });
    var svmdata = data.data.map(function(item){
        return item.input;
    });
    var svmlabels = data.data.map(function(item){
        if(item.output[0] == 1){
            return 0;
        }
        if(item.output[1] == 1){
            return 1;
        }
    });
    trainer_process.send({id: data.id, data: svmdata, labels: svmlabels});
};

app.use(function(req, res, next){
    next();
});

app.get('/locationtracker/user',
    function(req, res){
        res.json({success:true, result:req.user||{}});
});

app.post('/locationtracker/login', function(req,res,next){
    passport.authenticate('local', function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.json({success: false, err: info}); }
        req.login(user, function(err) {
            if (err) { return next(err); }
            return res.json({success: true, result: user});
        });
    })(req, res, next);
});

app.get('/locationtracker/logout', function(req,res){
    req.logout();
    res.json({success:true});
});

app.post('/locationtracker/signup', function(req, res){
    auth.signup(req.body, function(err, newUser){
        if(err) res.json({success:false, error: err});
        else {
            req.login(newUser.data, function(err){
                if(err) res.json({success:false});
                else res.json({success: true, result: newUser});
            });
        }
    });
});

app.post('/locationtracker/wifi', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
    	r.table('wifi_data').insert(req.body).run(conn).then(function(result){
            res.json(result);
        });
    });
});

app.put('/locationtracker/wifi', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
    	r.table('wifi_data').get(req.body.id).update(req.body).run(conn).then(function(result){
            res.json(result);
        });
    });
});

app.get('/locationtracker/wifi', function(req, res){
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
});

//delete the wifi data
app.delete('/locationtracker/wifi', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
        r.table('wifi_data').delete().run(conn).then(function(result){
            res.json(result);
	    });
    });
});


// posts training data for a given location
app.post('/locationtracker/data', function(req, res){
    if(!req.body.apikey){
        res.json({error:'Missing apikey'});
    } else {
        r.connect(db_config).then(function(conn){
            r.table('locations')
				.insert({apikey: req.body.apikey, name: req.body.name, data: req.body.data})//, preferedWifi: req.body.preferedWifi})
				.run(conn).then(function(result2){res.json(result2);});
        });
    }
});

// gets a list of available locations
app.get('/locationtracker/data', function(req, res){
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
});

// gets a list of available locations
app.delete('/locationtracker/data', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
        r.table('locations').get(req.body.id).delete().run(conn).then(function(result){
            return res.json({success: true});
        }).error(function(err){res.json(err);});
    });
});

// gets a list of trained locations
app.get('/locationtracker/train', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
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
});

// gets a trained location by id
app.get('/locationtracker/train/:id', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
        r.table('trained_locations').get(req.params.id).run(conn).then(function(result){
            res.json(result);
        }).error(function(err){res.json(err);});
    });
});

app.delete('/locationtracker/train/', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
        r.table('trained_locations').get(req.body.id).delete().run(conn).then(function(result){
            res.json(result);
        }).error(function(err){res.json(err);});
    });
});

app.put('/locationtracker/train/', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
        r.table('trained_locations').update({apikey:req.query.apikey, '_default':false}).run(conn).then(function(){
            r.table('trained_locations').get(req.body.id).update({'_default':true}).run(conn).then(function(result){
                    res.json(result);
                }).error(function(err){res.json(err);});
        });
    });
});

app.get('/locationtracker/default', function(req, res){
    if(!req.query.apikey){
        res.json({error:'Missing apikey'});
    } else
    r.connect(db_config).then(function(conn){
        r.table('trained_locations').filter({apikey:req.query.apikey, '_default':true}).run(conn).then(function(cursor){
                cursor.next().then(function(item){
                    res.json(item);
                });
            }).error(function(err){res.json(err);});
    });
});

// handle training. accepts a list of ids of traind locations
app.post('/locationtracker/train', function(req, res){
    if(!req.query.apikey) return res.json({success: false, error: 'Missing apikey'});
    r.connect(db_config).then(function(conn){
        r.table('locations').getAll(r.args(req.body.ids)).run(conn).then(function(cursor){
            // pull out the data
            cursor.toArray().then(function(arr){
                var numTrainingIds = req.body.ids.length;
                var training_set = [];
                // sort by name
                arr.sort(function(i, j){
                    if(i.name < j.name){
                        return -1;
                    } else if (i.name > j.name){
                        return 1;
                    }
                    return 0;
                });
                arr.forEach(function(d, index){
                    var temp = d.data.map(function(item){
                        // create an array of length numTrainingIds and set it to all zeros
                        var out = Array.apply(null, Array(numTrainingIds)).map(Number.prototype.valueOf,0);
                        // now set this training id to 1.
                        out[index] = 1;
                        return {
                            input: item.data,
                            output: out
                        };
                    });
                    temp.forEach(function(i){
                        training_set.push(i);
                    });
                });
                r.table('trained_locations').insert({
                    name: req.body.name,
                    network: null,
                    ids: req.body.ids,
                    locations: arr,
                    //type: req.body.type,
                    //preferedWifi: arr[0].preferedWifi,
                    apikey: req.query.apikey
                }).run(conn).then(function(result){
                    // train the data
                    if(req.body.type == 'svm')
                        trainsvm({id: result.generated_keys[0], data: training_set});
                    else
                        train({id: result.generated_keys[0], data: training_set});
                    res.json({success: true});
                });

            });
        });
    });
});

app.post('/locationtracker', function(req, res){
    train({id: -1, data: req.body});
    // we just send back an empty response.
    // the result we be broadcast to the web socket.
    res.send();
});

app.use(express.static('public'));


var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port);
});

// listen for ws connections
var WebSocketServer = require('ws').Server
, wss = new WebSocketServer({ port: 3001 });

//var ws;
wss.on('connection', function connection(socket) {
    //ws = socket;
    socket.on('message', function incoming(message) {
        if(message == 'abort'){
            if(trainer_process){
                trainer_process.kill('SIGKILL');
            }
        }
        console.log('received: %s', message);
    });
});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
};
