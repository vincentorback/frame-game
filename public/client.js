(function (window) {
  'use strict';

  var doc = window.document;
  var requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || window.mozRequestAnimationFrame;
  var socket = io.connect();

  socket.on('connected', function (data) {
    console.log(data);
  });




  /*
  url: the path to the image for this sprite
  pos: the x and y coordinate in the image for this sprite
  size: size of the sprite (just one keyframe)
  speed: speed in frames/sec for animating
  frames: an array of frame indexes for animating: [0, 1, 2, 1]
  dir: which direction to move in the sprite map when animating: 'horizontal' (default) or 'vertical'
  once: true to only run the animation once, defaults to false
  */
  function Sprite(url, pos, size, speed, frames, dir, once) {
    this.pos = pos;
    this.size = size;
    this.speed = typeof speed === 'number' ? speed : 0;
    this.frames = frames;
    this._index = 0;
    this.url = url;
    this.dir = dir || 'horizontal';
    this.once = once;
  }

  Sprite.prototype.update = function(dt) {
    this._index += this.speed*dt;
  }

  Sprite.prototype.render = function(ctx) {
      var frame;

      if (this.speed > 0) {
        var max = this.frames.length;
        var idx = Math.floor(this._index);
        frame = this.frames[idx % max];

        if (this.once && idx >= max) {
          this.done = true;
          return;
        }
      } else {
        frame = 0;
      }

      var x = this.pos[0];
      var y = this.pos[1];

      if (this.dir === 'vertical') {
        y += frame * this.size[1];
      } else {
        x += frame * this.size[0];
      }

      ctx.drawImage(resources.get(this.url), x, y, this.size[0], this.size[1], 0, 0, this.size[0], this.size[1]);
  }






  var canvas = doc.getElementById('game');
  console.log(canvas);
  var ctx = canvas.getContext('2d');

  canvas.width = 500;
  canvas.height = 500;









  // Defining player and moster

  var hero = {
    speed: 256,
    x: 0,
    y: 0,
    sprite = new Sprite('img/sprites.png', [0, 0], [39, 39], 16, [0, 1]);
  };

  var monster = {
    x: 0,
    y: 0
  };

  var monstersCaught = 0;
  var gameTime = 0;
  var isGameOver;

  var score = 0;
  var scoreEl = doc.getElementById('score');




  // Set up keys
  
  var keysDown = {};

  window.addEventListener('keydown', function (e) {
    keysDown[e.keyCode] = true;
  }, false);

  window.addEventListener('keydown', function (e) {
    delete keysDown[e.keyCode];
  }, false);





  // New game
  
  var reset = function () {
    hero.x = canvas.width / 2;
    hero.y = canvas.height / 2;

    monster.x = (charSize / 2) + (Math.random() * (canvas.width - charSize));
    monster.y = (charSize / 2) + (Math.random() * (canvas.width - charSize));
  };




  // Update game objects
  
  var update = function (delta) {
    gameTime += delta;
    handleInput(delta);
    updateEntities(delta);

    if (Math.random() < 1 - Math.pow(.993, gameTime)) {
      enemies.push({
        pos: []
      })
    }

    if (38 in keysDown) { // Up
      hero.y -= hero.speed * modifier;
    }
    if (40 in keysDown) { // Down
      hero.y -= hero.speed * modifier;
    }
    if (37 in keysDown) { // Left
      hero.x -= hero.speed * modifier;
    }
    if (39 in keysDown) { // Right
      hero.x -= hero.speed * modifier;
    }


    // Are they touching?
    if (
      hero.x <= (monster.x + 32)
      && monster.x <= (hero.x + 32)
      && hero.y <= (monster.y + 32)
      && monster.y <= (hero.y + 32)
    ) {
      ++monstersCaught;
      reset();
    }
  }





  // Rendering
  resources.load([
    'images/hero.png'
  ]);

  resources.onReady(render);

  var render = function () {

    ctx.drawImage(resources.get('img/hero.png'), hero.x, hero.y);

    ctx.fillStyle = 'rgb(250,250,250)';
    ctx.font = '24px Monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Monsters caught: ' + monstersCaught, 32, 32);
  };






  var main = function () {
    var now = Date.now();
    var delta = (now - lastTime) / 1000.0;

    update(delta);
    render();

    then = now;

    requestAnimationFrame(main);
  }





  // Start the game!
  
  var then = Date.now();
  reset();
  main();




}(this));