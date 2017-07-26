const fs = require('fs'),
    path = require('path'),
    express = require('express'),
    mustacheExpress = require('mustache-express'),
    passport = require('passport'),
    TwitterStrategy = require('passport-twitter').Strategy,
    session = require('express-session'),
    bodyParser = require('body-parser'),
    models = require("./models"),
    mongoose = require('mongoose'),
    expressValidator = require('express-validator'),
    User = models.User;

const app = express();

mongoose.connect('mongodb://localhost/test');

app.engine('mustache', mustacheExpress());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache')
app.set('layout', 'layout');
app.use('/static', express.static('static'));

passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_API_KEY,
        consumerSecret: process.env.TWITTER_API_SECRET,
        callbackURL: "http://localhost:3000/auth/twitter/callback"
    },
    function (token, tokenSecret, profile, done) {
        User.findOrCreate({
                provider: profile.provider,
                providerId: profile.id
            }, {
                displayName: profile.displayName
            },
            function (err, user) {
                if (err) {
                    return done(err);
                }
                done(null, user);
            });
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(expressValidator());


app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function (req, res, next) {
    res.locals.user = req.user;
    next();
})

app.get('/', function (req, res) {
    res.render("index");
})

// Redirect the user to Twitter for authentication.  When complete, Twitter
// will redirect the user back to the application at
//   /auth/twitter/callback
app.get('/auth/twitter', passport.authenticate('twitter'));

// Twitter will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
        successRedirect: '/',
        failureRedirect: '/login'
    }));

app.get('/login/', function (req, res) {
    res.redirect("/auth/twitter");
})

app.get('/logout/', function (req, res) {
    req.logout();
    res.redirect('/');
});

const requireLogin = function (req, res, next) {
    if (req.user) {
        next()
    } else {
        res.redirect('/login/');
    }
}

app.get('/secret/', requireLogin, function (req, res) {
    res.render("secret");
})

app.listen(3000, function () {
    console.log('Express running on http://localhost:3000/.')
});
