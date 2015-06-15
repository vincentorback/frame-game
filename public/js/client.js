(function (window) {
  'use strict';


  var Game = {};



  // Create the canvas
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  setCanvasSize();
  document.body.appendChild(canvas);


  canvas.classList.add('Canvas');


  var devicePixelRatio = window.devicePixelRatio || 1,
    backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                        ctx.mozBackingStorePixelRatio ||
                        ctx.msBackingStorePixelRatio ||
                        ctx.oBackingStorePixelRatio ||
                        ctx.backingStorePixelRatio || 1,
    ratio = devicePixelRatio / backingStoreRatio;




  function setCanvasSize() {
    var winWidth = window.innerWidth,
      winHeight = window.innerHeight,
      canvasWidth = (winWidth > 1000) ? 1000 : winWidth,
      canvasHeight = (winHeight > 600) ? 600 : winHeight;

    if (devicePixelRatio !== backingStoreRatio) {
      canvasWidth = canvasWidth * ratio;
      canvasHeight = canvasHeight * ratio;

      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = canvasHeight + 'px';

      ctx.scale(ratio, ratio);
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    Game.width = canvasWidth;
    Game.height = canvasHeight;
  }



  $(window).on('resize', function () {
    setCanvasSize();
  });
  



  
  var Player = function (startX, startY, color) {
    this.x = startX;
    this.y = startY;
    this.sprite = new Sprite('images/sprites.png', [0, 0], [22, 44], 12, [2, 3, 4, 5, 6, 7, 0, 1]),
    this.powerUp = false;
    this.dead = false;
    this.color = color || '#FFFFFF';
  };

  var Bullet = function (startX, startY, color, dir) {
    this.x = startX;
    this.y = startY;
    this.dir = dir || 'right';
    this.size = [5, 5];
    this.color = color || '#FFFFFF';

    this.render = function (ctx) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size[0], 0, 2 * Math.PI);
      ctx.fillStyle = this.color;
      ctx.fill();
    };
  };

  var Enemy = function (startX, startY) {
    this.x = startX;
    this.y = startY;
    this.sprite = new Sprite('images/sprites.png', [0, 66], [22, 44], 22, [1, 0, 7, 6, 5, 4, 3, 2]);
  };

  var Token = function (startX, startY) {
    this.x = startX;
    this.y = startY;
    this.sprite = new Sprite('images/sprites.png', [2, 156], [18, 18], 1, [0])
  };

  var Explosion = function (startX, startY) {
    this.x = startX;
    this.y = startY;
    this.sprite = new Sprite('images/sprites.png', [22, 132], [22, 22], 22, [0, 1, 2], null, true);
  };



  var localPlayer;
  var playerColor = '#FFFFFF';
  var remotePlayers = [];
  var bullets = [];
  var remoteBullets = [];
  var enemies = [];
  var explosions = [];
  var tokens = [];

  var lastFire = Date.now();
  var gameTime = 0;
  var isGameOver;

  var localScore = 0;
  var globalScore = 0;

  // Speed in pixels per second
  var playerSpeed = 200;
  var bulletSpeed = 500;
  var enemySpeed = 100;
  var tokenSpeed = 50;

  var soundOn = true;






  // Let’s get all of them elements!
  var $body = $(document.body);

  var $alert = $('.js-alert');

  var $localScore = $('.js-localScore');
  var $globalScore = $('.js-globalScore');

  var $online = $('.js-online');
  var $gameOver = $('.js-gameOver');
  
  var $dialog = $('.js-dialog');
  var $showDialog = $('.js-showDialog');
  var $closeDialog = $('.js-closeDialog');

  var $playButton = $('.js-playButton');
  var $pauseButton = $('.js-pauseButton');
  var $resetButton = $('.js-resetButton');
  var $readyButton = $('.js-readyButton');

  var $form = $('#highschore-form');
  var $formName = $('#highschore-name');
  var $highscoreTable = $('#highscore-table');

  var $soundToggle = $('.js-soundToggle');
  var $colorPick = $('.js-colorPick');
  var $stepButton = $('.js-stepButton');

  var activeStep;








  $stepButton.on('click', function () {
    $('#step-' + activeStep).removeClass('is-active');

    activeStep = $(this).data('step');
    $('#step-' + activeStep).addClass('is-active');
  });




  $colorPick.on('click', function () {
    playerColor = $(this).val();
  });






  // We need to load all your assets before starting the game so that they can be immediately used.
  // Like this, we can cache our resources.
  resources.load([
    'images/sprites.png'
  ]);
  resources.onReady(function () {
    $('#step-1').addClass('is-active');
    activeStep = 1;
  });




  var successSound = new Howl({
    urls: ['../audio/success.wav']
  });

  var laserSound = new Howl({
    urls: ['../audio/laser.wav'],
    volume: 0.1
  });

  var powerSound = new Howl({
    urls: ['../audio/power-up.wav']
  });

  var scoreSound = new Howl({
    urls: ['../audio/coin.wav']
  });

  var deathSound = new Howl({
    urls: ['../audio/died.wav'],
    volume: 0.1
  });

  Howler.iOSAutoEnable = false;




  $soundToggle.on('click', function () {
    if (soundOn) {
      soundOn = false;
      Howler.mute();
      $soundToggle.removeClass('is-active');
    } else {
      soundOn = true;
      Howler.unmute();
      $soundToggle.addClass('is-active');
    }
  });




  // Set up websocket connection
  var socket = io.connect();








  /*
  MAIN GAME LOOP

  The update function takes the time that has changed since the last update.
  The game will run wildly different on various computers and platforms,
  so we need to update your scene independently of framerate.

  This is achieved by calculating the time since last update (in seconds),
  and expressing all movements in pixels/second units.
  Movement then becomes x += 50 * dt, or '50 pixels per second'.
  */
  var lastTime;
  var frameInterval;
  function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0; // time since last update

    update(dt);
    render();

    lastTime = now;
    frameInterval = window.requestAnimationFrame(main);
  }



  function pause(state) {
    state = state || $pauseButton.hasClass('is-active');

    if (state) {
      window.cancelAnimationFrame(frameInterval);
    } else {
      frameInterval = window.requestAnimationFrame(main);
    }

    $pauseButton.toggleClass('is-active');
  }




  // Reset game to original state
  function reset() {
    // $gameOver.hide();

    isGameOver = false;
    gameTime = 0;

    localScore = 0;
    globalScore = 0;

    if (localPlayer) {
      localPlayer.dead = false;
    }

    $localScore.text(localScore);
    $globalScore.text(globalScore);

    //remotePlayers = [];
    remoteBullets = [];
    enemies = [];
    bullets = [];
    tokens = [];
  }









  function readyState() {
    if (playerColor) {

      localPlayer = new Player(5, Math.random() * (Game.height - 44), playerColor);
      localPlayer.id = socket.id;

      socket.emit('new player', localPlayer);
      socket.emit('player ready', localPlayer);
    } else {
      showAlert('How did you not pick a color? Contact sys-admin!');
    }

    $readyButton.prop('disabled', true);
  }






  function startGame() {
    reset();
    lastTime = Date.now();
    main();

    $playButton.hide();

    $body.addClass('is-playing');
    showAlert('Move with the keyboard arrows and shoot with the spacebar!');
  }




  // Update game objects
  function update(dt) {
    gameTime += dt;

    handleInput(dt);
    updateEntities(dt);
    checkCollisions();
  }




  // Handle all inputs
  // in `js/input.js` you’ll find the helpers
  function handleInput(dt) {
    if (localPlayer.dead === true) {
      return;
    }

    if (input.isDown('DOWN') || input.isDown('s')) {
      localPlayer.y += playerSpeed * dt;
      socket.emit('move player', {
        y: localPlayer.y,
        x: localPlayer.x
      });
    }

    if (input.isDown('UP') || input.isDown('w')) {
      localPlayer.y -= playerSpeed * dt;
      socket.emit('move player', {
        y: localPlayer.y,
        x: localPlayer.x
      });
    }

    if (input.isDown('LEFT') || input.isDown('a')) {
      localPlayer.x -= playerSpeed * dt;
      socket.emit('move player', {
        y: localPlayer.y,
        x: localPlayer.x
      });
    }

    if (input.isDown('RIGHT') || input.isDown('d')) {
      localPlayer.x += playerSpeed * dt;
      socket.emit('move player', {
        y: localPlayer.y,
        x: localPlayer.x
      });
    }

    if (input.isDown('SPACE') && !isGameOver && Date.now() - lastFire > 100) {
      var x = localPlayer.x + localPlayer.sprite.size[0] / 2;
      var y = localPlayer.y + localPlayer.sprite.size[1] / 2;

      if (localPlayer.powerUp === true) {
        var upBullet = new Bullet(x, y, localPlayer.color, 'up');
        var rightBullet = new Bullet(x, y, localPlayer.color, 'right');
        var downBullet = new Bullet(x, y, localPlayer.color, 'down');

        upBullet.id = _.uniqueId('bullet_');
        rightBullet.id = _.uniqueId('bullet_');
        downBullet.id = _.uniqueId('bullet_');

        socket.emit('new bullet', [
          {
            y: y,
            x: x,
            id: upBullet.id,
            color: localPlayer.color
          },
          {
            y: y,
            x: x,
            id: rightBullet.id,
            color: localPlayer.color
          },
          {
            y: y,
            x: x,
            id: downBullet.id,
            color: localPlayer.color
          }
        ]);

        bullets.push(upBullet, rightBullet, downBullet);

      } else {
        var newBullet = new Bullet(x, y, localPlayer.color, 'right');

        newBullet.id = _.uniqueId('bullet_');

        socket.emit('new bullet', {
          y: y,
          x: x,
          id: newBullet.id,
          color: localPlayer.color
        });

        bullets.push(newBullet);
      }
      
      laserSound.play();

      lastFire = Date.now();
    }
  }





  function updateEntities(dt) {
    // Update the player sprite animation
    if (localPlayer.dead === false) {
      localPlayer.sprite.update(dt);
    }

    // Update all bullet
    var i = 0;
    for (i; i < bullets.length; i += 1) {
      var bullet = bullets[i];

      switch(bullet.dir) {
        case 'up': bullet.y -= bulletSpeed * dt; break;
        case 'down': bullet.y += bulletSpeed * dt; break;
        case 'left': bullet.x -= bulletSpeed * dt; break;
        default: bullet.x += bulletSpeed * dt;
      }

      

      // Remove the bullet if it goes offscreen
      if (bullet.y < 0 || bullet.y > Game.height || bullet.x > Game.width) {
        bullets.splice(i, 1);
        i--;
      }
    }



    // Update all bullet
    var i = 0;
    for (i; i < remoteBullets.length; i += 1) {
      var bullet = remoteBullets[i];

      switch(bullet.dir) {
        case 'up': bullet.y -= bulletSpeed * dt; break;
        case 'down': bullet.y += bulletSpeed * dt; break;
        case 'left': bullet.x -= bulletSpeed * dt; break;
        default: bullet.x += bulletSpeed * dt;
      }
      

      // Remove the bullet if it goes offscreen
      if (bullet.y < 0 || bullet.y > Game.height || bullet.x > Game.width) {
        remoteBullets.splice(i, 1);
        i--;
      }
    }




    // Update all enemies
    var i = 0;
    for (i; i < enemies.length; i += 1) {
      enemies[i].x -= enemySpeed * dt;
      enemies[i].sprite.update(dt);

      // Remove if offscreen
      if (-(enemies[i].sprite.size[0]) > enemies[i].x) {
        enemies.splice(i, 1);
        i--;
      }
    }







    // Update all token
    var i = 0;
    for (i; i < tokens.length; i += 1) {
      tokens[i].y += tokenSpeed * dt;
      tokens[i].sprite.update(dt);

      // Remove if offscreen
      if (tokens[i].y + tokens[i].sprite.size[0] > Game.height) {
        tokens.splice(i, 1);
        i--;
      }
    }







    // Update all explosions
    var i = 0;
    for (i; i < explosions.length; i += 1) {
      explosions[i].sprite.update(dt);

      // Remove if animation is done
      if (explosions[i].sprite.done) {
        explosions.splice(i, 1);
        i--;
      }
    }
  }




  // Collision calculations :)
  function collides(x, y, r, b, x2, y2, r2, b2) {
    return !(r <= x2 || x > r2 || b <= y2 || y > b2);
  }

  function boxCollides(x, y, size, x2, y2, size2) {
    return collides(
      x, y,
      x + size[0], y + size[1],
      x2, y2,
      x2 + size2[0], y2 + size2[1]
    );
  }


  var tokenTimeout;

  function checkCollisions() {
    checkPlayerBounds();

    // Run collision detection for all enemies and bullets
    for (var i = 0; i < enemies.length; i += 1) {
      var x = enemies[i].x;
      var y = enemies[i].y;
      var enemySize = enemies[i].sprite.size;

      for (var j = 0; j < bullets.length; j += 1) {
        var x2 = bullets[j].x;
        var y2 = bullets[j].y;
        var bulletSize = bullets[j].size;

        if (boxCollides(x, y, enemySize, x2, y2, bulletSize)) {

          socket.emit('enemy shot', {
            enemyID: enemies[i].id,
            bulletID: bullets[j].id,
            x: x,
            y: y
          });

          // Remove the enemy
          enemies.splice(i, 1);
          i--;

          localScore += 100;
          $localScore.text(localScore);

          var newExplosion = new Explosion(x, y);

          // Add an explosion
          explosions.push(newExplosion);

          // Remove the bullet and stop this iteration
          bullets.splice(j, 1);
          break;
        }
      }

      if (boxCollides(x, y, enemySize, localPlayer.x, localPlayer.y, localPlayer.sprite.size)) {
        if (!isGameOver && (localPlayer.dead === false)) {
          socket.emit('player dead', {
            id: localPlayer.id
          });
          localPlayer.dead = true;
          localGameOver();

          deathSound.play();
        }
      }
    }




    // Run collision detection for all enemies and bullets
    var i = 0;
    for (i; i < tokens.length; i += 1) {
      var x = tokens[i].x;
      var y = tokens[i].y;
      var tokenSize = tokens[i].sprite.size;

      if (boxCollides(x, y, tokenSize, localPlayer.x, localPlayer.y, localPlayer.sprite.size)) {
        // Remove the token and stop this iteration
        tokens.splice(i, 1);

        clearTimeout(tokenTimeout);

        localPlayer.powerUp = true;
        localPlayer.sprite.speed = 24;
        tokenTimeout = setTimeout(function () {
          localPlayer.powerUp = false;
          localPlayer.sprite.speed = 12;
        }, 5000);
      }
    }



  }

  function checkPlayerBounds() {
    if (localPlayer.dead === true) {
      return;
    }

    // Check bounds
    if (localPlayer.x < 0) {
      localPlayer.x = 0;
    } else if (localPlayer.x > Game.width - localPlayer.sprite.size[0]) {
      localPlayer.x = Game.width - localPlayer.sprite.size[0];
    }

    if (localPlayer.y < 0) {
      localPlayer.y = 0;
    } else if (localPlayer.y > Game.height - localPlayer.sprite.size[1]) {
      localPlayer.y = Game.height - localPlayer.sprite.size[1];
    }
  }



  // Draw everything
  function render() {
    ctx.fillStyle = '#EEEEEE';
    ctx.fillRect(0, 0, Game.width, Game.height);

    // Render the localPlayer if the game isn't over
    if (!isGameOver && (localPlayer.dead === false)) {
      renderEntity(localPlayer);
    }

    if (remotePlayers.length) {
      renderEntities(remotePlayers);
    }

    renderEntities(remoteBullets);
    renderEntities(bullets);
    renderEntities(enemies);
    renderEntities(tokens);
    renderEntities(explosions);
  }

  function renderEntities(list) {
    for (var i = 0; i < list.length; i += 1) {
      renderEntity(list[i]);
    }    
  }

  function renderEntity(entity) {
    ctx.save();
    if (entity.sprite) {
      ctx.translate(entity.x, entity.y);
      entity.sprite.render(ctx);
    } else {
      entity.render(ctx, localPlayer.color);
      ctx.translate(entity.x, entity.y);
    }
    ctx.restore();
  }










  // Game over
  function localGameOver() {
    isGameOver = true;
    showAlert('Meh! You died....');
  }

  function globalGameOver() {
    //$gameOver.show();
    // $form.show();
    isGameOver = true;

    window.setTimeout(function () {
      //$body.removeClass('is-playing');
      //$gameOver.show();

      successSound.play();

      showAlert('Game over! You got ' + localScore + ' points and your team scored ' + globalScore + ' points!');
    }, 200);

    window.setTimeout(function () {
      $playButton
        .text('Play again!')
        .show();
    }, 5000);
  }








  $readyButton.on('click', readyState);







  // Highscore form
  $form.on('submit', function (event) {
    socket.emit('submit score', {
      name: $formName.val(),
      score: localScore
    });

    $form.hide();

    event.preventDefault();
  });






  // Highscore dialog
  $showDialog.on('click', function() {
    $dialog.show();
  });
  
  $closeDialog.on('click', function() {
    $dialog.hide();
  });





  /*
  # Average word per minute
  Third-grade students = 150
  Eight grade students = 250
  Average college student = 450
  Average “high level exec” = 575
  Average college professor = 675
  Speed readers = 1,500
  World speed reading champion = 4,700
  Average adult: 300
  */
  function showAlert(message) {
    var totalWords,
      wordsPerMillisecond,
      totalReadingTime,
      wordsPerMinute = 250,
      messageTest;

    messageTest = message.replace(/<\/?[^>]+(>|$)/g, ''); // Remove any HTML-tags
    totalWords = messageTest.split(/\s+/g).length; // Split up in words
    wordsPerMillisecond = wordsPerMinute / 60000;
    totalReadingTime = Math.floor(totalWords / wordsPerMillisecond);
    totalReadingTime = (totalReadingTime > 10000) ? totalReadingTime : 10000;

    $alert
      .html(message)
      .addClass('is-active');

    _.delay(function () {
      $alert.removeClass('is-active');
    }, totalReadingTime);
  }






  function updateOnlineCount() {
    if (remotePlayers.length) {
      $online.text((remotePlayers.length + 1) + ' players are online'); // remotePlayers + you
    } else {
      $online.text('');
    }
  }







  $playButton.on('click', function () {
    socket.emit('start game');
    //document.location.reload(true);
  });

  $pauseButton.on('click', function () {
    pause();
  });

  $resetButton.on('click', reset);







  // Get players, bullet, enemy etc by ID
  function characterById(id, list) {
    var i;
    for (i = 0; i < list.length; i += 1) {
      if (list[i].id === id) {
        return list[i];
      }
    }
    return false;
  }









  socket.on('disconnect', function (data) {
    console.log('Disconnected from socket server...');
    showAlert('Looks like the server crashed...');
  });



  socket.on('alert', function (data) {
    showAlert(data.message);
  });



  socket.on('start game', function () {
    startGame();
  });



  socket.on('game over', globalGameOver);



  socket.on('new player', function (data) {
    if (characterById(data.id, remotePlayers)) {
      console.log('This player already exists!');
    } else {
      var newPlayer = new Player(data.x, data.y, data.color);
      newPlayer.id = data.id;
      remotePlayers.push(newPlayer);
    }

    updateOnlineCount();
  });


  socket.on('players ready', function (data) {
    showAlert(data.ready + ' players are ready!');

    $playButton.show();
  });


  socket.on('move player', function (data) {
    var movePlayer = characterById(data.id, remotePlayers);

    if (!movePlayer) {
      console.log('Player to move not found: ' + data.id);
      return;
    }

    movePlayer.x = data.x;
    movePlayer.y = data.y;
  });



  socket.on('new enemy', function (data) {
    var newEnemy = new Enemy(data.x, data.y);
    newEnemy.id = data.id;
    enemies.push(newEnemy);
  });



  socket.on('new bullet', function (data) {
    var newBullet = new Bullet(data.x, data.y, data.color);
    newBullet.id = data.id;
    remoteBullets.push(newBullet);
  });



  socket.on('enemy shot', function (data) {
    var newExplosion = new Explosion(data.x, data.y);
    explosions.push(newExplosion);

    var removeBullet = characterById(data.bulletID, remoteBullets);
    var removeEnemy = characterById(data.enemyID, enemies);

    remoteBullets.splice(remoteBullets.indexOf(removeEnemy), 1);
    enemies.splice(enemies.indexOf(removeEnemy), 1);
  });



  socket.on('update score', function (data) {
    globalScore = data;

    $localScore.text(localScore);
    $globalScore.text(globalScore);
  });



  socket.on('player dead', function (data) {
    var deadPlayer = characterById(data.id, remotePlayers);

    if (!deadPlayer) {
      console.log('Dead player to move not found: ' + data.id);
      return;
    }

    var newExplosion = new Explosion(deadPlayer.x, deadPlayer.y);
    explosions.push(newExplosion);

    remotePlayers.splice(remotePlayers.indexOf(deadPlayer), 1);

    showAlert('Spelare ' + data.id + ' dog :/');
  });



  socket.on('remove player', function (data) {
    var removePlayer = characterById(data.id, remotePlayers);

    if (!removePlayer) {
      console.log('Player to remove not found: ' + data.id);
      return;
    }

    remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);

    updateOnlineCount();
  });



}(this));