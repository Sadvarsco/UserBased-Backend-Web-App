/**********************************************************/
/* Simple webpage to post messages to one another. The site
/* use a simple sqlite database that stores the user info,
/* the post info, and the user sessions information.
/* Visitors of the site can access user basic information 
/* and post information using localhost:8080/user/:id and
/* localhost:8080/post/:id. If user wants to post their
/* own post they will need to either log in or create a
/* new user. Once logged in they can create post, and
/* logout.
/*
/**********************************************************/

//required dependencies
var express = require('express');
var router = express.Router();

// initalize sequelize with session store and passport for
// local authentication. Once logged in a 'session' is created
// to keep that person logged in
const Sequelize = require('Sequelize');
const Op = Sequelize.Op;
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var SequelizeStore = require('connect-session-sequelize')(session.Store);

// create database, ensure 'sqlite3' in your package.json,
// use sequelize to connect and setup
const sequelize = new Sequelize('Data_chinook', 'dee', null, {
  host: 'localhost',
  dialect: 'sqlite',
  storage: './db/Chinook.sqlite'
});

// configure session 
router.use(session({
  secret: 'abbazabba',
  store: new SequelizeStore({
    db: sequelize,
    cookie: {
      maxAge: 60 * 60 * 1000 //max age 1hr
    }
  }),
  resave: false
}));

//Using LocalStrategy for authentication and logging in
passport.use(new LocalStrategy(
  function (username, password, done) {
    //Take username and password and find a matching user
    // in the database.
    User.findOne({
      where: {
        [Op.and]: {
          Username: username,
          Password: password
        }
      }
    }).catch(function (err) {
      console.log("111");
      // If error redirect to failed;
      res.redirect('/failed');
    }).then(user => {
      //if no error, assign login by ID
      if (user == null) {
        res.redirect('/failed');
      } else {
        return done(null, user.ID);
      }
    });
  }
));

//Use passport to store session and keep user loggin in
passport.serializeUser(function (user, done) {
  done(null, user);
});
passport.deserializeUser(function (user, done) {
  done(null, user);
});

/**********************************************************/
/* User: input and stored in SQLite database, no 
/* Database name: Users
/* Schema: 
/*    ID (Integer, primary key, auto increment, not null), 
/*    FirstName (string, not null)
/*    LastName (string, not null)
/*    Username (string, not null)
/*    password (string, not null)
/* Input: FirstName, Lastname, Username, password
/**********************************************************/
const User = sequelize.define(
  'Users', {
    ID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    FirstName: Sequelize.STRING,
    LastName: Sequelize.STRING,
    Username: Sequelize.STRING,
    Password: Sequelize.STRING
  }, {
    freezeTableName: true, //do not modify table names
    timestamps: false //do not add timestamps
  }
);

/**********************************************************/
/* Post: input and stored in SQLite database, no 
/* Database name: Posts
/* Schema: 
/*    ID (Integer, primary key, auto increment, not null), 
/*    Author ID (Integer, foreign key, not null)
/*    Message (string, 340 characters max)
/*    Timestamp (Date, default value now)
/* Input: Message
/* Author ID is determined by the session logged in
/**********************************************************/
const Post = sequelize.define(
  'Posts', {
    ID: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    AuthorID: Sequelize.INTEGER,
    Message: Sequelize.STRING,
    Timestamp: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  }, {
    freezeTableName: true, //do not modify table names
    timestamps: false //do not add timestamps
  }
);

/**********************************************************/
/* Linking tables
/* User links to Post 1:m
/**********************************************************/
User.hasMany(Post, {
  foreignKey: 'ID'
});
Post.belongsTo(User, {
  foreignKey: 'authorID'
});

//Initialize Passport and authentication
router.use(passport.initialize());
router.use(passport.session());
router.use(function (req, res, next) {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});


