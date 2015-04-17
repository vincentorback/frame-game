var _ = require('lodash');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var express = require('express');
var Habitat = require('habitat');
var monk = require('monk');
var path = require('path');
var request = require('request');
var session = require('express-session');
var util = require('util');



// Set up the application
var app = module.exports = express();



// Define environment
Habitat.load();
var env = new Habitat('daytona');



// Set up database
var db = monk(process.env.MONGOLAB_URI);



// Define app properties
app.set('port', process.env.PORT || 1234);



// Set up views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');



// Serve static files from project root
app.use('/', express.static(path.normalize(__dirname + '/public')));



// Set up session
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  name: 'daytona-clash',
  secret: _.uniqueId(),
  saveUninitialized: true,
  resave: true,
  env: 'dev'
}));



// Set up web sockets
var io = require('socket.io').listen(app.listen(app.get('port')));



// Rendering front view
app.get('/', function (req, res) {
  // Get posts from database.
  var posts = db.get('posts');
  posts.find({}, {sort: {date: -1}}, function (err, posts) {
    if (err) throw err;
    res.render('index', {
      posts: posts
    });
  });
});











function saveAndEmitPost(post) {
  var date = new Date(),
    niceDate = date.getHours() + ':' + date.getMinutes();

  io.emit('chat', {
    message: post.message,
    username: post.username || 'Anonymous',
    date: niceDate
  });

  // Saving to database with timestamp
  posts.insert({
    body: post.message,
    username: post.username || 'Anonymous',
    date: date.getTime(),
    niceDate: niceDate
  });
}


// This is where we’ll recieve messages
// https://api.slack.com/outgoing-webhooks
app.use('/slack-chat', function (req, res) {
  res.json({
    message: 'Hooray! Thanks for the post!'
  });

  saveAndEmitPost({
    message: req.body.text.replace('#simonsays', ''),
    username: req.body.user_name
  });
});




io.sockets.on('connection', function (socket) {

  socket.userid = _.uniqueId();

  socket.emit('connected', {
    id: socket.userid
  });

  socket.on('disconnect', function () {
    
  });

});


