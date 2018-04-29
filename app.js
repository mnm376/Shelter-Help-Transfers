//app.js
const bcrypt = require('bcrypt');
const Q = require('q');
var d3 = require("d3");

// express/handlebars setup
var express = require('express');
var app = express();
var path = require('path');
var hbs = require('hbs');

// mongoose setup
var bodyParser = require('body-parser');
require('./db.js');
var db = require('./db.js');
var mongoose = require('mongoose');
var User = mongoose.model("User");
var Request = mongoose.model("Request");
var Animal = mongoose.model("Animal");

//express-static
app.set('view engine', 'hbs');
var publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: false }));

//session
const session = require("express-session");
const sessionOptions = {
  secret: 'secret cookie',
  resave: true,
  saveUninitialized: true
};
app.use(session(sessionOptions));


function drawData() {
  let data;
  Animal.find({}, function(err, animal) {
    data = animal;
  });

  console.log(data);
  let container = d3.select("#chart");
  let items =  container
      .selectAll("g")
      .data(data)
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
  items.append("rect")
      //.style("opacity", 0.3)
      .attr("height", d => d.height)
      .attr("width", d => d.width)
      .attr("fill", d => d.color)
  //items.append("text")
  //  .text(d => d.Country)
  //  .attr("text-anchor", "middle")
  //  .attr("alignment-baseline", "central")
}

//Auth via passport
const passport = require("passport");
const LocalStrategy = require("passport-local");
app.use(passport.initialize());
app.use(passport.session());

//Source for: https://www.ctl.io/developers/blog/post/user-authentication-database-cloud
localReg = function (username, password, state) {
  const deferred = Q.defer();
  User.findOne({'username' : username})
  .then(function (result) {
    if (null !== result) {
      console.log("Username already in database", result.username);
      deferred.resolve(false); // username exists
    }
    else {
      const hash = bcrypt.hashSync(password, 8);
      const addUser = new User({
        "username": username,
        "password": hash,
        "completedRequests": [],
        "pendingRequests": [],
        "myAnimals": [],
        "myRequests": []
      });
      console.log("Adding user: ", username, " to database");
      // collection.insert(user)
      //   .then(function () {
      //     db.close();
      //     deferred.resolve(user);
      //   });

      addUser.save()
      .then(function () {
        deferred.resolve(addUser);
      });
    }
  });
  return deferred.promise;
};

localAuth = function (username, password) {
  const deferred = Q.defer();

  User.findOne({'username' : username})
  .then(function (result) {
    if (null === result) {
      console.log("Line 86", username, " not found in database");
      deferred.resolve(false);
    }
    else {
      const hash = result.password;
      console.log("Line 93: Login Succesful for: " + result.username);
      if (bcrypt.compareSync(password, hash)) {
        deferred.resolve(result);
      } else {
        console.log("Line 98: Login Unsuccesful");
        deferred.resolve(false);
      }
    }
  //db.close();
  });

  return deferred.promise;
};

