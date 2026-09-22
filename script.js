const STORAGE_KEY = "moneyClickerSaveV1";
const SAVE_VERSION = 1;
const OFFLINE_LIMIT_SECONDS = 8 * 60 * 60;
const INVESTMENT_INTERVAL = 10;

const upgradeDefinitions = [
  {
    id: "goldenFinger",
    icon: "👆",
    name: "Dedo dorado",
    unlockAt: 0,
    baseCost: 10,
    growth: 1.15,
    summary: level => `+$${formatNumber(level + 1)} / click`,
    effect: level => `+$${formatNumber(level)} / click`
  },
  {
    id: "autoClicker",
    icon: "🤖",
    name: "Auto Clicker",
    unlockAt: 100,
    baseCost: 100,
    growth: 1.18,
    summary: level => `+$${formatNumber(level + 1)} / sec`,
    effect: level => `+$${formatNumber(level)} / sec`
  },
  {
    id: "multiplier",
    icon: "⚡",
    name: "Multiplicador",
    unlockAt: 1000,
    baseCost: 1000,
    growth: 1.25,
    summary: level => `x${(1 + (level + 1) * 0.1).toFixed(2)} global`,
    effect: level => `x${(1 + level * 0.1).toFixed(2)} global`
  },
  {
    id: "bank",
    icon: "🏦",
    name: "Banco",
    unlockAt: 10000,
    baseCost: 10000,
    growth: 1.22,
    summary: level => `+$${formatNumber((level + 1) * 25)} / sec`,
    effect: level => `+$${formatNumber(level * 25)} / sec`
  },
  {
    id: "investment",
    icon: "📈",
    name: "Inversión",
    unlockAt: 100000,
    baseCost: 100000,
    growth: 1.28,
    summary: level => `+$${formatNumber((level + 1) * 1000)} cada 10s`,
    effect: level => `+$${formatNumber(level * 1000)} cada 10s`
  }
];

const achievements = [
  { id: "firstDollar", title: "🏆 Primer dólar", text: "Consigue $1.", check: game => game.totalMoney >= 1 },
  { id: "firstThousand", title: "🏆 Primeros mil", text: "Consigue $1,000.", check: game => game.totalMoney >= 1000 },
  { id: "millionaire", title: "🏆 Millonario", text: "Consigue $1,000,000.", check: game => game.totalMoney >= 1000000 },
  { id: "proClicker", title: "🏆 Clicker profesional", text: "Haz 1,000 clicks.", check: game => game.clicks >= 1000 },
  { id: "addict", title: "🏆 Adicto", text: "Haz 10,000 clicks.", check: game => game.clicks >= 10000 },
  { id: "rebirth", title: "🏆 Renacimiento", text: "Haz tu primer prestigio.", check: game => game.prestige >= 1 },
  { id: "tycoon", title: "🏆 Magnate", text: "Haz 10 prestigios.", check: game => game.prestige >= 10 }
];

const milestones = [
  { value: 100, title: "Primer impulso", text: "Has conseguido $100." },
  { value: 1000, title: "Primeros mil", text: "Has conseguido $1,000." },
  { value: 10000, title: "Negocio en marcha", text: "Has conseguido $10,000." },
  { value: 100000, title: "Seis cifras", text: "Has conseguido $100,000." },
  { value: 1000000, title: "¡PRIMER MILLÓN!", text: "Has conseguido $1,000,000." },
  { value: 10000000, title: "Imperio serio", text: "Has conseguido $10,000,000." },
  { value: 1000000000, title: "Billonario", text: "Has conseguido $1,000,000,000." }
];

const defaultState = () => ({
  version: SAVE_VERSION,
  money: 0,
  totalMoney: 0,
  maxMoney: 0,
  runMaxMoney: 0,
  level: 1,
  xp: 0,
  prestige: 0,
  clicks: 0,
  upgrades: Object.fromEntries(upgradeDefinitions.map(upgrade => [upgrade.id, 0])),
  achievements: {},
  milestones: {},
  settings: {
    sound: true,
    animations: true
  },
  lastSaved: Date.now()
});

let state = defaultState();
let audioContext = null;
let investmentTimer = 0;
let pendingOfflineReward = 0;

