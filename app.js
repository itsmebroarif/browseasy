let money = 0;
let rings = 0;
let isInteracting = false;
let lockCooldown = false;

const sfx = { 
  play: (type) => {
    if (type === 'coin') sfxCoin();
    else if (type === 'interact') sfxInteract();
  } 
};

// Audio setup
let actx = null;
function initAudio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
}
function sfxSound(freq, dur, type, vol, delay) {
  try {
    initAudio();
    if (!actx) return;
    const t = actx.currentTime + (delay || 0);
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (dur || 0.1));
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + (dur || 0.1));
  } catch(e) {}
}
function sfxCoin() { sfxSound(800, 0.1, 'square', 0.06); setTimeout(() => sfxSound(1200, 0.1, 'square', 0.06), 80); }
function sfxInteract() { sfxSound(500, 0.08, 'sine', 0.04); setTimeout(() => sfxSound(700, 0.08, 'sine', 0.04), 60); }
function sfxLevel() { [600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => sfxSound(f, 0.12, 'square', 0.05), i * 70)); }

let staticNoiseSource = null;
let staticGainNode = null;
function startTVStatic() {
  try {
    initAudio();
    if (!actx) return;
    if (staticNoiseSource) return;
    const bufferSize = 2 * actx.sampleRate;
    const noiseBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = actx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    const filter = actx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(120, actx.currentTime);
    filter.Q.setValueAtTime(0.6, actx.currentTime);
    staticGainNode = actx.createGain();
    staticGainNode.gain.setValueAtTime(0.065, actx.currentTime);
    whiteNoise.connect(filter);
    filter.connect(staticGainNode);
    staticGainNode.connect(actx.destination);
    whiteNoise.start();
    staticNoiseSource = whiteNoise;
  } catch(e) {}
}

const scene = new THREE.Scene();
// Extremely gloomy dark violet/black sky and background
const gloomyColor = 0x07010a;
scene.background = new THREE.Color(gloomyColor);
scene.fog = new THREE.FogExp2(gloomyColor, 0.026);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0); 
renderer.setSize(window.innerWidth, window.innerHeight); 
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement); 
renderer.domElement.id = 'game-canvas';

const controls = new THREE.PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');
const cooldownText = document.getElementById('cooldown-text');

// BGM music setup
const bgMusic = new Audio('ost.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.4;

instructions.addEventListener('click', () => {
    if(!isInteracting && !lockCooldown) {
        controls.lock();
        if (bgMusic.paused) {
            bgMusic.play().catch(err => console.log("BGM play blocked: ", err));
        }
        startTVStatic();
    }
    else if (lockCooldown) cooldownText.style.display = 'block';
});
controls.addEventListener('lock', () => { instructions.style.display = 'none'; cooldownText.style.display = 'none'; });
controls.addEventListener('unlock', () => {
    if(!isInteracting) instructions.style.display = 'flex';
    lockCooldown = true;
    setTimeout(() => { lockCooldown = false; cooldownText.style.display = 'none'; }, 1300);
});

// Dark blue ambient and directional light (Even gloomier settings)
scene.add(new THREE.AmbientLight(0x010108, 0.08));
const moonLight = new THREE.DirectionalLight(0x01020d, 0.15); 
moonLight.position.set(100, 200, 50); moonLight.castShadow = true;
moonLight.shadow.camera.left = -200; moonLight.shadow.camera.right = 200;
moonLight.shadow.camera.top = 200; moonLight.shadow.camera.bottom = -200;
scene.add(moonLight);

// Red Matrix Sky Dome
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 512;
skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d');
const skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.wrapS = THREE.RepeatWrapping;
skyTex.wrapT = THREE.RepeatWrapping;
skyTex.repeat.set(6, 4);

const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false });
const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 15), skyMat);
scene.add(skyMesh);

const skyColumns = 32;
const skyDrops = new Array(skyColumns).fill(0);
const skyFontSize = 16;

