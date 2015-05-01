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

var Character = require('./classes/Character').Character;



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



var months = ['jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
var players = [];
var deadPlayers = [];
var bullets = [];
var enemies = [];
var globalScore = 0;

var canvasWidth = 1000;
var canvasHeight = 600;

var spanwInterval = 2000; // The time between each enemy spawn.



function getCharacterById(id, type) {
  var i;
  for (i = 0; i < type.length; i += 1) {
    if (type[i].id == id) {
      return type[i];
    }
  }
  return false;
}









// Set up web sockets
var io = require('socket.io').listen(app.listen(app.get('port')));
var spawnTimer;

function spawnEnemy() {
  spawnTimer = _.delay(function() {

    var newX = Math.random() * (canvasWidth - 22),
      newY = -44,
      newEnemy = new Character(newX, newY),
      i,
      existingEnemy;

    newEnemy.id = _.uniqueId('enemy_');

    // Broadcast new enemy to connected socket clients
    io.sockets.emit('new enemy', {
      id: newEnemy.id,
      x: newEnemy.getX(),
      y: newEnemy.getY()
    });

    // Add new enemy to the enemy array
    enemies.push(newEnemy);

    if (spanwInterval > 500) {
      spanwInterval -= 200;
    } else if (spanwInterval > 200) {
      spanwInterval -= 10;
    } else if (spanwInterval > 40) {
      spanwInterval -= 1;
    }

    spawnEnemy();
  }, spanwInterval);
}


io.sockets.on('connection', function (socket) {




  socket.on('start game', function () {
    spawnEnemy();
    io.sockets.emit('start game');
  });




  /** NEW PLAYER HAS JOINED **/

  socket.on('new player', function (data) { // x, y, sprite
    
    if (getCharacterById(data.id, players)) {
      console.log('This player is already added!');
      return;
    }

    // Create a new player
    var newPlayer = new Character(data.x, data.y);
    newPlayer.id = socket.id;

    // Broadcast new player to connected socket clients
    socket.broadcast.emit('new player', {
      id: newPlayer.id,
      x: newPlayer.getX(),
      y: newPlayer.getY()
    });

    // Send existing players to the new player
    var i,
      j,
      k,
      existingPlayer;

    for (i = 0; i < players.length; i += 1) {
      existingPlayer = players[i];

      socket.emit('new player', {
        id: existingPlayer.id,
        x: existingPlayer.getX(),
        y: existingPlayer.getY()
      });
    }

    for (j = 0; j < enemies.lenght; j += 1) {
      existingEnemy = enemies[j];

      socket.emit('new enemy', {
        id: existingEnemy.id,
        x: existingEnemy.getX(),
        y: existingEnemy.getY()
      });
    }

    for (k = 0; k < bullets.lenght; k += 1) {
      existingBullet = bullets[k];

      socket.emit('new bullet', {
        id: existingBullet.id,
        x: existingBullet.getX(),
        y: existingBullet.getY()
      });
    }

    // Add new player to the players array
    players.push(newPlayer);
  });







  /** MOVE PLAYER POSITION **/

  socket.on('move player', function (data) {
    // Find player in array
    var movePlayer = getCharacterById(this.id, players);

    // Player not found
    if (!movePlayer) {
      util.log('Player not found: ' + this.id);
      return;
    };

    // Update player position
    movePlayer.setX(data.x);
    movePlayer.setY(data.y);

    // Broadcast updated position to connected socket clients
    socket.broadcast.emit('move player', {
      id: movePlayer.id,
      x: movePlayer.getX(),
      y: movePlayer.getY()
    });
  });





  // Bullet shot from the client!
  socket.on('new bullet', function (data) {
    if (_.isArray(data)) {
      for (var i = 0; data.length > i; i += 1) {
        var bullet = data[i];
        var newBullet = new Character(bullet.x, bullet.y);
        newBullet.id = bullet.id;

        // Broadcast new player to connected socket clients
        socket.broadcast.emit('new bullet', {
          id: newBullet.id,
          x: newBullet.getX(),
          y: newBullet.getY()
        });

        // Add new bullet to the players array
        bullets.push(newBullet);
      }
    } else {
      var newBullet = new Character(data.x, data.y);
      newBullet.id = data.id;

      // Broadcast new player to connected socket clients
      socket.broadcast.emit('new bullet', {
        id: newBullet.id,
        x: newBullet.getX(),
        y: newBullet.getY()
      });

      // Add new bullet to the players array
      bullets.push(newBullet);
    }
  });






  socket.on('player dead', function (data) {
    var deadPlayer = getCharacterById(data.id, players);

    // Player not found
    if (!deadPlayer) {
      console.log('Dead player not found: ' + data.id);
      return;
    }

    deadPlayer.dead = true;
    deadPlayers.push(deadPlayer);

    // Emit to others that the player is dead
    socket.broadcast.emit('player dead', {
      id: data.id
    });

    io.sockets.emit('update score', globalScore);

    if (deadPlayers.length === players.length) {
      io.sockets.emit('game over');

      globalScore = 0;
      spanwInterval = 2000;
      bullets = [];
      enemies = [];

      console.log('GAME OVER!');
      clearTimeout(spawnTimer);
    }
  });







  socket.on('enemy shot', function (data) {
    var removeBullet = getCharacterById(data.bulletID, bullets);
    var removeEnemy = getCharacterById(data.enemyID, enemies);

    // Bullet not found
    if (!removeBullet) {
      console.log('Bullet not found: ' + data.bulletID);
      return;
    }

    // Enemy not found
    if (!removeEnemy) {
      console.log('Enemy not found: ' + data.enemyID);
      return;
    }

    // Remove enemy and bullet from their arrays
    bullets.splice(bullets.indexOf(removeBullet), 1);
    enemies.splice(enemies.indexOf(removeEnemy), 1);

    // Emit to others about the shot enemy
    socket.broadcast.emit('enemy shot', {
      bulletID: data.bulletID,
      enemyID: data.enemyID,
      x: data.x,
      y: data.y
    });

    // +100 added to the global score
    globalScore += 100;
    io.sockets.emit('update score', globalScore);
  });






  /** When a player disconnects **/
  socket.on('disconnect', function () {
    var removePlayer = getCharacterById(socket.id, players);

    // Player not found, maybe it was just you?
    if (!removePlayer) {
      console.log('Disconnected player not found: ' + socket.id);
      return;
    }

    // Remove player from players array
    players.splice(players.indexOf(removePlayer), 1);

    // Broadcast removed player to connected socket clients
    socket.broadcast.emit('remove player', {
      id: socket.id
    });

    globalScore = 0;
    spanwInterval = 2000;
    bullets = [];
    enemies = [];

    console.log('clear spawning');
    clearTimeout(spawnTimer);
  });






  socket.on('submit score', function (data) {
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

      if ((_.isUndefined(scoreTen)) || (data.score > scoreTen) || (data.score === '0')) {
        highscoreDB.insert({
          score: data.score,
          name: data.name || 'Anonym',
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
          message: data.name + ' fick precis ' + data.score + ' poäng!'
        });

      } else {
        socket.emit('alert', {
          message: 'Ojdå, du kom visst inte med på highscorelistan med dina ' + data.score + ' poäng.... Försök igen!'
        });
      }
    });
  });




});



