(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const heartsEl = document.getElementById("hearts");
  const heartEls = [...heartsEl.children];
  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const startButton = document.getElementById("startButton");
  const restartButton = document.getElementById("restartButton");
  const finalScoreEl = document.getElementById("finalScore");
  const resultMessageEl = document.getElementById("resultMessage");
  const feedbackEl = document.getElementById("feedback");
  const liveStatus = document.getElementById("liveStatus");
  const leftButton = document.getElementById("leftButton");
  const rightButton = document.getElementById("rightButton");
  const W = 960, H = 600, groundY = 535;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    mode: "idle", score: 0, lives: 3, items: [], particles: [],
    clouds: [{ x: 115, y: 108, s: 1.1 }, { x: 660, y: 78, s: .82 }, { x: 840, y: 154, s: .56 }],
    player: { x: W / 2, y: groundY - 52, speed: 460 }, keys: { left: false, right: false },
    lastTime: 0, spawnTimer: 0, invincibleUntil: 0, shakeUntil: 0, elapsed: 0
  };

  function updateHud() {
    scoreEl.textContent = state.score;
    scoreEl.setAttribute("aria-label", `分數 ${state.score}`);
    heartEls.forEach((heart, i) => heart.classList.toggle("lost", i >= state.lives));
    heartsEl.setAttribute("aria-label", `剩餘 ${state.lives} 顆心`);
  }
  function resetGame() {
    Object.assign(state, { score: 0, lives: 3, items: [], particles: [], spawnTimer: .72, invincibleUntil: 0, shakeUntil: 0, elapsed: 0 });
    state.player.x = W / 2; state.keys.left = false; state.keys.right = false; updateHud();
  }
  function startGame() {
    resetGame(); state.mode = "playing";
    startOverlay.classList.remove("is-visible"); gameOverOverlay.classList.remove("is-visible");
    gameOverOverlay.setAttribute("aria-hidden", "true");
    liveStatus.textContent = "遊戲開始！你有三顆心，分數是零。"; state.lastTime = performance.now();
  }
  function endGame() {
    state.mode = "gameOver"; state.keys.left = false; state.keys.right = false;
    finalScoreEl.textContent = state.score;
    resultMessageEl.textContent = state.score >= 25 ? "超級果園高手！松鼠都看呆了！" : state.score >= 12 ? "好厲害！籃子裝得滿滿的！" : "再試一次，松鼠相信你！";
    gameOverOverlay.classList.add("is-visible"); gameOverOverlay.setAttribute("aria-hidden", "false");
    liveStatus.textContent = `遊戲結束。最終分數 ${state.score} 分。`; setTimeout(() => restartButton.focus(), 120);
  }
  function currentDifficulty() {
    const level = Math.min(state.score, 35);
    return { interval: Math.max(.46, 1.02 - level * .016), speed: Math.min(350, 195 + level * 4.1), chestnutChance: Math.min(.35, .17 + level * .005) };
  }
  function spawnItem() {
    const d = currentDifficulty(), isChestnut = Math.random() < d.chestnutChance;
    state.items.push({ type: isChestnut ? "chestnut" : "apple", x: 275 + Math.random() * 625, y: 80 + Math.random() * 24, radius: isChestnut ? 23 : 21, speed: d.speed * (.88 + Math.random() * .22), rotation: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * 3.4, sway: Math.random() * Math.PI * 2, handled: false });
    state.spawnTimer = d.interval * (.82 + Math.random() * .35);
  }
  function intersectsBasket(item) {
    return item.x + item.radius > state.player.x - 56 && item.x - item.radius < state.player.x + 56 && item.y + item.radius > state.player.y + 36 && item.y - item.radius < state.player.y + 76;
  }
  function showFeedback(text, type) {
    feedbackEl.textContent = text; feedbackEl.className = `feedback ${type}`; void feedbackEl.offsetWidth; feedbackEl.classList.add("show");
  }
  function addParticles(x, y, color) {
    if (reducedMotion) return;
    for (let i = 0; i < 10; i++) state.particles.push({ x, y, vx: (Math.random() - .5) * 150, vy: -50 - Math.random() * 120, life: .65 + Math.random() * .25, maxLife: .9, color, size: 3 + Math.random() * 5 });
  }
  function takeDamage(reason, now) {
    if (now < state.invincibleUntil || state.mode !== "playing") return;
    state.lives--; state.invincibleUntil = now + 720; state.shakeUntil = now + 340; updateHud();
    heartsEl.classList.remove("is-hit"); void heartsEl.offsetWidth; heartsEl.classList.add("is-hit");
    showFeedback(reason === "chestnut" ? "刺刺！-1 ♥" : "漏接了！-1 ♥", "bad");
    liveStatus.textContent = `${reason === "chestnut" ? "接到栗子" : "漏掉蘋果"}，剩下 ${state.lives} 顆心。`;
    if (state.lives <= 0) endGame();
  }
  function handleCatch(item, now) {
    item.handled = true;
    if (item.type === "apple") { state.score++; updateHud(); showFeedback("好球！+1", "good"); addParticles(item.x, item.y, "#f2c84b"); liveStatus.textContent = `接到蘋果，現在 ${state.score} 分。`; }
    else { addParticles(item.x, item.y, "#8b5a36"); takeDamage("chestnut", now); }
  }
  function update(dt, now) {
    state.elapsed += dt; if (state.mode !== "playing") return;
    const direction = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    state.player.x = Math.max(72, Math.min(W - 72, state.player.x + direction * state.player.speed * dt));
    state.spawnTimer -= dt; if (state.spawnTimer <= 0) spawnItem();
    for (const item of state.items) {
      item.y += item.speed * dt; item.rotation += item.spin * dt; item.x += Math.sin(state.elapsed * 2.2 + item.sway) * 10 * dt;
      if (!item.handled && intersectsBasket(item)) handleCatch(item, now);
      if (!item.handled && item.y - item.radius > groundY + 25) { item.handled = true; if (item.type === "apple") takeDamage("miss", now); }
    }
    state.items = state.items.filter(item => !item.handled && item.y < H + 80);
    for (const p of state.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }
    state.particles = state.particles.filter(p => p.life > 0);
  }
  function roundedRect(x, y, width, height, radius) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); }
  function drawCloud(x, y, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.fillStyle = "rgba(255,253,235,.78)"; ctx.beginPath();
    ctx.arc(-28, 8, 24, 0, Math.PI * 2); ctx.arc(0, -2, 33, 0, Math.PI * 2); ctx.arc(34, 9, 25, 0, Math.PI * 2); ctx.roundRect(-51, 5, 104, 33, 16); ctx.fill(); ctx.restore();
  }
  function drawBackground(t) {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY); sky.addColorStop(0, "#b8dfd1"); sky.addColorStop(.68, "#e8efc9"); sky.addColorStop(1, "#f4dfa1"); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,239,167,.72)"; ctx.beginPath(); ctx.arc(785, 115, 62, 0, Math.PI * 2); ctx.fill();
    state.clouds.forEach((c, i) => drawCloud(c.x + (reducedMotion ? 0 : Math.sin(t * .00018 + i) * 12), c.y, c.s));
    ctx.fillStyle = "#9fbd7a"; ctx.beginPath(); ctx.moveTo(0, 430); ctx.quadraticCurveTo(175, 365, 340, 432); ctx.quadraticCurveTo(560, 350, 745, 425); ctx.quadraticCurveTo(860, 386, 960, 420); ctx.lineTo(960, groundY); ctx.lineTo(0, groundY); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#67945a"; ctx.fillRect(0, groundY - 18, W, H - groundY + 18); ctx.fillStyle = "#4c784e";
    for (let x = 0; x < W; x += 26) { const h = 12 + (x * 17 % 17); ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 6, groundY - h); ctx.lineTo(x + 11, groundY); ctx.fill(); }
    drawTree(t); drawFlowers();
  }
  function drawTree(t) {
    ctx.save(); ctx.fillStyle = "#71432d"; ctx.beginPath(); ctx.moveTo(56, 505); ctx.quadraticCurveTo(84, 355, 105, 205); ctx.quadraticCurveTo(145, 190, 184, 212); ctx.quadraticCurveTo(163, 354, 198, 505); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#4f3024"; ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = "#71432d"; ctx.lineCap = "round"; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(126, 238); ctx.lineTo(245, 135); ctx.moveTo(131, 266); ctx.lineTo(35, 168); ctx.stroke();
    const leaves = [[-10,120,84],[60,72,92],[145,82,103],[232,88,84],[286,135,74],[205,164,96],[100,154,108],[22,195,82]];
    leaves.forEach(([x,y,r],i) => { ctx.fillStyle = i % 3 === 0 ? "#3c7648" : i % 2 ? "#5a8d4e" : "#477e49"; ctx.beginPath(); ctx.arc(x, y + (reducedMotion ? 0 : Math.sin(t * .001 + i) * 3), r, 0, Math.PI * 2); ctx.fill(); });
    for (let i = 0; i < 12; i++) { ctx.fillStyle = "#d94a2f"; ctx.beginPath(); ctx.arc(22 + (i * 73) % 278, 54 + (i * 47) % 156, 8, 0, Math.PI * 2); ctx.fill(); }
    drawSquirrel(245, 106, t); ctx.restore();
  }
  function drawSquirrel(x, y, t) {
    ctx.save(); ctx.translate(x, y + (reducedMotion ? 0 : Math.sin(t * .004) * 3)); ctx.rotate(-.08); ctx.fillStyle = "#bd6839";
    ctx.beginPath(); ctx.arc(41,-4,32,0,Math.PI*2); ctx.arc(67,-26,22,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(10,-10,37,.5,5.7); ctx.arc(-5,-33,30,1.1,6); ctx.fill();
    ctx.fillStyle="#f2bd79"; ctx.beginPath(); ctx.ellipse(47,2,16,23,-.3,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#7b3e29"; ctx.beginPath(); ctx.moveTo(56,-50); ctx.lineTo(62,-72); ctx.lineTo(74,-48); ctx.fill(); ctx.beginPath(); ctx.moveTo(73,-46); ctx.lineTo(84,-65); ctx.lineTo(90,-38); ctx.fill();
    ctx.fillStyle="#241b17"; ctx.beginPath(); ctx.arc(76,-31,4,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(91,-17,4,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="#241b17"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(92,-14); ctx.quadraticCurveTo(84,-8,79,-12); ctx.stroke(); ctx.restore();
  }
  function drawFlowers() {
    for (let x=250;x<W;x+=76) { const y=groundY+22+(x%3)*5; ctx.strokeStyle="#356c45";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y+15);ctx.lineTo(x,y-4);ctx.stroke();ctx.fillStyle=x%2?"#f6d365":"#f6eee0";for(let a=0;a<5;a++){ctx.beginPath();ctx.arc(x+Math.cos(a*Math.PI*.4)*7,y-6+Math.sin(a*Math.PI*.4)*7,5,0,Math.PI*2);ctx.fill();}ctx.fillStyle="#b35b35";ctx.beginPath();ctx.arc(x,y-6,4,0,Math.PI*2);ctx.fill(); }
  }
  function drawApple(item) {
    ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation);ctx.fillStyle="#d9432f";ctx.beginPath();ctx.arc(-9,3,15,0,Math.PI*2);ctx.arc(9,3,15,0,Math.PI*2);ctx.quadraticCurveTo(0,29,-17,10);ctx.fill();ctx.fillStyle="#f06943";ctx.beginPath();ctx.arc(-8,-2,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#503324";ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(3,-22);ctx.stroke();ctx.fillStyle="#47834d";ctx.beginPath();ctx.ellipse(12,-17,10,5,-.35,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawChestnut(item) {
    ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation);ctx.strokeStyle="#6d4b31";ctx.lineWidth=3;for(let i=0;i<14;i++){const a=Math.PI*2*i/14;ctx.beginPath();ctx.moveTo(Math.cos(a)*17,Math.sin(a)*17);ctx.lineTo(Math.cos(a)*29,Math.sin(a)*29);ctx.stroke();}ctx.fillStyle="#8b5a36";ctx.beginPath();ctx.arc(0,0,21,0,Math.PI*2);ctx.fill();ctx.fillStyle="#bf8550";ctx.beginPath();ctx.arc(-5,-6,7,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function drawPlayer(now) {
    if (now < state.invincibleUntil && Math.floor(now / 90) % 2 === 0) return;
    const p=state.player;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(state.keys.left?-.035:state.keys.right?.035:0);ctx.fillStyle="rgba(56,51,37,.18)";ctx.beginPath();ctx.ellipse(0,77,68,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#4d7866";roundedRect(-34,16,68,62,18);ctx.fill();ctx.fillStyle="#f4c59b";ctx.beginPath();ctx.arc(0,3,25,0,Math.PI*2);ctx.fill();ctx.fillStyle="#61432e";ctx.beginPath();ctx.arc(-2,-4,27,Math.PI,Math.PI*2);ctx.lineTo(25,3);ctx.quadraticCurveTo(8,-11,-27,4);ctx.fill();ctx.fillStyle="#e55b35";ctx.beginPath();ctx.ellipse(-2,-23,31,9,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-20,-42,38,18);ctx.fillStyle="#34251d";ctx.beginPath();ctx.arc(-9,2,2.5,0,Math.PI*2);ctx.arc(9,2,2.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#8f4c3b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,9,7,.2,Math.PI-.2);ctx.stroke();ctx.strokeStyle="#f4c59b";ctx.lineWidth=13;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-28,30);ctx.lineTo(-53,48);ctx.moveTo(28,30);ctx.lineTo(53,48);ctx.stroke();ctx.fillStyle="#c88942";ctx.strokeStyle="#654127";ctx.lineWidth=5;roundedRect(-58,37,116,43,11);ctx.fill();ctx.stroke();ctx.strokeStyle="#9d642f";ctx.lineWidth=4;for(let x=-42;x<=42;x+=21){ctx.beginPath();ctx.moveTo(x,42);ctx.lineTo(x,76);ctx.stroke();}ctx.beginPath();ctx.arc(0,40,48,Math.PI,Math.PI*2);ctx.stroke();ctx.fillStyle="#354e55";roundedRect(-29,72,23,11,5);ctx.fill();roundedRect(7,72,23,11,5);ctx.fill();ctx.restore();
  }
  function drawParticles(){for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/p.maxLife);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.life*5);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}ctx.globalAlpha=1;}
  function draw(now){ctx.save();if(!reducedMotion&&now<state.shakeUntil)ctx.translate((Math.random()-.5)*10,(Math.random()-.5)*6);drawBackground(now);state.items.forEach(i=>i.type==="apple"?drawApple(i):drawChestnut(i));drawParticles();drawPlayer(now);ctx.restore();}
  function loop(now){const dt=Math.min(.034,Math.max(0,(now-(state.lastTime||now))/1000));state.lastTime=now;update(dt,now);draw(now);requestAnimationFrame(loop);}
  const keyMap={ArrowLeft:"left",a:"left",A:"left",ArrowRight:"right",d:"right",D:"right"};
  window.addEventListener("keydown",e=>{const d=keyMap[e.key];if(!d)return;e.preventDefault();state.keys[d]=true;});
  window.addEventListener("keyup",e=>{const d=keyMap[e.key];if(!d)return;e.preventDefault();state.keys[d]=false;});
  window.addEventListener("blur",()=>{state.keys.left=false;state.keys.right=false;});
  function bindMoveButton(button,direction){const press=e=>{e.preventDefault();button.setPointerCapture?.(e.pointerId);button.classList.add("is-pressed");state.keys[direction]=true;};const release=e=>{e.preventDefault();button.classList.remove("is-pressed");state.keys[direction]=false;};button.addEventListener("pointerdown",press);button.addEventListener("pointerup",release);button.addEventListener("pointercancel",release);button.addEventListener("lostpointercapture",release);}
  bindMoveButton(leftButton,"left");bindMoveButton(rightButton,"right");startButton.addEventListener("click",startGame);restartButton.addEventListener("click",startGame);resetGame();requestAnimationFrame(loop);
})();
