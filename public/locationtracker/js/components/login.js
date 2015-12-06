(function(exports){

    var vm = function(){
        var self = this;
        self.email = m.prop();
        self.password = m.prop();
        self.submit = function(){
            self.wait(true);
            setTimeout(function(){
                m.request({method:'POST', url:exports.APIURL+'/login', data:{
                    email: self.email(),
                    password: self.password()
                }}).then(function(res){
                    if(res.success){
                        self.wait(false);
                        app.user(res.result);
                        m.route('/');
                        Materialize.toast('Login successful', 2000);
                    } else {
                        console.log(res.err);
                        self.wait(false);
                        Materialize.toast('Incorrect username or password', 2000);
                    }
                });
            },0);
        };
        self.wait = m.prop(false);
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
                    m('label', {for: 'email', class: 'active'}, 'Email:')
                ]),
                m('div.input-field.col.s12.l12', [
                    m('input[type=password]#password', {onchange: m.withAttr('value', ctrl.vm.password), placeholder: 'Password', class: 'validate', name:'password'}, ctrl.vm.password()),
                    m('label', {for: 'password', class: 'active'}, 'Password:')
                ])
            ]),
            m('div.row.flex-container', [
                m('div.btnspinner', [
                (function(){
                    if(!ctrl.vm.wait())
                    return m('button.btn.waves-effect.waves-light', {onclick: ctrl.vm.submit}, 'Submit', [
                        m('i.material-icons.right', 'send')
                    ]);
                })(),
                (function(){
                    if(ctrl.vm.wait())
                    return m('div.preloader-wrapper.big.active.spinner', [
                        m('div.spinner-layer.spinner-blue-only', [
                            m('div.circle-clipper.left', [
                                m('div.circle')
                            ]),
                            m('div.gap-patch', [
                                m('div.circle')
                            ]),
                            m('div.circle-clipper.right', [
                                m('div.circle')
                            ])
                        ])
                    ]);
                })()
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
