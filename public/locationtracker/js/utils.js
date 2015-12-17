(function(app){
    app.log = function(val){
        console.log(val);
    };
    app.APIURL = '//valis.strangled.net/locationtracker';
    var scheme = location.protocol.indexOf("https") > -1 ? "wss" : "ws";
    app.WEBSOCKET_URL = scheme + "://valis.strangled.net/locationtrackersocket";
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
