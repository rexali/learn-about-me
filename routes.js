var express = require("express");
var MongoClient = require('mongodb').MongoClient;
var userdb = require("./models/userdb");
var bcrypt = require("bcrypt");
var SALT_FACTOR = 10;

var url = "mongodb://localhost:27017/test";

var router = express.Router();

router.get("/signup", function (req, res) {

    res.render("signup");
});

router.get("/", function (req, res, next) {
    if (req.session.views) {
        req.session.views++;
        req.session.cookie.maxAge / 1000;
    } else {
        req.session.views = 1;
    }

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("test");
        dbo.collection("users").find({}).toArray(function (err, user) {
            if (err) throw err;
            res.flash('Welcome Back to Learn About Me', 'success', { position: 'tr', duration: '5000' });
            res.render("index", { users: user, ses: req.session.views });
            // console.log(req.session.views);
            db.close();
        });
    });
});

router.post("/signup", function (req, res, next) {
    // body-parser adds the username and password to req.body
    var usern = req.body.username;
    var pass = req.body.password;
    var createdAt = Date();
    var bio = '';
    var displayName = '';

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
            if (err) { throw err; }
            // Hashes the user’s password
            bcrypt.hash(pass, salt, function (err, hashedPassword) {
                if (err) { throw err; }
                var dbo = db.db("test");
                dbo.collection("users").insertOne({
                    username: usern,
                    password: hashedPassword,
                    createdAt: createdAt,
                    bio: bio,
                    displayName: displayName
                }, function (err, user) {
                    if (err) throw err;
                    console.log("1 Document inserted");
                    db.close();
                });

            });

        });

    });
    res.flash('Registration Successful, login now', 'success', { position: 'tr', duration: '5000' });
    res.redirect('/');
}
);

router.get("/users/:username", function (req, res, next) {

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("test");
        dbo.collection("users").findOne({ username: req.params.username }, function (err, user) {
            if (err) { return next(err); }
            if (!user) { return next(404); }
            res.render("profile", { user: user });
            // console.log(user._id);
            db.close();
        });
    });

});

router.get("/login", function (req, res) {
    res.render("login");
});

router.post("/login", function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("test");
        dbo.collection("users").findOne({ username: req.body.username }, function (err, user) {
            if (err) { throw err; }
            bcrypt.compare(req.body.password, user.password, function (err, isMatch) {
                if (isMatch == true) {
                
                    req.session.username = req.body.username;
                    req.session.password = req.body.password;
                    req.session.bio = user.bio;
                    req.session.displayName = user.displayName; 

                    req.app.locals.currentUser.username = user.username;
                    req.app.locals.currentUser._id = user._id;
                    req.app.locals.currentUser.displayName = user.displayName;
                    req.app.locals.currentUser.bio = user.bio;
                    req.app.locals.currentUser.password = req.body.password;
                    console.log(req.session.password);

                    res.flash('Login Successful', 'success', { position: 'tr', duration: '5000' });
                    res.redirect('/');
                } else {
                    res.type('text/plain');
                    res.redirect('/login');
                }

            });
        });
        db.close();
    });
});


router.get("/logout", function (req, res) {
    req.app.locals.currentUser.username = '';
    req.logOut;
    res.flash('Good Bye', 'info', { position: 'tr', duration: '5000' });
    res.redirect("/");


});

// router.get('/edit', function (req, res) {
//     if (userdb.checkPassword(req.app.locals.currentUser.username, req.app.locals.currentUser.password)) {
//         req.app.locals.currentUser.bio = user.bio;
//         req.app.locals.currentUser.displayName = user.displayName;
//         res.flash('Welcome Back', 'success', { position: 'tr', duration: '5000' });
//         res.render("edit");

//     } else {
//         res.redirect('/login');
//     }
// });
router.get("/edit", function (req, res) {
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("test");
        dbo.collection("users").findOne({ username: req.app.locals.currentUser.username }, function (err, user) {
            if (err) { throw err; }
            bcrypt.compare(req.app.locals.currentUser.password, user.password, function (err, isMatch) {
                if (isMatch) {
                    req.app.locals.currentUser.bio = user.bio;
                    req.app.locals.currentUser.displayName = user.displayName;
                    res.flash('Welcome Back', 'success', { position: 'tr', duration: '5000' });
                    res.render("edit");
                } else {
                    res.redirect('/login')
                }
            });
        });
    });
});

router.post("/edit", function (req, res, next) {

    var query = {
        username: req.app.locals.currentUser.username,
        _id: req.app.locals.currentUser._id
    };

    var obj = {
        $set: {
            displayName: req.body.displayName,
            bio: req.body.bio
        }
    };

    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("test");
        dbo.collection("users").updateOne(query, obj, function (err, user) {
            if (err) throw err;
            res.redirect("/edit");
            // res.render("index", { users: user });
            console.log(req.app.locals.currentUser.username);
            db.close();
        });
    });
    res.flash('Update Successful', 'success', { position: 'tr', duration: '5000' });
});

module.exports = router;