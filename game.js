'use strict';

// 			1. Реализовать базовые классы игры: `Vector`, `Actor` и `Level`
// -------------------------- VECTOR ------------------------------------------
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    // лучше сначала проверить аргументы, а потом писать основной код (как в конструкторе Actor) - DONE
    if (!(vector instanceof Vector)) {
      throw new TypeError(`${vector} не является объектом класса Vector`);
    } 
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  times(factor = 1) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

// -------------------------- ACTOR -------------------------------------------
class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    // лучше сначала проверки, а потом остальной код - DONE
    if (!(pos instanceof Vector)) {
      throw new TypeError(`${pos} не является объектом класса Vector`);
    }
    if (!(size instanceof Vector)) {
      throw new TypeError(`${size} не является объектом класса Vector`);
    }
    if (!(speed instanceof Vector)) {
      throw new TypeError(`${speed} не является объектом класса Vector`);
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
	
  get type() {
    return 'actor';
  }
  get left() {
    return this.pos.x;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get top() {
    return this.pos.y;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }

  act() {
  }
  isIntersect(actor) {
    if (!(actor instanceof Actor)) {
      throw new TypeError(`${actor} не является объектом класса Actor`);
    } 
    if (actor === this) {
      return false;
    } 
    return this.left < actor.right && actor.left < this.right && this.top < actor.bottom && actor.top < this.bottom;
  }
}

// -------------------------- LEVEL -------------------------------------------
class Level {
  constructor(grid = [], actors = []) {
    this.grid = grid.slice();
    this.actors = actors.slice();
    this.player = actors.find(elem => elem.type === 'player');
    this.height = grid.length;
    this.width = Math.max(0, ...grid.map(elem => elem.length));
    this.status = null;
    this.finishDelay = 1;
  }
  isFinished() {
    return this.finishDelay < 0 && this.status !== null;
  }
  actorAt(actor) {
    if (!(actor instanceof Actor)) {
      throw new TypeError(`${actor} не является объектом класса Actor`);
    } 
    return this.actors.find(elem => elem.isIntersect(actor));
  }
  obstacleAt(target, size) {
    if (!(target instanceof Vector)) {
      throw new TypeError(`${target} не является объектом класса Vector`);
    } 
    if (!(size instanceof Vector)) {
      throw new TypeError(`${size} не является объектом класса Vector`);
    }
    const movingActor = new Actor(target, size);
    if (movingActor.top < 0 || movingActor.left < 0 || movingActor.right > this.width) {
      return `wall`;
    }
    if (movingActor.bottom > this.height) {
      return `lava`;
    }
    // не объявляйте переменные через запятую, если захотите избавится от первой придётся менять 2 строчки - DONE
    const left = Math.floor(movingActor.left);
    const right = Math.ceil(movingActor.right);
    const top = Math.floor(movingActor.top);
    const bottom = Math.ceil(movingActor.bottom);
    for (let i = left; i < right; i++) {
      for (let j = top; j < bottom; j++) {
        const obstacle = this.grid [j][i];
        if (obstacle) {
          return obstacle;
        }
      }
    }
  }
  removeActor(actor) {
    this.actors = this.actors.filter(elem => elem !== actor);
  }
  noMoreActors(type) {
    return !this.actors.some(elem => elem.type === type);
  }
  playerTouched(type, actor) {
    if (this.status === null) {
      if (type === `lava` || type === `fireball`) {
        this.status = `lost`;
      } else  if (type === `coin` && actor.type === `coin`) {
        this.removeActor(actor);
        if (this.noMoreActors(`coin`)) {
          this.status = `won`;
        }
      }
    }
  }
}


// -------------------------- LEVEL PARSER ------------------------------------
class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = {...dictionary};
  }
  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }
  obstacleFromSymbol(symbol) {
    switch (symbol) {
      case 'x' : return 'wall';
      case '!' : return 'lava';
    }
  }
  createGrid(plan) {
    return plan.map(elem => elem.split('').map(this.obstacleFromSymbol));
  }
  createActors(plan) {
    const actors = [];
    for (let i = 0; i < plan.length; i++) {
      for (let j = 0; j < plan[i].length; j++) {
        const NewActor = this.actorFromSymbol(plan[i][j]);
        if (typeof NewActor === 'function') { 
          const newActor = new NewActor(new Vector(j,i));
          if (newActor instanceof Actor) {
            actors.push(newActor);
          }
        }
      }
    }
    return actors;
  }
  parse(plan) {
    return new Level(this.createGrid(plan), this.createActors(plan));
  }
}

// -------------------------- OBJECTS -----------------------------------------
class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }
  get type() {
    return "fireball";
  }
  getNextPosition(time = 1) {
    return this.pos.plus(this.speed.times(time));
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    const nextPosition = this.getNextPosition(time);
    if (level.obstacleAt(nextPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = nextPosition;
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(2, 0));
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 2));
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    super(pos, new Vector(0, 3));
    this.start = pos;
  }
  handleObstacle() {
    this.pos = this.start;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = Math.random() * Math.PI * 2;
    this.start = pos.plus(new Vector(0.2, 0.1));
  }
  get type() {
    return 'coin';
  }
  updateSpring(time = 1) {
    this.spring = this.spring + this.springSpeed * time;
  }
  getSpringVector() {
    return new Vector(0, Math.sin(this.spring) * this.springDist);
  }
  getNextPosition(time = 1) {
    this.updateSpring(time);
    return this.start.plus(this.getSpringVector());
  }
  act(time = 1) {
    this.pos = this.getNextPosition(time);
  }
}

// -------------------------- PLAYER ------------------------------------------
class Player extends Actor {
  constructor(pos = new Vector(0, 0)) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
  }
  get type() {
    return 'player';
  }
}

//--------------------------- !!! THE GAME !!! --------------------------------
// эта переменная больше не используется - можно удалить - DONE

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball
}

const parser = new LevelParser(actorDict);

loadLevels()
  .then(levels => {runGame(JSON.parse(levels), parser, DOMDisplay)
    .then(() => alert('Вы выиграли!'));
    }, () => console.error('Не удалось загрузить уровни'));
