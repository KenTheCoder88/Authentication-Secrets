//jshint esversion:6

//applies the required packages
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

//creates new app instant using express.js
const app = express();

//sets ejs
app.set('view engine', 'ejs');

//uses bodyparser and express.js
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//connects mongoose to mongo database
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//creates schema for Users in mongoose
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//accesses environment variable from .env file and password entered by user and encrypts password field
userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

//assigns mongoose model to User
const User = mongoose.model("User", userSchema);

//gets /home route
app.get("/", function(req, res) {
  //renders home.ejs
  res.render("home");
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

//chains the .post and other methods for the /register route
app.route("/register")
  //posts new Register page
  .post(function(req, res) {
    //creates new User
    const newUser = new User({
      email: req.body.username,
      password: req.body.password
    });
    //saves new User
    newUser.save(function(err) {
      if(err) {
        console.log(err);
      } else {
        //renders secrets.ejs for User
        res.render("secrets");
      };
    });
  });

  //chains the .post and other methods for the /login route
  app.route("/login")
    //posts new Login page
    .post(function(req, res) {
      //assigns entered username and entered password to username and password respectively
      const username = req.body.username;
      const password = req.body.password;
      //authenticates entered login info
      User.findOne({email: username}, function(err, foundUser) {
        if(err) {
          console.log(err);
        } else {
          //checks if entered username matches any entries in the database
          if(foundUser) {
            //checks if entered password matches any entries in the database
            if(foundUser.password === password) {
              //renders secrets.ejs for authenticated User
              res.render("secrets");
            };
          };
        };
      });
    });

//starts app on the designated server port
app.listen(3000, function() {
  console.log("Server started on port 3000");
});