const elements = {
  moneyDisplay: document.getElementById("moneyDisplay"),
  clickPower: document.getElementById("clickPower"),
  secondPower: document.getElementById("secondPower"),
  multiplierDisplay: document.getElementById("multiplierDisplay"),
  levelDisplay: document.getElementById("levelDisplay"),
  xpDisplay: document.getElementById("xpDisplay"),
  xpFill: document.getElementById("xpFill"),
  clickButton: document.getElementById("clickButton"),
  clickZone: document.getElementById("clickZone"),
  floatingLayer: document.getElementById("floatingLayer"),
  upgradeList: document.getElementById("upgradeList"),
  prestigePoints: document.getElementById("prestigePoints"),
  prestigeInfo: document.getElementById("prestigeInfo"),
  prestigeButton: document.getElementById("prestigeButton"),
  achievementList: document.getElementById("achievementList"),
  achievementCount: document.getElementById("achievementCount"),
  statsList: document.getElementById("statsList"),
  toastStack: document.getElementById("toastStack"),
  settingsButton: document.getElementById("settingsButton"),
  settingsModal: document.getElementById("settingsModal"),
  soundToggle: document.getElementById("soundToggle"),
  animationToggle: document.getElementById("animationToggle"),
  manualSaveButton: document.getElementById("manualSaveButton"),
  resetButton: document.getElementById("resetButton"),
  prestigeModal: document.getElementById("prestigeModal"),
  prestigeSummary: document.getElementById("prestigeSummary"),
  cancelPrestigeButton: document.getElementById("cancelPrestigeButton"),
  confirmPrestigeButton: document.getElementById("confirmPrestigeButton"),
  offlineModal: document.getElementById("offlineModal"),
  offlineTime: document.getElementById("offlineTime"),
  offlineReward: document.getElementById("offlineReward"),
  collectOfflineButton: document.getElementById("collectOfflineButton"),
  levelBurst: document.getElementById("levelBurst")
};

function formatNumber(value) {
  const number = Math.max(0, Number(value) || 0);
  const suffixes = [
    { value: 1e15, label: "Qa" },
    { value: 1e12, label: "T" },
    { value: 1e9, label: "B" },
    { value: 1e6, label: "M" }
  ];

  for (const suffix of suffixes) {
    if (number >= suffix.value) {
      const formatted = (number / suffix.value).toFixed(number >= suffix.value * 100 ? 0 : 1);
      return `${formatted.replace(/\.0$/, "")}${suffix.label}`;
    }
  }

  return Math.floor(number).toLocaleString("en-US");
}

function getUpgradeLevel(id) {
  return state.upgrades[id] || 0;
}

function getUpgradeCost(upgrade) {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, getUpgradeLevel(upgrade.id)));
}

function calculateMultiplier() {
  const prestigeMultiplier = 1 + state.prestige * 0.1;
  const upgradeMultiplier = 1 + getUpgradeLevel("multiplier") * 0.1;
  const levelMultiplier = 1 + (state.level - 1) * 0.02;
  return prestigeMultiplier * upgradeMultiplier * levelMultiplier;
}

function getMoneyPerClick() {
  return (1 + getUpgradeLevel("goldenFinger")) * calculateMultiplier();
}

function getPassivePerSecond() {
  const autoClicker = getUpgradeLevel("autoClicker");
  const bank = getUpgradeLevel("bank") * 25;
  return (autoClicker + bank) * calculateMultiplier();
}

function getInvestmentPayout() {
  return getUpgradeLevel("investment") * 1000 * calculateMultiplier();
}

function getMoneyPerSecond() {
  return getPassivePerSecond() + getInvestmentPayout() / INVESTMENT_INTERVAL;
}

function getXpNeeded() {
  return Math.floor(100 * Math.pow(1.24, state.level - 1));
}

function addMoney(amount, options = {}) {
  if (amount <= 0) return;

  state.money += amount;
  state.totalMoney += amount;
  state.maxMoney = Math.max(state.maxMoney, state.money);
  state.runMaxMoney = Math.max(state.runMaxMoney, state.money);
  state.xp += Math.max(1, amount * 0.15);

  checkLevelUp();
  checkMilestones();
  checkAchievements();

  if (options.floating !== false) {
    showFloatingText(`+$${formatNumber(amount)}`);
  }

  updateUI();
}

function handleClick() {
  const earned = getMoneyPerClick();
  state.clicks += 1;
  addMoney(earned, { source: "click" });
  animateClickButton();
  createParticles();
  playSound("click");
  saveGame();
}

function buyUpgrade(id) {
  const upgrade = upgradeDefinitions.find(item => item.id === id);
  if (!upgrade || state.runMaxMoney < upgrade.unlockAt) return;

  const cost = getUpgradeCost(upgrade);
  if (state.money < cost) return;

  state.money -= cost;
  state.upgrades[id] = getUpgradeLevel(id) + 1;
  showNotification("Mejora comprada", `${upgrade.icon} ${upgrade.name} ahora es nivel ${state.upgrades[id]}.`);
  markUpgradePurchased(id);
  playSound("buy");
  checkAchievements();
  updateUI();
  saveGame();
}

