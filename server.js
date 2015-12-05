var r = require('rethinkdb');
var redis = require("redis");
var client = redis.createClient();

var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({ extended: true }));

var cors = require('cors');
app.use(cors());

var session = require('express-session');
var RedisStore = require('connect-redis')(session);
app.use(session({
    store: new RedisStore({client: client}),
    secret: 'keyboard cat',
    resave: true, saveUninitialized: true
}));

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));

var training = require('./training');
/// routes ///
var user_routes = require('./routes/user');
var wifi_routes = require('./routes/wifi');
var data_routes = require('./routes/data');
var train_routes = require('./routes/train');

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

/// user routes ///
app.get('/locationtracker/user', user_routes.user);
app.post('/locationtracker/login', function(req,res,next){
    passport.authenticate('local', user_routes.login.bind(null, req, res))(req, res, next);
});
app.get('/locationtracker/logout', user_routes.logout);
app.post('/locationtracker/signup', function(req, res){
    auth.signup(req.body, user_routes.signup.bind(null, req, res));
});

/// wifi routes ///
app.post('/locationtracker/wifi', wifi_routes.post);
app.put('/locationtracker/wifi', wifi_routes.put);
app.get('/locationtracker/wifi', wifi_routes.get);
app.delete('/locationtracker/wifi', wifi_routes.delete);

/// data routes ///
app.post('/locationtracker/data', data_routes.post);
app.get('/locationtracker/data', data_routes.get);
app.delete('/locationtracker/data', data_routes.delete);

/// training routes ///
app.get('/locationtracker/train', train_routes.get_all);
app.get('/locationtracker/train/:id', train_routes.get_one);
app.delete('/locationtracker/train/', train_routes.delete);
app.put('/locationtracker/train/', train_routes.update);
app.get('/locationtracker/default', train_routes.get_default);
app.post('/locationtracker/train', function(req, res){
    train_routes.train(req, res, wss);
});

app.post('/locationtracker', function(req, res){
    training.train({id: -1, data: req.body});
    // we just send back an empty response.
    // the result we be broadcast to the web socket.
    res.send();
});


var server = app.listen(3000, function () {
    console.log('Location Tracker API server started...');
});

// listen for ws connections
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 3001 });

wss.on('connection', function connection(socket) {
    socket.on('message', function incoming(message) {
        if(message == 'abort'){
            train_routes.kill_training_process();
        }
    });
});

/**
 *  broadcast messages to all connected clients
 */
wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
};
