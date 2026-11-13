(() => {
  const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id);
  const screens={start:$('startScreen'),how:$('howScreen'),game:$('gameScreen'),over:$('gameOver')};
  const TILE=20, COLS=32, ROWS=32, W=COLS*TILE;
  const maps=[
`################################
#..............##..............#
#.####.#######.##.#######.####.#
#o####.#######.##.#######.####o#
#..............................#
#.####.##.############.##.####.#
#......##......##......##......#
######.#######.##.#######.######
     #.#######.##.#######.#     
######.##                ##.######
      .##.###.######.###.##.      
######.##.#            #.##.######
      .   #   #    #   #   .      
######.##.#            #.##.######
      .##.##############.##.      
######.##................##.######
      .####.###..###.####.      
######.####.#......#.####.######
#...........#.####.#...........#
#.####.####.#.####.#.####.####.#
#o..##........................o#
###.##.##.############.##.##.###
#......##......##......##......#
#.############.##.############.#
#..............................#
#.####.#######.##.#######.####.#
#.####.#######.##.#######.####.#
#......##......##......##......#
######.##.############.##.######
#..............................#
#..............##..............#
################################`,
`################################
#o........#..........#.........o#
#.######.#.########.#.######.#.#
#......#.#........#.#......#.#.#
######.#.########.#.######.#.#.#
#......#....#.....#....#...#...#
#.#########.#.########.#.#####.#
#...........#..........#.......#
#.############.######.########.#
#......#.......#....#.......#.#
######.#.#####.#.##.#####.#.#.#
#....#.#.#...#.#.##.#...#.#.#.#
#.##.#.#.#.#.#.#....#.#.#.#.#.#
#.##...#.#.#...######.#...#...#
#.######.#.############.#####.#
#..............................#
#.######.#####.##.#####.######.#
#.#....#.....#....#.....#....#.#
#.#.##.#####.######.#####.##.#.#
#...##....................##...#
###.##.####.########.####.##.###
#......#..............#........#
#.######.############.######...#
#........#............#........#
#.########.##########.########.#
#...........#......#...........#
#.#########.#.####.#.#########.#
#.#.......#.#......#.#.......#.#
#.#.#####.#.########.#.#####.#.#
#o..#......................#..o#
#...########################...#
################################`
  ];
  let grid=[],player,enemies=[],score=0,lives=3,level=1,running=false,paused=false,poweredUntil=0,last=0,high=Number(localStorage.getItem('neonMazeHigh')||0),soundOn=localStorage.getItem('neonMazeSound')!=='off',spawnTimer=0;
  const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  let audioCtx;
  function beep(freq,dur=.07,type='sine',vol=.04){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g).connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}catch(e){}}
  function setScreen(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active')}
  function normalizeMap(str){let lines=str.split('\n');let max=Math.max(...lines.map(x=>x.length));return lines.map(x=>x.padEnd(max,'#').slice(0,COLS).split('')).slice(0,ROWS)}
  function loadLevel(){grid=normalizeMap(maps[(level-1)%maps.length]); player={x:16,y:24,dir:dirs.left,next:dirs.left,px:16,py:24,progress:0,speed:7.4+Math.min(level,8)*.25}; if(grid[player.y]?.[player.x]==='#'){for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(grid[y][x]!=='#'){player.x=player.px=x;player.y=player.py=y;y=ROWS;break}}
    enemies=[{x:16,y:15,px:16,py:15,dir:dirs.left,progress:0,speed:4.5+level*.18,color:'#ff4fa3',mode:'chase',homeX:16,homeY:15},{x:14,y:15,px:14,py:15,dir:dirs.up,progress:0,speed:4.2+level*.16,color:'#9b7bff',mode:'ambush',homeX:14,homeY:15},{x:18,y:15,px:18,py:15,dir:dirs.right,progress:0,speed:4+level*.18,color:'#ffb44f',mode:'wander',homeX:18,homeY:15}];
  }
  function cellOpen(x,y){return grid[y]&&grid[y][x]!==undefined&&grid[y][x]!=='#'}
  function choosePlayerDir(){if(player.progress===0&&cellOpen(player.x+player.next.x,player.y+player.next.y))player.dir=player.next}
  function moveActor(a,dt,isPlayer=false){a.progress+=a.speed*dt;while(a.progress>=1){a.progress-=1;let nx=a.x+a.dir.x,ny=a.y+a.dir.y;if(cellOpen(nx,ny)){a.px=a.x;a.py=a.y;a.x=nx;a.y=ny}else{a.progress=0;break}if(isPlayer){choosePlayerDir();collect()}else chooseEnemyDir(a)}}
  function collect(){let c=grid[player.y][player.x];if(c==='.') {grid[player.y][player.x]=' ';score+=10;beep(660,.045,'square',.025);if(Math.random()<.15)particles(player.x,player.y,'#55f6ff')} if(c==='o'){grid[player.y][player.x]=' ';score+=50;poweredUntil=performance.now()+7000;beep(220,.16,'sawtooth',.05)} if(remaining()===0)nextLevel()}
  function remaining(){let n=0;for(const row of grid)for(const c of row)if(c==='.'||c==='o')n++;return n}
  function enemyTarget(e){if(e.mode==='wander')return {x:1+Math.floor(Math.random()*(COLS-2)),y:1+Math.floor(Math.random()*(ROWS-2))};if(e.mode==='ambush')return {x:player.x+player.dir.x*4,y:player.y+player.dir.y*4};return {x:player.x,y:player.y}}
  function chooseEnemyDir(e){let opts=[];for(const d of Object.values(dirs)){let nx=e.x+d.x,ny=e.y+d.y;if(!cellOpen(nx,ny))continue;if(d.x===-e.dir.x&&d.y===-e.dir.y)continue;opts.push(d)}if(!opts.length)opts=Object.values(dirs).filter(d=>cellOpen(e.x+d.x,e.y+d.y));if(!opts.length)return;let t=enemyTarget(e);if(performance.now()<poweredUntil){opts.sort(()=>Math.random()-.5);e.dir=opts[0];return}opts.sort((a,b)=>Math.hypot(e.x+a.x-t.x,e.y+a.y-t.y)-Math.hypot(e.x+b.x-t.x,e.y+b.y-t.y));e.dir=(e.mode==='wander'&&Math.random()<.45)?opts[Math.floor(Math.random()*opts.length)]:opts[0]}
  function nextLevel(){running=false;score+=500;level++;beep(880,.12,'triangle',.06);setTimeout(()=>{loadLevel();countdownStart()},650)}
  function loseLife(){if(spawnTimer>0)return;lives--;beep(90,.35,'sawtooth',.08);particles(player.x,player.y,'#ff4fa3',28);if(lives<=0){running=false;finishGame();return}spawnTimer=2.2;player.progress=0;enemies.forEach(e=>{e.x=e.px=e.homeX;e.y=e.py=e.homeY;e.progress=0});}
  function finishGame(){if(score>high){high=score;localStorage.setItem('neonMazeHigh',high)}$('finalScore').textContent=score;$('highScore').textContent=high;setScreen('over');beep(55,.7,'sawtooth',.07)}
  const sparks=[];function particles(x,y,color,n=8){for(let i=0;i<n;i++)sparks.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:.35+Math.random()*.5,color})}
  function update(dt){if(!running||paused)return;if(spawnTimer>0){spawnTimer-=dt;return}choosePlayerDir();moveActor(player,dt,true);enemies.forEach(e=>moveActor(e,dt));for(let i=enemies.length-1;i>=0;i--){let e=enemies[i],d=Math.hypot((e.x+e.progress*e.dir.x)-(player.x+player.progress*player.dir.x),(e.y+e.progress*e.dir.y)-(player.y+player.progress*player.dir.y));if(d<.68){if(performance.now()<poweredUntil){score+=200;particles(e.x,e.y,'#ffe76a',18);e.x=e.px=e.homeX;e.y=e.py=e.homeY;e.progress=0;beep(360,.08,'square',.05)}else loseLife()}}
    for(let i=sparks.length-1;i>=0;i--){let p=sparks[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)sparks.splice(i,1)}
  }
  function draw(){ctx.clearRect(0,0,W,W);ctx.fillStyle='#050b17';ctx.fillRect(0,0,W,W);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){let c=grid[y][x];if(c==='#'){ctx.fillStyle='#102a52';ctx.fillRect(x*TILE,y*TILE,TILE,TILE);ctx.strokeStyle='#1d63aa';ctx.lineWidth=1;ctx.strokeRect(x*TILE+1,y*TILE+1,TILE-2,TILE-2)}else if(c==='.'||c==='o'){ctx.fillStyle=c==='o'?'#ffe76a':'#8cf7ff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=c==='o'?16:8;ctx.beginPath();ctx.arc((x+.5)*TILE,(y+.5)*TILE,c==='o'?6:2.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}}
    function orb(a,color,r){let x=(a.x+.5+a.progress*a.dir.x)*TILE,y=(a.y+.5+a.progress*a.dir.y)*TILE;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#061022';ctx.beginPath();ctx.arc(x+a.dir.x*r*.35,y+a.dir.y*r*.35,3,0,Math.PI*2);ctx.fill()}
    orb(player,'#55f6ff',8);for(const e of enemies)orb(e,performance.now()<poweredUntil?'#4d6dff':e.color,8);for(const p of sparks){ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x*TILE-2,p.y*TILE-2,4,4);ctx.globalAlpha=1}
    if(spawnTimer>0){ctx.fillStyle='#fff';ctx.font='bold 18px system-ui';ctx.textAlign='center';ctx.fillText('PRONTO!',W/2,W/2)}
    $('score').textContent=score;$('lives').textContent='●'.repeat(Math.max(0,lives));$('level').textContent=level;
  }
  function loop(t){let dt=Math.min(.04,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
  function countdownStart(){setScreen('game');paused=false;running=false;let n=3,el=$('countdown');el.classList.remove('hidden');el.textContent=n;let timer=setInterval(()=>{n--;if(n>0){el.textContent=n;beep(520,.05,'square',.03)}else{clearInterval(timer);el.classList.add('hidden');running=true;beep(760,.1,'triangle',.05)}},700)}
  function startGame(){score=0;lives=3;level=1;poweredUntil=0;loadLevel();countdownStart()}
  function setDir(name){if(dirs[name])player.next=dirs[name]}
  $('playBtn').onclick=startGame;$('againBtn').onclick=startGame;$('menuBtn').onclick=()=>setScreen('start');$('howBtn').onclick=()=>setScreen('how');$('backBtn').onclick=()=>setScreen('start');$('restartBtn').onclick=startGame;$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
  function togglePause(){if(!screens.game.classList.contains('active'))return;paused=!paused;$('pauseOverlay').classList.toggle('hidden',!paused);$('pauseBtn').textContent=paused?'▶':'Ⅱ'}
  document.querySelectorAll('[data-dir]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();setDir(b.dataset.dir)}));
  document.addEventListener('keydown',e=>{let k={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'}[e.key];if(k){e.preventDefault();setDir(k)}if(e.key===' '){e.preventDefault();togglePause()}});
  let sx=0,sy=0;$('gameWrap').addEventListener('pointerdown',e=>{sx=e.clientX;sy=e.clientY});$('gameWrap').addEventListener('pointerup',e=>{let dx=e.clientX-sx,dy=e.clientY-sy;if(Math.hypot(dx,dy)<18)return;if(Math.abs(dx)>Math.abs(dy))setDir(dx>0?'right':'left');else setDir(dy>0?'down':'up')});
  function syncSound(){let txt=soundOn?'🔊':'🔇';$('soundBtn').textContent=txt;$('soundStart').textContent=`${txt} Som`;localStorage.setItem('neonMazeSound',soundOn?'on':'off')}$('soundBtn').onclick=()=>{soundOn=!soundOn;syncSound()};$('soundStart').onclick=()=>{soundOn=!soundOn;syncSound()};syncSound();
  loadLevel();draw();
})();