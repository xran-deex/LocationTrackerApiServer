var synaptic = require('synaptic');

var Network = synaptic.Network;
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;
var abort = false;
process.on('message', function(m){
    // console.log('Num outputs: ' + m.data[0].output.length);
    // console.log(m.data);
    // console.log(m.data[0].input.length);
    // //var num = m.data[0].input.length;
    // m.data.forEach(function(d){
    //     //console.log(d.input.length);
    // });

    network = new Architect.Perceptron(m.data[0].input.length, m.data[0].input.length, m.data[0].output.length);
    trainer = new Trainer(network);
    var training_result = trainer.train(m.data, {
        rate: 0.1,
        iterations: 2000000,
        error: 0.005,
        log: 100,
        schedule: {
            every: 10, // repeat this task every 500 iterations
            do: function(data) {
                console.log(data.error, data.iterations);
                process.send({log:data});
            }
        },
        cost: Trainer.cost.CROSS_ENTROPY
    });

    process.once("SIGTERM", function () {
        process.exit(0);
    });
    process.send({
        result: {
            network: network.toJSON(), result:training_result
        },
        id: m.id
    });
});
