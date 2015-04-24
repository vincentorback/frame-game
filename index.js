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
  name: 'daytona-zombies',
  secret: _.uniqueId(),
  saveUninitialized: true,
  resave: true,
  env: 'dev'
}));



// Set up web sockets
var io = require('socket.io').listen(app.listen(app.get('port')));



// Rendering front view
app.use('/', function (req, res) {
  // Get posts from database.
  highscore.find({}, {sort: {score: -1}}, function (err, highscore) {
    if (err) throw err;

    // Remove scores after the 10th
    if (highscore.length > 10) {
      io.emit('test', highscore.slice(highscore.length - 10, 10));
      //highscore.remove(highscore.slice(highscore.length - 10, 10));
    }

    res.render('index', {
      highscore: highscore.length ? highscore : false
    });
  });
});





// API call to get current highscore
app.get('/api/highscore', function (req, res) {
  // Get posts from database.
  highscore.find({}, {sort: {score: -1}}, function (err, highscore) {
    if (err) throw err;
    res.json(highscore);
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

    if ((_.isUndefined(scoreTen)) || (scoreData.score > scoreTen) || (scoreData.score === '0')) {

      console.log(scoreTen);

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
          message: 'Hurra du kom med i highscore!',
          openDialog: true,
          highscore: highscore
        });
      });

      socket.broadcast.emit('alert', {
        message: scoreData.name + ' fick precis ' + scoreData.score + ' poäng!'
      });

      // Emit to slack :)
      // request({
      //   uri: 'https://hooks.slack.com/services/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',
      //   method: 'POST',
      //   body: JSON.stringify({
      //     username: 'Daytona Zombie Challenge',
      //     text: scoreData.name + ' fick precis ' + scoreData.score + ' poäng i Daytona Zombie Challenge!'
      //   })
      // });

    } else {
      socket.emit('alert', {
        message: 'Ojdå, du kom visst inte med på highscorelistan med dina ' + scoreData.score + ' poäng.... <br> Försök igen!'
      });
    }

  });
});


