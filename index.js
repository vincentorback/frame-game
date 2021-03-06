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





// Render styles
app.use(require('./controllers/styles'));




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



var months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
var users = [];


// Set up web sockets
var io = require('socket.io').listen(app.listen(app.get('port')));
io.sockets.on('connection', function (socket) {

  users.push(socket.id); 

  io.sockets.emit('updateUsers', users);





  socket.on('savescore', function (scoreData) {
    var date = new Date(),
      niceHour = date.getHours() > 9 ? date.getHours() : (0 + '' + date.getHours()),
      niceMinutes = date.getMinutes() > 9 ? date.getMinutes() : (0 + '' + date.getMinutes()),
      week = getWeekNumber(date),
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
          name: scoreData.name || 'Anonymous',
          date: date.getTime(),
          niceDate: niceDate
        });

        highscoreDB.find({}, {sort: {score: -1}}, function (err, data) {
          if (err) throw err;

          socket.emit('alert', {
            message: 'Yay you got on the highscore!!',
            openDialog: true,
            highscore: data
          });
        });

        socket.broadcast.emit('alert', {
          message: scoreData.name + ' just got ' + scoreData.score + ' points!'
        });

      } else {
        socket.emit('alert', {
          message: 'Woops, looks like you didn’t make the highscore with your ' + scoreData.score + ' points.... Try again!'
        });
      }
    });
  });



  socket.on('disconnect', function() {
    users.splice(users.indexOf(socket.id), 1);
    io.sockets.emit('updateUsers', users);
  });

});




function getWeekNumber(d) {
  // Copy date so don't modify original
  d = new Date( + d);
  d.setHours(0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  // Get first day of year
  var yearStart = new Date(d.getFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  // Return array of year and week number
  return [d.getFullYear(), weekNo];
}