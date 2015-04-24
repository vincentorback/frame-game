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
var highscoreDB = db.get('highscore');



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
  name: 'daytona-zombies',
  secret: _.uniqueId(),
  saveUninitialized: true,
  resave: true,
  env: 'dev'
}));



// Set up web sockets
var io = require('socket.io').listen(app.listen(app.get('port')));






// API call to get current highscore
app.get('/api/highscore', function (req, res) {
  // Get posts from database.
  highscoreDB.find({}, {sort: {score: -1}}, function (err, data) {
    if (err) throw err;
    res.json(data);
  });
});





// Rendering front view
app.use('/', function (req, res) {
  // Get posts from database.
  highscoreDB.find({}, {sort: {score: -1}}, function (err, data) {
    if (err) throw err;

    // Remove scores after the 10th
    if (data.length > 10) {
      _.forEach(data.slice(10, data.length), function (score, i) {
        highscoreDB.remove(score)
      });
    }

    res.render('index', {
      highscore: data.length ? data : false
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

    highscoreDB.find({}, {sort: {score: -1}}, function (err, data) {
      if (err) throw err;
      if (data && data[9]) {
        scoreTen = data[9].score;
      }

      if ((_.isUndefined(scoreTen)) || (scoreData.score > scoreTen) || (scoreData.score === '0')) {

        highscoreDB.insert({
          score: scoreData.score,
          name: scoreData.name || 'Anonym',
          date: date.getTime(),
          niceDate: niceDate
        });

        highscoreDB.find({}, {sort: {score: -1}}, function (err, data) {
          if (err) throw err;

          socket.emit('alert', {
            message: 'Hurra du kom med i highscore!',
            openDialog: true,
            highscore: data
          });
        });

        socket.broadcast.emit('alert', {
          message: scoreData.name + ' fick precis ' + scoreData.score + ' poäng!'
        });

      } else {
        socket.emit('alert', {
          message: 'Ojdå, du kom visst inte med på highscorelistan med dina ' + scoreData.score + ' poäng.... Försök igen!'
        });
      }

    });

  });
});


