(function () {
  "use strict";

  const SAVE_KEY = "moneyClickerSaveV1";
  const AUTOSAVE_INTERVAL = 10000;
  const OFFLINE_LIMIT_SECONDS = 8 * 60 * 60;
  const PRESTIGE_BASE = 1000000;
  const RESOURCE_ICON = "⚡";

  const defaultUpgrades = {
    goldenFinger: {
      id: "goldenFinger",
      icon: "🖥️",
      name: "GPU de última generación",
      baseCost: 10,
      growth: 1.15,
      unlockAt: 0,
      effect: 1,
      type: "click",
      description: "+{value} cómputo por click"
    },
    autoClicker: {
      id: "autoClicker",
      icon: "🤖",
      name: "Agente autónomo",
      baseCost: 100,
      growth: 1.17,
      unlockAt: 100,
      effect: 1,
      type: "auto",
      description: "+{value} por segundo"
    },
    multiplier: {
      id: "multiplier",
      icon: "✨",
      name: "Modelo avanzado",
      baseCost: 1000,
      growth: 1.42,
      unlockAt: 1000,
      effect: 0.1,
      type: "multiplier",
      description: "+{value}% a toda la potencia"
    },
    bank: {
      id: "bank",
      icon: "🏢",
      name: "Centro de datos",
      baseCost: 10000,
      growth: 1.22,
      unlockAt: 10000,
      effect: 15,
      type: "auto",
      description: "+{value} por segundo"
    },
    investment: {
      id: "investment",
      icon: "📈",
      name: "Investigación de IA",
      baseCost: 100000,
      growth: 1.28,
      unlockAt: 100000,
      effect: 5000,
      interval: 10,
      type: "burst",
      description: "+{value} cada 10s"
    }
  };

  const achievements = [
    { id: "firstDollar", icon: "🏆", title: "Primer token", text: "Genera ⚡1 crédito de cómputo.", check: function () { return state.totalEarned >= 1; } },
    { id: "firstThousand", icon: "🏆", title: "Primeros mil tokens", text: "Genera ⚡1,000 créditos de cómputo.", check: function () { return state.totalEarned >= 1000; } },
    { id: "millionaire", icon: "🏆", title: "Primer millón de tokens", text: "Genera ⚡1,000,000 créditos de cómputo.", check: function () { return state.totalEarned >= 1000000; } },
    { id: "proClicker", icon: "🏆", title: "Entrenador de modelos", text: "Haz 1,000 ciclos de entrenamiento.", check: function () { return state.clicks >= 1000; } },
    { id: "addicted", icon: "🏆", title: "Arquitecto obsesivo", text: "Haz 10,000 ciclos de entrenamiento.", check: function () { return state.clicks >= 10000; } },
    { id: "rebirth", icon: "🏆", title: "Nueva arquitectura", text: "Inicia tu primera nueva generación.", check: function () { return state.prestige >= 1; } },
    { id: "tycoon", icon: "🏆", title: "Superinteligencia estable", text: "Inicia 10 nuevas generaciones.", check: function () { return state.prestige >= 10; } }
  ];

  const milestones = [
    { amount: 100, title: "🏆 ¡PRIMER CLÚSTER!", body: "Has generado ⚡100 créditos de cómputo." },
    { amount: 1000, title: "🏆 ¡PRIMEROS MIL TOKENS!", body: "Has generado ⚡1,000 créditos de cómputo." },
    { amount: 10000, title: "🏆 ¡LABORATORIO ACTIVO!", body: "Has generado ⚡10,000 créditos de cómputo." },
    { amount: 100000, title: "🏆 ¡ENTRENAMIENTO MASIVO!", body: "Has generado ⚡100,000 créditos de cómputo." },
    { amount: 1000000, title: "🏆 ¡PRIMER MILLÓN DE TOKENS!", body: "Has generado ⚡1,000,000 créditos de cómputo." },
    { amount: 10000000, title: "🏆 ¡IA IMPARABLE!", body: "Has generado ⚡10,000,000 créditos de cómputo." },
    { amount: 1000000000, title: "🏆 ¡POTENCIA DE CÓMPUTO MASIVA!", body: "Has generado ⚡1,000,000,000 créditos de cómputo." }
  ];

  const elements = {};
  let state;
  let audioContext = null;
  let pendingOfflineMoney = 0;

  function createNewState() {
    const upgrades = {};
    Object.keys(defaultUpgrades).forEach(function (id) {
      upgrades[id] = 0;
    });

    return {
      money: 0,
      level: 1,
      xp: 0,
      prestige: 0,
      clicks: 0,
      totalEarned: 0,
      upgrades: upgrades,
      achievements: [],
      milestones: [],
      timers: {
        investment: 0
      },
      settings: {
        sound: true,
        animations: true
      },
      lastSaved: Date.now()
    };
  }

  function init() {
    cacheElements();
    loadGame();
    bindEvents();
    applySettings();
    calculateOfflineProgress();
    renderAll();
    setInterval(tick, 1000);
    setInterval(saveGame, AUTOSAVE_INTERVAL);
  }

  function cacheElements() {
    elements.app = document.getElementById("app");
    elements.moneyDisplay = document.getElementById("moneyDisplay");
    elements.clickIncome = document.getElementById("clickIncome");
    elements.secondIncome = document.getElementById("secondIncome");
    elements.multiplierDisplay = document.getElementById("multiplierDisplay");
    elements.moneyButton = document.getElementById("moneyButton");
    elements.clickZone = document.getElementById("clickZone");
    elements.levelDisplay = document.getElementById("levelDisplay");
    elements.xpDisplay = document.getElementById("xpDisplay");
    elements.xpBar = document.getElementById("xpBar");
    elements.levelCard = document.getElementById("levelCard");
    elements.upgradesList = document.getElementById("upgradesList");
    elements.prestigeDisplay = document.getElementById("prestigeDisplay");
    elements.prestigeBonusDisplay = document.getElementById("prestigeBonusDisplay");
    elements.prestigeButton = document.getElementById("prestigeButton");
    elements.prestigeRequirement = document.getElementById("prestigeRequirement");
    elements.achievementList = document.getElementById("achievementList");
    elements.statsList = document.getElementById("statsList");
    elements.toastStack = document.getElementById("toastStack");
    elements.settingsButton = document.getElementById("settingsButton");
    elements.settingsModal = document.getElementById("settingsModal");
    elements.closeSettings = document.getElementById("closeSettings");
    elements.soundToggle = document.getElementById("soundToggle");
    elements.animationsToggle = document.getElementById("animationsToggle");
    elements.saveButton = document.getElementById("saveButton");
    elements.resetButton = document.getElementById("resetButton");
    elements.prestigeModal = document.getElementById("prestigeModal");
    elements.prestigeLossMoney = document.getElementById("prestigeLossMoney");
    elements.prestigeGainPoints = document.getElementById("prestigeGainPoints");
    elements.prestigeGainBonus = document.getElementById("prestigeGainBonus");
    elements.cancelPrestige = document.getElementById("cancelPrestige");
    elements.confirmPrestige = document.getElementById("confirmPrestige");
    elements.offlineModal = document.getElementById("offlineModal");
    elements.offlineTime = document.getElementById("offlineTime");
    elements.offlineMoney = document.getElementById("offlineMoney");
    elements.collectOffline = document.getElementById("collectOffline");
  }

  function bindEvents() {
    elements.moneyButton.addEventListener("click", handleClick);
    elements.upgradesList.addEventListener("click", function (event) {
      const button = event.target.closest("[data-upgrade]");
      if (button) {
        buyUpgrade(button.dataset.upgrade);
      }
    });
    elements.prestigeButton.addEventListener("click", openPrestigeModal);
    elements.confirmPrestige.addEventListener("click", doPrestige);
    elements.cancelPrestige.addEventListener("click", function () {
      closeModal(elements.prestigeModal);
    });
    elements.settingsButton.addEventListener("click", function () {
      openModal(elements.settingsModal);
    });
    elements.closeSettings.addEventListener("click", function () {
      closeModal(elements.settingsModal);
    });
    elements.soundToggle.addEventListener("click", function () {
      state.settings.sound = !state.settings.sound;
      applySettings();
      saveGame();
    });
    elements.animationsToggle.addEventListener("click", function () {
      state.settings.animations = !state.settings.animations;
      applySettings();
      saveGame();
    });
    elements.saveButton.addEventListener("click", function () {
      saveGame();
      playSound("buy");
      showNotification("💾 Simulación guardada", "Tu imperio de IA está a salvo.");
    });
    elements.resetButton.addEventListener("click", resetGame);
    elements.collectOffline.addEventListener("click", function () {
      if (pendingOfflineMoney > 0) {
        addMoney(pendingOfflineMoney);
        pendingOfflineMoney = 0;
        playSound("buy");
        renderAll();
        saveGame();
      }
      closeModal(elements.offlineModal);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal(elements.settingsModal);
        closeModal(elements.prestigeModal);
      }
    });
    window.addEventListener("beforeunload", saveGame);
  }

  function handleClick() {
    const gained = getMoneyPerClick();
    state.clicks += 1;
    addMoney(gained);
    addExperience(Math.max(1, gained * 0.16));
    showFloatingText("+" + RESOURCE_ICON + formatNumber(gained), elements.clickZone);
    createParticles();
    animateButton();
    playSound("click");
    checkProgressRewards();
    renderAll();
    saveGame();
  }

  function buyUpgrade(upgradeId) {
    const upgrade = defaultUpgrades[upgradeId];
    if (!upgrade || !isUpgradeUnlocked(upgrade)) {
      return;
    }

    const cost = getUpgradeCost(upgradeId);
    if (state.money < cost) {
      showNotification("⚠️ Cómputo insuficiente", "Te faltan " + RESOURCE_ICON + formatNumber(cost - state.money) + ".");
      return;
    }

    state.money -= cost;
    state.upgrades[upgradeId] += 1;
    addExperience(Math.max(5, cost * 0.03));
    playSound("buy");
    markUpgradeBought(upgradeId);
    checkProgressRewards();
    renderAll();
    saveGame();
  }

  function calculateMultiplier() {
    const upgradeMultiplier = 1 + (state.upgrades.multiplier || 0) * defaultUpgrades.multiplier.effect;
    const levelMultiplier = 1 + (state.level - 1) * 0.02;
    const prestigeMultiplier = getPrestigeMultiplier();
    return upgradeMultiplier * levelMultiplier * prestigeMultiplier;
  }

  function calculatePrestige() {
    if (state.totalEarned < PRESTIGE_BASE) {
      return 0;
    }
    return Math.max(1, Math.floor(Math.sqrt(state.totalEarned / PRESTIGE_BASE)));
  }

  function saveGame() {
    state.lastSaved = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function loadGame() {
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) {
      state = createNewState();
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      state = mergeState(createNewState(), parsed);
    } catch (error) {
      state = createNewState();
      showNotification("⚠️ Simulación nueva", "No se pudo cargar el guardado anterior.");
    }
  }

  function resetGame() {
    const confirmed = window.confirm("¿Seguro que quieres borrar la simulación? Perderás todo el progreso guardado.");
    if (!confirmed) {
      return;
    }
    localStorage.removeItem(SAVE_KEY);
    state = createNewState();
    pendingOfflineMoney = 0;
    closeModal(elements.settingsModal);
    closeModal(elements.offlineModal);
    renderAll();
    saveGame();
    showNotification("🗑️ Simulación reiniciada", "Has empezado con una IA básica.");
  }

  function calculateOfflineProgress() {
    const secondsAway = Math.floor((Date.now() - (state.lastSaved || Date.now())) / 1000);
    const effectiveSeconds = Math.min(secondsAway, OFFLINE_LIMIT_SECONDS);
    const perSecond = getMoneyPerSecond();
    const earned = effectiveSeconds * perSecond;

    if (earned >= 1 && effectiveSeconds >= 60) {
      pendingOfflineMoney = earned;
      elements.offlineTime.textContent = "Han pasado " + formatDuration(effectiveSeconds) + ".";
      elements.offlineMoney.textContent = RESOURCE_ICON + " +" + formatNumber(earned);
      openModal(elements.offlineModal);
    }
  }

  function formatNumber(value) {
    const number = Math.max(0, Number(value) || 0);
    const units = [
      { value: 1000000000000, suffix: "T" },
      { value: 1000000000, suffix: "B" },
      { value: 1000000, suffix: "M" }
    ];

    for (let i = 0; i < units.length; i += 1) {
      if (number >= units[i].value) {
        const scaled = number / units[i].value;
        const rounded = scaled >= 100 ? Math.floor(scaled).toString() : scaled.toFixed(1).replace(/\.0$/, "");
        return rounded + units[i].suffix;
      }
    }

    return Math.floor(number).toLocaleString("en-US");
  }

  function showFloatingText(text, parent) {
    if (!state.settings.animations) {
      return;
    }
    const node = document.createElement("div");
    node.className = "floating-text";
    node.textContent = text;
    node.style.left = 42 + Math.random() * 16 + "%";
    parent.appendChild(node);
    window.setTimeout(function () {
      node.remove();
    }, 720);
  }

  function unlockAchievement(id) {
    if (state.achievements.indexOf(id) !== -1) {
      return;
    }
    const achievement = achievements.find(function (item) { return item.id === id; });
    if (!achievement) {
      return;
    }
    state.achievements.push(id);
    playSound("achievement");
    showNotification(achievement.icon + " " + achievement.title, achievement.text);
  }

  function showNotification(title, body) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = "<strong></strong><p></p>";
    toast.querySelector("strong").textContent = title;
    toast.querySelector("p").textContent = body || "";
    elements.toastStack.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, 4100);
  }

  function tick() {
    const steadyIncome = getSteadyMoneyPerSecond();
    const timedIncome = processTimedProduction();
    const totalIncome = steadyIncome + timedIncome;

    if (totalIncome > 0) {
      addMoney(totalIncome);
      addExperience(Math.max(1, totalIncome * 0.04));
      checkProgressRewards();
      renderAll();
    }
  }

  function addMoney(amount) {
    state.money += amount;
    state.totalEarned += amount;
  }

  function addExperience(amount) {
    state.xp += amount;
    let leveled = false;
    while (state.xp >= getXpNeeded()) {
      state.xp -= getXpNeeded();
      state.level += 1;
      leveled = true;
    }

    if (leveled) {
      elements.levelCard.classList.remove("level-up-flash");
      void elements.levelCard.offsetWidth;
      elements.levelCard.classList.add("level-up-flash");
      playSound("level");
      showNotification("🎉 ¡" + getAIStage(state.level).toUpperCase() + "!", "Tu multiplicador ha aumentado.");
    }
  }

  function getXpNeeded() {
    return Math.floor(100 * Math.pow(1.18, state.level - 1));
  }

  function getBaseClick() {
    return 1 + (state.upgrades.goldenFinger || 0) * defaultUpgrades.goldenFinger.effect;
  }

  function getRawAuto() {
    return Object.keys(defaultUpgrades).reduce(function (total, id) {
      const upgrade = defaultUpgrades[id];
      if (upgrade.type !== "auto") {
        return total;
      }
      return total + (state.upgrades[id] || 0) * upgrade.effect;
    }, 0);
  }

  function getRawTimedAverage() {
    return Object.keys(defaultUpgrades).reduce(function (total, id) {
      const upgrade = defaultUpgrades[id];
      if (upgrade.type !== "burst") {
        return total;
      }
      const interval = upgrade.interval || 1;
      return total + ((state.upgrades[id] || 0) * upgrade.effect) / interval;
    }, 0);
  }

  function getMoneyPerClick() {
    return getBaseClick() * calculateMultiplier();
  }

  function getSteadyMoneyPerSecond() {
    return getRawAuto() * calculateMultiplier();
  }

  function getMoneyPerSecond() {
    return (getRawAuto() + getRawTimedAverage()) * calculateMultiplier();
  }

  function processTimedProduction() {
    let earned = 0;
    Object.keys(defaultUpgrades).forEach(function (id) {
      const upgrade = defaultUpgrades[id];
      const level = state.upgrades[id] || 0;
      if (upgrade.type !== "burst" || level <= 0) {
        return;
      }

      state.timers[id] = (state.timers[id] || 0) + 1;
      if (state.timers[id] >= upgrade.interval) {
        state.timers[id] = 0;
        const amount = level * upgrade.effect * calculateMultiplier();
        earned += amount;
        showFloatingText("+" + RESOURCE_ICON + formatNumber(amount), elements.clickZone);
        showNotification("🔬 Investigación completada", "+" + RESOURCE_ICON + formatNumber(amount) + " se añadieron al clúster.");
        playSound("buy");
      }
    });
    return earned;
  }

  function getPrestigeMultiplier() {
    return 1 + state.prestige * 0.1;
  }

  function getUpgradeCost(upgradeId) {
    const upgrade = defaultUpgrades[upgradeId];
    const level = state.upgrades[upgradeId] || 0;
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
  }

  function getUpgradeValue(upgrade) {
    const level = state.upgrades[upgrade.id] || 0;
    if (upgrade.type === "click") {
      return level * upgrade.effect;
    }
    if (upgrade.type === "multiplier") {
      return Math.round(level * upgrade.effect * 100);
    }
    return level * upgrade.effect;
  }

  function isUpgradeUnlocked(upgrade) {
    return state.totalEarned >= upgrade.unlockAt || state.money >= upgrade.unlockAt;
  }

  function renderAll() {
    renderHero();
    renderUpgrades();
    renderPrestige();
    renderAchievements();
    renderStats();
    applySettings();
  }

  function renderHero() {
    const xpNeeded = getXpNeeded();
    const xpPercent = Math.min(100, (state.xp / xpNeeded) * 100);
    elements.moneyDisplay.textContent = "🧠 " + RESOURCE_ICON + formatNumber(state.money);
    elements.clickIncome.textContent = "+" + RESOURCE_ICON + formatNumber(getMoneyPerClick()) + " / click";
    elements.secondIncome.textContent = "+" + RESOURCE_ICON + formatNumber(getMoneyPerSecond()) + " / sec";
    elements.multiplierDisplay.textContent = "x" + formatMultiplier(calculateMultiplier());
    elements.levelDisplay.textContent = "Nivel " + state.level + " · " + getAIStage(state.level);
    elements.xpDisplay.textContent = formatNumber(state.xp) + "/" + formatNumber(xpNeeded) + " XP";
    elements.xpBar.style.width = xpPercent + "%";
  }

  function renderUpgrades() {
    const html = Object.keys(defaultUpgrades).map(function (id) {
      const upgrade = defaultUpgrades[id];
      const unlocked = isUpgradeUnlocked(upgrade);
      const level = state.upgrades[id] || 0;
      const cost = getUpgradeCost(id);
      const affordable = state.money >= cost;
      const currentValue = getUpgradeValue(upgrade);

      if (!unlocked) {
        return [
          '<article class="upgrade-card locked-card">',
          '<div class="upgrade-icon">🔒</div>',
          '<div class="upgrade-info">',
          '<div class="upgrade-title"><span>' + upgrade.name + '</span><span>BLOQUEADO</span></div>',
          '<p class="locked-text">Desbloquea al alcanzar ' + RESOURCE_ICON + formatNumber(upgrade.unlockAt) + '</p>',
          '</div>',
          '</article>'
        ].join("");
      }

      return [
        '<article class="upgrade-card ' + (affordable ? "affordable" : "") + '" id="upgrade-' + id + '">',
        '<div class="upgrade-icon">' + upgrade.icon + '</div>',
        '<div class="upgrade-info">',
        '<div class="upgrade-title"><span>' + upgrade.name + '</span><span>NIVEL ' + level + '</span></div>',
        '<p class="upgrade-description">' + getUpgradeDescription(upgrade) + '</p>',
        '<div class="upgrade-cost">' + RESOURCE_ICON + formatNumber(cost) + '</div>',
        '</div>',
        '<button class="buy-button" type="button" data-upgrade="' + id + '" ' + (affordable ? "" : "disabled") + '>COMPRAR</button>',
        '</article>'
      ].join("");
    }).join("");

    elements.upgradesList.innerHTML = html;
  }

  function getUpgradeDescription(upgrade) {
    const level = state.upgrades[upgrade.id] || 0;
    const nextValue = upgrade.type === "multiplier"
      ? Math.round((level + 1) * upgrade.effect * 100)
      : (level + 1) * upgrade.effect;
    return upgrade.description.replace("{value}", formatNumber(nextValue));
  }

  function renderPrestige() {
    const gained = calculatePrestige();
    const canPrestige = gained > 0;
    elements.prestigeDisplay.textContent = formatNumber(state.prestige);
    elements.prestigeBonusDisplay.textContent = "+" + Math.round((getPrestigeMultiplier() - 1) * 100) + "%";
    elements.prestigeButton.disabled = !canPrestige;
    elements.prestigeRequirement.textContent = canPrestige
      ? "Obtendrás +" + gained + " puntos de generación."
      : "Disponible desde " + RESOURCE_ICON + "1M de cómputo generado en total.";
  }

  function renderAchievements() {
    elements.achievementList.innerHTML = achievements.map(function (achievement) {
      const unlocked = state.achievements.indexOf(achievement.id) !== -1;
      return [
        '<article class="achievement ' + (unlocked ? "" : "locked") + '">',
        '<span>' + (unlocked ? achievement.icon : "🔒") + '</span>',
        '<div><strong>' + achievement.title + '</strong><p>' + achievement.text + '</p></div>',
        '</article>'
      ].join("");
    }).join("");
  }

  function renderStats() {
    const stats = [
      ["Ciclos manuales", formatNumber(state.clicks)],
      ["Cómputo total generado", RESOURCE_ICON + formatNumber(state.totalEarned)],
      ["Cómputo actual", RESOURCE_ICON + formatNumber(state.money)],
      ["Cómputo por click", RESOURCE_ICON + formatNumber(getMoneyPerClick())],
      ["Cómputo por segundo", RESOURCE_ICON + formatNumber(getMoneyPerSecond())],
      ["Nivel", formatNumber(state.level)],
      ["Generaciones", formatNumber(state.prestige)]
    ];

    elements.statsList.innerHTML = stats.map(function (row) {
      return "<dt>" + row[0] + "</dt><dd>" + row[1] + "</dd>";
    }).join("");
  }

  function checkProgressRewards() {
    achievements.forEach(function (achievement) {
      if (achievement.check()) {
        unlockAchievement(achievement.id);
      }
    });

    milestones.forEach(function (milestone) {
      if (state.totalEarned >= milestone.amount && state.milestones.indexOf(milestone.amount) === -1) {
        state.milestones.push(milestone.amount);
        playSound("achievement");
        showNotification(milestone.title, milestone.body);
      }
    });
  }

  function openPrestigeModal() {
    const gained = calculatePrestige();
    if (gained <= 0) {
      return;
    }
    elements.prestigeLossMoney.textContent = "❌ " + RESOURCE_ICON + formatNumber(state.money);
    elements.prestigeGainPoints.textContent = "🧬 +" + gained + " Puntos de Generación";
    elements.prestigeGainBonus.textContent = "🔥 +" + (gained * 10) + "% potencia permanente";
    openModal(elements.prestigeModal);
  }

  function doPrestige() {
    const gained = calculatePrestige();
    if (gained <= 0) {
      return;
    }
    const previousPrestige = state.prestige;
    const currentSettings = state.settings;
    const currentAchievements = state.achievements.slice();
    const currentMilestones = state.milestones.slice();
    state = createNewState();
    state.prestige = previousPrestige + gained;
    state.achievements = currentAchievements;
    state.milestones = currentMilestones;
    state.settings = currentSettings;
    closeModal(elements.prestigeModal);
    elements.app.classList.remove("prestige-flash");
    void elements.app.offsetWidth;
    elements.app.classList.add("prestige-flash");
    unlockAchievement("rebirth");
    playSound("prestige");
    showNotification("🧬 ¡NUEVA GENERACIÓN!", "Has ganado +" + gained + " puntos de generación.");
    renderAll();
    saveGame();
  }

  function animateButton() {
    if (!state.settings.animations) {
      return;
    }
    elements.moneyButton.classList.remove("pressed");
    void elements.moneyButton.offsetWidth;
    elements.moneyButton.classList.add("pressed");
    window.setTimeout(function () {
      elements.moneyButton.classList.remove("pressed");
    }, 110);
  }

  function createParticles() {
    if (!state.settings.animations) {
      return;
    }
    for (let i = 0; i < 9; i += 1) {
      const particle = document.createElement("span");
      const angle = (Math.PI * 2 * i) / 9;
      const distance = 46 + Math.random() * 34;
      particle.className = "particle";
      particle.style.setProperty("--x", Math.cos(angle) * distance + "px");
      particle.style.setProperty("--y", Math.sin(angle) * distance + "px");
      elements.clickZone.appendChild(particle);
      window.setTimeout(function () {
        particle.remove();
      }, 580);
    }
  }

  function markUpgradeBought(upgradeId) {
    if (!state.settings.animations) {
      return;
    }
    window.requestAnimationFrame(function () {
      const card = document.getElementById("upgrade-" + upgradeId);
      if (!card) {
        return;
      }
      card.classList.add("bought");
      window.setTimeout(function () {
        card.classList.remove("bought");
      }, 380);
    });
  }

  function applySettings() {
    elements.soundToggle.textContent = state.settings.sound ? "ON" : "OFF";
    elements.soundToggle.classList.toggle("off", !state.settings.sound);
    elements.animationsToggle.textContent = state.settings.animations ? "ON" : "OFF";
    elements.animationsToggle.classList.toggle("off", !state.settings.animations);
    document.body.classList.toggle("animations-off", !state.settings.animations);
  }

  function playSound(type) {
    if (!state.settings.sound || !window.AudioContext && !window.webkitAudioContext) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    const presets = {
      click: { frequency: 470, duration: 0.045, wave: "square", gain: 0.035 },
      buy: { frequency: 720, duration: 0.07, wave: "triangle", gain: 0.045 },
      level: { frequency: 940, duration: 0.12, wave: "sine", gain: 0.06 },
      achievement: { frequency: 820, duration: 0.14, wave: "triangle", gain: 0.06 },
      prestige: { frequency: 520, duration: 0.22, wave: "sawtooth", gain: 0.055 }
    };
    const preset = presets[type] || presets.click;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = preset.wave;
    oscillator.frequency.setValueAtTime(preset.frequency, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(preset.frequency * 1.35, audioContext.currentTime + preset.duration);
    gain.gain.setValueAtTime(preset.gain, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + preset.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + preset.duration);
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
  }

  function formatMultiplier(value) {
    return value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
  }

  function getAIStage(level) {
    if (level >= 50) {
      return "Superinteligencia";
    }
    if (level >= 35) {
      return "IA autónoma";
    }
    if (level >= 24) {
      return "IA multimodal";
    }
    if (level >= 14) {
      return "IA avanzada";
    }
    if (level >= 6) {
      return "IA entrenada";
    }
    return "IA básica";
  }

  function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return hours + "h " + minutes + "min";
    }
    return minutes + "min";
  }

  function mergeState(base, saved) {
    const merged = Object.assign(base, saved);
    merged.settings = Object.assign(base.settings, saved.settings || {});
    merged.upgrades = Object.assign(base.upgrades, saved.upgrades || {});
    merged.timers = Object.assign(base.timers, saved.timers || {});
    merged.achievements = Array.isArray(saved.achievements) ? saved.achievements : [];
    merged.milestones = Array.isArray(saved.milestones) ? saved.milestones : [];
    return merged;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