// Passport session integration functions.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the LocalStrategy within Passport to login/”signin” users.
passport.use("login", new LocalStrategy(
  {passReqToCallback : true}, //allows us to pass back the request to the callback
  function(req, username, password, done) {
    localAuth(username, password)
    .then(function (user) {
      if (user) {
        console.log("Line 124: Login Succesful for: " + user.username);
        req.session.success = "You are successfully logged in " + user.username + "!";
        done(null, user);
      }
      if (!user) {
        console.log("Line 129: Login Unsuccesful");
        req.session.error = "Could not log user in. Please try again.";
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

// Use the LocalStrategy within Passport to register/"signup" users.
passport.use("register", new LocalStrategy(
  {passReqToCallback : true},
  function(req, username, password, done) {
    localReg(username, password)
    .then(function (user) {
      if (user) {
        console.log("REGISTERED: " + user.username);
        req.session.success = "You are successfully registered and logged in " + user.username + "!";
        done(null, user);
      }
      if (!user) {
        console.log("COULD NOT REGISTER");
        req.session.error = "That username is taken.";
        done(null, user);
      }
    })
    .fail(function (err){
      console.log(err.body);
    });
  }
));

//source for: https://stackoverflow.com/questions/38820251/what-is-req-isauthenticated-passportjs
function checkLoggedIn(req, res, next) {
  if (req.isAuthenticated()) { 
    return next();
  }
  req.session.error = "Please sign in!";
  res.redirect("/login");
}

//to be used for removing requests after update
let del = function(userReq, reqObj) {
  userReq.splice(userReq.indexOf(reqObj), 1);
};


//routes
//source for layout structure (my hw05): https://github.com/nyu-csci-ua-0480-008-spring-2018/mnm376-homework05/blob/master/app.js
//added loggedIn variable to display navbar

//when localhost is called, redirect to home
app.get("/", function(req, res){ res.redirect("/home");});

//homepage
app.get('/home', function(req, res) {
  Animal.find({}, function(err, animal) {
    if (req.isAuthenticated()){res.render('index', {layout:'layout', obj:animal, loggedIn: true});}
    else{res.render('index', {layout:'layout', obj:animal, loggedIn: false});}
  });
});

//displaying chart in test
app.get('/chart', function(req, res) {
  res.render('chart', {layout:'layout', code: drawData()});
});

//login page
app.get("/login", function(req, res){res.render("login");});

app.post("/login", passport.authenticate("login", {
  successRedirect: "/home",
  failureRedirect: "/login"
  })
);

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/home");
});

app.get("/register", function(req, res){ res.render("register");});

app.post("/register", passport.authenticate("register", {
  successRedirect: "/home",
  failureRedirect: "/register"
  })
);

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/home");
});

// app.use('/animals/add', checkLoggedIn);
// app.get('/animals/add', function(req, res) {
//   res.render('add', {layout:'add-layout'});
// });
// app.get('/animals/add1', function(req, res) {
//   res.render("legacy.hbs");
// });

//test without layout
app.use('/animals/add', checkLoggedIn);
app.get('/animals/add', function(req, res) {res.render("add", {loggedIn: true});});

//save feature taken from: http://jvers.com/csci-ua.0480-spring2018-008/slides/12/mongoose.html#/12
app.post('/animals/add', function(req, res) {
  let addAnimal = new Animal({
    name: req.body.name,
    description: req.body.description,
    ownerID: req.user._id,
    user: req.user._id
  });
  addAnimal.save(function(err){
    User.findOneAndUpdate({_id: req.user._id}, {$push: {myAnimals: addAnimal._id}}, function(err){ res.redirect('/');});
  });
});

//source from: http://mongoosejs.com/docs/populate.html
app.use("/myAnimals",checkLoggedIn);
app.get("/myAnimals", function(req, res){
  let totalAnimals = 0;
  User.find({}, function(err, users) {
      totalAnimals = users.reduce(function(acc, curr){return acc + curr.myAnimals.length;}, 0);
  });
  User.findOne({_id: req.user._id})
    .populate('myAnimals')
    .exec(function(err, user) {res.render("myAnimals", {layout: 'layout', loggedIn: true, Animals: user.myAnimals, totalAnimals:totalAnimals});});
});

app.get("/animals/:slug", function(req, res){
  Animal.findOne({slug: req.params.slug}, function(err, animals) {
    if(err) {console.log(err);}
    //else
    res.render("animals", {loggedIn: true, animals: animals})
  });
});


app.use("/animals/:slug/addRequest",checkLoggedIn);
app.get("/animals/:slug/addRequest", function(req, res){
  Animal.findOne({slug: req.params.slug}, function(err, animals) {
    if(err) {console.log(err);}
    //else
    res.render("addRequest", {loggedIn: true, animals: animals})
  });
});

app.post("/animals/:slug/addRequest", function(req, res){
  Animal.findOne({slug: req.params.slug}, function(err, animals) {
    if(err) {console.log(err);}
    const addRequest = new Request({
      user: req.user._id,
      message: req.body.message,
      transferred: false,
      animal: animals._id
    });
    addRequest.requestID = addRequest._id;
    addRequest.save(function(err){
      if(err) {console.log(err);} 
      else {
        User.findOneAndUpdate({_id: req.user._id}, {$push:{pendingRequests: addRequest._id}}, function(err){
          if(err) {console.log(err);}
          else {
            User.findOneAndUpdate({_id: animals.user}, {$push:{myRequests: addRequest._id}}, function(err, obj){
              if(err) {console.log(err);}
              else {res.redirect("/");}
            });
          }
        });
      }
    });
  });
});

app.use("/myRequests", checkLoggedIn);
app.get("/myRequests", function(req, res){
  let pendingNum = 0;
  let transferredNum = 0;
  User.find({}, function(err, users) {
      pendingNum = users.reduce(function(acc, curr){return acc + curr.pendingRequests.length;}, 0);
      transferredNum = users.reduce(function(acc, curr){return acc + curr.completedRequests.length;}, 0);
  });
  User.findOne({_id: req.user._id}).populate('pendingRequests').populate('pendingRequests.animal').populate('completedRequests').populate('completedRequests.animal')
    .exec(function(error, user) {
    res.render("myRequests", {pendingTransfers: user.pendingRequests, completedTransfers: user.completedRequests, transferred: transferredNum, pending: pendingNum, loggedIn: true});});
});

app.use("/myRequests/:requestID",checkLoggedIn);
app.get("/myRequests/:requestID", function(req, res){
  Request.findOne({requestID: req.params.requestID})
    .populate("animal")
    .exec(function(err, request) {
      if(request.user +"" === req.user._id) {
        res.render("requests", {request: request, animal: request.animal, loggedIn: true});
      } else {res.render("requests", {loggedIn: false});}
    });
});

app.use("/requestsReceived",checkLoggedIn);
app.get("/requestsReceived", function(req, res){
  User.findOne({_id: req.user._id})
    .populate('myRequests')
    .exec(function(error, user) {res.render("requestsReceived", {myRequests: user.myRequests, loggedIn: true});});
});

app.use("/completeRequest/:requestID",checkLoggedIn);
app.get("/completeRequest/:requestID", function(req, res){
  Request.findOne({requestID: req.params.requestID})
    .populate("animal")
    .exec(function(err, request) {
      if(request.animal.user + "" === req.user._id) {
        res.render("completeRequest", {loggedIn: true, request: request, animal: request.animal});
      } else {res.render("completeRequest", {loggedIn: false});}
    });
});

app.post("/completeRequest/:requestID", function(req, res){
  if(req.body.transferred === "true") {
    Request.findOneAndUpdate({requestID: req.params.requestID}, {transferred: true}, function(err, request) {
      User.findById(request.user, function(err, user){
        if(err) {console.log(err);} 
        else {
          console.log(user);
          user.completedRequests.push(request._id);
          del(user.pendingRequests, request._id);
          user.save(function(err){
            if(err) {console.log(err);} 
            else {
              User.findById(req.user._id, function(err, userCurrent){
                if(err) {console.log(err);} 
                else {
                  del(userCurrent.myRequests, request._id);
                  userCurrent.save(function(err){
                    if(err) {console.log(err);} 
                    else {res.redirect("/requestsReceived");}
                  });
                }
              });
            }
          });
        }
      });
    });
  }
});

//app.listen(3000);
app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
})



