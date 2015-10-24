var synaptic = require('synaptic');

var Network = synaptic.Network;
var Architect = synaptic.Architect;
var Trainer = synaptic.Trainer;

process.on('message', function(m){
    console.log('Num outputs: ' + m.data[0].output.length);
    network = new Architect.Perceptron(29, 29, m.data[0].output.length);
    trainer = new Trainer(network);
    var training_result = trainer.train(m.data, {
        rate: 0.1,
        iterations: 20000,
        error: 0.005,
        log: 100,
        schedule: {
            every: 10, // repeat this task every 500 iterations
            do: function(data) {
                console.log(data.error);
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
