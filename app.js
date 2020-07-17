//jshint esversion:6

//loads the required packages
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

//creates new app instant using express.js
const app = express();

//sets ejs
app.set("view engine", "ejs");

//uses bodyparser, express.js, express-session, MongoStore and passport.js packages
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({secret: "Our little secret.", resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

//connects mongoose to mongo database
mongoose.connect("mongodb+srv://admin-ken:Test123@cluster0-osmig.mongodb.net/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//sets useCreateIndex in the mongoose package to true
mongoose.set("useCreateIndex", true);

//creates schema for Users in mongoose
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

//adds passport-local-mongoose package to userSchema as a plugin
userSchema.plugin(passportLocalMongoose);

//adds passport-local-mongoose package to userSchema as a plugin
userSchema.plugin(findOrCreate);

//assigns mongoose model to User
const User = mongoose.model("User", userSchema);

//creates local login authentication strategy from passport.js
passport.use(User.createStrategy());

//serializes User identification
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

//Deserializes User identification
passport.deserializeUser(function(id, done) {
  //finds current user in mongDB
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//uses passport to authenticate users using a Google account
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://agile-brook-49599.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    //finds current user or creates new user in mongDB
    User.findOrCreate({googleId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));

//gets /home route
app.get("/", function(req, res) {
  //renders home.ejs
  res.render("home");
});

//gets /auth/google route
app.get("/auth/google",
//authenticates user using Google
passport.authenticate("google", {scope: ["profile"]}));

//gets /auth/google/secrets route
app.get("/auth/google/secrets",
//authenticates user locally
  passport.authenticate("google", {failureRedirect: "/login"}),
  function(req, res) {
    //redirects to the /secrets route
    res.redirect("/secrets");
  });

//gets /login route
app.get("/login", function(req, res) {
  //renders login.ejs
  res.render("login");
});

//gets /register route
app.get("/register", function(req, res) {
  //renders register.ejs
  res.render("register");
});

//gets /secrets route
app.get("/secrets", function(req, res) {
  //finds all users with submitted secrets
  User.find({"secret": {$ne: null}}, function(err, foundUsers) {
    if(err) {
      console.log(err);
    } else {
      //renders secrets.ejs and all users with submitted secrets
      res.render("secrets", {usersWithSecrets: foundUsers});
    };
  });
});

//gets /submit route
app.get("/submit", function(req, res) {
  if(req.isAuthenticated()) {
    //renders submit.ejs
    res.render("submit");
  } else {
    //redirects to the /login route
    res.redirect("/login");
  };
});

//gets /logout route
app.get("/logout", function(req, res) {
  req.logout();
  //redirects to the /home route
  res.redirect("/");
});

//chains the .post and any other methods for the /register route
app.route("/register")
  //posts new register page
  .post(function(req, res) {
    //finds current user in mongDB
    User.register({username: req.body.username}, req.body.password, function(err, user) {
      if(err) {
        console.log(err);
        //redirects to the /register route
        res.redirect("/register");
      } else {
        //authenticates newly registered User
        passport.authenticate("local")(req, res, function() {
          //redirects to the /secrets route
          res.redirect("/secrets");
        });
      };
    });
  });

  //chains the .post and any other methods for the /login route
  app.route("/login")
    //posts new Login page
    .post(function(req, res) {
      //creates new User
      const user = new User({
        username: req.body.username,
        password: req.body.password
      });
      //authenticates User login credentials
      req.login(user, function(err) {
        if(err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function() {
            //redirects to the /secrets route
            res.redirect("/secrets");
          });
        };
      });
    });

    //chains the .post and any other methods for the /submit route
    app.route("/submit")
      //posts new submit page
      .post(function(req, res) {
        //saves the secret the user submitted
        const submittedSecret = req.body.secret;
        //finds current user in mongDB and save submitted secrets to their account
        console.log(req.user.id);
        //finds current user in mongDB
        User.findById(req.user.id, function(err, foundUser) {
          if(err) {
            console.log(err);
          } else {
            if(foundUser) {
              //sets found user's secret as the submitted secret
              foundUser.secret = submittedSecret;
              //saves secret to the user
              foundUser.save(function() {
                //redirects to the /secrets route
                res.redirect("/secrets");
              });
            };
          };
        });
      });

//starts app on the designated server port
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
};
app.listen(port, function() {
  console.log("Server has started successfully.");
});
