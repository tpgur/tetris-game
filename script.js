const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");
const holdCanvas = document.getElementById("hold");
const holdCtx = holdCanvas.getContext("2d");

const COLS = 10, ROWS = 20, BLOCK = 30;
let board = [];
let current, next, hold = null;
let canHold = true;
let score = 0, lines = 0, level = 1;
let dropInterval = 1000;
let lastDrop = 0;
let gameOver = false;
let difficulty = "easy";
let grayTimer = null;

const colors = {
  I: "#00ffff",
  O: "#ffff00",
  T: "#800080",
  S: "#00ff00",
  Z: "#ff0000",
  J: "#0000ff",
  L: "#ffa500",
  gray: "#555555"
};

const pieces = {
  I: [[1,1,1,1]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1]],
  S: [[0,1,1],[1,1,0]],
  Z: [[1,1,0],[0,1,1]],
  J: [[1,0,0],[1,1,1]],
  L: [[0,0,1],[1,1,1]]
};

document.getElementById("startButton").addEventListener("click", startGame);

function startGame(){
  difficulty = document.getElementById("difficulty").value;
  init();
}

function init(){
  board = Array.from({length: ROWS}, () => Array(COLS).fill(""));
  score = 0; lines = 0; level = 1;
  gameOver = false; hold = null; canHold = true;
  dropInterval = difficulty==="easy" ? 1000 : difficulty==="normal" ? 700 : 500;
  next = randomPiece();
  newPiece();
  document.getElementById("gameOver").classList.add("hidden");
  cancelAnimationFrame(lastDrop);
  if (grayTimer) clearInterval(grayTimer);
  if (difficulty === "hard") {
    grayTimer = setInterval(addGrayLine, 30000);
  }
  lastDrop = performance.now();
  requestAnimationFrame(update);
}

function randomPiece(){
  const types = Object.keys(pieces);
  const type = types[Math.floor(Math.random()*types.length)];
  return { type, shape: pieces[type], x: 3, y: 0 };
}

function newPiece(){
  current = next;
  next = randomPiece();
  canHold = true;
  if (collide(current)) gameOverFunc();
}

function drawBoard(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<ROWS;y++){
    for(let x=0;x<COLS;x++){
      if(board[y][x]) drawBlock(x,y,colors[board[y][x]]);
      ctx.strokeStyle = "#222";
      ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
    }
  }
}

function drawBlock(x,y,color){
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
}

function drawPiece(p){
  p.shape.forEach((row,dy)=>{
    row.forEach((val,dx)=>{
      if(val){
        drawBlock(p.x+dx,p.y+dy,colors[p.type]);
      }
    });
  });
}

function move(dir){
  current.x += dir;
  if(collide(current)) current.x -= dir;
}

function drop(){
  current.y++;
  if(collide(current)){
    current.y--;
    merge();
    clearLines();
    newPiece();
  }
}

function hardDrop(){
  while(!collide(current)) current.y++;
  current.y--;
  merge();
  clearLines();
  newPiece();
}

function rotate(){
  const rotated = current.shape[0].map((_,i)=>current.shape.map(r=>r[i])).reverse();
  const test = { ...current, shape: rotated };
  const kicks = [[0,0],[-1,0],[1,0],[0,-1]];
  for(const [dx,dy] of kicks){
    test.x = current.x+dx;
    test.y = current.y+dy;
    if(!collide(test)){
      current.shape = rotated;
      current.x = test.x; current.y = test.y;
      return;
    }
  }
}

function collide(p){
  return p.shape.some((row,dy)=>
    row.some((val,dx)=>{
      if(!val) return false;
      const x = p.x+dx, y = p.y+dy;
      return x<0 || x>=COLS || y>=ROWS || (y>=0 && board[y][x]);
    })
  );
}

function merge(){
  current.shape.forEach((row,dy)=>{
    row.forEach((val,dx)=>{
      if(val && current.y+dy>=0) board[current.y+dy][current.x+dx] = current.type;
    });
  });
}

function clearLines(){
  let cleared = 0;
  for(let y=ROWS-1;y>=0;y--){
    if(board[y].every(cell => cell !== "")){
      board.splice(y,1);
      board.unshift(Array(COLS).fill(""));
      cleared++;
      y++;
    }
  }
  if(cleared>0){
    score += [0,20,40,80,120][cleared];
    lines += cleared;
    if(difficulty==="hard" && lines>=level*20){
      level++;
      dropInterval *= 0.9;
    }
    updateScore();
  }
}

function updateScore(){
  document.getElementById("score").textContent = score;
  document.getElementById("lines").textContent = lines;
  document.getElementById("level").textContent = level;
}

function addGrayLine(){
  const hole = Math.floor(Math.random()*COLS);
  const newLine = Array(COLS).fill("gray");
  newLine[hole] = "";
  board.shift();
  board.push(newLine);
}

function holdPiece(){
  if(!canHold) return;
  if(!hold){
    hold = current;
    newPiece();
  } else {
    [hold, current] = [current, hold];
    current.x = 3; current.y = 0;
  }
  canHold = false;
  drawHold();
}

function drawNext(){
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  drawMini(nextCtx,next);
}

function drawHold(){
  holdCtx.clearRect(0,0,holdCanvas.width,holdCanvas.height);
  if(hold) drawMini(holdCtx,hold);
}

function drawMini(ctx,piece){
  const b = 20;
  const offsetX = 50 - (piece.shape[0].length * b) / 2;
  const offsetY = 50 - (piece.shape.length * b) / 2;
  piece.shape.forEach((row,dy)=>{
    row.forEach((val,dx)=>{
      if(val){
        ctx.fillStyle = colors[piece.type];
        ctx.fillRect(offsetX+dx*b,offsetY+dy*b,b,b);
        ctx.strokeStyle = "#000";
        ctx.strokeRect(offsetX+dx*b,offsetY+dy*b,b,b);
      }
    });
  });
}

function gameOverFunc(){
  gameOver = true;
  document.getElementById("gameOver").classList.remove("hidden");
  cancelAnimationFrame(lastDrop);
  if (grayTimer) clearInterval(grayTimer);
}


document.addEventListener("keydown", e => {
  const tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

  const preventKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  if (preventKeys.includes(e.code)) e.preventDefault();

  if (gameOver) return;

  switch (e.code) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      drop();
      break;
    case "ArrowUp":
      rotate();
      break;
    case "Space":
      e.preventDefault();
      hardDrop();
      break;
    case "KeyC":
      holdPiece();
      break;
  }
});

function update(time){
  if(gameOver) return;
  const delta = time - lastDrop;
  if(delta > dropInterval){
    drop();
    lastDrop = time;
  }
  drawBoard();
  drawPiece(current);
  drawNext();
  drawHold();
  requestAnimationFrame(update);
}
