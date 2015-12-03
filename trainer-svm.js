//var svm = require('node-svm');
var svmjs = require('svm');

process.on('message', function(m){

    var SVM = new svmjs.SVM();
    SVM.train(m.data, m.labels);
    process.send({
            result: {
                network: SVM.toJSON(), result: ''
            },
            id: m.id
        });
    //var clf = new svm.CSVC();
    // clf.train(m.data).progress(function(rate){
    //     console.log(rate);
    // }).spread(function(model, report){
    //     process.send({
    //         result: {
    //             network: model, result: report
    //         },
    //         id: m.id
    //     });
    //     console.log(report);
    // });

    process.once("SIGTERM", function () {
        process.exit(0);
    });

});
