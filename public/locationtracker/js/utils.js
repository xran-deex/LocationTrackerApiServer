(function(app){
    app.log = function(val){
        console.log(val);
    };
    app.APIURL = 'http://valis.strangled.net/locationtracker';
    app.user = m.prop();
    m.request({method:'get', url:app.APIURL+'/user'}).then(function(res){
        if(res.success) {
            app.user(res.result);
            if(app.model)
            app.model.update();
        } else {
            m.route('/login');
        }
    }, function(err){
        console.log(err);
    });
})(app = window.app || {});
