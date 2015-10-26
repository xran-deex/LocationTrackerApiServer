(function(app){


})(app = window.app || {});

var NavLinks = [
    {
        name:'Home',
        href:'#/'
    },
    {
        name:'Manage Locations',
        href:'#/manage',
        loggedIn: true
    },
    {
        name:'Trained Locations',
        href:'#/locations',
        loggedIn: true
    },
    {
        name:'Logout',
        href:'#/logout',
        loggedIn: true
    },
    {
        name:'Login',
        href:'#/login',
        loggedIn: false
    },
    {
        name: 'Signup',
        href:'#/signup',
        loggedIn: false
    }
];

var navLinks = function(){
    return NavLinks.filter(function(nav){
        if(nav.name === 'Home') return nav;
        if(app.user() && app.user().email){
            return nav.loggedIn;
        } else {
            return !nav.loggedIn;
        }
    });
};

m.route.mode = "hash";
m.mount(document.getElementById('nav'), m.component(app.Nav, {nav_items: navLinks}));
m.route(document.getElementById('app'), '/', {
    '/': app.Page1,
    '/login': app.Login,
    '/signup': app.Signup,
    '/manage': app.ManageLocations,
    '/locations': app.TrainedLocations,
    '/logout': {
        controller: function(){
            m.request({method:'get', url:app.APIURL+'/logout'}).then(function(res){
                m.route('/login');
            });
        },
        view: function(ctrl){}
    }
});
