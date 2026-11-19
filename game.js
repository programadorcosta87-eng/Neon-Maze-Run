(() => {
  const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
  const $=id=>document.getElementById(id);
  const screens={start:$('startScreen'),how:$('howScreen'),game:$('gameScreen'),over:$('gameOver')};
  const TILE=20, COLS=32, ROWS=32, W=COLS*TILE;
  const mazeLayer=document.createElement('canvas');
  mazeLayer.width=W; mazeLayer.height=W;
  const mazeCtx=mazeLayer.getContext('2d');
  const hudCache={score:null,lives:null,level:null,keys:null};
  const levelPalettes=[{wall:'#102a52',edge:'#1d63aa',dot:'#8cf7ff',key:'#ffe76a'},{wall:'#24184c',edge:'#8b5cf6',dot:'#c6a7ff',key:'#ffcf5c'},{wall:'#123c3a',edge:'#21b6a2',dot:'#8effd2',key:'#ff8ec7'},{wall:'#40213c',edge:'#e35b9b',dot:'#ffc1e1',key:'#8ff7ff'}];
  let levelKeys=[],keysCollected=0,keysRequired=0;
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
  let hunterCombo=0,hunterComboAt=0;
  let grid=[],collectiblesLeft=0,player,enemies=[],score=0,lives=3,level=1,running=false,paused=false,poweredUntil=0,last=0,high=Number(safeGet('neonMazeHigh','0'))||0,bestLevel=Math.max(1,Number(safeGet('neonMazeBestLevel','1'))||1),soundOn=safeGet('neonMazeSound','on')!=='off',spawnTimer=0;
  const dirs={up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
  let audioCtx;
  function beep(freq,dur=.07,type='sine',vol=.04){if(!soundOn)return;try{audioCtx??=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g).connect(audioCtx.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);o.stop(audioCtx.currentTime+dur)}catch(e){}}
  function setScreen(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name].classList.add('active');if(name==='start')updateRecords()}
  function saveProgress(){
    if(score>high){high=score;safeSet('neonMazeHigh',String(high))}
    if(level>bestLevel){bestLevel=level;safeSet('neonMazeBestLevel',String(bestLevel))}
    updateRecords();
  }
  function updateRecords(){
    const scoreEl=$('menuHighScore'),levelEl=$('menuBestLevel');
    if(scoreEl)scoreEl.textContent=high.toLocaleString('pt-BR');
    if(levelEl)levelEl.textContent=bestLevel.toLocaleString('pt-BR');
  }
  function normalizeMap(str){
    const lines=str.split('\n');
    const map=lines.slice(0,ROWS).map(x=>x.padEnd(COLS,'#').slice(0,COLS).split(''));
    while(map.length<ROWS) map.push(Array(COLS).fill('#'));
    for(let x=0;x<COLS;x++){map[0][x]='#';map[ROWS-1][x]='#'}
    for(let y=0;y<ROWS;y++){map[y][0]='#';map[y][COLS-1]='#'}

    // Garante que todos os corredores e pontos pertençam a uma única região acessível.
    const flood=()=>{
      let start=null;
      for(let y=1;y<ROWS-1&&!start;y++)for(let x=1;x<COLS-1;x++)if(map[y][x]!=='#'){start=[x,y];break}
      if(!start)return new Set();
      const q=[start],seen=new Set([start[1]*COLS+start[0]]);
      for(let i=0;i<q.length;i++){
        const [x,y]=q[i];
        for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const nx=x+dx,ny=y+dy,id=ny*COLS+nx;
          if(nx>0&&nx<COLS-1&&ny>0&&ny<ROWS-1&&map[ny][nx]!=='#'&&!seen.has(id)){seen.add(id);q.push([nx,ny])}
        }
      }
      return seen;
    };
    let reachable=flood();
    // Liga cada componente isolado ao corredor principal pelo caminho mais curto.
    for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
      if(map[y][x]==='#'||reachable.has(y*COLS+x))continue;
      const q=[[x,y]],prev=new Map([[y*COLS+x,-1]]);
      let end=-1;
      for(let i=0;i<q.length&&end<0;i++){
        const [cx,cy]=q[i],id=cy*COLS+cx;
        if(reachable.has(id)){end=id;break}
        for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]]){
          const nx=cx+dx,ny=cy+dy,nid=ny*COLS+nx;
          if(nx>0&&nx<COLS-1&&ny>0&&ny<ROWS-1&&!prev.has(nid)){prev.set(nid,id);q.push([nx,ny])}
        }
      }
      if(end>=0){
        let id=end;
        while(id!==-1){const px=id%COLS,py=Math.floor(id/COLS);map[py][px]='.';id=prev.get(id)}
        reachable=flood();
      }
    }
    return map;
  }
  function buildMazeLayer(){
    const palette=levelPalettes[(level-1)%levelPalettes.length];
    mazeCtx.clearRect(0,0,W,W);
    mazeCtx.fillStyle='#050b17';
    mazeCtx.fillRect(0,0,W,W);
    mazeCtx.fillStyle=palette.wall;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]==='#')mazeCtx.fillRect(x*TILE,y*TILE,TILE,TILE);
    mazeCtx.strokeStyle=palette.edge;
    mazeCtx.lineWidth=1;
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]==='#')mazeCtx.strokeRect(x*TILE+1,y*TILE+1,TILE-2,TILE-2);
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
      const c=grid[y][x];
      if(c==='.'||c==='o'){
        mazeCtx.fillStyle=c==='o'?palette.key:palette.dot;
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
  function transformLevelMap(map,variant){
    if(variant===0)return map;
    return map.map((row,y)=>row.map((cell,x)=>variant===1?row[COLS-1-x]:variant===2?map[ROWS-1-y][COLS-1-x]:map[ROWS-1-y][x]));
  }
  function placeLevelKeys(spawn){
    keysRequired=Math.min(4,2+Math.floor((level-1)/3));
    keysCollected=0;
    levelKeys=[];
    const dist=new Int16Array(COLS*ROWS);dist.fill(-1);
    const start=spawn.y*COLS+spawn.x,q=[start];dist[start]=0;
    for(let i=0;i<q.length;i++){
      const id=q[i],x=id%COLS,y=Math.floor(id/COLS);
      for(const d of Object.values(dirs)){
        const nx=x+d.x,ny=y+d.y,nid=ny*COLS+nx;
        if(cellOpen(nx,ny)&&dist[nid]===-1){dist[nid]=dist[id]+1;q.push(nid)}
      }
    }
    const chosen=[];
    for(let n=0;n<keysRequired;n++){
      let best=null,bestDistance=-1;
      for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++){
        const id=y*COLS+x;
        if(!cellOpen(x,y)||dist[id]<0||dist[id]<3||chosen.some(p=>Math.abs(p.x-x)+Math.abs(p.y-y)<7))continue;
        const spacing=chosen.length?Math.min(...chosen.map(p=>Math.abs(p.x-x)+Math.abs(p.y-y))):999;
        const value=dist[id]+spacing*.7;
        if(value>bestDistance){bestDistance=value;best={x,y}}
      }
      if(!best)break;
      chosen.push(best);
    }
    keysRequired=chosen.length;
    levelKeys=chosen.map((p,index)=>({...p,phase:index*.9}));
    for(const p of chosen){if(grid[p.y][p.x]==='.'||grid[p.y][p.x]==='o')collectiblesLeft--;grid[p.y][p.x]='k'}
  }
  function loadLevel(){
    const base=normalizeMap(maps[Math.floor((level-1)/4)%maps.length]);
    grid=transformLevelMap(base,(level-1)%4);
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
    placeLevelKeys(p);

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
  function recoverEnemyPosition(a){
    const pos=closestOpenCell(a.x,a.y);
    if(!pos)return false;
    a.x=a.px=pos.x;a.y=a.py=pos.y;a.progress=0;
    return chooseEnemyDir(a,true);
  }
  function moveEnemy(a,dt){
    if(a.progress===0&&!cellOpen(a.x+a.dir.x,a.y+a.dir.y)){
      if(!chooseEnemyDir(a,true)&&!recoverEnemyPosition(a))return;
    }
    a.progress+=a.speed*dt;
    let guard=0;
    while(a.progress>=1&&guard++<8){
      a.progress-=1;
      let nx=a.x+a.dir.x,ny=a.y+a.dir.y;
      if(!cellOpen(nx,ny)){
        if(!chooseEnemyDir(a,true)){a.progress=0;recoverEnemyPosition(a);return}
        nx=a.x+a.dir.x;ny=a.y+a.dir.y;
      }
      if(!cellOpen(nx,ny)){a.progress=0;recoverEnemyPosition(a);return}
      a.px=a.x;a.py=a.y;a.x=nx;a.y=ny;
      if(!chooseEnemyDir(a,false)&&!recoverEnemyPosition(a))return;
    }
    if(guard>=8)a.progress=0;
  }
  function collect(){
    const c=grid[player.y][player.x];
    if(c==='k'){
      grid[player.y][player.x]=' ';
      levelKeys=levelKeys.filter(key=>key.x!==player.x||key.y!==player.y);
      keysCollected++;
      score+=150;
      floatingText(player.x,player.y,'+150 CHAVE','#ffe76a');
      clearCollectible(player.x,player.y);
      particles(player.x,player.y,levelPalettes[(level-1)%levelPalettes.length].key,16);
      beep(980,.12,'triangle',.06);
      updateHUD();
      if(keysCollected>=keysRequired)nextLevel();
      return;
    }
    if(c==='.'||c==='o'){
      grid[player.y][player.x]=' ';
      collectiblesLeft--;
      clearCollectible(player.x,player.y);
      if(c==='.'){
        score+=10;
        floatingText(player.x,player.y,'+10','#8cf7ff');
        beep(660,.045,'square',.025);
        if(Math.random()<.15)particles(player.x,player.y,'#55f6ff');
      }else{
        score+=50;
        hunterCombo=0;
        poweredUntil=performance.now()+7000;
        floatingText(player.x,player.y,'NÚCLEO ATIVO!','#ffe76a');
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
  function closestOpenCell(x,y){
    x=Math.max(1,Math.min(COLS-2,Math.round(x)));
    y=Math.max(1,Math.min(ROWS-2,Math.round(y)));
    if(cellOpen(x,y))return {x,y};
    for(let r=1;r<Math.max(COLS,ROWS);r++){
      for(let yy=Math.max(1,y-r);yy<=Math.min(ROWS-2,y+r);yy++){
        for(let xx=Math.max(1,x-r);xx<=Math.min(COLS-2,x+r);xx++){
          if(cellOpen(xx,yy))return {x:xx,y:yy};
        }
      }
    }
    return null;
  }
  function buildDistanceField(tx,ty){
    const target=closestOpenCell(tx,ty);
    const dist=new Int16Array(COLS*ROWS);dist.fill(-1);
    if(!target)return dist;
    const q=[target.y*COLS+target.x];dist[q[0]]=0;
    for(let i=0;i<q.length;i++){
      const id=q[i],x=id%COLS,y=Math.floor(id/COLS),next=dist[id]+1;
      for(const d of Object.values(dirs)){
        const nx=x+d.x,ny=y+d.y,nid=ny*COLS+nx;
        if(cellOpen(nx,ny)&&dist[nid]===-1){dist[nid]=next;q.push(nid)}
      }
    }
    return dist;
  }
  function chooseEnemyDir(e,force=false){
    const all=Object.values(dirs).filter(d=>cellOpen(e.x+d.x,e.y+d.y));
    if(!all.length)return false;

    const fleeing=performance.now()<poweredUntil;
    const target=fleeing?{x:player.x,y:player.y}:enemyTarget(e);
    const field=buildDistanceField(target.x,target.y);
    let best=[],bestScore=fleeing?-Infinity:Infinity;
    for(const d of all){
      const value=field[(e.y+d.y)*COLS+(e.x+d.x)];
      if(value<0)continue;
      if((!fleeing&&value<bestScore)||(fleeing&&value>bestScore)){bestScore=value;best=[d]}
      else if(value===bestScore)best.push(d);
    }
    // A connected map always provides a route; legal-neighbor fallback prevents a freeze
    // if a malformed or externally modified map is ever encountered.
    const options=best.length?best:all;
    if(e.mode==='wander'&&!fleeing&&!force&&Math.random()<.22){
      e.dir=options[Math.floor(Math.random()*options.length)];
    }else{
      e.dir=options[Math.floor(Math.random()*options.length)];
    }
    return true;
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
    saveProgress();
    beep(880,.12,'triangle',.06);
    levelTimer=setTimeout(()=>{levelTimer=null;loadLevel();countdownStart()},650);
  }
  function loseLife(){if(spawnTimer>0)return;hunterCombo=0;floatingText(player.x,player.y,'-1 VIDA','#ff6b9d');lives--;beep(90,.35,'sawtooth',.08);particles(player.x,player.y,'#ff4fa3',28);if(lives<=0){running=false;finishGame();return}spawnTimer=2.2;resetControls();player.progress=0;enemies.forEach(e=>{e.x=e.px=e.homeX;e.y=e.py=e.homeY;e.progress=0});}
  function finishGame(){
    clearPendingTimers();
    $('pauseOverlay').classList.add('hidden');
    saveProgress();
    $('finalScore').textContent=score;
    $('highScore').textContent=high;
    setScreen('over');
    beep(55,.7,'sawtooth',.07);
  }
  const sparks=[];
  const floatingTexts=[];
  function particles(x,y,color,n=8){for(let i=0;i<n;i++)sparks.push({x:x+.5,y:y+.5,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5,life:.35+Math.random()*.5,color})}
  function floatingText(x,y,text,color){floatingTexts.push({x:x+.5,y:y+.25,text,color,life:1,maxLife:1})}
  function update(dt){if(!running||paused)return;if(spawnTimer>0){spawnTimer=Math.max(0,spawnTimer-dt);return}choosePlayerDir();movePlayer(dt);enemies.forEach(e=>moveEnemy(e,dt));for(let i=enemies.length-1;i>=0;i--){let e=enemies[i],d=Math.hypot((e.x+e.progress*e.dir.x)-(player.x+player.progress*player.dir.x),(e.y+e.progress*e.dir.y)-(player.y+player.progress*player.dir.y));if(d<.68){if(performance.now()<poweredUntil){const now=performance.now();hunterCombo=now-hunterComboAt<2600?hunterCombo+1:1;hunterComboAt=now;const bonus=200*hunterCombo;score+=bonus;floatingText(e.x,e.y,`+${bonus} x${hunterCombo}`,'#ffe76a');particles(e.x,e.y,'#ffe76a',18);e.x=e.px=e.homeX;e.y=e.py=e.homeY;e.progress=0;beep(360,.08,'square',.05);updateHUD()}else loseLife()}}
    if(performance.now()>=poweredUntil)hunterCombo=0;
    for(let i=sparks.length-1;i>=0;i--){let p=sparks[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)sparks.splice(i,1)}
    for(let i=floatingTexts.length-1;i>=0;i--){const p=floatingTexts[i];p.y-=dt*1.05;p.life-=dt;if(p.life<=0)floatingTexts.splice(i,1)}
  }
  function updateHUD(){
    saveProgress();
    if(hudCache.keys!==keysCollected){$('keys').textContent=`${keysCollected}/${keysRequired}`;hudCache.keys=keysCollected}
    if(hudCache.score!==score){$('score').textContent=score;hudCache.score=score}
    if(hudCache.lives!==lives){$('lives').textContent='●'.repeat(Math.max(0,lives));hudCache.lives=lives}
    if(hudCache.level!==level){$('level').textContent=level;hudCache.level=level}
  }
  function draw(){
    ctx.drawImage(mazeLayer,0,0);
    function actorPosition(a){return {x:(a.x+.5+a.progress*a.dir.x)*TILE,y:(a.y+.5+a.progress*a.dir.y)*TILE}}
    function drawPlayer(a){
      const {x,y}=actorPosition(a),t=performance.now()/180,pulse=1+Math.sin(t)*.07;
      ctx.save();ctx.translate(x,y);ctx.scale(pulse,pulse);ctx.shadowColor='#55f6ff';ctx.shadowBlur=18;
      const body=ctx.createRadialGradient(-3,-4,1,0,0,10);body.addColorStop(0,'#ffffff');body.addColorStop(.22,'#9cffff');body.addColorStop(.62,'#35d9ff');body.addColorStop(1,'#1768d8');
      ctx.fillStyle=body;ctx.beginPath();ctx.arc(0,0,8.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
      ctx.rotate(t);ctx.strokeStyle='#c9ffff';ctx.lineWidth=1.25;ctx.beginPath();ctx.ellipse(0,0,12,4.2,0,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,2.2,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function drawHunter(a,color){
      const {x,y}=actorPosition(a),t=performance.now()/260;
      ctx.save();ctx.translate(x,y);ctx.rotate(t*(a.mode==='ambush'?-1:1));ctx.shadowColor=color;ctx.shadowBlur=14;ctx.fillStyle=color;
      ctx.beginPath();for(let i=0;i<6;i++){const angle=Math.PI/3*i-Math.PI/6,px=Math.cos(angle)*8.5,py=Math.sin(angle)*8.5;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}ctx.closePath();ctx.fill();
      ctx.shadowBlur=0;ctx.fillStyle='#071326';ctx.beginPath();ctx.ellipse(0,0,4.5,2.2,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(a.dir.x*2,a.dir.y*1.5,1.5,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#ffffff88';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    drawPlayer(player);const powered=performance.now()<poweredUntil;
    for(const e of enemies)drawHunter(e,powered?'#6688ff':e.color);
    for(const key of levelKeys){
      const x=(key.x+.5)*TILE,y=(key.y+.5)*TILE,pulse=1+Math.sin(performance.now()/180+key.phase)*.12;
      const color=levelPalettes[(level-1)%levelPalettes.length].key;
      ctx.save();ctx.translate(x,y);ctx.scale(pulse,pulse);ctx.shadowColor=color;ctx.shadowBlur=15;ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(-3,-4,5,0,Math.PI*2);ctx.moveTo(1,0);ctx.lineTo(9,8);ctx.lineTo(6,11);ctx.moveTo(5,6);ctx.lineTo(2,9);ctx.stroke();ctx.restore();
    }
    for(const p of sparks){
      ctx.globalAlpha=Math.max(0,p.life*2);
      ctx.fillStyle=p.color;
      ctx.fillRect(p.x*TILE-2,p.y*TILE-2,4,4);
    }
    ctx.globalAlpha=1;
    for(const p of floatingTexts){ctx.save();ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.font='900 12px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#06101f';ctx.strokeText(p.text,p.x*TILE,p.y*TILE);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x*TILE,p.y*TILE);ctx.restore()}
    if(performance.now()<poweredUntil){const remain=Math.max(0,(poweredUntil-performance.now())/1000);ctx.save();ctx.textAlign='center';ctx.font='900 13px system-ui';ctx.fillStyle='#ffe76a';ctx.shadowColor='#ffe76a';ctx.shadowBlur=12;ctx.fillText(`NÚCLEO ${remain.toFixed(1)}s`,W/2,22);ctx.restore()}
    if(spawnTimer>0){
      ctx.fillStyle='#fff';ctx.font='bold 18px system-ui';ctx.textAlign='center';
      ctx.fillText('PRONTO!',W/2,W/2);
    }
    updateHUD();
  }
  function loop(t){
    const dt=Math.min(.033,Math.max(0,(t-last)/1000||0));
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
    hudCache.score=null;hudCache.lives=null;hudCache.level=null;hudCache.keys=null;
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
  loadLevel();updateRecords();draw();
})();