function calculatePrestige() {
  if (state.money < 1000000) return 0;
  return Math.max(1, Math.floor(Math.log10(state.money / 1000000)) + 1);
}

function doPrestige() {
  const points = calculatePrestige();
  if (points <= 0) return;

  state.prestige += points;
  state.money = 0;
  state.level = 1;
  state.xp = 0;
  state.runMaxMoney = 0;
  state.upgrades = Object.fromEntries(upgradeDefinitions.map(upgrade => [upgrade.id, 0]));
  investmentTimer = 0;

  elements.prestigeModal.close();
  showNotification("Prestigio completado", `💎 +${points} puntos. Ingresos permanentes: +${state.prestige * 10}%.`);
  showLevelBurst("💎 PRESTIGIO");
  playSound("prestige");
  checkAchievements();
  updateUI();
  saveGame();
}

function saveGame() {
  state.lastSaved = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    state = defaultState();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    const fresh = defaultState();
    state = {
      ...fresh,
      ...parsed,
      upgrades: { ...fresh.upgrades, ...(parsed.upgrades || {}) },
      achievements: parsed.achievements || {},
      milestones: parsed.milestones || {},
      settings: { ...fresh.settings, ...(parsed.settings || {}) }
    };
  } catch (error) {
    state = defaultState();
  }
}

function resetGame() {
  const confirmed = window.confirm("¿Seguro que quieres borrar la partida? Esta acción no se puede deshacer.");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  state = defaultState();
  investmentTimer = 0;
  elements.settingsModal.close();
  showNotification("Partida reiniciada", "Has empezado una partida nueva.");
  updateUI();
  saveGame();
}

function calculateOfflineProgress() {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - (state.lastSaved || Date.now())) / 1000));
  const cappedSeconds = Math.min(elapsedSeconds, OFFLINE_LIMIT_SECONDS);
  const reward = getMoneyPerSecond() * cappedSeconds;
  return {
    elapsedSeconds,
    cappedSeconds,
    reward
  };
}

function showFloatingText(text) {
  if (!state.settings.animations) return;

  const floating = document.createElement("span");
  floating.className = "floating-text";
  floating.textContent = text;
  floating.style.setProperty("--drift", `${Math.round(Math.random() * 80 - 40)}px`);
  floating.style.left = `${44 + Math.random() * 12}%`;
  floating.style.top = `${34 + Math.random() * 18}%`;
  elements.floatingLayer.appendChild(floating);
  window.setTimeout(() => floating.remove(), 720);
}

function unlockAchievement(id) {
  if (state.achievements[id]) return;

  const achievement = achievements.find(item => item.id === id);
  if (!achievement) return;

  state.achievements[id] = true;
  showNotification(achievement.title, achievement.text);
  playSound("achievement");
}

function showNotification(title, text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
  elements.toastStack.appendChild(toast);
  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    window.setTimeout(() => toast.remove(), 220);
  }, 3200);
}

function checkAchievements() {
  achievements.forEach(achievement => {
    if (!state.achievements[achievement.id] && achievement.check(state)) {
      unlockAchievement(achievement.id);
    }
  });
}

function checkMilestones() {
  milestones.forEach(milestone => {
    if (!state.milestones[milestone.value] && state.maxMoney >= milestone.value) {
      state.milestones[milestone.value] = true;
      showNotification(`🏆 ${milestone.title}`, milestone.text);
      playSound("achievement");
    }
  });
}

function checkLevelUp() {
  let leveled = false;

  while (state.xp >= getXpNeeded()) {
    state.xp -= getXpNeeded();
    state.level += 1;
    leveled = true;
  }

  if (leveled) {
    showNotification(`🎉 ¡NIVEL ${state.level}!`, "Tu multiplicador ha aumentado ligeramente.");
    showLevelBurst(`🎉 ¡NIVEL ${state.level}!`);
    playSound("level");
  }
}