function updateSkyMatrix() {
    skyCtx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    skyCtx.fillRect(0, 0, 512, 512);
    
    skyCtx.font = `bold ${skyFontSize}px monospace`;
    
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&+-/*";
    const colors = ['#ff2233', '#ffcc00', '#00ff66']; // Red, Yellow, Green
    
    for (let i = 0; i < skyColumns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * (512 / skyColumns);
        const y = skyDrops[i] * skyFontSize;
        
        skyCtx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        skyCtx.fillText(char, x, y);
        
        if (y > 512 && Math.random() > 0.975) {
            skyDrops[i] = 0;
        }
        skyDrops[i]++;
    }
    skyTex.needsUpdate = true;
}

let lastSkyMatrixTime = 0;
function tickSkyMatrix(time) {
    if (time - lastSkyMatrixTime < 33) return; // 30 FPS throttle
    lastSkyMatrixTime = time;
    updateSkyMatrix();
}

// Creepy Smiley Sun Sprite
function createSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 256);
    
    // Outer glowing corona
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255, 0, 51, 1)');
    grad.addColorStop(0.3, 'rgba(255, 0, 80, 0.85)');
    grad.addColorStop(0.7, 'rgba(150, 0, 50, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 120, 0, Math.PI * 2);
    ctx.fill();
    
    // Dark body of the sun
    ctx.fillStyle = '#0a000c';
    ctx.beginPath();
    ctx.arc(128, 128, 80, 0, Math.PI * 2);
    ctx.fill();
    
    // Border outline
    ctx.strokeStyle = '#ff0033';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // Smile :)
    ctx.fillStyle = '#ff0033';
    ctx.font = 'bold 90px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fillText(':)', 128, 128);
    
    return new THREE.CanvasTexture(canvas);
}

const sunMat = new THREE.SpriteMaterial({
    map: createSunTexture(),
    color: 0xffffff,
    fog: false
});
const sunSprite = new THREE.Sprite(sunMat);
sunSprite.position.set(100, 220, -150);
sunSprite.scale.set(65, 65, 1);
scene.add(sunSprite);

// Generate Film Grain noise dynamically
function initFilmGrain() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    
    const blockSize = 2; // larger grittier grain blocks
    for (let y = 0; y < 128; y += blockSize) {
        for (let x = 0; x < 128; x += blockSize) {
            const val = Math.floor(Math.random() * 255);
            ctx.fillStyle = `rgba(${val}, ${val}, ${val}, 0.38)`; // higher opacity
            ctx.fillRect(x, y, blockSize, blockSize);
        }
    }
    const overlay = document.getElementById('grain-overlay');
    if (overlay) {
        overlay.style.backgroundImage = `url(${canvas.toDataURL()})`;
    }
}
initFilmGrain();

// Point lights
const pointLight1 = new THREE.PointLight(0x00f0ff, 1.5, 60); pointLight1.position.set(-20, 5, -20); scene.add(pointLight1);
const pointLight2 = new THREE.PointLight(0xff1d8e, 1.5, 60); pointLight2.position.set(40, 5, 40); scene.add(pointLight2);

function createCorruptedTexture(color1, color2) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color1; ctx.fillRect(0, 0, 512, 512); 
    for(let i=0; i<6000; i++) {
        ctx.fillStyle = Math.random() > 0.85 ? color2 : 'rgba(0,0,0,0.1)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random()*8, Math.random()*8);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(30, 30); return tex;
}

function createCreepyFace() {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#bbb'; ctx.fillRect(0, 0, 128, 128); // Pale grey skin
    
    // Eyes: Two vertical white strips
    ctx.fillStyle = 'white';
    ctx.fillRect(30, 45, 12, 35);
    ctx.fillRect(80, 45, 12, 35);
    
    // Pupils: A black line in the middle of each eye strip
    ctx.fillStyle = 'black';
    ctx.fillRect(35, 45, 2, 35);
    ctx.fillRect(85, 45, 2, 35);
    
    // Eyebrows: Bent downwards angrily (\ /)
    ctx.strokeStyle = 'black'; ctx.lineWidth = 3;
    // Left eyebrow
    ctx.beginPath(); ctx.moveTo(25, 33); ctx.lineTo(45, 43); ctx.stroke();
    // Right eyebrow
    ctx.beginPath(); ctx.moveTo(99, 33); ctx.lineTo(79, 43); ctx.stroke();
    
    // Smile (creepy line)
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 100); ctx.lineTo(88, 100); ctx.stroke();
    
    return new THREE.CanvasTexture(canvas);
}

function createSignTexture(text, bgColor, textColor) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = textColor; ctx.font = 'bold 36px monospace'; 
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);
    return new THREE.CanvasTexture(canvas);
}

// === MONSTER & REAL-TIME COMBAT SETUP ===
function createMonsterFaceTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f051c'; ctx.fillRect(0, 0, 256, 256);
    
    // Red eyes
    ctx.fillStyle = '#ff0033';
    ctx.fillRect(40, 60, 40, 40);
    ctx.fillRect(176, 60, 40, 40);
    
    // Pupils
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(58, 60, 4, 40);
    ctx.fillRect(194, 60, 4, 40);
    
    // Eyebrows
    ctx.strokeStyle = '#ff0033'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(35, 45); ctx.lineTo(85, 75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(221, 45); ctx.lineTo(171, 75); ctx.stroke();
    
    // Smile with sharp teeth
    ctx.strokeStyle = '#ff0033'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(128, 140, 65, 0, Math.PI, false); ctx.stroke();
    
    // Sharp teeth
    ctx.fillStyle = '#ffffff';
    const teethY = 145;
    for (let x = 75; x <= 165; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, teethY);
        ctx.lineTo(x + 8, teethY + 16);
        ctx.lineTo(x + 16, teethY);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x, teethY + 20);
        ctx.lineTo(x + 8, teethY + 4);
        ctx.lineTo(x + 16, teethY + 20);
        ctx.closePath();
        ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
}

const monsterFaceMat = new THREE.MeshStandardMaterial({
    map: createMonsterFaceTexture(),
    emissive: 0x990022,
    emissiveIntensity: 0.8
});

const monsters = [];
function createMonster(x, z) {
    const monsterBodyMat = new THREE.MeshStandardMaterial({
        color: 0x1d0532,
        emissive: 0x110220,
        emissiveIntensity: 0.8,
        roughness: 0.6
    });
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 4.5, 2.5), monsterBodyMat);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), monsterFaceMat);
    head.position.y = 3.35;
    
    const monsterGrp = new THREE.Group();
    monsterGrp.add(body); monsterGrp.add(head);
    monsterGrp.position.set(x, 2.25, z);
    scene.add(monsterGrp);
    
    monsters.push({
        mesh: monsterGrp,
        bodyMesh: body,
        headMesh: head,
        hp: 100,
        tx: x,
        tz: z,
        speed: 3.5 + Math.random() * 2,
        wanderTimer: 0,
        shootCooldown: 0,
        flashTimer: 0
    });
}

// Spawn 8 Monsters
for (let i = 0; i < 8; i++) {
    let mx = (Math.random() - 0.5) * 360;
    let mz = (Math.random() - 0.5) * 360;
    if (Math.abs(mx - (-20)) < 25 && Math.abs(mz) < 25) {
        mx += 40; mz += 40;
    }
    createMonster(mx, mz);
}

function drawLaserBeam(from, to, colorHex) {
    const material = new THREE.LineBasicMaterial({ color: colorHex });
    const points = [from.clone(), to.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    setTimeout(() => {
        scene.remove(line);
        geometry.dispose();
        material.dispose();
    }, 100);
}

const interactables = [];
const ringObjects = [];
const mapSize = 600;

// Ground (Perfect Black & White Chessboard Floor, Slightly Dimmed)
const groundTex = createChessboardTexture('#000000', '#ffffff', 40, 40);
const dirtMat = new THREE.MeshBasicMaterial({ map: groundTex, color: 0x555555 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(mapSize, mapSize), dirtMat);
ground.rotation.x = -Math.PI / 2; scene.add(ground);

function createChessboardTexture(color1, color2, repeatX, repeatY) {
    const canvas = document.createElement('canvas'); 
    canvas.width = 128; 
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const size = 16; // 8x8 checker grid
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? color1 : color2;
            ctx.fillRect(c * size, r * size, size, size);
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; 
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
}

// Asphalt Chessboard Roads (Perfect Black & White, Slightly Dimmed)
const roadZTex = createChessboardTexture('#000000', '#ffffff', 2, 40);
const roadZMat = new THREE.MeshBasicMaterial({ map: roadZTex, color: 0x777777 });
const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(30, mapSize), roadZMat);
roadZ.rotation.x = -Math.PI / 2; roadZ.position.y = 0.05; scene.add(roadZ);

const roadXTex = createChessboardTexture('#000000', '#ffffff', 40, 2);
const roadXMat = new THREE.MeshBasicMaterial({ map: roadXTex, color: 0x777777 });
const roadX = new THREE.Mesh(new THREE.PlaneGeometry(mapSize, 30), roadXMat);
roadX.rotation.x = -Math.PI / 2; roadX.position.y = 0.06; scene.add(roadX);

// Laut & Pantai
const waterMat = new THREE.MeshStandardMaterial({ color: 0x005f73, transparent: true, opacity: 0.8 });
const sea = new THREE.Mesh(new THREE.PlaneGeometry(mapSize, 200), waterMat);
sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.1, -300); scene.add(sea);

const sandMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 1 });
const beach = new THREE.Mesh(new THREE.PlaneGeometry(mapSize, 50), sandMat);
beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.08, -180); scene.add(beach);

// === NEW BUILDINGS: CYBER MALL, CIRCUS, BEACH CANDLES & MORE APARTMENTS ===
// 1. Cyber Mall
const mall = createBuilding(-100, -80, 50, 25, 40, 0x0b1022, "MALL BESAR", "#ffcc00", "black");
const mallLight = new THREE.PointLight(0x00f0ff, 2, 50);
mallLight.position.set(-100, 20, -58);
scene.add(mallLight);

// 2. Circus Area
function createCircusTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#ff0033' : '#ffff00';
        ctx.fillRect(i * 16, 0, 16, 128);
    }
    return new THREE.CanvasTexture(canvas);
}
const circusTex = createCircusTexture();
const circusBase = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 12, 16), new THREE.MeshStandardMaterial({ map: circusTex, roughness: 0.5 }));
circusBase.position.set(90, 6, -60); circusBase.castShadow = true; circusBase.receiveShadow = true;
scene.add(circusBase);
const circusRoof = new THREE.Mesh(new THREE.ConeGeometry(17, 10, 16), new THREE.MeshBasicMaterial({ map: circusTex }));
circusRoof.position.set(90, 17, -60);
scene.add(circusRoof);

const circusLights = [];
const circusColors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0000];
for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const cx = 90 + Math.cos(angle) * 20;
    const cz = -60 + Math.sin(angle) * 20;
    const pLight = new THREE.PointLight(circusColors[i % circusColors.length], 2, 25);
    pLight.position.set(cx, 8, cz);
    scene.add(pLight);
    circusLights.push(pLight);
}

// 3. Beach Candles (Yellow-Brownish flame points)
const beachCandles = [];
const candleGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8);
const candleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 });
const flameGeo = new THREE.ConeGeometry(0.25, 0.6, 8);
const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

for (let i = 0; i < 12; i++) {
    const cx = -250 + (i * 45) + (Math.random() - 0.5) * 10;
    const cz = -180 + (Math.random() - 0.5) * 5;
    
    const candleGrp = new THREE.Group();
    const body = new THREE.Mesh(candleGeo, candleMat);
    body.position.y = 0.6;
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 1.5;
    
    candleGrp.add(body); candleGrp.add(flame);
    candleGrp.position.set(cx, 0.08, cz);
    scene.add(candleGrp);
    
    const cLight = new THREE.PointLight(0xff7700, 1.8, 20);
    cLight.position.set(cx, 1.8, cz);
    scene.add(cLight);
    
    beachCandles.push({ flame: flame, light: cLight });
}

// 4. Extra Buildings
createBuilding(-120, 120, 20, 45, 20, 0x110d1a, "APARTEMEN A", "black", "#ff1d8e");
createBuilding(120, 120, 22, 50, 22, 0x0f1118, "APARTEMEN B", "black", "#00f0ff");
createBuilding(-120, -120, 25, 40, 25, 0x150d15, "SHELTER C", "#150d15", "#ffff00");
createBuilding(120, -120, 20, 35, 20, 0x0a101a, "KANTOR D", "black", "#ff0055");
createBuilding(-70, -150, 30, 28, 20, 0x0d0d15, "GUDANG E", "black", "#00ffaa");

// === RADAR MINIMAP RENDERING ===
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas ? miniCanvas.getContext('2d') : null;

function drawMinimap() {
    if (!miniCtx) return;
    
    // Clear canvas
    miniCtx.fillStyle = 'rgba(8, 5, 20, 0.85)';
    miniCtx.fillRect(0, 0, 180, 180);
    
    const playerPos = camera.position;
    const miniScale = 0.8; // Zoom level: 1 unit = 0.8px
    
    // Save state for circular clipping
    miniCtx.save();
    
    // Create circular path
    miniCtx.beginPath();
    miniCtx.arc(90, 90, 80, 0, Math.PI * 2);
    miniCtx.clip();
    
    // Draw scrolling grid
    const gridSpacing = 40;
    const offsetX = (playerPos.x * miniScale) % gridSpacing;
    const offsetZ = (playerPos.z * miniScale) % gridSpacing;
    
    miniCtx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    miniCtx.lineWidth = 1;
    for (let x = -offsetX; x < 180; x += gridSpacing) {
        miniCtx.beginPath(); miniCtx.moveTo(x, 0); miniCtx.lineTo(x, 180); miniCtx.stroke();
    }
    for (let z = -offsetZ; z < 180; z += gridSpacing) {
        miniCtx.beginPath(); miniCtx.moveTo(0, z); miniCtx.lineTo(180, z); miniCtx.stroke();
    }
    
    // Draw sea & beach relative to player
    const seaY = 90 + (-180 - playerPos.z) * miniScale;
    if (seaY > 0) {
        miniCtx.fillStyle = 'rgba(0, 95, 115, 0.3)';
        miniCtx.fillRect(0, 0, 180, seaY);
    }
    
    const beachYStart = 90 + (-180 - playerPos.z) * miniScale;
    const beachYEnd = 90 + (-155 - playerPos.z) * miniScale;
    if (beachYEnd > 0) {
        miniCtx.fillStyle = 'rgba(74, 59, 44, 0.4)';
        miniCtx.fillRect(0, Math.max(0, beachYStart), 180, beachYEnd - Math.max(0, beachYStart));
    }
    
    // Draw asphalt roads relative to player
    miniCtx.fillStyle = 'rgba(30, 26, 44, 0.9)';
    // Z-road at x=0
    const roadZX = 90 + (0 - playerPos.x - 15) * miniScale;
    miniCtx.fillRect(roadZX, 0, 30 * miniScale, 180);
    // X-road at z=0
    const roadXY = 90 + (0 - playerPos.z - 15) * miniScale;
    miniCtx.fillRect(0, roadXY, 180, 30 * miniScale);
    
    // Draw buildings relative to player
    const buildingsMap = [
        { name: "IN", x: -40, z: -40, w: 25, d: 20, col: '#00f0ff' }, // Indomaret
        { name: "AL", x: 40, z: -40, w: 25, d: 20, col: '#ff1d8e' },  // Alfamart
        { name: "PG", x: -60, z: 40, w: 30, d: 30, col: '#a000c8' },  // Pasar Gelap
        { name: "WN", x: 50, z: 60, w: 20, d: 20, col: '#00ffaa' },   // Warnet
        { name: "DI", x: 0, z: 80, w: 20, d: 20, col: '#ff00ff' },    // Disco
        { name: "WK", x: -20, z: 0, w: 15, d: 15, col: '#ff7700' },   // Warkop
        { name: "ML", x: -100, z: -80, w: 50, d: 40, col: '#ffff00' }, // Mall
        { name: "CS", x: 90, z: -60, w: 30, d: 30, col: '#ff0033' }   // Circus
    ];
    
    buildingsMap.forEach(b => {
        const bx = 90 + (b.x - playerPos.x - b.w/2) * miniScale;
        const bz = 90 + (b.z - playerPos.z - b.d/2) * miniScale;
        
        miniCtx.strokeStyle = b.col;
        miniCtx.lineWidth = 1.5;
        miniCtx.strokeRect(bx, bz, b.w * miniScale, b.d * miniScale);
        
        // Draw initials inside building
        miniCtx.fillStyle = b.col;
        miniCtx.font = 'bold 10px "VT323", monospace';
        miniCtx.textAlign = 'center';
        miniCtx.textBaseline = 'middle';
        miniCtx.fillText(b.name, bx + (b.w * miniScale)/2, bz + (b.d * miniScale)/2);
    });
    
    // Draw gold rings
    miniCtx.fillStyle = '#ffaa00';
    ringObjects.forEach(r => {
        const rx = 90 + (r.position.x - playerPos.x) * miniScale;
        const rz = 90 + (r.position.z - playerPos.z) * miniScale;
        miniCtx.beginPath();
        miniCtx.arc(rx, rz, 1.5, 0, Math.PI * 2);
        miniCtx.fill();
    });
    
    // Draw warga (NPCs) (Green dots)
    miniCtx.fillStyle = '#00ffaa';
    interactables.forEach(npc => {
        if (npc.type === 'npc' && npc.parentGrp) {
            const nx = 90 + (npc.parentGrp.position.x - playerPos.x) * miniScale;
            const nz = 90 + (npc.parentGrp.position.z - playerPos.z) * miniScale;
            miniCtx.beginPath();
            miniCtx.arc(nx, nz, 2, 0, Math.PI * 2);
            miniCtx.fill();
        }
    });
    
    // Draw monsters (Crimson blinking dots)
    const mFlash = (Math.floor(Date.now() / 250) % 2 === 0);
    miniCtx.fillStyle = mFlash ? '#ff0033' : '#770011';
    monsters.forEach(m => {
        if (m.mesh) {
            const mx = 90 + (m.mesh.position.x - playerPos.x) * miniScale;
            const mz = 90 + (m.mesh.position.z - playerPos.z) * miniScale;
            miniCtx.beginPath();
            miniCtx.arc(mx, mz, 3.5, 0, Math.PI * 2);
            miniCtx.fill();
        }
    });
    
    // Restore clipping path
    miniCtx.restore();
    
    // Draw central player pointer (Fixed yellow triangle at center, rotating with camera)
    const fDir = new THREE.Vector3();
    camera.getWorldDirection(fDir);
    const angle = Math.atan2(fDir.x, fDir.z);
    
    miniCtx.save();
    miniCtx.translate(90, 90);
    miniCtx.rotate(angle);
    
    miniCtx.fillStyle = '#ffff00';
    miniCtx.beginPath();
    miniCtx.moveTo(0, 6);
    miniCtx.lineTo(-4, -4);
    miniCtx.lineTo(4, -4);
    miniCtx.closePath();
    miniCtx.fill();
    
    miniCtx.strokeStyle = '#ffff00';
    miniCtx.lineWidth = 1;
    miniCtx.beginPath(); miniCtx.moveTo(0, 0); miniCtx.lineTo(0, 9); miniCtx.stroke();
    
    miniCtx.restore();
    
    // Draw circular radar border and compass directions
    miniCtx.strokeStyle = '#ff1d8e';
    miniCtx.lineWidth = 3;
    miniCtx.beginPath();
    miniCtx.arc(90, 90, 80, 0, Math.PI * 2);
    miniCtx.stroke();
    
    // Draw Compass directions (N, E, S, W)
    miniCtx.fillStyle = '#00f0ff';
    miniCtx.font = 'bold 15px "VT323", monospace';
    miniCtx.textAlign = 'center';
    miniCtx.textBaseline = 'middle';
    miniCtx.fillText('N', 90, 16);
    miniCtx.fillText('S', 90, 164);
    miniCtx.fillText('W', 16, 90);
    miniCtx.fillText('E', 164, 90);
}

// Sawah
const sawahMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, wireframe: true });
const sawah = new THREE.Mesh(new THREE.PlaneGeometry(150, 150, 20, 20), sawahMat);
sawah.rotation.x = -Math.PI / 2; sawah.position.set(-150, 0.1, 100); scene.add(sawah);

// Gunung
const mountains = [];
const mountainGeo = new THREE.ConeGeometry(100, 150, 4);
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x24083a, flatShading: true });
for(let i=0; i<5; i++) {
    const m = new THREE.Mesh(mountainGeo, mountainMat);
    const mx = (Math.random()-0.5)*500;
    const mz = 250 + Math.random()*100;
    m.position.set(mx, 75, mz);
    m.rotation.y = Math.random() * Math.PI; scene.add(m);
    mountains.push({ x: mx, z: mz, radius: 100, height: 150 });
}

function getMountainHeightAt(x, z) {
    let maxHeight = 0;
    for (let i = 0; i < mountains.length; i++) {
        const m = mountains[i];
        const dx = x - m.x;
        const dz = z - m.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < m.radius) {
            const h = m.height * (1 - dist / m.radius);
            if (h > maxHeight) maxHeight = h;
        }
    }
    return maxHeight;
}

function createBuilding(x, z, w, h, d, color, signText, signBg, signColor) {
    const grp = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({color: color}));
    mesh.position.set(0, h/2, 0); mesh.castShadow = true; mesh.receiveShadow = true; grp.add(mesh);
    
    if(signText) {
        const signMat = new THREE.MeshBasicMaterial({ map: createSignTexture(signText, signBg, signColor) });
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(w*0.8, h*0.3), signMat);
        sign.position.set(0, h*0.8, d/2 + 0.1); grp.add(sign);
    }
    grp.position.set(x, 0, z); scene.add(grp); return grp;
}

createBuilding(-40, -40, 25, 12, 20, 0x0a2f5c, "INDOMARET", "#00f0ff", "black");
createBuilding(40, -40, 25, 12, 20, 0x5c0a30, "ALFAMART", "#ff1d8e", "white");
createBuilding(-60, 40, 30, 15, 30, 0x221a30, "PASAR GELAP", "#ff1d8e", "#00f0ff");
createBuilding(50, 60, 20, 10, 20, 0x1b2d42, "WARNET & WARTEL", "#080515", "#00f0ff");

// Disco
const disco = createBuilding(0, 80, 20, 15, 20, 0x1a0f30, "D I S C O", "black", "#ff1d8e");
const discoLight = new THREE.PointLight(0xff00ff, 2.5, 40); discoLight.position.set(0, 10, 85); scene.add(discoLight);

function createGerobak(x, z, typeStr) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 2), new THREE.MeshStandardMaterial({color: 0x5a3d28}));
    body.position.set(0, 2, 0); grp.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.2, 2.5), new THREE.MeshStandardMaterial({color: 0x1d1a2c}));
    roof.position.set(0, 4.5, 0); grp.add(roof);
    const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5), new THREE.MeshStandardMaterial({color: 0x777777}));
    pole1.position.set(-1.8, 3.75, 0); grp.add(pole1);
    
    const signMat = new THREE.MeshBasicMaterial({ map: createSignTexture(typeStr, "black", "#00f0ff") });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 1), signMat);
    sign.position.set(0, 4.5, 1.3); grp.add(sign);
    
    grp.position.set(x, 0, z); scene.add(grp);
}
createGerobak(-15, -25, "NASI GORENG");
createGerobak(15, -25, "MIE AYAM");
createGerobak(-15, 25, "KETOPRAK TELOR");

// Warkop Utama
const warkopGrp = createBuilding(-20, 0, 15, 8, 15, 0x301a08, "WARKOP", "#1c142c", "#ff1d8e");
const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1), new THREE.MeshStandardMaterial({ color: 0x444 }));
laptopBase.position.set(-20, 3, 5); scene.add(laptopBase);
const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
laptopScreen.position.set(-20, 3.5, 4.5); laptopScreen.rotation.x = -0.2; scene.add(laptopScreen);

interactables.push({ mesh: laptopBase, type: 'laptop', name: "Laptop" });
interactables.push({ mesh: laptopScreen, type: 'laptop', name: "Laptop" });

const faceTex = createCreepyFace();
const faceMat = new THREE.MeshStandardMaterial({ 
    map: faceTex, 
    emissive: 0x666666, 
    emissiveIntensity: 0.8 
});
const bodyMat = new THREE.MeshStandardMaterial({ 
    color: 0x1d0f3a, 
    emissive: 0x1d0f3a, 
    emissiveIntensity: 0.8, 
    roughness: 0.7 
});

const creepyDialogues = [
    "Apakah kamu suka kota neon yang cerah ini?",
    "Warkop ini menyajikan kopi terbaik di semesta.",
    "Lampu neon di sini membuatku merasa tenang.",
    "Tolong optimalkan kode game ini agar lancar!",
    "Wartelnya aktif kembali. Siapa yang ingin kamu telepon?",
    "Indomaret selalu terang benderang sepanjang malam.",
    "Menatap langit cyber ini sangat memanjakan mata.",
    "Yuki... semuanya baik-baik saja sekarang!",
    "Wajahku terlihat berkilau di bawah cahaya neon ini.",
    "Disko di sana memutar lagu synthwave terpopuler.",
    "Apakah ada rahasia di dasar laut sana?",
    "Nilai tukar rupiah sedang stabil hari ini.",
    "Aku melihat bintang jatuh melintas di langit!",
    "Sawah ini menggunakan teknologi pertanian IoT terbaru.",
    "Aku bisa mendengarmu mengontrol langkahku.",
    "Toko buku itu menjual tutorial Git & Clean Code.",
    "Mari berkunjung ke rumahku di pojok kota.",
    "Laptop di warkop ini menyimpan kode masa lalu.",
    "Alfamart memiliki pendingin ruangan yang sangat dingin.",
    "Kecepatan langkahmu sedikit melambat, bukan?",
    "Tekan SHIFT jika ingin berlari dengan cepat!",
    "Pistol di tanganmu memancarkan cahaya laser biru.",
    "Aku melihat 50 orang berkeliaran di kota ini hari ini.",
    "Kota ini terlihat jauh lebih cerah dari sebelumnya.",
    "Terima kasih telah memisahkan CSS dan JS game ini!",
    "Ada rumor tentang developer mode rahasia...",
    "Klik judul PixelLife jika ingin menguji kontrol rahasia.",
    "Lampu mercusuar di laut sana berputar lambat.",
    "Apakah kamu ingin memesan nasi goreng pedas?",
    "Mie ayam Mang Ujang terkenal paling enak.",
    "Gelas kopi ini tidak pernah kosong.",
    "Layar komputer warnet memancarkan radiasi biru.",
    "RT dan RW sedang merancang portal desa digital.",
    "Turis Jepang itu sangat menyukai bakso urat.",
    "Turis Aussie bernyanyi musik synth di pinggir jalan.",
    "Bakso Mpok Noni selalu ramai pembeli.",
    "Fotografer itu mengambil foto bayangan neon.",
    "Penjahit baju sedang membuat kostum cybernetic.",
    "Tukang kebun menyiram bunga mawar bercahaya.",
    "Kurir mengantar paket kartu grafis RTX terbaru.",
    "Mekanik sedang menservis motor bertenaga plasma.",
    "Guru sekolah mengajarkan kalkulus di masa depan.",
    "Anak warnet sedang mabar game online legendaris.",
    "Animator sedang merancang sprite art 16-bit.",
    "Kolektor mobil memajang diecast Skyline GT-R.",
    "Perencana keuangan menyarankan untuk rajin menabung.",
    "Satpam komplek menjaga kota dengan drone pengawas.",
    "Marketer mengiklankan game ini ke seluruh dunia.",
    "Barista menggambar seni latte berbentuk hati.",
    "Koki restoran sedang memasak steak rendang lezat."
];

const NPC_DATA = [
  {n:'Rina',c:[255,150,150],hc:[100,50,50],t:'Mahasiswi magang',d:[{a:'Hai! Aku Rina, magang di sini.'}]},
  {n:'Budi',c:[150,200,255],hc:[80,80,80],t:'Senior Engineer',d:[{a:'Eh, selamat pagi!'}]},
  {n:'Sari',c:[255,220,150],hc:[180,120,60],t:'UI/UX Designer',d:[{a:'Hei hei! Lagi ngapain?'}]},
  {n:'Dimas',c:[180,255,180],hc:[60,100,60],t:'Junior Dev',d:[{a:'Oh hai!'}]},
  {n:'Wati',c:[200,150,255],hc:[120,80,150],t:'HR Manager',d:[{a:'Selamat siang'}]},
  {n:'Alex',c:[255,180,100],hc:[80,60,40],t:'CEO',d:[{a:'Ya, ada apa?'}]}
];

const extraNames = [
    "Andi", "Shinta", "Eko", "Joko", "Mega", "Sita", "Rudi", "Deni", "Lutfi", "Reza", 
    "Irma", "Maya", "Nina", "Tono", "Anton", "Joni", "Susi", "Lisa", "Dito", "Agus", 
    "Yanto", "Bambang", "Hendra", "Tommy", "Doni", "Edi", "Hadi", "Heru", "Guntur", "Fitri", 
    "Lilis", "Ratna", "Sri", "Yani", "Dewi", "Ningsih", "Indah", "Rian", "Adi", "Fajar", 
    "Galih", "Bayu", "Surya", "Putri"
];
const extraRoles = [
    "Gamer", "Hacker", "Cyber Junkie", "Data Analyst", "Product Owner", "QA Engineer", 
    "Cloud Architect", "DevOps Admin", "Security Expert", "AI Researcher", "Tech Blogger", 
    "Crypto Trader", "System Analyst", "Database Admin", "Web Designer", "Mobile Dev", 
    "Game Dev", "Sound Designer", "Video Specialist", "IT Specialist", "Scrum Master", 
    "Tech Lead", "Freelancer", "Network Engineer", "Hardware Specialist", "Security Operator", 
    "SEO Expert", "Social Media Admin", "Digital Creator", "Animator", "3D Modeler", 
    "Support Agent", "Tester", "UI Developer", "Data Scientist", "Backend Dev", "Frontend Dev", 
    "System Engineer", "Network Operator", "Cyber Agent", "VR Designer", "UX Researcher", 
    "Tech Consultant", "Hardware Dev"
];

for (let i = 0; i < 44; i++) {
    const name = extraNames[i % extraNames.length];
    const role = extraRoles[i % extraRoles.length];
    const color = [
        Math.floor(100 + Math.random() * 155),
        Math.floor(100 + Math.random() * 155),
        Math.floor(100 + Math.random() * 155)
    ];
    const hairColor = [
        Math.floor(50 + Math.random() * 150),
        Math.floor(50 + Math.random() * 150),
        Math.floor(50 + Math.random() * 150)
    ];
    const dialogue = creepyDialogues[i % creepyDialogues.length];
    NPC_DATA.push({
        n: name,
        c: color,
        hc: hairColor,
        t: role,
        d: [{ a: dialogue }]
    });
}

function createCreepyNPC(x, z, name, role, dialogueStr, cColor, hcColor, isCustomer = false) {
    const customBodyMat = cColor ? new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(cColor[0]/255, cColor[1]/255, cColor[2]/255), 
      emissive: new THREE.Color(cColor[0]/255, cColor[1]/255, cColor[2]/255),
      emissiveIntensity: 0.8,
      roughness: 0.7 
    }) : bodyMat;
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 1.2), customBodyMat);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), faceMat);
    head.position.y = 1.55;
    const npcGrp = new THREE.Group();
    npcGrp.add(body); npcGrp.add(head);
    npcGrp.position.set(x, 1, z);
    
    // Set wander data
    npcGrp.userData = {
      tx: x,
      tz: z,
      pt: Math.random() * 2,
      speed: 1.5 + Math.random() * 1.5
    };
    
    scene.add(npcGrp);
    
    interactables.push({ 
        mesh: body, head: head, type: 'npc', 
        name: name, role: role,
        dialogue: dialogueStr, isCustomer: isCustomer,
        parentGrp: npcGrp
    });
    interactables.push({ mesh: head, parentGrp: body });
}

// Spawn exactly 50 NPCs from NPC_DATA
NPC_DATA.forEach((nd, i) => {
    let tx = (Math.random() - 0.5) * 260;
    let tz = (Math.random() - 0.5) * 260;
    // Keep them away from warkop center slightly
    if (Math.abs(tx - (-20)) < 15 && Math.abs(tz) < 15) {
      tx += 30; tz += 30;
    }
    const dialogStr = (nd.d && nd.d[0]) ? nd.d[0].a : "Mari berteman!";
    createCreepyNPC(tx, tz, nd.n, nd.t, dialogStr, nd.c, nd.hc, false);
});

// Customer Warkop
createCreepyNPC(-15, 5, "Pelanggan", "Customer", "Berikan aku zat kafein segar.", [200, 200, 200], [50, 50, 50], true);

// Sonic Rings (Brighter Cyber Rings)
const ringGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 20);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
for(let i=0; i<50; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set((Math.random()-0.5)*260, 1.5, (Math.random()-0.5)*260);
    scene.add(ring); ringObjects.push(ring);
}

// Black trees
const treeGeo = new THREE.CylinderGeometry(0.2, 0.4, 5);
const treeMat = new THREE.MeshStandardMaterial({color: 0x0f031b});
for(let i=0; i<60; i++) {
    const tree = new THREE.Mesh(treeGeo, treeMat);
    tree.position.set((Math.random()-0.5)*300, 2.5, (Math.random()-0.5)*300);
    tree.rotation.x = (Math.random()-0.5)*0.2;
    tree.rotation.z = (Math.random()-0.5)*0.2;
    scene.add(tree);
}

const centerUI = document.getElementById('center-ui');
function showNotification(msg) {
    const notif = document.getElementById('notification');
    notif.innerText = msg; notif.style.opacity = 1;
    setTimeout(() => notif.style.opacity = 0, 2500);
}

// Side Quest Coding
const codeSnippets = [
    "while(true) { suffer(); }",
    "delete World.Yuki.Sanity;",
    "if(reality === false) return void;",
    "SYSTEM.ERROR(404): EXIT NOT FOUND"
];
let currentTargetCode = "";
let currentTypedCode = "";

function startCoding() {
    isInteracting = true; controls.unlock();
    centerUI.style.display = 'flex';
    document.getElementById('center-title').innerText = "MENULIS TAKDIR...";
    
    currentTargetCode = codeSnippets[Math.floor(Math.random() * codeSnippets.length)];
    currentTypedCode = "";
    renderCodeDisplay();
    document.addEventListener('keydown', codingKeyListener);
}

function renderCodeDisplay() {
    let html = `<div id="code-display">`;
    html += `<span class="code-typed">${escapeHTML(currentTypedCode)}</span>`;
    let remaining = currentTargetCode.substring(currentTypedCode.length);
    if(remaining.length > 0) {
        html += `<span style="background: #ff1d8e; color: white;">${escapeHTML(remaining[0])}</span>`;
        html += `<span class="code-untyped">${escapeHTML(remaining.substring(1))}</span>`;
    }
    html += `</div>`;
    html += `<p style="margin-top: 20px; font-size: 18px; color: #888;">(Mengetik kode mengubah realitas. Tekan ESC untuk lari)</p>`;
    document.getElementById('center-content').innerHTML = html;
}

function escapeHTML(str) { return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>").replace(/ /g, "&nbsp;"); }

function codingKeyListener(e) {
    if (e.key === 'Escape') { endCoding(); return; }
    if (e.key.length > 1 && e.key !== 'Enter') return;
    
    let charToType = currentTargetCode[currentTypedCode.length];
    let typedChar = e.key === 'Enter' ? '\n' : e.key;

    if (typedChar === charToType) {
        currentTypedCode += charToType;
        money += 666;
        document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
        
        if (currentTypedCode === currentTargetCode) {
            showNotification("Realitas diubah. +Rp " + (currentTargetCode.length * 666).toLocaleString('id-ID'));
            setTimeout(endCoding, 500);
        } else {
            renderCodeDisplay();
        }
    }
}

function endCoding() {
    document.removeEventListener('keydown', codingKeyListener);
    centerUI.style.display = 'none';
    isInteracting = false;
    instructions.style.display = 'flex';
}

// Turn-Based Serving
function startTurnBased() {
    isInteracting = true; controls.unlock();
    centerUI.style.display = 'flex';
    document.getElementById('center-title').innerText = "MEREKA MEMINTA";
    
    let html = `<div style="font-size: 24px; margin: 20px 0; color: #00f0ff;">"Beri aku cairan hitam kafein itu."</div>`;
    html += `<div style="display: flex; justify-content: center; gap: 10px;">
                <button class="dr-btn" onclick="serveCoffee(true)">Beri Kopi Hitam</button>
                <button class="dr-btn" onclick="serveCoffee(false)">Beri Jus Soda</button>
             </div>`;
    document.getElementById('center-content').innerHTML = html;
}

window.serveCoffee = function(correct) {
    if(correct) {
        money += 5000;
        document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
        showNotification("Entitas menerima sesajen kopi.");
        sfx.play('coin');
    } else {
        showNotification("Entitas menolak minuman itu!");
    }
    centerUI.style.display = 'none';
    isInteracting = false;
    instructions.style.display = 'flex';
};

// === TURN-BASED COMBAT SYSTEM ===
window.battleState = null;

function startBattle(npc) {
    isInteracting = true;
    controls.unlock();
    
    window.battleState = {
        npc: npc,
        playerHP: 100,
        enemyHP: 100,
        enemyHostility: 100,
        playerDefending: false,
        enemyStunned: false,
        turn: 'player'
    };
    
    centerUI.style.display = 'flex';
    document.getElementById('center-title').innerText = `PERTARUNGAN DENGAN ${npc.name.toUpperCase()} (${npc.role.toUpperCase()})`;
    
    let html = `
        <div class="battle-container" style="display: flex; flex-direction: column; gap: 10px; font-family: 'VT323', monospace;">
            <!-- Status bars -->
            <div class="battle-stats" style="display: flex; justify-content: space-between; border-bottom: 2px solid #ff1d8e; padding-bottom: 8px;">
                <div>
                    <div style="color: #00f0ff;">KAMU (PLAYER)</div>
                    <div style="font-size: 20px;">HP: <span id="battle-player-hp">100</span>/100</div>
                    <div style="width: 120px; height: 10px; background: #333; border: 1px solid #00f0ff; margin-top: 4px;">
                        <div id="battle-player-hp-bar" style="width: 100%; height: 100%; background: #00ff00; transition: width 0.3s;"></div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #ff1d8e;" id="battle-enemy-name">${npc.name.toUpperCase()}</div>
                    <div style="font-size: 20px;">HP: <span id="battle-enemy-hp">100</span>/100</div>
                    <div style="width: 120px; height: 10px; background: #333; border: 1px solid #ff1d8e; margin-top: 4px; display: inline-block;">
                        <div id="battle-enemy-hp-bar" style="width: 100%; height: 100%; background: #ff1d8e; transition: width 0.3s;"></div>
                    </div>
                    <div style="font-size: 16px; color: #ffaa00; margin-top: 4px;">HOSTILITY: <span id="battle-enemy-hostility">100</span>%</div>
                </div>
            </div>
            
            <!-- Battle log -->
            <div id="battle-log" style="height: 120px; overflow-y: auto; background: rgba(0,0,0,0.5); border: 1px solid #ff1d8e; padding: 8px; font-size: 18px; color: #bbb; display: flex; flex-direction: column; gap: 4px; text-transform: none; text-align: left;">
                <!-- Log messages go here -->
            </div>
            
            <!-- Action buttons -->
            <div id="battle-actions" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                <!-- Buttons rendered dynamically -->
            </div>
        </div>
    `;
    document.getElementById('center-content').innerHTML = html;
    
    addBattleLog(`${npc.name} (${npc.role}) tampak marah dan bersiap menyerang!`);
    renderActionsMenu('main');
}

function addBattleLog(msg) {
    const logDiv = document.getElementById('battle-log');
    if (!logDiv) return;
    const p = document.createElement('div');
    p.innerText = `> ${msg}`;
    logDiv.appendChild(p);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function updateBattleStats() {
    const state = window.battleState;
    if (!state) return;
    
    document.getElementById('battle-player-hp').innerText = state.playerHP;
    document.getElementById('battle-player-hp-bar').style.width = `${state.playerHP}%`;
    
    if (state.playerHP < 30) {
        document.getElementById('battle-player-hp-bar').style.backgroundColor = '#ff0000';
    } else if (state.playerHP < 60) {
        document.getElementById('battle-player-hp-bar').style.backgroundColor = '#ffff00';
    } else {
        document.getElementById('battle-player-hp-bar').style.backgroundColor = '#00ff00';
    }
    
    document.getElementById('battle-enemy-hp').innerText = state.enemyHP;
    document.getElementById('battle-enemy-hp-bar').style.width = `${state.enemyHP}%`;
    
    document.getElementById('battle-enemy-hostility').innerText = state.enemyHostility;
}

function renderActionsMenu(menu) {
    const actionsDiv = document.getElementById('battle-actions');
    if (!actionsDiv) return;
    
    let html = "";
    if (menu === 'main') {
        html = `
            <button class="dr-btn" onclick="battleAction('attack')">⚔️ SERANG</button>
            <button class="dr-btn" onclick="battleAction('defend')">🛡️ BERTAHAN</button>
            <button class="dr-btn" onclick="battleAction('menu', 'skill')">✨ SKILL</button>
            <button class="dr-btn" onclick="battleAction('menu', 'item')">🎒 ITEM</button>
            <button class="dr-btn" style="grid-column: span 2;" onclick="battleAction('run')">🏃 LARI</button>
        `;
    } else if (menu === 'skill') {
        html = `
            <button class="dr-btn" onclick="battleAction('skill', 'hipnotis')">🌀 HIPNOTIS (Stun)</button>
            <button class="dr-btn" onclick="battleAction('skill', 'berkawan')">🤝 BERKAWAN (-Hostility)</button>
            <button class="dr-btn" style="grid-column: span 2;" onclick="battleAction('menu', 'main')">↩️ KEMBALI</button>
        `;
    } else if (menu === 'item') {
        html = `
            <button class="dr-btn" onclick="battleAction('item', 'bomb')">💣 BOMB (40 Dmg)</button>
            <button class="dr-btn" onclick="battleAction('item', 'potion')">🧪 POTION (40 Heal)</button>
            <button class="dr-btn" onclick="battleAction('item', 'peace')">🕊️ PEACE (Damai)</button>
            <button class="dr-btn" onclick="battleAction('menu', 'main')">↩️ KEMBALI</button>
        `;
    }
    actionsDiv.innerHTML = html;
}

function disableBattleButtons() {
    const btns = document.querySelectorAll('#battle-actions button');
    btns.forEach(b => {
        b.disabled = true;
        b.style.opacity = 0.5;
        b.style.cursor = 'not-allowed';
    });
}

window.battleAction = function(action, param) {
    const state = window.battleState;
    if (!state || state.turn === 'enemy') return;
    
    let logMsg = "";
    let proceedToEnemy = true;
    
    if (action === 'attack') {
        const dmg = Math.floor(15 + Math.random() * 11); // 15 to 25
        state.enemyHP = Math.max(0, state.enemyHP - dmg);
        logMsg = `Kamu menyerang ${state.npc.name} dan memberikan ${dmg} damage!`;
        addBattleLog(logMsg);
        sfxSound(150, 0.1, 'sawtooth', 0.1);
        
        if (state.enemyHP <= 0) {
            winBattle();
            return;
        }
    } else if (action === 'defend') {
        state.playerDefending = true;
        logMsg = `Kamu bersiap menahan serangan! Pertahanan meningkat.`;
        addBattleLog(logMsg);
        sfxSound(400, 0.15, 'sine', 0.08);
    } else if (action === 'run') {
        if (Math.random() < 0.5) {
            logMsg = `Kamu berhasil melarikan diri dari pertarungan!`;
            addBattleLog(logMsg);
            sfxSound(600, 0.2, 'sine', 0.08);
            setTimeout(() => {
                endBattle(true);
            }, 1500);
            return;
        } else {
            logMsg = `Gagal melarikan diri! ${state.npc.name} menghalangi jalanmu.`;
            addBattleLog(logMsg);
            sfxSound(100, 0.2, 'sawtooth', 0.1);
        }
    } else if (action === 'skill') {
        if (param === 'hipnotis') {
            state.enemyStunned = true;
            logMsg = `Kamu menghipnotis ${state.npc.name}! Dia terdiam linglung.`;
            addBattleLog(logMsg);
            sfxSound(500, 0.3, 'sine', 0.06);
        } else if (param === 'berkawan') {
            const red = Math.floor(25 + Math.random() * 16); // 25 to 40%
            state.enemyHostility = Math.max(0, state.enemyHostility - red);
            logMsg = `Kamu mengajak ${state.npc.name} berteman. Permusuhan berkurang ${red}%!`;
            addBattleLog(logMsg);
            sfxSound(700, 0.2, 'sine', 0.07);
        }
    } else if (action === 'item') {
        if (param === 'bomb') {
            const dmg = 40;
            state.enemyHP = Math.max(0, state.enemyHP - dmg);
            logMsg = `Kamu melempar Bom! Meledak dan memberikan ${dmg} damage!`;
            addBattleLog(logMsg);
            sfxSound(60, 0.4, 'sawtooth', 0.2);
            if (state.enemyHP <= 0) {
                winBattle();
                return;
            }
        } else if (param === 'potion') {
            const heal = 40;
            state.playerHP = Math.min(100, state.playerHP + heal);
            logMsg = `Kamu meminum Potion! HP pulih ${heal} poin.`;
            addBattleLog(logMsg);
            sfxSound(600, 0.2, 'sine', 0.08);
        } else if (param === 'peace') {
            if (state.enemyHostility <= 50) {
                logMsg = `Berdamai berhasil! ${state.npc.name} menerima tawaran damai.`;
                addBattleLog(logMsg);
                money += 8000;
                rings += 3;
                document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
                document.getElementById('ring-display').innerText = rings;
                sfx.play('coin');
                
                setTimeout(() => {
                    winBattle(true);
                }, 1500);
                return;
            } else {
                logMsg = `${state.npc.name} masih terlalu agresif (Hostility: ${state.enemyHostility}%). Kurangi hostility dulu!`;
                addBattleLog(logMsg);
                sfxSound(150, 0.2, 'sawtooth', 0.08);
            }
        }
    } else if (action === 'menu') {
        renderActionsMenu(param);
        return;
    }
    
    // Update UI stats
    updateBattleStats();
    
    // Enemy Turn
    if (proceedToEnemy) {
        state.turn = 'enemy';
        disableBattleButtons();
        setTimeout(enemyTurn, 1200);
    }
};

function enemyTurn() {
    const state = window.battleState;
    if (!state) return;
    
    if (state.enemyStunned) {
        state.enemyStunned = false;
        addBattleLog(`${state.npc.name} masih terhipnotis dan melewatkan gilirannya!`);
        state.playerDefending = false;
        state.turn = 'player';
        updateBattleStats();
        renderActionsMenu('main');
        return;
    }
    
    let dmg = Math.floor(10 + Math.random() * 11); // 10 to 20
    if (state.playerDefending) {
        dmg = Math.floor(dmg / 2);
        addBattleLog(`${state.npc.name} menyerangmu sebesar ${dmg} damage! (Tertahan oleh pertahananmu)`);
    } else {
        addBattleLog(`${state.npc.name} menyerangmu sebesar ${dmg} damage!`);
    }
    
    state.playerHP = Math.max(0, state.playerHP - dmg);
    state.playerDefending = false;
    
    updateBattleStats();
    
    if (state.playerHP <= 0) {
        setTimeout(loseBattle, 1200);
    } else {
        state.turn = 'player';
        renderActionsMenu('main');
    }
}

function winBattle(isPeace = false) {
    disableBattleButtons();
    const state = window.battleState;
    if (!state) return;
    
    if (isPeace) {
        addBattleLog(`Pertarungan selesai dengan damai!`);
    } else {
        addBattleLog(`Kemenangan! ${state.npc.name} telah kalah.`);
        money += 15000;
        rings += 5;
        document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
        document.getElementById('ring-display').innerText = rings;
        sfx.play('coin');
    }
    
    setTimeout(() => {
        if (state.npc.parentGrp) {
            scene.remove(state.npc.parentGrp);
        }
        
        const idx = interactables.findIndex(i => i === state.npc || i.mesh === state.npc.mesh);
        if (idx > -1) {
            interactables.splice(idx, 1);
        }
        for (let i = interactables.length - 1; i >= 0; i--) {
            if (interactables[i].parentGrp === state.npc.mesh || interactables[i].mesh === state.npc.head || (state.npc.parentGrp && interactables[i].parentGrp === state.npc.parentGrp)) {
                interactables.splice(i, 1);
            }
        }
        
        endBattle(false);
    }, 2000);
}

function loseBattle() {
    disableBattleButtons();
    const state = window.battleState;
    if (!state) return;
    
    addBattleLog(`Kamu K.O.! Jiwamu melayang kembali ke warkop...`);
    money = Math.floor(money * 0.8);
    document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
    
    setTimeout(() => {
        camera.position.set(-20, 2, 10);
        if (controls) {
            controls.getObject().position.set(-20, 2, 10);
        }
        endBattle(false);
    }, 2000);
}

function endBattle(runAway) {
    window.battleState = null;
    centerUI.style.display = 'none';
    isInteracting = false;
    instructions.style.display = 'flex';
}

// === NPC DIALOG SYSTEM ===
function startNPCDialog(npc) {
    isInteracting = true;
    controls.unlock();
    centerUI.style.display = 'flex';
    document.getElementById('center-title').innerText = `${npc.name.toUpperCase()} (${npc.role.toUpperCase()})`;
    
    let html = `
        <div style="font-size: 24px; margin: 20px 0; color: #00f0ff; text-transform: none; text-align: left;">
            "${npc.dialogue}"
        </div>
        <div style="display: flex; justify-content: center; gap: 10px;">
            <button class="dr-btn" onclick="closeNPCDialog()">TUTUP</button>
        </div>
    `;
    document.getElementById('center-content').innerHTML = html;
}

window.closeNPCDialog = function() {
    centerUI.style.display = 'none';
    isInteracting = false;
    instructions.style.display = 'flex';
};

// === TYPEWRITER RPG DIALOG BOX SYSTEM ===
let typewriterInterval = null;
let activeTalkingNPC = null;

function showTypewriterDialog(npc) {
    if (activeTalkingNPC === npc) return;
    activeTalkingNPC = npc;
    
    const dialogBox = document.getElementById('dialog-box');
    const speakerDiv = document.getElementById('dialog-speaker');
    const textDiv = document.getElementById('dialog-text');
    
    if (!dialogBox || !speakerDiv || !textDiv) return;
    
    dialogBox.style.display = 'block';
    speakerDiv.innerText = `${npc.name.toUpperCase()} - ${npc.role.toUpperCase()}`;
    
    if (typewriterInterval) clearInterval(typewriterInterval);
    
    const fullText = npc.dialogue;
    let currentIndex = 0;
    textDiv.innerText = "";
    
    typewriterInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
            textDiv.innerText += fullText[currentIndex];
            currentIndex++;
            if (currentIndex % 2 === 0) {
                sfxSound(600, 0.03, 'sine', 0.02); // retro type sound
            }
        } else {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
        }
    }, 35);
}

function hideTypewriterDialog() {
    if (!activeTalkingNPC) return;
    activeTalkingNPC = null;
    if (typewriterInterval) {
        clearInterval(typewriterInterval);
        typewriterInterval = null;
    }
    const dialogBox = document.getElementById('dialog-box');
    if (dialogBox) dialogBox.style.display = 'none';
}

// === 2D PISTOL CANVAS OVERLAY ===
const pContainer = document.createElement('div');
pContainer.id = 'pistol-container';
pContainer.style.position = 'absolute';
pContainer.style.bottom = '0';
pContainer.style.right = '10%';
pContainer.style.zIndex = '15';
pContainer.style.pointerEvents = 'none';
pContainer.style.width = '240px';
pContainer.style.height = '240px';
document.body.appendChild(pContainer);

const pCa = document.createElement('canvas');
pCa.id = 'pistol-canvas';
pCa.width = 240;
pCa.height = 240;
pCa.style.width = '100%';
pCa.style.height = '100%';
pContainer.appendChild(pCa);
const pCx = pCa.getContext('2d');

let shootT = 0;
let isHolstered = false;
let holsterT = 0;
let canJump = true;
let isJumping = false;
let verticalVelocity = 0;
const gravityVal = 22;
const jumpImpulse = 9.0;
function renderPistol() {
  pCx.clearRect(0, 0, 240, 240);
  let recoil = 0;
  if (shootT > 0) {
    recoil = Math.sin((shootT / 0.25) * Math.PI) * 20;
  }
  const holsterOffset = holsterT * 260;
  const gunX = 75;
  const gunY = 85 + recoil + holsterOffset;

  // Muzzle flash
  if (shootT > 0.15) {
    pCx.fillStyle = '#ffaa00';
    pCx.beginPath();
    pCx.arc(gunX + 35, gunY - 20, 28, 0, Math.PI * 2);
    pCx.fill();
    pCx.fillStyle = '#ffffff';
    pCx.beginPath();
    pCx.arc(gunX + 35, gunY - 20, 12, 0, Math.PI * 2);
    pCx.fill();
  }

  // Pistol body
  pCx.fillStyle = '#22222e';
  pCx.fillRect(gunX, gunY, 50, 110);
  pCx.fillStyle = '#111116';
  pCx.fillRect(gunX + 10, gunY - 25, 30, 25); // slide
  pCx.fillStyle = '#ff1d8e';
  pCx.fillRect(gunX + 23, gunY - 32, 4, 7); // cyber red dot sight

  // Grip
  pCx.fillStyle = '#08080c';
  pCx.fillRect(gunX + 12, gunY + 80, 42, 80);

  // Arm
  pCx.fillStyle = '#1c0824'; // Cyber purple sleeve
  pCx.fillRect(gunX + 22, gunY + 115, 80, 80);
}

// === PISTOL SHOOT LOGIC ===
function shootPistol() {
  if (shootT > 0) return;
  if (isInteracting) return;
  if (isHolstered) return;
  shootT = 0.25;
  
  sfxSound(120, 0.15, 'triangle', 0.18);
  sfxSound(800, 0.05, 'sawtooth', 0.1);

  raycaster.setFromCamera(centerVector, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  
  if (intersects.length > 0) {
    let object = intersects[0].object;
    
    // Check if we shot a monster
    let hitMonster = null;
    let tempObj = object;
    while (tempObj) {
      hitMonster = monsters.find(m => m.mesh === tempObj || m.bodyMesh === tempObj || m.headMesh === tempObj);
      if (hitMonster) break;
      tempObj = tempObj.parent;
    }
    
    if (hitMonster) {
      // Deal real-time damage
      hitMonster.hp -= 25;
      hitMonster.flashTimer = 0.15;
      sfxSound(180, 0.1, 'sawtooth', 0.15);
      
      // Draw player laser
      const pPos = camera.position.clone();
      const hitPoint = intersects[0].point;
      const laserOrigin = pPos.add(new THREE.Vector3(0.5, -0.5, -0.8).applyQuaternion(camera.quaternion));
      drawLaserBeam(laserOrigin, hitPoint, 0x00f0ff);
      
      if (hitMonster.hp <= 0) {
        money += 25000;
        document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
        showNotification("MONSTER MUSNAH! +Rp 25.000");
        sfxLevel();
        
        // Drop rings
        for (let r = 0; r < 5; r++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(
                hitMonster.mesh.position.x + (Math.random() - 0.5) * 6,
                1.5,
                hitMonster.mesh.position.z + (Math.random() - 0.5) * 6
            );
            scene.add(ring);
            ringObjects.push(ring);
        }
        
        scene.remove(hitMonster.mesh);
        const mIdx = monsters.indexOf(hitMonster);
        if (mIdx > -1) monsters.splice(mIdx, 1);
      }
      return;
    }
    
    // Check if we shot an NPC
    let hitNpc = null;
    let tempNpc = object;
    while (tempNpc) {
      hitNpc = interactables.find(i => (i.mesh === tempNpc || i.head === tempNpc) && i.type === 'npc');
      if (hitNpc) break;
      tempNpc = tempNpc.parent;
    }
    if (hitNpc && camera.position.distanceTo(hitNpc.parentGrp.position) < 25) {
      if (hitNpc.isCustomer) {
        showNotification("Jangan menembak pelanggan!");
        return;
      }
      sfxSound(200, 0.1, 'sawtooth', 0.15);
      startBattle(hitNpc);
    }
  }
}

// === DEV MODE LOGIC ===
let devMode = false;
let devTimer = 0;
let devLinePos = null;

function activateDevMode() {
  if (devMode) return;
  devMode = true;
  devTimer = 3.0;
  devLinePos = null;
  sfxLevel();

  // Show center dialog
  centerUI.style.display = 'flex';
  document.getElementById('center-title').innerText = "DEVELOPER CONTROL ACTIVE";
  document.getElementById('center-content').innerHTML = `
    <div style="font-size: 24px; margin: 20px 0; color: #00f0ff; animation: glitch 2s infinite;">
      "Kita kaget, kamu kok bisa punya control seperti developer?"
    </div>
    <div style="display: flex; justify-content: center; gap: 10px;">
      <button class="dr-btn" onclick="endDevMode()">...</button>
    </div>
  `;
}

window.endDevMode = function() {
  devTimer = 0; // instantly trigger scatter
}

// Raycaster & Movement
const raycaster = new THREE.Raycaster();
const centerVector = new THREE.Vector2(0, 0);
const clock = new THREE.Clock(); 
const velocity = new THREE.Vector3(); 
const direction = new THREE.Vector3();
const keys = { w: false, a: false, s: false, d: false, shift: false };

window.addEventListener('keydown', e => { 
    const key = e.key.toLowerCase(); keys[key] = true; 
    
    // Spacebar to jump
    if (e.key === ' ' || e.code === 'Space') {
        if (canJump && controls.isLocked && !isInteracting) {
            verticalVelocity = jumpImpulse;
            canJump = false;
            isJumping = true;
            sfxSound(300, 0.08, 'sine', 0.05);
        }
    }
    
    // H or 1 to holster
    if (key === 'h' || key === '1') {
        if (controls.isLocked && !isInteracting) {
            isHolstered = !isHolstered;
            showNotification(isHolstered ? "Senjata Disarungkan" : "Senjata Disiapkan");
            sfxSound(400, 0.08, 'triangle', 0.08);
            setTimeout(() => sfxSound(500, 0.08, 'triangle', 0.08), 60);
        }
    }

    if (key === 'q') shootPistol();
    if (key === 'p' || key === '`') activateDevMode();
    if (key === 'e') {
        if (!controls.isLocked || isInteracting) return;
        raycaster.setFromCamera(centerVector, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        if (intersects.length > 0) {
            let object = intersects[0].object; 
            let interactable = null;
            while (object) {
                interactable = interactables.find(i => (i.mesh === object || i.head === object) && i.type === 'npc');
                if (!interactable) {
                    interactable = interactables.find(i => i.mesh === object || (i.head && i.head === object));
                }
                if (interactable) break;
                object = object.parent;
            }
            if (interactable) {
                if(interactable.parentGrp) interactable = interactables.find(i => i.mesh === interactable.parentGrp);
                if (interactable.type === 'npc') {
                    if (interactable.isCustomer) startTurnBased();
                    else startNPCDialog(interactable);
                }
                else if (interactable.type === 'laptop') startCoding();
            }
        }
    }
}); 
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

document.getElementById('brand').onclick = () => activateDevMode();

// === BLUE MATRIX CODE EFFECT (COD BLACK OPS STYLE) ===
const mCa = document.createElement('canvas');
mCa.id = 'matrix-canvas';
mCa.style.position = 'absolute';
mCa.style.top = '0';
mCa.style.left = '0';
mCa.style.width = '100vw';
mCa.style.height = '100vh';
mCa.style.zIndex = '2';
mCa.style.pointerEvents = 'none';
mCa.style.opacity = '0.15';
mCa.style.imageRendering = 'pixelated';
document.body.appendChild(mCa);

const mCx = mCa.getContext('2d');
let mWidth = mCa.width = window.innerWidth / 2;
let mHeight = mCa.height = window.innerHeight / 2;

const matrixFontSize = 12;
let matrixColumns = Math.floor(mWidth / matrixFontSize);
const matrixDrops = new Array(matrixColumns).fill(0);

let lastMatrixTime = 0;
function updateMatrix(time) {
    if (time - lastMatrixTime < 50) return; // 20 FPS throttle
    lastMatrixTime = time;
    
    mCx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    mCx.fillRect(0, 0, mWidth, mHeight);
    
    mCx.fillStyle = '#00f0ff'; // Neon blue
    mCx.font = `${matrixFontSize}px monospace`;
    
    for (let i = 0; i < matrixDrops.length; i++) {
        const char = Math.random() > 0.5 ? '1' : '0';
        const x = i * matrixFontSize;
        const y = matrixDrops[i] * matrixFontSize;
        
        mCx.fillText(char, x, y);
        
        if (y > mHeight && Math.random() > 0.975) {
            matrixDrops[i] = 0;
        }
        matrixDrops[i]++;
    }
}

window.addEventListener('resize', () => {
    mWidth = mCa.width = window.innerWidth / 2;
    mHeight = mCa.height = window.innerHeight / 2;
    const newCols = Math.floor(mWidth / matrixFontSize);
    while (matrixDrops.length < newCols) matrixDrops.push(0);
    if (matrixDrops.length > newCols) matrixDrops.length = newCols;
});

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();
    
    // Gun holster transition
    if (isHolstered) {
        holsterT = Math.min(1, holsterT + delta * 5);
    } else {
        holsterT = Math.max(0, holsterT - delta * 5);
    }

    // Gun timer tick
    if (shootT > 0) shootT -= delta;
    renderPistol();
    
    // Update matrix rain
    updateMatrix(elapsedTime * 1000);
    tickSkyMatrix(elapsedTime * 1000);

    // Sun scale pulse
    const pulseFactor = 1 + Math.sin(elapsedTime * 2.5) * 0.06;
    sunSprite.scale.set(65 * pulseFactor, 65 * pulseFactor, 1);

    // Circus lights rotation & flashing
    if (typeof circusLights !== 'undefined') {
        circusLights.forEach((l, idx) => {
            l.intensity = 1.5 + Math.sin(elapsedTime * 8 + idx) * 1.5;
        });
    }

    // Beach candles flickering
    if (typeof beachCandles !== 'undefined') {
        beachCandles.forEach(c => {
            const flicker = 1 + (Math.random() - 0.5) * 0.15;
            c.flame.scale.set(flicker, flicker * 1.2, flicker);
            c.light.intensity = 1.8 * flicker;
        });
    }

    // === MONSTERS & NPC DEFENSE SIMULATION ===
    if (typeof monsters !== 'undefined') {
        const playerPos = camera.position;
        
        // 1. Monster Update Loop
        for (let m = monsters.length - 1; m >= 0; m--) {
            const monster = monsters[m];
            
            // Handle hit flashing
            if (monster.flashTimer > 0) {
                monster.flashTimer -= delta;
                monster.headMesh.material.emissive.setHex(0xffffff);
                monster.bodyMesh.material.emissive.setHex(0xff0000);
            } else {
                monster.headMesh.material.emissive.setHex(0x990022);
                monster.bodyMesh.material.emissive.setHex(0x110220);
            }
            
            // Monster targeting: find nearest NPC or Player
            let targetPos = playerPos;
            let minDist = playerPos.distanceTo(monster.mesh.position);
            let targetType = 'player';
            
            // Check NPC distances
            interactables.forEach(i => {
                if (i.type === 'npc' && !i.isCustomer && i.parentGrp) {
                    const dist = i.parentGrp.position.distanceTo(monster.mesh.position);
                    if (dist < minDist) {
                        minDist = dist;
                        targetPos = i.parentGrp.position;
                        targetType = 'npc';
                    }
                }
            });
            
            // Movement: seek target if within 100 units, otherwise wander
            if (minDist < 100) {
                const dir = new THREE.Vector3().subVectors(targetPos, monster.mesh.position);
                dir.y = 0;
                dir.normalize();
                monster.mesh.position.addScaledVector(dir, monster.speed * delta);
                monster.mesh.rotation.y = Math.atan2(dir.x, dir.z);
                
                // Attack player if within 4 units
                if (targetType === 'player' && minDist < 4.0 && !isInteracting) {
                    if (monster.shootCooldown <= 0) {
                        monster.shootCooldown = 2.0;
                        
                        // Screen flash red
                        const vignette = document.getElementById('vignette-overlay');
                        if (vignette) {
                            vignette.style.background = 'radial-gradient(circle, rgba(255,0,0,0) 30%, rgba(255,0,0,0.85) 90%)';
                            setTimeout(() => {
                                vignette.style.background = 'radial-gradient(circle, rgba(0,0,0,0) 45%, rgba(4, 0, 8, 0.65) 94%)';
                            }, 300);
                        }
                        
                        sfxSound(80, 0.35, 'sawtooth', 0.2);
                        showNotification("KAMU DISERANG MONSTER!");
                        
                        // Teleport back to Warkop
                        money = Math.floor(money * 0.9);
                        document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
                        camera.position.set(-20, 2, 10);
                        if (controls) {
                            controls.getObject().position.set(-20, 2, 10);
                        }
                        showNotification("Kamu pingsan dan terbangun kembali di warkop...");
                    }
                }
            } else {
                // Wander
                if (monster.wanderTimer <= 0) {
                    monster.tx = (Math.random() - 0.5) * 360;
                    monster.tz = (Math.random() - 0.5) * 360;
                    monster.wanderTimer = 3 + Math.random() * 5;
                } else {
                    monster.wanderTimer -= delta;
                    const dx = monster.tx - monster.mesh.position.x;
                    const dz = monster.tz - monster.mesh.position.z;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    if (dist > 1.0) {
                        const step = (monster.speed * 0.5) * delta;
                        monster.mesh.position.x += (dx / dist) * step;
                        monster.mesh.position.z += (dz / dist) * step;
                        monster.mesh.rotation.y = Math.atan2(dx, dz);
                    }
                }
            }
            if (monster.shootCooldown > 0) monster.shootCooldown -= delta;
        }
        
        // 2. NPC Auto-defense Shooting Loop
        interactables.forEach(npc => {
            if (npc.type === 'npc' && !npc.isCustomer && npc.parentGrp) {
                let closestMonster = null;
                let closestDist = 35;
                
                monsters.forEach(m => {
                    const dist = npc.parentGrp.position.distanceTo(m.mesh.position);
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestMonster = m;
                    }
                });
                
                if (closestMonster) {
                    // Turn NPC to face monster
                    const dx = closestMonster.mesh.position.x - npc.parentGrp.position.x;
                    const dz = closestMonster.mesh.position.z - npc.parentGrp.position.z;
                    npc.parentGrp.rotation.y = Math.atan2(dx, dz);
                    
                    if (npc.parentGrp.userData.shootCooldown === undefined) {
                        npc.parentGrp.userData.shootCooldown = Math.random() * 1.5;
                    }
                    npc.parentGrp.userData.shootCooldown -= delta;
                    
                    if (npc.parentGrp.userData.shootCooldown <= 0) {
                        npc.parentGrp.userData.shootCooldown = 1.5 + Math.random() * 1.0;
                        
                        const npcHeadPos = new THREE.Vector3();
                        npc.head.getWorldPosition(npcHeadPos);
                        const mBodyPos = new THREE.Vector3();
                        closestMonster.bodyMesh.getWorldPosition(mBodyPos);
                        
                        drawLaserBeam(npcHeadPos, mBodyPos, 0xff0044);
                        sfxSound(500, 0.05, 'triangle', 0.03);
                        
                        closestMonster.hp -= 5;
                        closestMonster.flashTimer = 0.15;
                        
                        if (closestMonster.hp <= 0) {
                            money += 25000;
                            document.getElementById('money-display').innerText = `Rp ${money.toLocaleString('id-ID')}`;
                            showNotification("MONSTER DIKALAHKAN OLEH WARGA! +Rp 25.000");
                            sfxLevel();
                            
                            scene.remove(closestMonster.mesh);
                            const mIdx = monsters.indexOf(closestMonster);
                            if (mIdx > -1) monsters.splice(mIdx, 1);
                        }
                    }
                }
            }
        });
    }

    // Gravity & Jumping update
    const mountH = getMountainHeightAt(camera.position.x, camera.position.z);
    const baseHeight = 2 + mountH;

    if (isJumping) {
        verticalVelocity -= gravityVal * delta;
        camera.position.y += verticalVelocity * delta;
        if (camera.position.y <= baseHeight) {
            camera.position.y = baseHeight;
            verticalVelocity = 0;
            isJumping = false;
            canJump = true;
        }
    } else {
        const heightDiff = camera.position.y - baseHeight;
        if (heightDiff > 0.5) {
            isJumping = true;
            verticalVelocity = 0;
        } else {
            camera.position.y = baseHeight;
        }
    }

    // Disco light color rotation
    discoLight.color.setHSL((elapsedTime * 0.5) % 1, 1, 0.5);

    // Update NPCs (wandering or dev mode alignment)
    if (devMode) {
      if (!devLinePos) {
        const fDir = new THREE.Vector3();
        camera.getWorldDirection(fDir);
        const pDir = new THREE.Vector3(-fDir.z, 0, fDir.x).normalize();
        const lineCenter = camera.position.clone().add(fDir.multiplyScalar(9));
        lineCenter.y = 1.0;
        devLinePos = {
          center: lineCenter,
          dir: pDir
        };
      }
      let npcIdx = 0;
      interactables.forEach(i => {
        if (i.type === 'npc' && !i.isCustomer && i.parentGrp) {
          const offset = (npcIdx - 25) * 1.5;
          const targetPos = devLinePos.center.clone().add(devLinePos.dir.clone().multiplyScalar(offset));
          i.parentGrp.userData.tx = targetPos.x;
          i.parentGrp.userData.tz = targetPos.z;
          i.parentGrp.userData.speed = 15.0; // run to line up
          i.parentGrp.userData.pt = 0;
          npcIdx++;
        }
      });

      devTimer -= delta;
      if (devTimer <= 0) {
        devMode = false;
        devLinePos = null;
        centerUI.style.display = 'none';
        isInteracting = false;
        instructions.style.display = 'flex';
        
        // Scatter NPCs
        interactables.forEach(i => {
          if (i.type === 'npc' && !i.isCustomer && i.parentGrp) {
            i.parentGrp.userData.tx = (Math.random() - 0.5) * 260;
            i.parentGrp.userData.tz = (Math.random() - 0.5) * 260;
            i.parentGrp.userData.speed = 1.5 + Math.random() * 1.5;
            i.parentGrp.userData.pt = 1 + Math.random() * 3;
          }
        });
        showNotification("NPC BUBAR JALAN!");
      }
    }

    // NPC movement logic
    let closestNpc = null;
    let minDistance = 999;

    interactables.forEach(i => {
      if (i.type === 'npc' && !i.isCustomer && i.parentGrp) {
        const grp = i.parentGrp;
        
        // Stop moving and face the player if they approach within 12 units
        const playerDist = camera.position.distanceTo(grp.position);
        if (playerDist < 12 && !devMode) {
          const dxPlayer = camera.position.x - grp.position.x;
          const dzPlayer = camera.position.z - grp.position.z;
          grp.rotation.y = Math.atan2(dxPlayer, dzPlayer);
          
          if (playerDist < minDistance) {
              minDistance = playerDist;
              closestNpc = i;
          }
          return;
        }

        if (grp.userData.pt > 0 && !devMode) {
          grp.userData.pt -= delta;
        } else {
          const dx = grp.userData.tx - grp.position.x;
          const dz = grp.userData.tz - grp.position.z;
          const dist = Math.sqrt(dx*dx + dz*dz);
          if (dist > 0.6) {
            const step = grp.userData.speed * delta;
            grp.position.x += (dx / dist) * step;
            grp.position.z += (dz / dist) * step;
            grp.rotation.y = Math.atan2(dx, dz);
          } else if (!devMode) {
            grp.userData.tx = (Math.random() - 0.5) * 260;
            grp.userData.tz = (Math.random() - 0.5) * 260;
            grp.userData.pt = 1 + Math.random() * 4;
          }
        }
      }
    });

    // Handle Proximity Typewriter Dialog Trigger
    if (closestNpc && !isInteracting) {
        showTypewriterDialog(closestNpc);
    } else {
        hideTypewriterDialog();
    }

    if (controls.isLocked && !isInteracting) {
        direction.z = Number(keys.w) - Number(keys.s); 
        direction.x = Number(keys.d) - Number(keys.a); 
        direction.normalize();
        
        // Slower base speed, fast running with Shift key
        const speedMultiplier = keys.shift ? 160 : 70; 
        const moveSpeed = keys.shift ? 10 : 4;
        
        if (keys.w || keys.s) velocity.z -= direction.z * speedMultiplier * delta;
        if (keys.a || keys.d) velocity.x -= direction.x * speedMultiplier * delta;
        
        controls.moveRight(-velocity.x * delta * moveSpeed); 
        controls.moveForward(-velocity.z * delta * moveSpeed);
        
        velocity.x -= velocity.x * 10.0 * delta; 
        velocity.z -= velocity.z * 10.0 * delta;

        // NPC Hover Tooltip Logic (Optimized for 60FPS+)
        raycaster.setFromCamera(centerVector, camera);
        const targetMeshes = [];
        for (let i = 0; i < interactables.length; i++) {
            const item = interactables[i];
            if (item.mesh) targetMeshes.push(item.mesh);
            if (item.head) targetMeshes.push(item.head);
        }
        const intersects = raycaster.intersectObjects(targetMeshes, false);
        let hoveredNpc = null;
        
        if (intersects.length > 0) {
            let object = intersects[0].object;
            while (object) {
                let interactable = interactables.find(i => i.mesh === object || (i.head && i.head === object));
                if (interactable && interactable.type === 'npc' && !interactable.isCustomer) {
                    hoveredNpc = interactable; break;
                }
                object = object.parent;
            }
        }

        const tooltip = document.getElementById('npc-tooltip');
        if (hoveredNpc && camera.position.distanceTo(hoveredNpc.parentGrp.position) < 15) {
            const headPos = new THREE.Vector3();
            hoveredNpc.head.getWorldPosition(headPos);
            headPos.y += 1.0; 
            headPos.project(camera);
            const x = (headPos.x * 0.5 + 0.5) * window.innerWidth;
            const y = (headPos.y * -0.5 + 0.5) * window.innerHeight;

            tooltip.style.display = 'block';
            tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
            tooltip.innerText = hoveredNpc.dialogue;
        } else {
            tooltip.style.display = 'none';
        }
    } else {
        document.getElementById('npc-tooltip').style.display = 'none';
    }

    const playerPos = camera.position;
    for(let i = ringObjects.length - 1; i >= 0; i--) {
        let ring = ringObjects[i];
        ring.rotation.y += 2 * delta; 
        const dx = playerPos.x - ring.position.x;
        const dz = playerPos.z - ring.position.z;
        if ((dx * dx + dz * dz) < 6.0) {
            scene.remove(ring); ringObjects.splice(i, 1);
            rings++; document.getElementById('ring-display').innerText = rings;
            sfx.play('coin');
        }
    }
    drawMinimap();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => { 
    camera.aspect = window.innerWidth / window.innerHeight; 
    camera.updateProjectionMatrix(); 
    renderer.setSize(window.innerWidth, window.innerHeight); 
});

animate();
