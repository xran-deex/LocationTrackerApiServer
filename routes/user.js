/**
 *  User routes
 */
module.exports = {
    user: function(req, res){
        res.json({success:true, result:req.user||{}});
    },
    login: function(err, user, info) {
        if (err) { return next(err); }
        if (!user) { return res.json({success: false, err: info}); }
        req.login(user, function(err) {
            if (err) { return next(err); }
            return res.json({success: true, result: user});
        });
    },
    logout: function(req,res){
        req.logout();
        res.json({success:true});
    },
    signup: function(err, newUser){
        if(err) res.json({success:false, error: err});
        else {
            req.login(newUser.data, function(err){
                if(err) res.json({success:false});
                else res.json({success: true, result: newUser});
            });
        }
    }
};