function updateUI() {
  const multiplier = calculateMultiplier();
  const xpNeeded = getXpNeeded();
  const prestigeGain = calculatePrestige();

  document.body.classList.toggle("no-animations", !state.settings.animations);
  elements.moneyDisplay.textContent = `💰 $${formatNumber(state.money)}`;
  elements.clickPower.textContent = `+$${formatNumber(getMoneyPerClick())} / click`;
  elements.secondPower.textContent = `+$${formatNumber(getMoneyPerSecond())} / sec`;
  elements.multiplierDisplay.textContent = `x${formatMultiplier(multiplier)}`;
  elements.levelDisplay.textContent = `Nivel ${state.level}`;
  elements.xpDisplay.textContent = `${formatNumber(state.xp)}/${formatNumber(xpNeeded)} XP`;
  elements.xpFill.style.width = `${Math.min(100, (state.xp / xpNeeded) * 100)}%`;
  elements.prestigePoints.textContent = `${state.prestige} 💎`;
  elements.prestigeInfo.textContent = prestigeGain > 0
    ? `Obtendrás ${prestigeGain} punto${prestigeGain === 1 ? "" : "s"} de prestigio y +${prestigeGain * 10}% permanente.`
    : "Alcanza $1M para renacer con una bonificación permanente.";
  elements.prestigeButton.disabled = prestigeGain <= 0;
  elements.soundToggle.textContent = state.settings.sound ? "ON" : "OFF";
  elements.animationToggle.textContent = state.settings.animations ? "ON" : "OFF";

  renderUpgrades();
  renderAchievements();
  renderStats();
}

function renderUpgrades() {
  elements.upgradeList.innerHTML = "";

  upgradeDefinitions.forEach(upgrade => {
    const level = getUpgradeLevel(upgrade.id);
    const unlocked = state.runMaxMoney >= upgrade.unlockAt;
    const cost = getUpgradeCost(upgrade);
    const card = document.createElement("article");

    if (!unlocked) {
      card.className = "upgrade-card locked";
      card.innerHTML = `
        <strong>🔒 BLOQUEADO</strong>
        <span>${upgrade.name}</span>
        <span>Desbloquea al alcanzar $${formatNumber(upgrade.unlockAt)}</span>
      `;
      elements.upgradeList.appendChild(card);
      return;
    }

    card.className = `upgrade-card ${state.money >= cost ? "affordable" : ""}`;
    card.dataset.upgradeId = upgrade.id;
    card.innerHTML = `
      <div class="upgrade-icon">${upgrade.icon}</div>
      <div>
        <div class="upgrade-name">
          <span>${upgrade.name}</span>
          <span>NIVEL ${level}</span>
        </div>
        <div class="upgrade-desc">${upgrade.effect(level)} · Siguiente: ${upgrade.summary(level)}</div>
      </div>
      <button class="buy-button" type="button" ${state.money < cost ? "disabled" : ""}>$${formatNumber(cost)}</button>
    `;
    card.querySelector("button").addEventListener("click", () => buyUpgrade(upgrade.id));
    elements.upgradeList.appendChild(card);
  });
}

function renderAchievements() {
  const unlockedCount = achievements.filter(achievement => state.achievements[achievement.id]).length;
  elements.achievementCount.textContent = `${unlockedCount}/${achievements.length}`;
  elements.achievementList.innerHTML = "";

  achievements.forEach(achievement => {
    const unlocked = Boolean(state.achievements[achievement.id]);
    const card = document.createElement("article");
    card.className = `achievement-card ${unlocked ? "unlocked" : ""}`;
    card.innerHTML = `
      <strong>${unlocked ? achievement.title : "🔒 Logro oculto"}</strong>
      <p>${achievement.text}</p>
    `;
    elements.achievementList.appendChild(card);
  });
}

function renderStats() {
  const stats = [
    ["Clicks totales", formatNumber(state.clicks)],
    ["Dinero total generado", `$${formatNumber(state.totalMoney)}`],
    ["Dinero actual", `$${formatNumber(state.money)}`],
    ["Dinero por click", `$${formatNumber(getMoneyPerClick())}`],
    ["Dinero por segundo", `$${formatNumber(getMoneyPerSecond())}`],
    ["Nivel", state.level],
    ["Prestigios", state.prestige],
    ["Multiplicador", `x${formatMultiplier(calculateMultiplier())}`]
  ];

  elements.statsList.innerHTML = stats.map(([label, value]) => `
    <article class="stat-card">
      <strong>${label}</strong>
      <span>${value}</span>
    </article>
  `).join("");
}

function formatMultiplier(value) {
  return value < 10 ? value.toFixed(2).replace(/\.00$/, "") : value.toFixed(1);
}

function animateClickButton() {
  if (!state.settings.animations) return;

  elements.clickButton.classList.remove("pressed");
  void elements.clickButton.offsetWidth;
  elements.clickButton.classList.add("pressed");
  window.setTimeout(() => elements.clickButton.classList.remove("pressed"), 120);
}

