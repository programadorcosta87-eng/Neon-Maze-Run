(() => {
  const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id);
  const screens={start:$('startScreen'),how:$('howScreen'),game:$('gameScreen'),over:$('gameOver')};
  const TILE=20, COLS=32, ROWS=32, W=COLS*TILE;
  const mazeLayer=document.createElement('canvas');
  mazeLayer.width=W; mazeLayer.height=W;
  const mazeCtx=mazeLayer.getContext('2d');
  const hudCache={score:null,lives:null,level:null};
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
  const safeGet=(key,fallback=null)=>{try{return localStorage.getItem(key)??fallback}catch(e){return fallback}};
  const safeSet=(key,value)=>{try{localStorage.setItem(key,value)}catch(e){}};
  let countdownTimer=null,levelTimer=null,controlSource=null,activeDirection=null;
  let grid=[],collectiblesLeft=0,player,enemies=[],score=0,lives=3,level=1,running=false,paused=false,poweredUntil=0,last=0,high=Number(safeGet('neonMazeHigh','0'))||0,soundOn=safeGet('neonMazeSound','on')!=='off',spawnTimer=0;
  const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  let audioCtx;
  function beep(freq,dur=.07,type='sine',vol=.04){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g).connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}catch(e){}}
  function setScreen(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active')}
  function normalizeMap(str){
    const lines=str.split('\n');
    const map=lines.slice(0,ROWS).map(x=>x.padEnd(COLS,'#').slice(0,COLS).split(''));
    while(map.length<ROWS) map.push(Array(COLS).fill('#'));
    for(let x=0;x<COLS;x++){map[0][x]='#';map[ROWS-1][x]='#'}
    for(let y=0;y<ROWS;y++){map[y][0]='#';map[y][COLS-1]='#'}
    return map;
  }
  function buildMazeLayer(){
    mazeCtx.clearRect(0,0,W,W);
    mazeCtx.fillStyle='#050b17';
    mazeCtx.fillRect(0,0,W,W);
    mazeCtx.fillStyle='#102a52';
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]==='#')mazeCtx.fillRect(x*TILE,y*TILE,TILE,TILE);
    mazeCtx.strokeStyle='#1d63aa';
    mazeCtx.lineWidth=1;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]==='#')mazeCtx.strokeRect(x*TILE+1,y*TILE+1,TILE-2,TILE-2);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const c=grid[y][x];
      if(c==='.'||c==='o'){
        mazeCtx.fillStyle=c==='o'?'#ffe76a':'#8cf7ff';
        mazeCtx.beginPath();
        mazeCtx.arc((x+.5)*TILE,(y+.5)*TILE,c==='o'?5:2.5,0,Math.PI*2);
        mazeCtx.fill();
      }
    }
  }
  function clearCollectible(x,y){
    mazeCtx.fillStyle='#050b17';
    mazeCtx.fillRect(x*TILE,y*TILE,TILE,TILE);
  }
  function loadLevel(){
    grid=normalizeMap(maps[(level-1)%maps.length]);
    collectiblesLeft=0;
    for(const row of grid)for(const c of row)if(c==='.'||c==='o')collectiblesLeft++;
    buildMazeLayer();

    const difficulty=Math.min(level-1,24);
    const nearestOpen=(sx,sy)=>{
      if(cellOpen(sx,sy))return {x:sx,y:sy};
      for(let r=1;r<Math.max(COLS,ROWS);r++)for(let y=Math.max(1,sy-r);y<=Math.min(ROWS-2,sy+r);y++)for(let x=Math.max(1,sx-r);x<=Math.min(COLS-2,sx+r);x++)if(cellOpen(x,y))return {x,y};
      return {x:1,y:1};
    };
    const p=nearestOpen(16,24);
    player={x:p.x,y:p.y,dir:dirs.left,next:dirs.left,px:p.x,py:p.y,progress:0,speed:7.4+difficulty*.10,moving:false,stopAfterTile:false};

    const makeEnemy=(x,y,dir,color,mode,baseSpeed)=>{
      const pos=nearestOpen(x,y);
      return {x:pos.x,y:pos.y,px:pos.x,py:pos.y,dir:dirs[dir],progress:0,speed:baseSpeed+difficulty*.10,color,mode,homeX:pos.x,homeY:pos.y,wanderTarget:null};
    };
    enemies=[
      makeEnemy(16,15,'left','#ff4fa3','chase',4.25),
      makeEnemy(14,15,'up','#9b7bff','ambush',4.05),
      makeEnemy(18,15,'right','#ffb44f','wander',3.90)
    ];
    enemies.forEach(chooseEnemyDir);
  }
  function cellOpen(x,y){return grid[y]&&grid[y][x]!==undefined&&grid[y][x]!=='#'}
  function choosePlayerDir(){
    if(player.progress!==0)return;
    if(cellOpen(player.x+player.next.x,player.y+player.next.y))player.dir=player.next;
  }
  function movePlayer(dt){
    if(!player.moving && player.progress===0)return;
    player.progress+=player.speed*dt;
    while(player.progress>=1){
      player.progress-=1;
      const nx=player.x+player.dir.x,ny=player.y+player.dir.y;
      if(!cellOpen(nx,ny)){player.progress=0;player.moving=false;break}
      player.px=player.x;player.py=player.y;player.x=nx;player.y=ny;
      collect();
      if(player.stopAfterTile){player.progress=0;player.moving=false;player.stopAfterTile=false;break}
      choosePlayerDir();
    }
  }
  function moveEnemy(a,dt){
    // Escolhe uma rota antes de andar quando está exatamente em uma célula.
    // Isso elimina o estado em que o Caçador ficava parado contra uma parede.
    if(a.progress===0 && !cellOpen(a.x+a.dir.x,a.y+a.dir.y))chooseEnemyDir(a,true);

    a.progress+=a.speed*dt;
    while(a.progress>=1){
      a.progress-=1;
      let nx=a.x+a.dir.x,ny=a.y+a.dir.y;
      if(!cellOpen(nx,ny)){
        chooseEnemyDir(a,true);
        nx=a.x+a.dir.x; ny=a.y+a.dir.y;
      }
      if(!cellOpen(nx,ny)){
        // Recuperação de segurança: nunca mantém um inimigo congelado.
        const fallback=Object.values(dirs).find(d=>cellOpen(a.x+d.x,a.y+d.y));
        if(!fallback){a.progress=0;return}
        a.dir=fallback;
        nx=a.x+a.dir.x; ny=a.y+a.dir.y;
      }
      a.px=a.x;a.py=a.y;a.x=nx;a.y=ny;
      chooseEnemyDir(a,false);
    }
  }
  function collect(){
    const c=grid[player.y][player.x];
    if(c==='.'||c==='o'){
      grid[player.y][player.x]=' ';
      collectiblesLeft--;
      clearCollectible(player.x,player.y);
      if(c==='.'){
        score+=10;
        beep(660,.045,'square',.025);
        if(Math.random()<.15)particles(player.x,player.y,'#55f6ff');
      }else{
        score+=50;
        poweredUntil=performance.now()+7000;
        beep(220,.16,'sawtooth',.05);
      }
      updateHUD();
      if(collectiblesLeft<=0)nextLevel();
    }
  }
  function enemyTarget(e){
    if(e.mode==='wander'){
      if(!e.wanderTarget || (e.x===e.wanderTarget.x&&e.y===e.wanderTarget.y) || Math.random()<.08){
        const open=[];
        for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(cellOpen(x,y))open.push({x,y});
        e.wanderTarget=open[Math.floor(Math.random()*open.length)]||{x:player.x,y:player.y};
      }
      return e.wanderTarget;
    }
    if(e.mode==='ambush')return {x:player.x+player.dir.x*4,y:player.y+player.dir.y*4};
    return {x:player.x,y:player.y};
  }
  function chooseEnemyDir(e,force=false){
    const all=Object.values(dirs).filter(d=>cellOpen(e.x+d.x,e.y+d.y));
    if(!all.length)return;
    const forward=all.filter(d=>d.x!==-e.dir.x||d.y!==-e.dir.y);
    let opts=forward.length?forward:all;
    const target=enemyTarget(e);

    if(performance.now()<poweredUntil){
      // Sob energia, fogem do jogador em vez de perseguir.
      opts.sort((a,b)=>Math.hypot(e.x+b.x-player.x,e.y+b.y-player.y)-Math.hypot(e.x+a.x-player.x,e.y+a.y-player.y));
      e.dir=opts[0];
      return;
    }

    if(e.mode==='wander' && !force && Math.random()<.30){
      e.dir=opts[Math.floor(Math.random()*opts.length)];
      return;
    }

    opts.sort((a,b)=>{
      const da=Math.hypot(e.x+a.x-target.x,e.y+a.y-target.y);
      const db=Math.hypot(e.x+b.x-target.x,e.y+b.y-target.y);
      return da-db;
    });
    e.dir=opts[0];
  }
  function clearPendingTimers(){
    if(countdownTimer){clearInterval(countdownTimer);countdownTimer=null}
    if(levelTimer){clearTimeout(levelTimer);levelTimer=null}
  }
  function nextLevel(){
    if(!running)return;
    running=false;
    clearPendingTimers();
    score+=500;
    level++;
    beep(880,.12,'triangle',.06);
    levelTimer=setTimeout(()=>{levelTimer=null;loadLevel();countdownStart()},650);
  }
  function loseLife(){if(spawnTimer>0)return;lives--;beep(90,.35,'sawtooth',.08);particles(player.x,player.y,'#ff4fa3',28);if(lives<=0){running=false;finishGame();return}spawnTimer=2.2;resetControls();player.progress=0;enemies.forEach(e=>{e.x=e.px=e.homeX;e.y=e.py=e.homeY;e.progress=0});}
  function finishGame(){
    clearPendingTimers();
    $('pauseOverlay').classList.add('hidden');
    if(score>high){high=score;safeSet('neonMazeHigh',high)}
    $('finalScore').textContent=score;
    $('highScore').textContent=high;
    setScreen('over');
    beep(55,.7,'sawtooth',.07);
  }
  const sparks=[];function particles(x,y,color,n=8){for(let i=0;i<n;i++)sparks.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:.35+Math.random()*.5,color})}
  function update(dt){if(!running||paused)return;if(spawnTimer>0){spawnTimer-=dt;return}choosePlayerDir();movePlayer(dt);enemies.forEach(e=>moveEnemy(e,dt));for(let i=enemies.length-1;i>=0;i--){let e=enemies[i],d=Math.hypot((e.x+e.progress*e.dir.x)-(player.x+player.progress*player.dir.x),(e.y+e.progress*e.dir.y)-(player.y+player.progress*player.dir.y));if(d<.68){if(performance.now()<poweredUntil){score+=200;particles(e.x,e.y,'#ffe76a',18);e.x=e.px=e.homeX;e.y=e.py=e.homeY;e.progress=0;beep(360,.08,'square',.05)}else loseLife()}}
    for(let i=sparks.length-1;i>=0;i--){let p=sparks[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)sparks.splice(i,1)}
  }
  function updateHUD(){
    if(hudCache.score!==score){$('score').textContent=score;hudCache.score=score}
    if(hudCache.lives!==lives){$('lives').textContent='●'.repeat(Math.max(0,lives));hudCache.lives=lives}
    if(hudCache.level!==level){$('level').textContent=level;hudCache.level=level}
  }
  function draw(){
    ctx.drawImage(mazeLayer,0,0);
    function orb(a,color,r){
      const x=(a.x+.5+a.progress*a.dir.x)*TILE,y=(a.y+.5+a.progress*a.dir.y)*TILE;
      ctx.fillStyle=color;
      ctx.shadowColor=color;
      ctx.shadowBlur=10;
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#061022';
      ctx.beginPath();ctx.arc(x+a.dir.x*r*.35,y+a.dir.y*r*.35,3,0,Math.PI*2);ctx.fill();
    }
    orb(player,'#55f6ff',8);
    const powered=performance.now()<poweredUntil;
    for(const e of enemies)orb(e,powered?'#4d6dff':e.color,8);
    for(const p of sparks){
      ctx.globalAlpha=Math.max(0,p.life*2);
      ctx.fillStyle=p.color;
      ctx.fillRect(p.x*TILE-2,p.y*TILE-2,4,4);
    }
    ctx.globalAlpha=1;
    if(spawnTimer>0){
      ctx.fillStyle='#fff';ctx.font='bold 18px system-ui';ctx.textAlign='center';
      ctx.fillText('PRONTO!',W/2,W/2);
    }
    updateHUD();
  }
  function loop(t){
    const dt=Math.min(.04,(t-last)/1000||0);
    last=t;
    if(!document.hidden){update(dt);draw()}
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange',()=>{last=performance.now()});
  requestAnimationFrame(loop);
  function countdownStart(){
    clearPendingTimers();
    setScreen('game');
    paused=false;
    running=false;
    $('pauseOverlay').classList.add('hidden');
    $('pauseBtn').textContent='Ⅱ';
    let n=3,el=$('countdown');
    el.classList.remove('hidden');
    el.textContent=n;
    countdownTimer=setInterval(()=>{
      n--;
      if(n>0){
        el.textContent=n;
        beep(520,.05,'square',.03);
      }else{
        clearInterval(countdownTimer);
        countdownTimer=null;
        el.classList.add('hidden');
        running=true;
        beep(760,.1,'triangle',.05);
      }
    },700);
  }
  function startGame(){
    clearPendingTimers();
    resetControls();
    score=0;
    lives=3;
    level=1;
    poweredUntil=0;
    spawnTimer=0;
    hudCache.score=null;hudCache.lives=null;hudCache.level=null;
    loadLevel();
    countdownStart();
  }
  function setDir(name,{start=false,source='program'}={}){
    if(!dirs[name]||!player)return;
    // Only the active input source can control the current movement.
    if(controlSource && controlSource!==source)return;
    controlSource=source;
    activeDirection=name;
    player.next=dirs[name];
    if(start){
      player.stopAfterTile=false;
      player.moving=true;
      choosePlayerDir();
    }
  }
  function stopPlayer(source='program'){
    if(!player||controlSource!==source)return;
    activeDirection=null;
    controlSource=null;
    if(player.progress>0)player.stopAfterTile=true;
    else player.moving=false;
  }
  function resetControls(){
    controlSource=null;
    activeDirection=null;
    if(player){player.moving=false;player.stopAfterTile=false;player.progress=0}
  }

  $('playBtn').onclick=startGame;
  $('againBtn').onclick=startGame;
  $('menuBtn').onclick=()=>{clearPendingTimers();resetControls();running=false;paused=false;$('pauseOverlay').classList.add('hidden');setScreen('start')};
  $('howBtn').onclick=()=>setScreen('how');
  $('backBtn').onclick=()=>setScreen('start');
  $('restartBtn').onclick=startGame;
  $('pauseBtn').onclick=togglePause;
  $('resumeBtn').onclick=togglePause;

  function togglePause(){
    if(!screens.game.classList.contains('active'))return;
    paused=!paused;
    $('pauseOverlay').classList.toggle('hidden',!paused);
    $('pauseBtn').textContent=paused?'▶':'Ⅱ';
  }

  // Touch buttons: each physical button controls only its own direction.
  let activeTouchButton=null;
  let activePointerId=null;
  document.querySelectorAll('[data-dir]').forEach(button=>{
    const direction=button.dataset.dir;
    const source='button:'+direction;
    const start=e=>{
      e.preventDefault();
      e.stopPropagation();
      // Ignore another button while one button is already being pressed.
      if(activeTouchButton && activeTouchButton!==button)return;
      activeTouchButton=button;
      activePointerId=e.pointerId;
      try{button.setPointerCapture(e.pointerId)}catch(_){}
      setDir(direction,{start:true,source});
    };
    const stop=e=>{
      e.preventDefault();
      e.stopPropagation();
      if(activeTouchButton!==button)return;
      if(activePointerId!==null && e.pointerId!==activePointerId)return;
      activeTouchButton=null;
      activePointerId=null;
      stopPlayer(source);
      try{button.releasePointerCapture(e.pointerId)}catch(_){}
    };
    button.addEventListener('pointerdown',start);
    button.addEventListener('pointerup',stop);
    button.addEventListener('pointercancel',stop);
    button.addEventListener('lostpointercapture',()=>stopPlayer(source));
    button.addEventListener('contextmenu',e=>e.preventDefault());
  });

  // Keyboard: hold a key to move; release it to stop cleanly on a tile.
  const keyMap={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
  const pressedKeys=new Set();
  document.addEventListener('keydown',e=>{
    const dir=keyMap[e.key];
    if(dir){
      e.preventDefault();
      pressedKeys.add(e.key);
      setDir(dir,{start:true,source:'keyboard'});
      return;
    }
    if(e.key===' '){e.preventDefault();togglePause()}
  });
  document.addEventListener('keyup',e=>{
    if(keyMap[e.key]){
      pressedKeys.delete(e.key);
      if(pressedKeys.size===0)stopPlayer('keyboard');
    }
  });

  // Swipe changes direction and starts movement. A new swipe is required to change it again.
  let sx=0,sy=0,swipeActive=false;
  $('gameWrap').addEventListener('pointerdown',e=>{
    if(e.target.closest('[data-dir]'))return;
    sx=e.clientX;sy=e.clientY;swipeActive=true;
  });
  $('gameWrap').addEventListener('pointerup',e=>{
    if(!swipeActive)return;
    swipeActive=false;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    if(Math.hypot(dx,dy)<18)return;
    const dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    setDir(dir,{start:true,source:'swipe'});
  });
  $('gameWrap').addEventListener('pointercancel',()=>{swipeActive=false;stopPlayer('swipe')});
  function syncSound(){let txt=soundOn?'🔊':'🔇';$('soundBtn').textContent=txt;$('soundStart').textContent=`${txt} Som`;safeSet('neonMazeSound',soundOn?'on':'off')}$('soundBtn').onclick=()=>{soundOn=!soundOn;syncSound()};$('soundStart').onclick=()=>{soundOn=!soundOn;syncSound()};syncSound();
  loadLevel();draw();
})();