(function(app){


    var model = function(){
        var self = this;
        this.title = m.prop('Location Tracker');
        this.update = function(){};
    };

    app.vm = function(){
        this.model = app.model = new model();
        this.msg = m.prop();
        this.welcomeMsg = function(){
            if(app.user().email){
                return 'Welcome ' + app.user().email;
            } else {
                return '';
            }
        };
    };

    // the app controller
    var ctrl = function(){
        this.vm = new app.vm();
    };

    var view = function(ctrl){
        return [
            m('h1', ctrl.vm.model.title()),
            m('p', {class: 'caption'}, 'Geofencing indoors'),
            m('h5', ctrl.vm.welcomeMsg())
        ];
    };

    app.Page1 = {
        controller: ctrl,
        view: view
    };

})(app = window.app || {});