function createParticles() {
  if (!state.settings.animations) return;

  for (let i = 0; i < 8; i += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.setProperty("--x", `${Math.round(Math.random() * 170 - 85)}px`);
    particle.style.setProperty("--y", `${Math.round(Math.random() * 170 - 110)}px`);
    particle.style.background = i % 2 === 0 ? "#f59e0b" : "#22c55e";
    elements.floatingLayer.appendChild(particle);
    window.setTimeout(() => particle.remove(), 650);
  }
}

function markUpgradePurchased(id) {
  if (!state.settings.animations) return;

  window.requestAnimationFrame(() => {
    const card = elements.upgradeList.querySelector(`[data-upgrade-id="${id}"]`);
    if (!card) return;
    card.classList.add("purchased");
    window.setTimeout(() => card.classList.remove("purchased"), 500);
  });
}

function showLevelBurst(text) {
  if (!state.settings.animations) return;

  elements.levelBurst.textContent = text;
  elements.levelBurst.classList.remove("show");
  void elements.levelBurst.offsetWidth;
  elements.levelBurst.classList.add("show");
  window.setTimeout(() => elements.levelBurst.classList.remove("show"), 1120);
}

function playSound(type) {
  if (!state.settings.sound) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const presets = {
    click: [520, 0.05, "sine", 0.035],
    buy: [680, 0.09, "triangle", 0.045],
    level: [880, 0.16, "sine", 0.055],
    achievement: [760, 0.14, "square", 0.035],
    prestige: [420, 0.24, "sawtooth", 0.05]
  };
  const [frequency, duration, wave, volume] = presets[type] || presets.click;

  oscillator.type = wave;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.4, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function openPrestigeModal() {
  const points = calculatePrestige();
  if (points <= 0) return;

  elements.prestigeSummary.innerHTML = `
    <div><strong>Perderás:</strong></div>
    <div>❌ $${formatNumber(state.money)}</div>
    <div>❌ Todas las mejoras</div>
    <div>❌ Nivel ${state.level}</div>
    <div><strong>Obtendrás:</strong></div>
    <div>💎 +${points} punto${points === 1 ? "" : "s"} de prestigio</div>
    <div>🔥 +${points * 10}% ingresos permanentes</div>
  `;
  elements.prestigeModal.showModal();
}

function showOfflineModal(offline) {
  pendingOfflineReward = offline.reward;
  elements.offlineTime.textContent = `Han pasado ${formatDuration(offline.cappedSeconds)}.`;
  elements.offlineReward.textContent = `+$${formatNumber(offline.reward)}`;
  elements.offlineModal.showModal();
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${Math.max(1, minutes)}min`;
}

function gameTick() {
  const passiveIncome = getPassivePerSecond();
  if (passiveIncome > 0) {
    addMoney(passiveIncome, { source: "auto", floating: false });
  }

  investmentTimer += 1;
  if (investmentTimer >= INVESTMENT_INTERVAL) {
    investmentTimer = 0;
    const payout = getInvestmentPayout();
    if (payout > 0) {
      addMoney(payout, { source: "investment" });
      showNotification("📈 Inversión cobrada", `Has recibido $${formatNumber(payout)}.`);
      playSound("buy");
    }
  }

  saveGame();
}

function bindEvents() {
  elements.clickButton.addEventListener("click", handleClick);
  elements.prestigeButton.addEventListener("click", openPrestigeModal);
  elements.confirmPrestigeButton.addEventListener("click", doPrestige);
  elements.cancelPrestigeButton.addEventListener("click", () => elements.prestigeModal.close());
  elements.settingsButton.addEventListener("click", () => elements.settingsModal.showModal());

  elements.soundToggle.addEventListener("click", () => {
    state.settings.sound = !state.settings.sound;
    playSound("click");
    updateUI();
    saveGame();
  });

  elements.animationToggle.addEventListener("click", () => {
    state.settings.animations = !state.settings.animations;
    updateUI();
    saveGame();
  });

  elements.manualSaveButton.addEventListener("click", () => {
    saveGame();
    showNotification("Partida guardada", "Tu progreso se ha guardado en este navegador.");
  });

  elements.resetButton.addEventListener("click", resetGame);
  elements.collectOfflineButton.addEventListener("click", () => {
    addMoney(pendingOfflineReward, { source: "offline", floating: false });
    pendingOfflineReward = 0;
    elements.offlineModal.close();
    playSound("buy");
    saveGame();
  });

  window.addEventListener("beforeunload", saveGame);
}

function init() {
  loadGame();
  const offline = calculateOfflineProgress();
  bindEvents();
  updateUI();

  if (offline.cappedSeconds >= 60 && offline.reward >= 1) {
    showOfflineModal(offline);
  }

  window.setInterval(gameTick, 1000);
  window.setInterval(saveGame, 15000);
}

init();
