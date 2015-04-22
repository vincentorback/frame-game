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
var highscore = db.get('highscore');



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
  highscore.find({}, {sort: {score: -1}}, function (err, highscore) {
    if (err) throw err;
    res.render('index', {
      highscore: highscore.length ? highscore : false
    });
  });
});









var months = ['jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

io.sockets.on('connection', function (socket) {

  socket.on('savescore', function (scoreData) {
    var date = new Date(),
      niceHour = date.getHours() > 9 ? date.getHours() : (0 + '' + date.getHours()),
      niceMinutes = date.getMinutes() > 9 ? date.getMinutes() : (0 + '' + date.getMinutes()),
      niceDate = niceHour + ':' + niceMinutes + ' - ' + date.getDate() + ' ' + months[date.getMonth()],
      scoreTen;

    highscore.find({}, {sort: {score: -1}}, function (err, highscore) {
      if (err) throw err;
      if (highscore && highscore[9]) {
        scoreTen = highscore[9].score;
      }
    });

    if ((_.isUndefined(scoreTen)) || (scoreData.score > scoreTen) || (scoreData.score === 0)) {
      if (scoreTen) {
        highscore.remove({score: scoreTen}); // Remove lowest score
      }

      highscore.insert({
        score: scoreData.score,
        name: scoreData.name || 'Anonym',
        date: date.getTime(),
        niceDate: niceDate
      });

      highscore.find({}, {sort: {score: -1}}, function (err, highscore) {
        if (err) throw err;

        socket.emit('alert', {
          message: 'Hurra du är med i highscore listan!',
          openDialog: true,
          highscore: highscore
        });
      });

      

      socket.broadcast.emit('alert', {
        message: scoreData.name + ' fick precis ' + scoreData.score + ' poäng!'
      });

    } else {
      socket.emit('alert', {
        message: 'Ojdå, du kom visst inte med i highscore-listan med dina ' + scoreData.score + ' poäng... <br> Försök igen!'
      });
    }

  });
});


