/* global $ */
/* global Sprite */
(function (window) {
  'use strict';







  // Game size
  var winWidth = window.innerWidth;
  var winHeight = window.innerHeight;
  var canvasWidth = (winWidth > 800) ? 700 : winWidth;
  var canvasHeight = (winHeight > 600) ? 500 : winHeight - document.getElementById('footer').offsetHeight;

  // Create the canvas
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  document.body.appendChild(canvas);




  // finally query the various pixel ratios
  var devicePixelRatio = window.devicePixelRatio || 1,
    backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                        ctx.mozBackingStorePixelRatio ||
                        ctx.msBackingStorePixelRatio ||
                        ctx.oBackingStorePixelRatio ||
                        ctx.backingStorePixelRatio || 1,
    ratio = devicePixelRatio / backingStoreRatio;

  // upscale the canvas if the two ratios don't match
   if (devicePixelRatio !== backingStoreRatio) {
       var oldWidth = canvas.width;
       var oldHeight = canvas.height;

       canvas.width = oldWidth * ratio;
       canvas.height = oldHeight * ratio;

       canvas.style.width = oldWidth + 'px';
       canvas.style.height = oldHeight + 'px';

       ctx.scale(ratio, ratio);
   }

  





  // Game variables
  var player = {
    pos: [0, 0],
    //sprite: new Sprite('images/sprites.png', [0, 0], [22, 44], 12, [2, 3, 4, 5, 6, 7, 0, 1])
    sprite: new Sprite('images/sprites.png', [0, 0], [22, 44], 12, [2])
  };

  var bullets = [];
  var enemies = [];
  var tokens = [];
  var explosions = [];

  var lastFire = Date.now();
  var gameTime = 0;
  var isGameOver;

  var score = 0;
  var hasPowerUp = false;

  // Speed in pixels per second
  var playerSpeed = 200;
  var bulletSpeed = 500;
  var enemySpeed = 100;
  var tokenSpeed = 50;

  











  // Let’s get all of them elements!
  var $body = $(document.body);
  var $score = $('.js-score');
  var $playing = $('.js-playing');
  var $gameOver = $('.js-gameOver');
  var $form = $('#highschore-form');
  var $formName = $('#highschore-name');

  var $dialog = $('.js-dialog');
  var $showDialog = $('.js-showDialog');
  var $closeDialog = $('.js-closeDialog');

  var $playButton = $('.js-playButton');
  var $pauseButton = $('.js-pauseButton');

  var $alert = $('.js-alert');
  var $highscoreTable = $('#highscore-table');















  // We need to load all your assets before starting the game so that they can be immediately used.
  // Like this, we can cache our resources.
  Resources.load([
    'images/sprites.png'
  ]);
  
  Resources.onReady(function () {
    $body.addClass('is-loaded');
    init();
  });


  /*
  MAIN GAME LOOP

  The update function takes the time that has changed since the last update.
  The game will run wildly different on various computers and platforms,
  so we need to update your scene independently of framerate.

  This is achieved by calculating the time since last update (in seconds),
  and expressing all movements in pixels/second units.
  Movement then becomes x += 50 * dt, or "50 pixels per second".
  */
  var requestID;
  var lastTime;
  var frameInterval;
  function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0; // time since last update

    update(dt);
    render();

    lastTime = now;
<<<<<<< HEAD
    frameInterval = window.requestAnimationFrame(main);
=======
    requestID = window.requestAnimationFrame(main);
>>>>>>> 0c8ddbbf35d9e472f6cd60729617ca8692594fbb
  }


  // Initialize the game
  function init() {
    $playButton.on('click', reset);

    $pauseButton.on('click', function () {
      if ($pauseButton.hasClass('is-active')) {
        //requestID = window.requestAnimationFrame(main);
        //$pauseButton.removeClass('is-active')
      } else {
        //window.cancelAnimationFrame(requestID);
        //$pauseButton.addClass('is-active')
      }
    });

    reset();
    lastTime = Date.now();
    main();
  }


  // Update game objects
  function update(dt) {
    gameTime += dt;

    handleInput(dt);

    updateEntities(dt);

    // It gets harder over time by adding enemies using this equation: 1-.993^gameTime
    if (Math.random() < 1 - Math.pow(.993, gameTime)) {
      enemies.push({
        pos: [canvasWidth, Math.random() * (canvasHeight - 44)],
        sprite: new Sprite('images/sprites.png', [0, 66], [22, 44], 22, [1, 0, 7, 6, 5, 4, 3, 2])
      });
    }

    // Tokens appear less frequest
    if (Math.random() < 1 - Math.pow(.9998, gameTime)) {
      tokens.push({
        pos: [canvasWidth, Math.random() * (canvasHeight - 18)],
        sprite: new Sprite('images/sprites.png', [2, 156], [18, 18], 1, [0])
      });
    }

    checkCollisions();

    $score.text(' ' + score);
  }

  function pause () {
      if ($pauseButton.hasClass('is-active')) {
      frameInterval = window.requestAnimationFrame(main);
    } else {
      window.cancelAnimationFrame(frameInterval);
    }
    $pauseButton.toggleClass('is-active');
  }




  // Handle all inputs
  // in `js/input.js` you’ll find the helpers
  function handleInput(dt) {

    if (input.isDown('DOWN') || input.isDown('UP') || input.isDown('LEFT') || input.isDown('RIGHT')) {
      player.sprite.frames = [2, 3, 4, 5, 6, 7, 0, 1];
    } else {
      player.sprite.frames = [2];
    }

    if (input.isDown('DOWN')) {
      player.pos[1] += playerSpeed * dt;
    }

    if (input.isDown('UP')) {
      player.pos[1] -= playerSpeed * dt;
    }

    if (input.isDown('LEFT')) {
      player.pos[0] -= playerSpeed * dt;
    }

    if (input.isDown('RIGHT')) {
      player.pos[0] += playerSpeed * dt;
    }

    if (input.isDown('SPACE') && !isGameOver && Date.now() - lastFire > 100) {
      var x = player.pos[0] + player.sprite.size[0] / 2;
      var y = player.pos[1] + player.sprite.size[1] / 2;

      bullets.push({
        pos: [x, y],
        dir: 'forward',
        sprite: new Sprite('images/sprites.png', [5, 137], [12, 12])
      });

      if (hasPowerUp) {
        bullets.push({
          pos: [x, y],
          dir: 'up',
          sprite: new Sprite('images/sprites.png', [5, 137], [12, 12])
        });

        bullets.push({
          pos: [x, y],
          dir: 'down',
          sprite: new Sprite('images/sprites.png', [5, 137], [12, 12])
        });
      }

      lastFire = Date.now();
    }
  }





  function updateEntities(dt) {
    // Update the player sprite animation
    player.sprite.update(dt);

    // Update all bullet
    for (var i = 0; i < bullets.length; i += 1) {
      var bullet = bullets[i];

      switch(bullet.dir) {
        case 'up': bullet.pos[1] -= bulletSpeed * dt; break;
        case 'down': bullet.pos[1] += bulletSpeed * dt; break;
        default: bullet.pos[0] += bulletSpeed * dt;
      }

      // Remove the bullet if it goes offscreen
      if (bullet.pos[1] < 0 || bullet.pos[1] > canvasHeight || bullet.pos[0] > canvasWidth) {
        bullets.splice(i, 1);
        i--;
      }
    }


    // Update all enemies
    for (var i = 0; i < enemies.length; i += 1) {
      enemies[i].pos[0] -= enemySpeed * dt;
      enemies[i].sprite.update(dt);

      // Remove if offscreen
      if (enemies[i].pos[0] + enemies[i].sprite.size[0] < 0) {
        enemies.splice(i, 1);
        i--;
      }
    }



    // Update all token
    for (var i = 0; i < tokens.length; i += 1) {
      tokens[i].pos[0] -= tokenSpeed * dt;
      tokens[i].sprite.update(dt);

      // Remove if offscreen
      if (tokens[i].pos[0] + tokens[i].sprite.size[0] < 0) {
        tokens.splice(i, 1);
        i--;
      }
    }



    // Update all explosions
    for (var i = 0; i < explosions.length; i += 1) {
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

  function boxCollides(pos, size, pos2, size2) {
    return collides(
      pos[0], pos[1],
      pos[0] + size[0], pos[1] + size[1],
      pos2[0], pos2[1],
      pos2[0] + size2[0], pos2[1] + size2[1]
    );
  }

  var tokenTimeout;

  function checkCollisions() {
    checkPlayerBounds();
    
    // Run collision detection for all enemies and bullets
    for (var i = 0; i < enemies.length; i += 1) {
      var pos = enemies[i].pos;
      var size = enemies[i].sprite.size;

      for (var j = 0; j < bullets.length; j += 1) {
        var pos2 = bullets[j].pos;
        var size2 = bullets[j].sprite.size;

        if (boxCollides(pos, size, pos2, size2)) {
          // Remove the enemy
          enemies.splice(i, 1);
          i--;

          // Add score
          score += 100;

          // Add an explosion
          explosions.push({
            pos: pos,
            sprite: new Sprite('images/sprites.png', [22, 132], [22, 22], 16, [0, 1, 2], null, true)
          });

          // Remove the bullet and stop this iteration
          bullets.splice(j, 1);
          break;
        }
      }

      if (boxCollides(pos, size, player.pos, player.sprite.size)) {
        if (!isGameOver) {
          gameOver();
        }
      }
    }


    // Run collision detection for all enemies and bullets
    for (var i = 0; i < tokens.length; i += 1) {
      var pos = tokens[i].pos;
      var size = tokens[i].sprite.size;

      if (boxCollides(pos, size, player.pos, player.sprite.size)) {
        // Remove the token and stop this iteration
        tokens.splice(i, 1);

        hasPowerUp = true;
        player.sprite.speed = 24;
        tokenTimeout = setTimeout(function () {
          hasPowerUp = false;
          player.sprite.speed = 12;
        }, 5000);
      }
    }

  }

  function checkPlayerBounds() {
    // Check bounds
    if (player.pos[0] < 0) {
      player.pos[0] = 0;
    } else if (player.pos[0] > canvasWidth - player.sprite.size[0]) {
      player.pos[0] = canvasWidth - player.sprite.size[0];
    }

    if (player.pos[1] < 0) {
      player.pos[1] = 0;
    } else if (player.pos[1] > canvasHeight - player.sprite.size[1]) {
      player.pos[1] = canvasHeight - player.sprite.size[1];
    }
  }



  // Draw everything
  function render() {
    ctx.fillStyle = '#6cc055';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render the player if the game isn't over
    if (!isGameOver) {
      renderEntity(player);
    }

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
    ctx.translate(entity.pos[0], entity.pos[1]);
    entity.sprite.render(ctx);
    ctx.restore();
  }










  // Game over
  function gameOver() {
    $gameOver.show();
    $form.show();
    isGameOver = true;
  }

  // Reset game to original state
  function reset() {
    $gameOver.hide();

    isGameOver = false;
    gameTime = 0;
    score = 0;

    enemies = [];
    tokens = [];
    bullets = [];

    player.pos = [5, canvasHeight - 44];
  }









  // Set up websocket connection
  var socket = io.connect();





  // Highscore form
  $form.on('submit', function (event) {
    socket.emit('savescore', {
      name: $formName.val(),
      score: score
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
    totalReadingTime = (totalReadingTime > 6000) ? totalReadingTime : 6000;

    $alert
      .html(message)
      .addClass('is-active');

    window.setTimeout(function () {
      $alert.removeClass('is-active');
    }, totalReadingTime);
  }







  if (Modernizr.touchevents || !Modernizr.canvas) {
    window.alert('Sorry! Det här spelet funkar inte på din enhet just nu! Antingen är den för gammal eller så är det en "touch"-enhet :/');
  } else {
    showAlert('Spring med piltangenterna och skjut med mellanslag!');
  }










  $(window).on('resize', _.debounce(function () {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight - document.getElementById('footer').offsetHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    reset();
    lastTime = Date.now();
    window.cancelAnimationFrame(frameInterval);

  }, 500));










  // Socket events
  
  // Show alert messages and update highscores
  socket.on('alert', function (data) {

    showAlert(data.message);

    var newHighscore = '<tbody>';

    if (data.openDialog) {
      for (var i = 0; i < data.highscore.length; i += 1) {
        newHighscore += '<tr><td>' + data.highscore[i].name + '</td><td>' + data.highscore[i].score + '</td><td>' + data.highscore[i].niceDate + '</td></tr>';
      }
      newHighscore += '</tobdy>';

      $highscoreTable.find('tbody').remove();
      $highscoreTable.append(newHighscore);
      $dialog.show();
    }
  });

  socket.on('updateUsers', function (data) {
    if (data.length > 1) {
      $playing.html(data.length + ' personer spelar just nu');
    } else {
      $playing.empty();
    }
  });

}(this));