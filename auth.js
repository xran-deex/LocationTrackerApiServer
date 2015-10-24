var r = require('rethinkdb');
var db_config = require('./config');
var bcrypt = require('bcryptjs');
//var uuid = require('node-uuid');

var dbConnection = {
    host: db_config.host,
    db: db_config.db
};

function Auth(sessions){
    var self = this;
    this.sessions = sessions;
    /**
     *  Handles errors.
     */
    var handleError = function(err, callback){
        var result = {
            success: false,
            message: err,
            data: {}
        };
        callback({
            result: result
        });
    };
    var handleUserLookup = function(err, cur, data, callback){
        var self = this;
        if (err) {
            handleError(err, callback);
        } else {
            // ok, this should only be one item
            cur.next(function(err, res) {
                if (err) {
                    handleError(err, callback);
                } else {
                    bcrypt.compare(data.password, res.password, function(err, hashResult){
			console.log(hashResult);
                        if(!hashResult)
                            handleError('Invalid password', callback);
                        else
                        handleHashCompare(err, res, callback);
                    });
                }
            });
        }
    }

    /**
     *  Handles inserting a new user in the database
     *  \param err - an error object
     *  \param res - the insert result
     *  \param callback - a callback to execute when complete
     */
    var handleInsert = function(err, res, callback){
        var result;
        if (err) {
            handleError(err, callback);
        } else {

            if (err) {
                handleError(err, callback);
            } else {
                res = res.changes[0].new_val;
                //just send back the id
                result = {
                    success: true,
                    data: {
                        id: res.id,
                        name: res.name,
                        email: res.email
                    }
                };
                callback(null, result);
            }
        }
    }

    var handleHashCompare = function(err, res, callback){

        var result = {
            success: true,
	    data: {
                id: res.id,
		apikey: res.apikey,
                name: res.name,
                email: res.email
            }
        };
        //var sessionId = createAndStoreSession(result.data);//, conn);
        callback(err, result);//, sessionId);
    }

    var createAndStoreSession = function(id, conn){
        var sessionId = r.uuid();
        self.sessions[sessionId] = {
            user: id
        };
        //sessions[sessionId] = '';
        //r.table('sessions').insert({user_id:id, sessionId: sessionId}).run(conn, function(err, res){});
        return sessionId;
    }

    this.login = function(data, callback){
        var self = this;
        r.connect(dbConnection, function(err, conn) {
            if (err) {
                handleError(err, callback);
            } else {
                r.table(db_config.userTable).filter({
                    email: data.email
                }).run(conn, function(err, cur) {
                    handleUserLookup(err, cur, data, callback);
                });
            }
        });
    };

    this.signup = function(data, callback){
        var self = this;
        r.connect(dbConnection, function(err, conn) {
            if (err) {
                handleError(err, callback);
            } else {
                // hash the incoming password.
                bcrypt.hash(data.password, 10, function(err, hash_res){
                    // update the password with the new hashed password and insert in the database
                   data.password = hash_res;
                   r.table(db_config.userTable).insert(data, {returnChanges: true}).run(conn, function(err, res) {
                       handleInsert(err, res, callback);
                   });
               });
           }
       });
    };
}

module.exports = Auth;