/* GET home page. */
// Home Page, includes nav bar, header, all post ordered randomly
router.get('/', function (req, res, next) {
  //find and post all messages
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  let allpost = [];
  Post.findAll({
    attributes: ['ID', 'User.Username', 'Message', 'Timestamp'],
    include: [User]
  }).then(posts => {
    allpost = posts;
    shuffle(allpost);
    res.render('index', {
      title: 'Express',
      postitems: allpost, passUserID
    });
  })
});
/* GET home page. */
// Home Page, includes nav bar, header, all post ordered randomly
router.get('/index', function (req, res, next) {
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  let allpost = [];
  Post.findAll({
    attributes: ['ID', 'User.Username', 'Message', 'Timestamp'],
    include: [User]
  }).then(posts => {
    allpost = posts;
    shuffle(allpost);
    res.render('index', {
      title: 'Express',
      postitems: allpost,
      passUserID
    });
  })
});

//Get Newuser page
router.get('/newuser', function (req, res, next) {
  res.render('newuser', {
    title: 'Create User'
  });
});

//Post Newuser page
//Creates a new user, takes in 4 inputs.
//Username must be unique, all fields need to be 
//at least 3 characters long.
router.post('/newuser', (req, res) => {
  let fName = '';
  let lName = '';
  let uName = '';
  let pword = '';
  fName = req.body.firstName;
  lName = req.body.lastName;
  uName = req.body.username;
  pword = req.body.password;

  fName = fName.trim();
  lName = lName.trim();
  uName = uName.trim();

  // only checking each field as at least 3 characters
  if (fName.length > 2 && lName.length > 2 && uName.length > 2 && pword.length > 2) {
    User.create({
      FirstName: fName,
      LastName: lName,
      Username: uName,
      Password: pword
    }).catch(function (err) {
      // handle error;
      console.log(err);
      res.redirect('/failed');
    }).then(user => {
      //Once user is created, login and return to index
      req.login(user.ID, function (err) {
        res.redirect('/index');
      });
    });
  }
});

//Get login page
//Allow user to login, looks through database to see if user exist
router.get('/login', function (req, res, next) {
  res.render('login', {
    title: 'login'
  });
});

//Post login page
//Allow user to login, looks through database to see if user exist.
//If user does exist return to login page, if not, redirect to failed.
//Uses passport to login.
router.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/failed'
}));

//Logout
// destroys any session, redirects to index page
router.get('/logout', function (req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/');
});

//Get User ID
//based on ID, get user that matches that id.
//If no user exist, an empty page is shown
router.get('/user/:id', function (req, res, next) {
  let aID = parseInt(req.params.id);
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  User.find({
    attributes: ['ID', 'FirstName', 'LastName', 'Username'],
    where: {
      ID: `${aID}`
    }
  }).then(output => {
    res.render('user', {
      output,
      passUserID
    });
  });
});

//Get Newpost
// Creates a new past, uses user ID as author ID.
// If user is not logged in, redirected to login page
router.get('/newpost', function (req, res, next) {
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  res.render('newpost', {
    title: 'New Post', passUserID
  });
});

//Post Newpost
// Creates a new past, uses user ID as author ID.
// If user is not logged in, redirected to login page
// Message must not be empty
router.post('/newpost', (req, res) => {
  let aMessage = '';
  let aID = req.user;
  aMessage = req.body.message;
  aMessage = aMessage.trim();

  //Check if user is logged in. if not redirected to login page
  //If user is logged in, but message is invalid, redirect to failed page
  if (req.isAuthenticated()) {
    if (!(aMessage === undefined && aMessage == '' && aID === undefined && aID == '')) {
      Post.create({
        AuthorID: aID,
        Message: aMessage
      }).catch(function (err) {
        // handle error;
        console.log(err);
        res.redirect('/failed');
      }).then(function () {
        res.redirect('/success');
      })
    }
  } else {
    res.redirect('/login');
  }
});

//Get Update page
// Creates a new past, uses user ID as author ID.
// If user is not logged in, redirected to login page
router.get('/update/:id', function (req, res, next) {
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  let pID = parseInt(req.params.id);
  Post.find({
    attributes: ['ID', 'AuthorID', 'Message', 'Timestamp'],
    where: {
      ID: `${pID}`
    },
    include: [User]
  }).then(output => {
    if (output.AuthorID == req.user) {
      res.render('update', {
        output,
        passUserID
      });
    } else {
      res.redirect('/login');
    }
  });
});

