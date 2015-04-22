(function (window) {
  'use strict';



  // requestAnimationFrame polyfill
  var requestAnimFrame = (function () {
    return window.requestAnimationFrame  ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      window.oRequestAnimationFrame      ||
      window.msRequestAnimationFrame     ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  }());



  // Game variables
  var player = {
    pos: [0, 0],
    sprite: new Sprite('images/sprites.png', [0, 0], [22, 44], 12, [2, 3, 4, 5, 6, 7, 0, 1])
  };

  var bullets = [];
  var enemies = [];
  var explosions = [];

  var lastFire = Date.now();
  var gameTime = 0;
  var isGameOver;

  var score = 0;

  // Speed in pixels per second
  var playerSpeed = 200;
  var bulletSpeed = 500;
  var enemySpeed = 100;

  // Game size
  var winWidth = window.innerWidth;
  var winHeight = window.innerHeight;
  var canvasWidth = winWidth;
  var canvasHeight = winHeight;

  if (winWidth > 600 && winHeight > 600) {
    canvasWidth = 500;
    canvasHeight = 500;
  }
  






  // Let’s get all of them elements!
  var $score = $('.js-score');
  var $gameOver = $('.js-gameOver');
  var $overlay = $('.js-overlay');
  var $form = $('#highschore-form');
  var $formName = $('#highschore-name');

  var $showDialog = $('.js-showDialog');
  var $closeDialog = $('.js-closeDialog');

  var $playAgain = $('.js-playAgain');

  var $alert = $('#alert');
  var $highscoreTable = $('#highscore-table');







  // Create the canvas
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  document.body.appendChild(canvas);


  // Set up and load all resources that we’ll need!
  resources.load([
    'images/sprites.png'
  ]);
  resources.onReady(init);


  // The main game loop
  var lastTime;
  function main() {
    var now = Date.now();
    var dt = (now - lastTime) / 1000.0;

    update(dt);
    render();

    lastTime = now;
    requestAnimFrame(main);
  }


  // Initialize the game
  function init() {
    $playAgain.on('click', reset);

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
        pos: [canvasWidth, Math.random() * (canvasHeight - 39)],
        sprite: new Sprite('images/sprites.png', [0, 66], [22, 44], 22, [1, 0, 7, 6, 5, 4, 3, 2])
      });
    }

    checkCollisions();

    $score.text(score);
  };


  // Handle all inputs
  // in `js/input.js` you’ll find the helpers
  function handleInput(dt) {
    if (input.isDown('DOWN') || input.isDown('s')) {
      player.pos[1] += playerSpeed * dt;
    }

    if (input.isDown('UP') || input.isDown('w')) {
      player.pos[1] -= playerSpeed * dt;
    }

    if (input.isDown('LEFT') || input.isDown('a')) {
      player.pos[0] -= playerSpeed * dt;
    }

    if (input.isDown('RIGHT') || input.isDown('d')) {
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

      /*
      Uncomment to shot in all directions :O
      TODO: Add power-up to gameplay

      bullets.push({
        pos: [x, y],
        dir: 'up',
        sprite: new Sprite('images/sprites.png', [5, 93], [12, 12])
      });

      bullets.push({
        pos: [x, y],
        dir: 'down',
        sprite: new Sprite('images/sprites.png', [5, 93], [12, 12])
      });
      */

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

  function checkCollisions() {
    checkPlayerBounds();
    
    // Run collision detection for all enemies and bullets
    for(var i = 0; i < enemies.length; i += 1) {
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
        gameOver();
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
    }
    else if (player.pos[1] > canvasHeight - player.sprite.size[1]) {
      player.pos[1] = canvasHeight - player.sprite.size[1];
    }
  }



  // Draw everything
  function render() {
    ctx.fillStyle = '#6cc055';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render the player if the game isn't over
    if(!isGameOver) {
      renderEntity(player);
    }

    renderEntities(bullets);
    renderEntities(enemies);
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







  // Let’s get all 'em elements!





  // Game over
  function gameOver() {
    $gameOver.show();
    $overlay.show();

    $form.show();
    isGameOver = true;
  }

  // Reset game to original state
  function reset() {
    $gameOver.hide();
    $overlay.hide();

    isGameOver = false;
    gameTime = 0;
    score = 0;

    enemies = [];
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
  var dialog = document.getElementById('dialog');
  $showDialog.on('click', function() {
    dialog.showModal();
  });
  $closeDialog.on('click', function() {
    dialog.close();
  });






  // Socket events
  
  // Show alert messages and update highscores
  socket.on('alert', function (data) {
    $alert.html(data.message);
    $alert.addClass('is-active');

    var newHighscore = '<tbody>';

    if (data.openDialog) {
      for (var i = 0; i < data.highscore.length; i += 1) {
        newHighscore += '<tr><td>' + data.highscore[i].name + '</td><td>' + data.highscore[i].score + '</td><td>' + data.highscore[i].niceDate + '</td></tr>';
      }
      newHighscore += '</tobdy>';

      $highscoreTable.find('tbody').remove();
      $highscoreTable.append(newHighscore);
      dialog.showModal();
    }

    window.setTimeout(function () {
      $alert.removeClass('is-active');
    }, 10000);
  });




}(this));