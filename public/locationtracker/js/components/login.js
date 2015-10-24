(function(exports){

    var vm = function(){
        var self = this;
        self.email = m.prop();
        self.password = m.prop();
        self.submit = function(){
            m.request({method:'POST', url:exports.APIURL+'/login', data:{
                email: self.email(),
                password: self.password()
            }}).then(function(res){
                if(res.success){
                    app.user(res.result);
                    m.route('/');
                } else {
                    console.log(res.err);
                }
            });
        };
    };

    var ctrl = function(){
        this.vm = new vm();
    };

    var view = function(ctrl){
        return m('div', {class: 'col s12 l6 offset-l3'}, [
            m('div', {class: 'row'}, [
                m('h1', 'Login'),
                m('div.input-field.col.s12.l12', [
                    m('input[type=email]#email', {onchange: m.withAttr('value', ctrl.vm.email), placeholder: 'Email', class: 'validate', name:'email'}, ctrl.vm.email()),
                    m('label', {for: 'SQL', class: 'active'}, 'Email:')
                ]),
                m('div.input-field.col.s12.l12', [
                    m('input[type=password]#password', {onchange: m.withAttr('value', ctrl.vm.password), placeholder: 'Password', class: 'validate', name:'password'}, ctrl.vm.password()),
                    m('label', {for: 'SQL', class: 'active'}, 'Password:')
                ]),
                m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.submit}, 'Submit', [
                    m('i.material-icons.right', 'send')
                ])
            ])
        ]);
    };

    var component = {
        view: view,
        controller: ctrl
    };

    exports.Login = component;
})(app = window.app || {});