//update post
// Creates a new past, uses user ID as author ID.
// If user is not logged in, redirected to login page
// Message must not be empty
router.post('/update/:id', (req, res) => {
  let aMessage = '';
  let aID = req.user;
  let pID = parseInt(req.params.id);
  aMessage = req.body.message;
  aMessage = aMessage.trim();

  //Check if user is logged in. if not redirected to login page
  //If user is logged in, but message is invalid, redirect to failed page
  if (req.isAuthenticated()) {
    if (!(aMessage === undefined && aMessage == '' && pID === undefined && pID == '')) {
      Post.update({
        Message: `${aMessage}`
      }, {
        where: {
          ID: `${pID}`
        },
        returning: false
      }).catch(function (err) {
        // handle error;
        res.redirect('/failed');
      }).then(function () {
        res.redirect('/success');
      })
    }
  } else {
    res.redirect('/login');
  }
});

//Get Post ID
//based on ID, get post that matches that id.
//If no post exist, an empty page is shown
router.get('/post/:id', function (req, res, next) {
  let cUser = '';
  let cUserCheck = false;
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  let aID = parseInt(req.params.id);
  Post.find({
    attributes: ['ID', 'User.Username', 'AuthorID', 'Message', 'Timestamp'],
    where: {
      ID: `${aID}`
    },
    include: [User]
  }).then(output => {
    if (output.AuthorID == req.user) {
      cUserCheck = true;
    }
    res.render('post', {
      currentUser: cUserCheck,
      output,
      passUserID
    });
  });
});

//Get Delete ID
//based on ID, get post that matches that id.
//If no post exist, an empty page is shown
router.get('/delete/:id', function (req, res) {
  let pID = parseInt(req.params.id);
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  Post.find({
    attributes: ['ID', 'User.Username', 'AuthorID', 'Message', 'Timestamp'],
    where: {
      ID: `${pID}`
    },
    include: [User]
  }).then(output => {
    res.render('delete', {
      output,
      passUserID
    });
  });
});

//Post Delete ID
//based on ID, get post that matches that id.
//If no post exist, an empty page is shown. Deletes post
router.post('/delete/:id', function (req, res) {
  let pID = parseInt(req.params.id);
  console.log("1");
  Post.find({
    attributes: ['AuthorID'],
    where: {
      ID: `${pID}`
    }
  }).then(output => {
    console.log("2");
    if (output.AuthorID == req.user) {
      console.log("3");
      Post.destroy({
        where: {
          ID: `${pID}`
        }
      }).then(function () {
        console.log("4");
        res.redirect('/success');
      })
    } else {
      console.log("51");
      res.redirect('/failed');
    }
  });
});

//Profile, finds all user with matching ID, finds post from that user.
//currently 
router.get('/profile', verifyuser(), function (req, res, next) {
  //find user, then post all by that user
  User.findAll({
    attributes: ['ID', 'firstName', 'lastName', 'Username'],
    where: {
      ID: `${req.user}`
    }
  }).then(output => {
    let allpost = [];
    Post.findAll({
      attributes: ['ID', 'User.Username', 'Message', 'Timestamp'],
      where: {
        ID: `${req.user}`
      },
      include: [User]
    }).then(posts => {
      res.render('profile', {
        title: 'My Profile',
        postitems: allpost
      });
    })
  });
});

//Dummy page to handle all successful actions including creating a post,
// creating a new user.
router.get('/success', function (req, res, next) {
  let passUserID = '';
  if (req.isAuthenticated()) {
    passUserID = req.user;
  }
  res.render('success', {
    title: 'success',
    passUserID
  });
});

//Dummy page to handle all failed actions including creating a post,
// creating a new user.
router.get('/failed', function (req, res, next) {
  res.render('failed', {
    title: 'failed'
  });
});

//Function to verify user for post and looking at user profile.
function verifyuser() {
  return (req, res, next) => {
    console.log(`req.session.passport.user: ${JSON.stringify(req.session.passport)}`);

    if (req.isAuthenticated()) return next();
    res.redirect('/login')
  }
}

//uses to shuffle array
function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

module.exports = router;