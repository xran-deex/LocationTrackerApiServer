(function(exports){

    var vm = function(){
        var self = this;
        self.wait = m.prop(false);
        self.email = m.prop();
        self.password = m.prop();
        self.password2 = m.prop();
        self.pass2valid = m.prop(true);
        self.validate = function(val){
            console.log(val);
            self.password2(val);
            if(self.password() !== self.password2()){
                self.pass2valid(false);
            } else {
                self.pass2valid(true);
            }
        };

        self.submit = function(){
            if(self.password() !== self.password2()){
                alert("Passwords don't match");
                return;
            }
            self.wait(true);
            setTimeout(function(){
                m.request({method:'POST', url:exports.APIURL+'/signup', data:{
                    email: self.email(),
                    password: self.password()
                }}).then(function(res){
                    if(res.success){
                        self.wait(false);
                        app.user(res.result);
                        m.route('/');
                    } else {
                        console.log(res.err);
                    }
                });
            }, 0);
        };
    };

    var ctrl = function(){
        this.vm = new vm();
    };

    var view = function(ctrl){
        return m('div', {class: 'col s12 l6 offset-l3'}, [
            m('div', {class: 'row'}, [
                m('h1', 'Signup'),
                m('div.input-field.col.s12.l12', [
                    m('input[type=email]#email', {onchange: m.withAttr('value', ctrl.vm.email), placeholder: 'Email', class: 'validate', name:'email'}, ctrl.vm.email()),
                    m('label', {for: 'email', class: 'active'}, 'Email:')
                ]),
                m('div.input-field.col.s12.l12', [
                    m('input[type=password]#password', {onchange: m.withAttr('value', ctrl.vm.password), placeholder: 'Password', class: 'validate', name:'password'}, ctrl.vm.password()),
                    m('label', {for: 'password', class: 'active'}, 'Password:')
                ]),
                m('div.input-field.col.s12.l12', [
                    m('input[type=password]#password2', {onkeyup: m.withAttr('value', ctrl.vm.validate), placeholder: 'Password', class: ctrl.vm.pass2valid() ? 'validate' : 'validate invalid', name:'password2'}, ctrl.vm.password2()),
                    m('label', {for: 'password2', class: 'active'}, 'Retype Password:')
                ])
            ]),
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
        ]);
    };

    var component = {
        view: view,
        controller: ctrl
    };

    exports.Signup = component;
})(app = window.app || {});
