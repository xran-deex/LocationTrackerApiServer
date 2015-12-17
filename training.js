var r = require('rethinkdb');
var dbConfig = require('./config');
var db_config = {
    db: dbConfig.db,
    host: dbConfig.host
};

// spawn a new training process and listen for messages.
// messages will be broadcast to connected websockets
var cp = require('child_process');
var trainer_process;
var train = function(data, wss){
    trainer_process = cp.fork(__dirname+'/trainer-process.js');
    trainer_process.on('message', function(m){

        if(m.result) {
            r.connect(db_config).then(function(conn){
                r.table('trained_locations').get(m.id).update({
                    network: m.result.network,
		            info: m.result.result,
                    type: 'nn'
                }).run(conn);
            });
            wss.broadcast(JSON.stringify({'result': m.result, id: m.id}));
        }
        try{
            if(m.log) {
                wss.broadcast(JSON.stringify({'log': m.log, id: data.id}));
            }
        } catch(e){
            console.log(e);
            trainer_process.kill('SIGKILL');
        }
    });
    trainer_process.send(data);
    return trainer_process;
};

var trainsvm = function(data, wss){
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
    return trainer_process;
};

module.exports = {
    train: train,
    trainsvm: trainsvm
};