// //for d3 research http://bl.ocks.org/michellechandra/0b2ce4923dc9b5809922
// //I think I will use this to see where animals are being data entered
// //from the most. /
// //to see which community are/can use this app to full potential
// //can create the map but need to figure out how to use mongodb in it
// //need to know how to translate data into the map based on location
// //longitude/latitude?
// //create a svg (or png?) in html documents
// const WIDTH = 800
// const HEIGHT = 400
// const MARGIN = {
//     left: 50,
//     top: 30,
//     bottom: 40,
//     right: 30
// }

// const CHART_BODY_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
// const CHART_BODY_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom; 
// //in main
// function main(country) {
//     d3.select("#map")
//         .attr("width", WIDTH)
//         .attr("height", HEIGHT)
//     createMap();
// }

// createMap(){
//     let container = d3.select(containerID)
    
//     // Create Projection
//     let projection = d3
//         .geoNaturalEarth1()
//         //.geoOrthographic()
//         .fitSize([WIDTH, HEIGHT-50], mapData)
//         .translate([WIDTH/2, HEIGHT/2])
//         .rotate([200,0])
    
//     //Create geoPath 
//     let path = d3.geoPath()
//         .projection(projection);
//     //Draw Sphere - Border Around the map
//     container.append("path")
//         .datum({type: "Sphere"})
//         .attr("fill", "white")
//         .attr("stroke", "black")
//         .attr("strike-width", 1)
//         .attr("d", path)
// }

