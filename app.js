/* ============================================================
   Air&Bits — APP.JS (PARTE 1/6)
   Variables globales, audio, vibración, usuarios, ajustes, CSV
   ============================================================ */

/* ----------------- VARIABLES GLOBALES ----------------- */

let questions = [];
let filteredQuestions = [];

let mode = null;
let currentIndex = 0;

let studySettings = { reviewRandom: true, examBalanced: true, examCount: 40 };

let reviewQueue = [];
let reviewCurrent = null;

let flashQueue = [];
let flashCurrent = null;
let flashRevealed = false;


let examQuestions = [];

let companyExamQuestions = [];
let companyExamIndex = 0;
let companyExamStartTime = null;
let companyExamTimerInterval = null;

let examIndex = 0;
let examStartTime = null;
let examTimerInterval = null;

let fastWeights = {};
let fastQueue = [];
let fastCurrent = null;

let swipeQueue = [];
let swipeCurrent = null;

let currentLanguage = "es";

/* ----------------- AUDIO ----------------- */

let audioClick = null;
let audioCorrect = null;
let audioWrong = null;

function initAudio() {
    audioClick = new Audio("sounds/click.mp3");
    audioCorrect = new Audio("sounds/correct.mp3");
    audioWrong = new Audio("sounds/wrong.mp3");
}

function playClick() {
    if (appSettings.soundsEnabled) audioClick.play();
}

function playCorrect() {
    if (appSettings.soundsEnabled) audioCorrect.play();
}

function playWrong() {
    if (appSettings.soundsEnabled) audioWrong.play();
}

/* ----------------- VIBRACIÓN ----------------- */

function vibrate(type) {
    if (!appSettings.vibrationEnabled) return;

    if (navigator.vibrate) {
        if (type === "correct") navigator.vibrate(40);
        if (type === "wrong") navigator.vibrate([60, 40, 60]);
    }
}

/* ----------------- USUARIOS ----------------- */

function loadUserData() {
    const raw = localStorage.getItem("airbits_users");
    if (!raw) {
        const base = { currentUserId: null, users: {} };
        localStorage.setItem("airbits_users", JSON.stringify(base));
        return base;
    }
    return JSON.parse(raw);
}

function saveUserData(data) {
    localStorage.setItem("airbits_users", JSON.stringify(data));
}

function createUser(name) {
    const data = loadUserData();
    const id = "u" + Date.now();

    data.users[id] = {
        name,
        dailyTarget: 30,
        dailyProgress: 0,
        dailyDate: null,
        stats: {}
    };

    data.currentUserId = id;
    saveUserData(data);
    updateCurrentUserInfo();
}

function setCurrentUser(id) {
    const data = loadUserData();
    data.currentUserId = id;
    saveUserData(data);
    updateCurrentUserInfo();
}

function deleteUser(id) {
    const data = loadUserData();
    delete data.users[id];
    if (data.currentUserId === id) data.currentUserId = null;
    saveUserData(data);
    updateCurrentUserInfo();
}

function getCurrentUser() {
    const data = loadUserData();
    if (!data.currentUserId) return null;
    return data.users[data.currentUserId];
}

function updateCurrentUserInfo() {
    const user = getCurrentUser();
    const el = document.getElementById("currentUserInfo");
    if (!el) return;

    if (!user) el.textContent = "Usuario: (ninguno)";
    else el.textContent = "Usuario: " + user.name;
}

/* ----------------- AJUSTES ----------------- */

let appSettings = {
    language: "es",
    soundsEnabled: true,
    vibrationEnabled: true,
    visualTheme: "airbus"
};

function loadStudySettings() {
    const raw = localStorage.getItem("airbits_studysettings");
    if (raw) {
        try {
            const obj = JSON.parse(raw);
            studySettings = { ...studySettings, ...obj };
        } catch (e) {}
    }
}

function saveStudySettings() {
    localStorage.setItem("airbits_studysettings", JSON.stringify(studySettings));
}

function loadAppSettings() {
    const raw = localStorage.getItem("airbits_settings");
    if (raw) appSettings = JSON.parse(raw);
}

function saveAppSettings() {
    localStorage.setItem("airbits_settings", JSON.stringify(appSettings));
}

/* ----------------- PESOS DEL MODO RÁPIDO ----------------- */

function loadFastWeights() {
    const raw = localStorage.getItem("airbits_fastweights");
    if (raw) fastWeights = JSON.parse(raw);
}

function saveFastWeights() {
    localStorage.setItem("airbits_fastweights", JSON.stringify(fastWeights));
}

/* ----------------- UTILIDADES ----------------- */

function getUserId() {
    const data = loadUserData();
    return data.currentUserId || null;
}

function getQKey(q) {
    return String(q.ID || q.Question || "");
}

function getUserStatsObject() {
    const data = loadUserData();
    const uid = data.currentUserId;
    if (!uid || !data.users[uid]) return null;
    if (!data.users[uid].stats) data.users[uid].stats = {};
    return { data, user: data.users[uid] };
}

function ensureQState(q) {
    const wrap = getUserStatsObject();
    if (!wrap) return null;
    const key = getQKey(q);
    if (!wrap.user.stats[key]) {
        wrap.user.stats[key] = { correct: 0, wrong: 0, srsLevel: 0, srsNext: 0, flagged: false, lastSeen: null };
        saveUserData(wrap.data);
    }
    return wrap.user.stats[key];
}

function getQState(q) {
    const wrap = getUserStatsObject();
    if (!wrap) return null;
    const key = getQKey(q);
    return wrap.user.stats[key] || null;
}

function setFlag(q, flagged) {
    const wrap = getUserStatsObject();
    if (!wrap) return;
    const s = ensureQState(q);
    s.flagged = !!flagged;
    saveUserData(wrap.data);
}

function isFlagged(q) {
    const s = getQState(q);
    return !!(s && s.flagged);
}

function syncQuestionRuntimeState(q) {
    const s = ensureQState(q);
    if (!s) return;
    q._wrongCount = s.wrong || 0;
    q._correctCount = s.correct || 0;
    q._srsLevel = s.srsLevel || 0;
    q._srsNext = s.srsNext || 0;
    q._flagged = !!s.flagged;
}


function shuffle(arr) {
    // Fisher–Yates (uniform)
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}



function saveLastSession(state) {
    try { localStorage.setItem("airbits_lastsession", JSON.stringify(state)); } catch(e) {}
}

function loadLastSession() {
    const raw = localStorage.getItem("airbits_lastsession");
    if (!raw) return null;
    try { return JSON.parse(raw); } catch(e) { return null; }
}

function clearLastSession() {
    localStorage.removeItem("airbits_lastsession");
}
/* ============================================================
   Air&Bits — APP.JS (PARTE 2/6)
   Banco de preguntas, filtros, menú principal
   ============================================================ */

/* ----------------- BANCO DE PREGUNTAS ----------------- */

function showQuestionBankSettings() {
    document.getElementById("app").innerHTML = `
        <div class="card">
            <h2>📚 Banco de preguntas</h2>

            <div class="setting-group">
                <h4>Importar banco CSV</h4>
                <p>Selecciona un archivo CSV con tu banco de preguntas.</p>
                <input type="file" id="csvInput" accept=".csv" onchange="handleCSVImport(event)">
            </div>

            <div class="setting-group">
                <h4>Estado del banco</h4>
                <p>Preguntas cargadas: <strong>${questions.length}</strong></p>
            </div>

            <div class="setting-group">
                <h4>Limpiar banco</h4>
                <button class="danger" onclick="clearQuestionBank()">🗑 Limpiar banco</button>
            </div>

            <button class="btn-secondary" onclick="playClick(); showSettings()">⬅️ Volver</button>
        </div>
    `;
}

function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        const text = e.target.result;
        const parsed = parseCSV(text);

        if (!parsed.length) {
            alert("El archivo CSV no contiene preguntas válidas.");
            return;
        }

        questions = parsed;
        // Sincronizar estado persistente del usuario (fallos, SRS, flags)
        questions.forEach(q => syncQuestionRuntimeState(q));
        filteredQuestions = [...questions];

        // Reanudar sesión si existe
        const last = loadLastSession();
        if (last && last.bankSignature && last.bankSignature === String(questions.length)) {
            const ok = confirm(`¿Continuar donde lo dejaste?
Modo: ${last.mode}`);
            if (ok) {
                // Restaurar filtros básicos
                if (last.filteredIds && last.filteredIds.length) {
                    const idSet = new Set(last.filteredIds.map(String));
                    filteredQuestions = questions.filter(q => idSet.has(String(q.ID)));
                }
                mode = last.mode;
                if (mode === "review") {
                    studySettings.reviewRandom = !!last.reviewRandom;
                    saveStudySettings();
                    if (studySettings.reviewRandom) {
                        reviewQueue = filteredQuestions.filter(q => String(q.ID) !== String(last.currentId));
                        shuffle(reviewQueue);
                        reviewCurrent = questions.find(q => String(q.ID) === String(last.currentId)) || null;
                        showQuestion();
                    } else {
                        currentIndex = Math.max(0, filteredQuestions.findIndex(q => String(q.ID) === String(last.currentId)));
                        showQuestion();
                    }
                    showQuestionBankSettings();
                    return;
                }
                if (mode === "flash") {
                    flashQueue = filteredQuestions.filter(q => String(q.ID) !== String(last.currentId));
                    shuffle(flashQueue);
                    flashCurrent = questions.find(q => String(q.ID) === String(last.currentId)) || null;
                    flashRevealed = false;
                    showFlashcard();
                    showQuestionBankSettings();
                    return;
                }
            }
        }
        // Si no se reanuda, sigue normal
        clearLastSession();

        // Validación rápida del banco
        const missingCorrect = questions.filter(q => !(q.CorrectAnswer || q.Correct || "").trim()).length;
        const missingOpts = questions.filter(q => !q.OptionA || !q.OptionB || !q.OptionC || !q.OptionD).length;
        const total = questions.length;

        alert(
            "Banco importado ✅\n\n" +
            `Total: ${total}\n` +
            `Sin CorrectAnswer: ${missingCorrect}\n` +
            `Con opciones incompletas: ${missingOpts}`
        );



        showQuestionBankSettings();
    };

    reader.readAsText(file);
}

function clearQuestionBank() {
    const ok = confirm("¿Seguro que quieres borrar todas las preguntas?");
    if (!ok) return;

    questions = [];
    filteredQuestions = [];

    alert("Banco de preguntas limpiado.");
    showQuestionBankSettings();
}

/* ----------------- FILTROS ----------------- */

function uniqueOptions(arr) {
    const set = new Set(arr.filter(x => x && x.trim() !== ""));
    return Array.from(set).sort();
}

function applyFilters() {
    const cat = document.getElementById("filterCategory").value;
    const ac = document.getElementById("filterAircraft").value;
    const sys = document.getElementById("filterSystem").value;
    const diff = document.getElementById("filterDifficulty").value;

    const search = (document.getElementById("filterSearch")?.value || "").trim().toLowerCase();
    studySettings.reviewRandom = (document.getElementById("filterReviewRandom")?.value || "1") === "1";
    studySettings.examBalanced = (document.getElementById("filterExamBalanced")?.value || "1") === "1";
    studySettings.examCount = parseInt(document.getElementById("filterExamCount")?.value || "40", 10);


    filteredQuestions = questions.filter(q => {
        if (cat && q.Category !== cat) return false;
        if (ac && q.Aircraft !== ac) return false;
        if (sys && q.System !== sys) return false;
        if (diff && q.Difficulty !== diff) return false;
        if (search) {
            const blob = (q.Question + ' ' + q.OptionA + ' ' + q.OptionB + ' ' + q.OptionC + ' ' + q.OptionD).toLowerCase();
            if (!blob.includes(search)) return false;
        }
        return true;
    });

    updateFilterInfo();
}

function updateFilterInfo() {
    const el = document.getElementById("filterInfo");
    if (!el) return;

    const total = questions.length;
    const filtered = filteredQuestions.length || total;

    el.textContent = `Preguntas filtradas: ${filtered} / ${total}`;
}

/* ----------------- MENÚ PRINCIPAL ----------------- */

function showMenu() {
    mode = "menu";

    if (!questions.length) {
        document.getElementById("app").innerHTML = `
            <div class="card">
                <h2>No hay preguntas cargadas</h2>
                <p>Ve a Ajustes → Banco de preguntas para importar un CSV.</p>
            </div>
        `;
        return;
    }

    const categories = uniqueOptions(questions.map(q => q.Category));
    const aircrafts = uniqueOptions(questions.map(q => q.Aircraft));
    const systems = uniqueOptions(questions.map(q => q.System));
    const difficulties = uniqueOptions(questions.map(q => q.Difficulty));

    document.getElementById("app").innerHTML = `
        <div class="card filter-panel">
            <details class="filters-drop" open>
                <summary class="filters-summary">Filtros</summary>

            <h2>Filtros</h2>

            <div class="filter-grid">

                <div class="filter-item">
                    <label>Buscar texto</label>
                    <input type="text" id="filterSearch" placeholder="Ej: RAT, PTU, VLO..." />
                </div>

                <div class="filter-item">
                    <label>Repaso aleatorio</label>
                    <select id="filterReviewRandom">
                        <option value="1" selected>Sí</option>
                        <option value="0">No</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label>Examen balanceado por sistema</label>
                    <select id="filterExamBalanced">
                        <option value="1" selected>Sí</option>
                        <option value="0">No</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label>Nº preguntas examen</label>
                    <select id="filterExamCount">
                        <option value="20">20</option>
                        <option value="40" selected>40</option>
                        <option value="60">60</option>
                        <option value="80">80</option>
                    </select>
                </div>



                <div class="filter-item">
                    <label>Categoría</label>
                    <select id="filterCategory">
                        <option value="">Todas</option>
                        ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
                    </select>
                </div>

                <div class="filter-item">
                    <label>Aeronave</label>
                    <select id="filterAircraft">
                        <option value="">Todas</option>
                        ${aircrafts.map(c => `<option value="${c}">${c}</option>`).join("")}
                    </select>
                </div>

                <div class="filter-item">
                    <label>Sistema</label>
                    <select id="filterSystem">
                        <option value="">Todos</option>
                        ${systems.map(c => `<option value="${c}">${c}</option>`).join("")}
                    </select>
                </div>

                <div class="filter-item">
                    <label>Dificultad</label>
                    <select id="filterDifficulty">
                        <option value="">Todas</option>
                        ${difficulties.map(c => `<option value="${c}">${c}</option>`).join("")}
                    </select>
                </div>

            </div>

            <button class="btn-primary" onclick="playClick(); applyFilters()">Aplicar filtros</button>
            <div class="info" id="filterInfo"></div>
        </div>

        <div class="card modes-grid">

            ${createModeCard("📘", "Repaso", "Recorre todas las preguntas filtradas", "startReviewMode")}
            ${createModeCard("🃏", "Flashcards", "Mostrar respuesta + autoevaluación", "startFlashcardMode")}
            ${createModeCard("📝", "Examen", "Examen configurable balanceado", "startExamMode")}
            ${createModeCard("🏢", "Compañía", "Sin feedback hasta el final", "startCompanyExamMode")}
            ${createModeCard("❌", "Falladas", "Solo tus errores", "startFailedMode")}
            ${createModeCard("🚩", "Marcadas", "Solo preguntas con flag", "startMarkedMode")}
            ${createModeCard("🧠", "Inteligente", "Orden adaptativo según tu rendimiento", "startSmartMode")}
            ${createModeCard("⚡", "Rápido", "Flashcards con repetición de fallos", "startFastMode")}
            ${createModeCard("👆", "Swipe", "Desliza para marcar si la sabías", "startSwipeMode")}
            ${createModeCard("🔀", "Híbrido", "Nuevas + falladas + refuerzo", "startHybridMode")}
            ${createModeCard("🧠", "SRS", "Repetición espaciada real", "startSrsMode")}
            ${createModeCard("🛠", "Por sistema", "Entrena un sistema concreto", "startSystemDrillMode")}
            ${createModeCard("🩻", "Debilidades", "Tu mapa de puntos débiles", "showWeaknessAnalysis")}
            ${createModeCard("📊", "Estadísticas", "Tu progreso global", "showDashboard")}

        </div>
    `;

    updateFilterInfo();
}

/* ============================================================
   Air&Bits — APP.JS (PARTE 3/6)
   Modos de estudio: repaso, examen, falladas, inteligente,
   rápido, swipe, híbrido, SRS, drill por sistema
   ============================================================ */

/* ----------------- COMPONENTES VISUALES ----------------- */

function createModeCard(icon, title, desc, action) {
    return `
        <div class="mode-card" onclick="playClick(); ${action}()">
            <div class="mode-icon">${icon}</div>
            <div class="mode-title">${title}</div>
            <div class="mode-desc">${desc}</div>
        </div>
    `;
}

function createOption(letter, text) {
    return `
        <button onclick="playClick(); checkAnswer('${letter}')">
            <span class="opt-letter">${letter}</span>
            <span>${text}</span>
        </button>
    `;
}

/* ----------------- MOSTRAR PREGUNTA ----------------- */

function nextReviewQuestion() {
    if (!reviewQueue.length) {
        alert("Has completado el repaso.");
        showMenu();
        return;
    }
    reviewCurrent = reviewQueue.pop();
    showQuestion();
}

function showQuestion() {
    const q = (mode === "review" && studySettings.reviewRandom) ? reviewCurrent : filteredQuestions[currentIndex];
    if (!q) {
        showMenu();
        return;
    }

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">${q.Category || ""} • ${q.Aircraft || ""} • ${q.System || ""} ${q._flagged ? " <span style=\"color:#d32f2f;font-weight:700;\">🚩 MARCADA</span>" : ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <div class="options" style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar / Desmarcar</button>
                <button class="btn-secondary" onclick="playClick(); skipQuestion()">⏭️ Saltar</button>
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;

    snapshotSession();
}

/* ----------------- MODO REPASO ----------------- */

function startReviewMode() {
    if (!filteredQuestions.length) {
        alert("No hay preguntas filtradas.");
        return;
    }

    mode = "review";
    currentIndex = 0;

    if (studySettings.reviewRandom) {
        reviewQueue = [...filteredQuestions];
        shuffle(reviewQueue);
        reviewCurrent = null;
        nextReviewQuestion();
    } else {
        reviewQueue = [];
        reviewCurrent = null;
        showQuestion();
    }
}

/* ----------------- MODO FLASHCARDS ----------------- */

function startFlashcardMode() {
    if (!filteredQuestions.length) {
        alert("No hay preguntas filtradas.");
        return;
    }
    mode = "flash";
    flashQueue = [...filteredQuestions];
    shuffle(flashQueue);
    nextFlashcard();
}

function nextFlashcard() {
    if (!flashQueue.length) {
        alert("Flashcards completadas.");
        showMenu();
        return;
    }
    flashCurrent = flashQueue.pop();
    flashRevealed = false;
    showFlashcard();
}

function showFlashcard() {
    const q = flashCurrent;
    if (!q) return showMenu();

    document.getElementById("app").innerHTML = `
        <div class="card question-card">
            <div class="q-meta">${q.Category || ""} • ${q.Aircraft || ""} • ${q.System || ""}</div>
            <div class="question-text">${q.Question}</div>

            <div class="options modern-options" style="display:${flashRevealed ? "block" : "none"};">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
                <button class="btn-primary" onclick="playClick(); revealFlashcard()">👁️ Mostrar respuesta</button>
                <button class="btn-secondary" onclick="playClick(); gradeFlashcard(true)">👍 La sabía</button>
                <button class="btn-secondary" onclick="playClick(); gradeFlashcard(false)">👎 No la sabía</button>
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar</button>
                <button class="btn-secondary" onclick="playClick(); nextFlashcard()">⏭️ Siguiente</button>
                <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
            </div>
        </div>
    `;

    snapshotSession();
}

function revealFlashcard() {
    flashRevealed = true;
    showFlashcard();
    const q = flashCurrent;
    const correct = (q.CorrectAnswer || q.Correct || "").trim().toUpperCase();
    try { highlightCorrectOption(correct); } catch(e) {}
}

function gradeFlashcard(knewIt) {
    const q = flashCurrent;
    if (!q) return;
    if (!knewIt) {
        q._wrongCount = (q._wrongCount || 0) + 1;
        updateStats(q, false);
        updateSrs(q, false);
    } else {
        updateStats(q, true);
        updateSrs(q, true);
    }
    nextFlashcard();
}

/* ----------------- MODO COMPAÑÍA (SIN FEEDBACK) ----------------- */

function startCompanyExamMode() {
    const n = studySettings.examCount || 40;

    if (filteredQuestions.length < n) {
        alert(`Necesitas al menos ${n} preguntas filtradas.`);
        return;
    }

    mode = "company";
    companyExamQuestions = (studySettings.examBalanced)
        ? buildBalancedExam(filteredQuestions, n)
        : shuffle([...filteredQuestions]).slice(0, n);

    companyExamQuestions.forEach(q => { q._companyAnswer = null; q._correct = false; });

    companyExamIndex = 0;
    companyExamStartTime = Date.now();

    startCompanyExamTimer();
    showCompanyExamQuestion();
}

function startCompanyExamTimer() {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;

    clearInterval(companyExamTimerInterval);
    companyExamTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - companyExamStartTime) / 1000);
        const min = Math.floor(elapsed / 60);
        const sec = elapsed % 60;
        timerEl.textContent = `${min}:${sec.toString().padStart(2, "0")}`;
    }, 1000);
}

function showCompanyExamQuestion() {
    const q = companyExamQuestions[companyExamIndex];
    if (!q) return finishCompanyExam();

    document.getElementById("app").innerHTML = `
        <div class="card question-card">
            <div class="q-meta">Compañía • Pregunta ${companyExamIndex + 1} / ${companyExamQuestions.length} ${q._flagged ? " <span style=\"color:#d32f2f;font-weight:700;\">🚩 MARCADA</span>" : ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                <button onclick="playClick(); companySelect('A')"><span class="opt-letter">A</span><span>${q.OptionA}</span></button>
                <button onclick="playClick(); companySelect('B')"><span class="opt-letter">B</span><span>${q.OptionB}</span></button>
                <button onclick="playClick(); companySelect('C')"><span class="opt-letter">C</span><span>${q.OptionC}</span></button>
                <button onclick="playClick(); companySelect('D')"><span class="opt-letter">D</span><span>${q.OptionD}</span></button>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar / Desmarcar</button>
                <button class="btn-secondary" onclick="playClick(); companySkip()">⏭️ Saltar</button>
            </div>
        </div>
    `;

    snapshotSession();
}

function companySelect(letter) {
    const q = companyExamQuestions[companyExamIndex];
    if (!q) return;

    q._companyAnswer = letter;

    // Guardar stats solo al final (simula examen real), pero sí guardamos lastSeen
    updateStats(q, true); // cuenta intento diario (sin sumar correct/wrong aquí de forma estricta)
    // Revertir el incremento para no contaminar stats: dejamos solo lastSeen/daily progress
    const wrap = getUserStatsObject();
    if (wrap) {
        const key = getQKey(q);
        if (wrap.user.stats[key]) {
            wrap.user.stats[key].correct = wrap.user.stats[key].correct || 0;
            wrap.user.stats[key].wrong = wrap.user.stats[key].wrong || 0;
            saveUserData(wrap.data);
        }
    }

    companyExamIndex++;
    showCompanyExamQuestion();
}

function companySkip() {
    companyExamIndex++;
    showCompanyExamQuestion();
}

function finishCompanyExam() {
    clearInterval(companyExamTimerInterval);

    // Corrección
    companyExamQuestions.forEach(q => {
        const correct = (q.CorrectAnswer || q.Correct || "").trim().toUpperCase();
        q._correct = q._companyAnswer && q._companyAnswer === correct;

        // Actualizar stats reales ahora
        if (q._companyAnswer) {
            updateStats(q, q._correct);
            updateSrs(q, q._correct);
        }
    });

    const correctN = companyExamQuestions.filter(q => q._correct).length;
    const total = companyExamQuestions.length;
    const percent = Math.round((correctN / total) * 100);

    const wrongQs = companyExamQuestions.filter(q => !q._correct);

    document.getElementById("app").innerHTML = `
        <div class="card exam-result">
            <h2>🏢 Examen Compañía finalizado</h2>
            <div class="result-number">${percent}%</div>

            <div class="result-details">
                <p><strong>Correctas:</strong> ${correctN} / ${total}</p>
                <p><strong>Falladas:</strong> ${total - correctN}</p>
            </div>

            <div style="margin-top:16px; text-align:left;">
                <h3 style="margin-bottom:8px;">Revisar fallos</h3>
                ${wrongQs.length ? wrongQs.map((q, i) => `
                    <div style="padding:10px; border:1px solid rgba(0,0,0,0.1); border-radius:10px; margin-bottom:10px;">
                        <div style="font-size:13px; opacity:0.7;">${q.System || "Otros"} • ID ${q.ID}</div>
                        <div style="margin:6px 0; font-weight:600;">${q.Question}</div>
                        <div style="font-size:14px; margin:6px 0;">
                            <strong>Tu respuesta:</strong> ${q._companyAnswer || "(sin responder)"} • 
                            <strong>Correcta:</strong> ${(q.CorrectAnswer || q.Correct || "").trim().toUpperCase()}
                        </div>
                        <button class="btn-secondary" onclick="playClick(); reviewCompanyWrong(${i})">Revisar</button>
                    </div>
                `).join("") : "<p>✅ No hay fallos.</p>"}
            </div>

            <button class="btn-primary" onclick="playClick(); showMenu()">Volver al menú</button>
        </div>
    `;

    clearLastSession();
}

function reviewCompanyWrong(i) {
    const wrongQs = companyExamQuestions.filter(q => !q._correct);
    const q = wrongQs[i];
    if (!q) return showMenu();

    mode = "review";
    studySettings.reviewRandom = false;
    saveStudySettings();

    filteredQuestions = wrongQs;
    currentIndex = i;
    showQuestion();
}

/* ----------------- MODO EXAMEN ----------------- */

function buildBalancedExam(pool, n) {
    const groups = {};
    pool.forEach(q => {
        const k = (q.System || "Otros").trim() || "Otros";
        if (!groups[k]) groups[k] = [];
        groups[k].push(q);
    });

    const systems = Object.keys(groups);
    systems.forEach(s => shuffle(groups[s]));

    const result = [];
    while (result.length < n) {
        let added = false;
        for (const s of systems) {
            if (result.length >= n) break;
            if (groups[s].length) {
                result.push(groups[s].pop());
                added = true;
            }
        }
        if (!added) break;
    }

    if (result.length < n) {
        const remaining = [];
        systems.forEach(s => remaining.push(...groups[s]));
        shuffle(remaining);
        result.push(...remaining.slice(0, n - result.length));
    }
    return result.slice(0, n);
}

function startExamMode() {
    const n = studySettings.examCount || 40;

    if (filteredQuestions.length < n) {
        alert(`Necesitas al menos ${n} preguntas filtradas.`);
        return;
    }

    mode = "exam";
    if (studySettings.examBalanced) {
        examQuestions = buildBalancedExam(filteredQuestions, studySettings.examCount || 40);
    } else {
        examQuestions = shuffle([...filteredQuestions]).slice(0, studySettings.examCount || 40);
    }
    examIndex = 0;
    examStartTime = Date.now();

    startExamTimer();
    showExamQuestion();
}

function startExamTimer() {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;

    examTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - examStartTime) / 1000);
        const min = Math.floor(elapsed / 60);
        const sec = elapsed % 60;
        timerEl.textContent = `${min}:${sec.toString().padStart(2, "0")}`;
    }, 1000);
}

function showExamQuestion() {
    const q = examQuestions[examIndex];

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">Pregunta ${examIndex + 1} / ${examQuestions.length} ${q._flagged ? " <span style=\"color:#d32f2f;font-weight:700;\">🚩 MARCADA</span>" : ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <div class="options" style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar / Desmarcar</button>
                <button class="btn-secondary" onclick="playClick(); skipQuestion()">⏭️ Saltar</button>
            </div>
        </div>
    `;

    snapshotSession();
}

function finishExam() {
    clearInterval(examTimerInterval);

    const correct = examQuestions.filter(q => q._correct).length;
    const total = examQuestions.length;
    const percent = Math.round((correct / total) * 100);

    const wrongQs = examQuestions.filter(q => !q._correct);

    document.getElementById("app").innerHTML = `
        <div class="card exam-result">
            <h2>📝 Examen finalizado</h2>

            <div class="result-number">${percent}%</div>

            <div class="result-details">
                <p><strong>Correctas:</strong> ${correct} / ${total}</p>
                <p><strong>Falladas:</strong> ${total - correct}</p>
            </div>

            <div style="margin-top:16px; text-align:left;">
                <h3 style="margin-bottom:8px;">Revisar fallos</h3>
                ${wrongQs.length ? wrongQs.map((q, i) => `
                    <div style="padding:10px; border:1px solid rgba(0,0,0,0.1); border-radius:10px; margin-bottom:10px;">
                        <div style="font-size:13px; opacity:0.7;">${q.System || "Otros"} • ID ${q.ID}</div>
                        <div style="margin:6px 0; font-weight:600;">${q.Question}</div>
                        <button class="btn-secondary" onclick="playClick(); reviewSingleWrong(${i})">Revisar</button>
                    </div>
                `).join("") : "<p>✅ No hay fallos.</p>"}
            </div>

            <button class="btn-primary" onclick="playClick(); showMenu()">Volver al menú</button>
        </div>
    `;
}

function reviewSingleWrong(i) {
    const wrongQs = examQuestions.filter(q => !q._correct);
    const q = wrongQs[i];
    if (!q) return showMenu();

    // Revisión como repaso (no cuenta como examen)
    mode = "review";
    studySettings.reviewRandom = false;
    saveStudySettings();

    filteredQuestions = wrongQs;
    currentIndex = i;
    showQuestion();
}


/* ----------------- MODO FALLADAS ----------------- */

function startFailedMode() {
    const failed = filteredQuestions.filter(q => q._wrongCount > 0);

    if (!failed.length) {
        alert("No tienes preguntas falladas.");
        return;
    }

    filteredQuestions = failed;
    mode = "review";
    currentIndex = 0;
    showQuestion();
}

/* ----------------- MODO MARCADAS ----------------- */

function startMarkedMode() {
    const marked = filteredQuestions.filter(q => isFlagged(q));
    if (!marked.length) {
        alert("No tienes preguntas marcadas.");
        return;
    }
    filteredQuestions = marked;
    mode = "review";
    currentIndex = 0;

    if (studySettings.reviewRandom) {
        reviewQueue = [...filteredQuestions];
        shuffle(reviewQueue);
        reviewCurrent = null;
        nextReviewQuestion();
    } else {
        showQuestion();
    }
}

/* ----------------- MODO INTELIGENTE ----------------- */

function buildSmartSession(pool, n) {
    // Prioridad: SRS due > falladas > nuevas > resto
    const now = Date.now();
    const due = [];
    const wrong = [];
    const fresh = [];
    const rest = [];

    pool.forEach(q => {
        const s = getQState(q);
        const seen = s && (s.correct + s.wrong) > 0;
        const isDue = s && s.srsNext && now >= s.srsNext;
        const w = (s && s.wrong) || 0;

        if (isDue) due.push(q);
        else if (w > 0) wrong.push(q);
        else if (!seen) fresh.push(q);
        else rest.push(q);
    });

    shuffle(due);
    shuffle(wrong);
    shuffle(fresh);
    shuffle(rest);

    const result = [];
    const take = (arr, k) => { while (arr.length && result.length < n && k-- > 0) result.push(arr.pop()); };

    // mix típico: 40% due, 30% wrong, 20% fresh, 10% rest
    take(due, Math.ceil(n * 0.4));
    take(wrong, Math.ceil(n * 0.3));
    take(fresh, Math.ceil(n * 0.2));
    take(rest, n);

    // si aún falta, rellena con lo que quede
    const remaining = [...due, ...wrong, ...fresh, ...rest];
    shuffle(remaining);
    while (result.length < n && remaining.length) result.push(remaining.pop());

    return result.slice(0, n);
}

function startSmartMode() {
    if (!filteredQuestions.length) {
        alert("No hay preguntas filtradas.");
        return;
    }

    mode = "review";
    currentIndex = 0;

    // Tamaño de sesión inteligente
    const n = Math.min(30, filteredQuestions.length);
    const session = buildSmartSession(filteredQuestions, n);

    // Usamos cola aleatoria (sin repetir)
    studySettings.reviewRandom = true;
    saveStudySettings();

    reviewQueue = [...session];
    shuffle(reviewQueue);
    reviewCurrent = null;
    nextReviewQuestion();
}

/* ----------------- MODO RÁPIDO ----------------- */

function startFastMode() {
    if (!filteredQuestions.length) {
        alert("No hay preguntas filtradas.");
        return;
    }

    fastQueue = [...filteredQuestions];
    shuffle(fastQueue);

    mode = "fast";
    nextFastQuestion();
}

function nextFastQuestion() {
    if (!fastQueue.length) {
        alert("Modo rápido completado.");
        showMenu();
        return;
    }

    fastCurrent = fastQueue.pop();
    showFastQuestion();
}

function showFastQuestion() {
    const q = fastCurrent;

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System} ${q._flagged ? " <span style=\"color:#d32f2f;font-weight:700;\">🚩 MARCADA</span>" : ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <div class="options" style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar / Desmarcar</button>
                <button class="btn-secondary" onclick="playClick(); skipQuestion()">⏭️ Saltar</button>
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;

    snapshotSession();
}

/* ----------------- MODO SWIPE ----------------- */

function startSwipeMode() {
    swipeQueue = shuffle([...filteredQuestions]);
    mode = "swipe";
    nextSwipeQuestion();
}

function nextSwipeQuestion() {
    if (!swipeQueue.length) {
        alert("Modo Swipe completado.");
        showMenu();
        return;
    }

    swipeCurrent = swipeQueue.pop();
    showSwipeQuestion();
}

function showSwipeQuestion() {
    const q = swipeCurrent;

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                <button onclick="playClick(); swipeAnswer(true)">👍 La sabía</button>
                <button onclick="playClick(); swipeAnswer(false)">👎 No la sabía</button>
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;
}

function swipeAnswer(knewIt) {
    if (!knewIt) swipeCurrent._wrongCount = (swipeCurrent._wrongCount || 0) + 1;
    nextSwipeQuestion();
}

/* ----------------- MODO HÍBRIDO ----------------- */

function startHybridMode() {
    const wrong = filteredQuestions.filter(q => q._wrongCount > 0);
    const fresh = filteredQuestions.filter(q => !q._wrongCount);

    hybridQueue = shuffle([...wrong, ...fresh.slice(0, 20)]);

    mode = "hybrid";
    nextHybridQuestion();
}

function nextHybridQuestion() {
    if (!hybridQueue.length) {
        alert("Modo híbrido completado.");
        showMenu();
        return;
    }

    hybridCurrent = hybridQueue.pop();
    showHybridQuestion();
}

function showHybridQuestion() {
    const q = hybridCurrent;

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System} ${q._flagged ? " <span style=\"color:#d32f2f;font-weight:700;\">🚩 MARCADA</span>" : ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <div class="options" style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar / Desmarcar</button>
                <button class="btn-secondary" onclick="playClick(); skipQuestion()">⏭️ Saltar</button>
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;

    snapshotSession();
}

/* ----------------- MODO SRS ----------------- */

function startSrsMode() {
    const due = filteredQuestions.filter(q => {
        if (!q._srsNext) return true;
        return Date.now() >= q._srsNext;
    });

    if (!due.length) {
        alert("No tienes preguntas pendientes en SRS.");
        return;
    }

    srsQueue = shuffle(due);
    mode = "srs";
    nextSrsQuestion();
}

function nextSrsQuestion() {
    if (!srsQueue.length) {
        alert("Modo SRS completado.");
        showMenu();
        return;
    }

    srsCurrent = srsQueue.pop();
    showSrsQuestion();
}

function showSrsQuestion() {
    const q = srsCurrent;

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System} ${q._flagged ? " <span style=\"color:#d32f2f;font-weight:700;\">🚩 MARCADA</span>" : ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <div class="options" style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                <button class="btn-secondary" onclick="playClick(); toggleFlagCurrent()">🚩 Marcar / Desmarcar</button>
                <button class="btn-secondary" onclick="playClick(); skipQuestion()">⏭️ Saltar</button>
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;

    snapshotSession();
}

/* ----------------- MODO DRILL POR SISTEMA ----------------- */

function startSystemDrillMode() {
    const systems = uniqueOptions(questions.map(q => q.System));

    document.getElementById("app").innerHTML = `
        <div class="card">
            <h2>Entrenar por sistema</h2>

            <div class="filter-grid">

                <div class="filter-item">
                    <label>Buscar texto</label>
                    <input type="text" id="filterSearch" placeholder="Ej: RAT, PTU, VLO..." />
                </div>

                <div class="filter-item">
                    <label>Repaso aleatorio</label>
                    <select id="filterReviewRandom">
                        <option value="1" selected>Sí</option>
                        <option value="0">No</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label>Examen balanceado por sistema</label>
                    <select id="filterExamBalanced">
                        <option value="1" selected>Sí</option>
                        <option value="0">No</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label>Nº preguntas examen</label>
                    <select id="filterExamCount">
                        <option value="20">20</option>
                        <option value="40" selected>40</option>
                        <option value="60">60</option>
                        <option value="80">80</option>
                    </select>
                </div>


                ${systems.map(s => `
                    <button onclick="playClick(); startSystemDrill('${s}')">${s}</button>
                `).join("")}
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;
}

function startSystemDrill(system) {
    filteredQuestions = questions.filter(q => q.System === system);

    if (!filteredQuestions.length) {
        alert("No hay preguntas para este sistema.");
        return;
    }

    mode = "review";
    currentIndex = 0;
    showQuestion();
}

/* ============================================================
   Air&Bits — APP.JS (PARTE 4/6 REGENERADA)
   Corrección, feedback PRO, estadísticas, avance, SRS
   ============================================================ */

/* ----------------- PARSER CSV (ROBUSTO) ----------------- */
/*
  - Soporta comillas dobles, comas internas y saltos de línea dentro de campos.
  - Auto-detecta separador: "," o ";" (según la cabecera).
*/
function parseCSV(text) {
    // Normalizar saltos de línea sin regex literals
    const raw = String(text).split("\r\n").join("\n").split("\r").join("\n");

    const firstLine = raw.split("\n").find(l => l.trim() !== "") || "";

    // Detectar separador por cabecera (típico: Europa usa ';')
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount  = (firstLine.match(/;/g) || []).length;
    const sep = semiCount > commaCount ? ";" : ",";

    const rows = [];
    let current = [];
    let insideQuotes = false;
    let value = "";

    for (let i = 0; i < raw.length; i++) {
        const c = raw[i];
        const next = raw[i + 1];

        // Escapar comillas dobles dentro de comillas: "" -> "
        if (c === '"' && next === '"') {
            value += '"';
            i++;
            continue;
        }

        if (c === '"') {
            insideQuotes = !insideQuotes;
            continue;
        }

        if (c === sep && !insideQuotes) {
            current.push(value.trim());
            value = "";
            continue;
        }

        if (c === "\n" && !insideQuotes) {
            if (value.length > 0 || current.length > 0) {
                current.push(value.trim());
                rows.push(current);
            }
            current = [];
            value = "";
            continue;
        }

        value += c;
    }

    if (value.length > 0 || current.length > 0) {
        current.push(value.trim());
        rows.push(current);
    }

    if (!rows.length) return [];

    const headers = rows.shift().map(h => (h || "").trim());

    return rows
        .filter(r => r.some(cell => (cell || "").trim() !== ""))
        .map(r => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = (r[i] ?? "").toString().trim();
            });
            return obj;
        });
}

/* ----------------- FEEDBACK PRO + CORRECCIÓN ----------------- */

function checkAnswer(letter) {
    const q =
        mode === "exam" ? examQuestions[examIndex] :
        mode === "fast" ? fastCurrent :
        mode === "hybrid" ? hybridCurrent :
        mode === "srs" ? srsCurrent :
        filteredQuestions[currentIndex];

    // Leer respuesta correcta (CSV: CorrectAnswer). Fallback: Correct (banco antiguo).
    const correct = (q.CorrectAnswer || q.Correct || "").trim().toUpperCase();
    const isCorrect = letter === correct;

    // Bloquear botones (si existen)
    const buttons = document.querySelectorAll(".modern-options button");
    buttons.forEach(b => { try { b.disabled = true; } catch(e) {} });

    const feedback = document.getElementById("feedback");

    // Si no hay clave, avisar pero permitir avanzar (no bloquea la app)
    if (!correct || !["A","B","C","D"].includes(correct)) {
        if (feedback) {
            feedback.textContent = "⚠️ Esta pregunta no tiene CorrectAnswer válido en el CSV.";
            feedback.style.color = "#b26a00";
        }
        // Avanzar igual
        setTimeout(() => {
            try { nextQuestion(); } catch (e) { console.error(e); showMenu(); }
        }, 800);
        return;
    }

    try {
        if (isCorrect) {
            playCorrect();
            vibrate("correct");
            if (feedback) {
                feedback.textContent = "✔️ Correcto";
                feedback.style.color = "#2e7d32";
            }
            q._correct = true;
            updateStats(q, true);
            updateSrs(q, true);
        } else {
            playWrong();
            vibrate("wrong");
            if (feedback) {
                feedback.textContent = "❌ Incorrecto";
                feedback.style.color = "#c62828";
            }
            q._wrongCount = (q._wrongCount || 0) + 1;
            updateStats(q, false);
            updateSrs(q, false);
        }

        // Marcar opción correcta si podemos
        try { highlightCorrectOption(correct); } catch (e) { console.warn(e); }

    } catch (err) {
        console.error("checkAnswer error:", err);
        if (feedback) {
            feedback.textContent = "⚠️ Error interno. Avanzando…";
            feedback.style.color = "#b26a00";
        }
    }

    // Avanzar SIEMPRE (aunque haya error)
    setTimeout(() => {
        try { nextQuestion(); } catch (e) { console.error(e); showMenu(); }
    }, 1200);
}


function highlightCorrectOption(correctLetter) {
    const buttons = document.querySelectorAll(".modern-options button");

    buttons.forEach(btn => {
        const letter = btn.querySelector(".opt-letter")?.textContent;

        if (!letter) return;

        if (letter === correctLetter) {
            btn.classList.add("option-correct");
        } else {
            btn.classList.add("option-wrong");
        }
    });
}

function getCurrentQuestionObject() {
    return (
        mode === "exam" ? examQuestions[examIndex] :
        mode === "fast" ? fastCurrent :
        mode === "hybrid" ? hybridCurrent :
        mode === "srs" ? srsCurrent :
        mode === "swipe" ? swipeCurrent :
        mode === "flash" ? flashCurrent :
        mode === "company" ? companyExamQuestions[companyExamIndex] :
        filteredQuestions[currentIndex]
    );
}



function snapshotSession() {
    // Guarda el pool filtrado por IDs para poder reanudar
    const filteredIds = (filteredQuestions || []).map(q => String(q.ID));
    const q = getCurrentQuestionObject();
    const currentId = q ? String(q.ID) : null;

    saveLastSession({
        bankSignature: String(questions.length),
        mode: mode,
        currentId,
        filteredIds,
        reviewRandom: !!studySettings.reviewRandom
    });
}
function toggleFlagCurrent() {
    const q = getCurrentQuestionObject();
    if (!q) return;
    const now = !isFlagged(q);
    setFlag(q, now);
    q._flagged = now;
    alert(now ? "✅ Pregunta marcada" : "🚩 Marca quitada");
}

function skipQuestion() {
    try { nextQuestion(); } catch (e) { console.error(e); showMenu(); }
}

/* ----------------- AVANCE ENTRE PREGUNTAS ----------------- */

function nextQuestion() {
    if (mode === "review") {
        if (studySettings.reviewRandom) {
            nextReviewQuestion();
        } else {
            currentIndex++;
            if (currentIndex >= filteredQuestions.length) {
                alert("Has completado el repaso.");
                showMenu();
            } else {
                showQuestion();
            }
        }
        return;
    }

    if (mode === "exam") {
        examIndex++;
        if (examIndex >= examQuestions.length) {
            finishExam();
        } else {
            showExamQuestion();
        }
        return;
    }

    if (mode === "fast") {
        nextFastQuestion();
        return;
    }

    if (mode === "swipe") {
        nextSwipeQuestion();
        return;
    }

    if (mode === "hybrid") {
        nextHybridQuestion();
        return;
    }

    if (mode === "srs") {
        nextSrsQuestion();
        return;
    }
}

/* ----------------- ESTADÍSTICAS DEL USUARIO ----------------- */

function updateStats(q, correct) {
    const data = loadUserData();
    const user = getCurrentUser();
    if (!user) return;

    const key = q.ID || q.Question;

    if (!user.stats[key]) {
        user.stats[key] = { correct: 0, wrong: 0, srsLevel: 0, srsNext: 0, flagged: false, lastSeen: null };
    }

    if (correct) user.stats[key].correct++; else user.stats[key].wrong++;

    // Progreso diario
    const today = todayISO();
    if (user.dailyDate !== today) {
        user.dailyDate = today;
        user.dailyProgress = 0;
    }
    user.dailyProgress++;

    saveUserData(data);
}

/* ----------------- SRS (SPACED REPETITION SYSTEM) ----------------- */

function updateSrs(q, correct) {
    const wrap = getUserStatsObject();
    if (!wrap) return;

    const key = getQKey(q);
    if (!wrap.user.stats[key]) {
        wrap.user.stats[key] = { correct: 0, wrong: 0, srsLevel: 0, srsNext: 0, flagged: false, lastSeen: null };
    }

    let level = wrap.user.stats[key].srsLevel || 0;
    if (correct) level++;
    else level = Math.max(0, level - 1);

    const intervals = [0, 1, 3, 7, 14, 30]; // días
    const idx = Math.min(level, intervals.length - 1);
    const days = intervals[idx];

    const next = Date.now() + days * 24 * 60 * 60 * 1000;

    wrap.user.stats[key].srsLevel = level;
    wrap.user.stats[key].srsNext = next;

    q._srsLevel = level;
    q._srsNext = next;

    saveUserData(wrap.data);
}

/* ============================================================
   Air&Bits — APP.JS (PARTE 5/6)
   Ajustes, usuarios, temas, idioma, sonido, vibración
   ============================================================ */

/* ----------------- AJUSTES (PANTALLA PRINCIPAL) ----------------- */

function showSettings() {
    document.getElementById("app").innerHTML = `
        <div class="settings-layout">

            <div class="settings-sidebar">
                <button class="settings-nav-button" onclick="playClick(); showGeneralSettings()">General</button>
                <button class="settings-nav-button" onclick="playClick(); showUserManagement()">Usuarios</button>
                <button class="settings-nav-button" onclick="playClick(); showQuestionBankSettings()">Banco</button>
                <button class="settings-nav-button" onclick="playClick(); showAbout()">Acerca de</button>
            </div>

            <div class="settings-content" id="settingsContent">
                <!-- Aquí se carga la sección activa -->
            </div>

        </div>
    `;

    showGeneralSettings();
}

/* ----------------- AJUSTES → GENERAL ----------------- */

function showGeneralSettings() {
    document.getElementById("settingsContent").innerHTML = `
        <div class="setting-group">
            <h4>Idioma</h4>
            <select onchange="changeLanguage(this.value)">
                <option value="es" ${appSettings.language === "es" ? "selected" : ""}>Español</option>
                <option value="en" ${appSettings.language === "en" ? "selected" : ""}>English</option>
            </select>
        </div>

        <div class="setting-group">
            <h4>Sonido</h4>
            <div class="toggle-row">
                <span>Activar sonidos</span>
                <input type="checkbox" ${appSettings.soundsEnabled ? "checked" : ""} onchange="toggleSounds(this.checked)">
            </div>
        </div>

        <div class="setting-group">
            <h4>Vibración</h4>
            <div class="toggle-row">
                <span>Vibración al responder</span>
                <input type="checkbox" ${appSettings.vibrationEnabled ? "checked" : ""} onchange="toggleVibration(this.checked)">
            </div>
        </div>

        <div class="setting-group">
            <h4>Tema visual</h4>
            <select onchange="changeTheme(this.value)">
                <option value="airbus" ${appSettings.visualTheme === "airbus" ? "selected" : ""}>Airbus</option>
                <option value="dark" ${appSettings.visualTheme === "dark" ? "selected" : ""}>Oscuro</option>
                <option value="light" ${appSettings.visualTheme === "light" ? "selected" : ""}>Claro</option>
            </select>
        </div>

        <button class="btn-secondary" onclick="playClick(); showMenu()">⬅️ Volver</button>
    `;
}

function changeLanguage(lang) {
    appSettings.language = lang;
    saveAppSettings();
}

function toggleSounds(enabled) {
    appSettings.soundsEnabled = enabled;
    saveAppSettings();
}

function toggleVibration(enabled) {
    appSettings.vibrationEnabled = enabled;
    saveAppSettings();
}

function changeTheme(theme) {
    appSettings.visualTheme = theme;
    saveAppSettings();
    document.body.className = theme;
}

/* ----------------- AJUSTES → USUARIOS ----------------- */

function exportProgress() {
    const data = loadUserData();
    const uid = data.currentUserId;
    if (!uid) { alert("No hay usuario seleccionado."); return; }

    const payload = {
        version: 1,
        exportedAt: Date.now(),
        userId: uid,
        user: data.users[uid]
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `airbits_progress_${data.users[uid].name || "user"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function importProgressFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const payload = JSON.parse(e.target.result);
            if (!payload.user || !payload.user.name) throw new Error("Formato inválido");

            const data = loadUserData();
            const id = "u" + Date.now();
            data.users[id] = payload.user;
            data.currentUserId = id;
            saveUserData(data);

            alert("Progreso importado ✅");
            updateCurrentUserInfo();
            showUserManagement();
        } catch (err) {
            alert("No se pudo importar el progreso (JSON inválido).");
        }
    };
    reader.readAsText(file);
}

function showUserManagement() {
    const data = loadUserData();
    const users = data.users;

    document.getElementById("settingsContent").innerHTML = `
        <div class="setting-group">
            <h4>Usuarios</h4>

            <div>
                ${Object.keys(users).length === 0 ? "<p>No hay usuarios creados.</p>" : ""}
                ${Object.entries(users).map(([id, u]) => `
                    <div class="user-row">
                        <strong>${u.name}</strong>
                        <button onclick="playClick(); setCurrentUser('${id}')">Seleccionar</button>
                        <button class="danger" onclick="playClick(); deleteUser('${id}')">Eliminar</button>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="setting-group">
            <h4>Progreso</h4>
            <button onclick="playClick(); exportProgress()">⬇️ Exportar progreso (JSON)</button>
            <p style="margin-top:8px; opacity:0.7;">Importar crea un usuario nuevo con ese progreso.</p>
            <input type="file" accept=".json" onchange="importProgressFromFile(event)">
        </div>

        <div class="setting-group">
            <h4>Crear nuevo usuario</h4>
            <input type="text" id="newUserName" placeholder="Nombre del usuario">
            <button onclick="playClick(); createUserFromInput()">Crear</button>
        </div>

        <button class="btn-secondary" onclick="playClick(); showSettings()">⬅️ Volver</button>
    `;
}

function createUserFromInput() {
    const name = document.getElementById("newUserName").value.trim();
    if (!name) {
        alert("Introduce un nombre.");
        return;
    }
    createUser(name);
    showUserManagement();
}

/* ----------------- AJUSTES → ACERCA DE ----------------- */

function showAbout() {
    document.getElementById("settingsContent").innerHTML = `
        <div class="setting-group">
            <h4>Air&Bits</h4>
            <p>Entrenador de banco de preguntas para aviación.</p>
            <p>Versión: 1.0</p>
        </div>

        <div class="setting-group">
            <h4>Autor</h4>
            <p>Desarrollado por Xavi.</p>
        </div>

        <button class="btn-secondary" onclick="playClick(); showSettings()">⬅️ Volver</button>
    `;
}

/* ============================================================
   Air&Bits — APP.JS (PARTE 6/6)
   Dashboard, debilidades, inicialización
   ============================================================ */

/* ----------------- DASHBOARD ----------------- */

function showDashboard() {
    const user = getCurrentUser();
    if (!user) {
        alert("No hay usuario seleccionado.");
        return;
    }

    const stats = user.stats || {};
    const total = Object.keys(stats).length;

    let correct = 0;
    let wrong = 0;

    for (const key in stats) {
        correct += stats[key].correct;
        wrong += stats[key].wrong;
    }

    const totalAnswers = correct + wrong;
    const accuracy = totalAnswers ? Math.round((correct / totalAnswers) * 100) : 0;

    document.getElementById("app").innerHTML = `
        <div class="card">
            <h2 class="dashboard-title">📊 Estadísticas</h2>

            <div class="stat-block">
                <div class="stat-row">
                    <span>Preguntas respondidas</span>
                    <strong>${totalAnswers}</strong>
                </div>

                <div class="stat-row">
                    <span>Aciertos</span>
                    <strong>${correct}</strong>
                </div>

                <div class="stat-row">
                    <span>Fallos</span>
                    <strong>${wrong}</strong>
                </div>

                <div class="stat-row">
                    <span>Precisión</span>
                    <strong>${accuracy}%</strong>
                </div>

                <div class="bar-container">
                    <div class="bar-fill" style="width:${accuracy}%"></div>
                </div>
            </div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">⬅️ Volver</button>
        </div>
    `;
}

/* ----------------- ANÁLISIS DE DEBILIDADES ----------------- */

function showWeaknessAnalysis() {
    const user = getCurrentUser();
    if (!user) {
        alert("No hay usuario seleccionado.");
        return;
    }

    const stats = user.stats || {};
    const bySystem = {};

    for (const q of questions) {
        const key = q.ID || q.Question;
        const s = stats[key];
        if (!s) continue;

        const total = (s.correct || 0) + (s.wrong || 0);
        if (!total) continue;

        const sys = (q.System || "Otros").trim() || "Otros";
        if (!bySystem[sys]) bySystem[sys] = { sys, correct: 0, wrong: 0, total: 0, acc: 0 };
        bySystem[sys].correct += (s.correct || 0);
        bySystem[sys].wrong += (s.wrong || 0);
        bySystem[sys].total += total;
    }

    const rows = Object.values(bySystem).map(r => {
        r.acc = r.total ? Math.round((r.correct / r.total) * 100) : 0;
        return r;
    });

    rows.sort((a, b) => a.acc - b.acc);

    document.getElementById("app").innerHTML = `
        <div class="card">
            <h2>🩻 Debilidades por sistema</h2>
            <p style="opacity:0.7;">Ordenado de menor a mayor precisión.</p>

            <table>
                <tr>
                    <th>Sistema</th>
                    <th>Intentos</th>
                    <th>Precisión</th>
                    <th>Acción</th>
                </tr>

                ${rows.map(r => `
                    <tr>
                        <td>${r.sys}</td>
                        <td>${r.total}</td>
                        <td data-acc="${r.acc}">${r.acc}%</td>
                        <td><button class="btn-secondary" onclick="playClick(); startWeakSystemDrill('${r.sys.replace(/'/g, "\'")}')">Entrenar 20</button></td>
                    </tr>
                `).join("")}
            </table>

            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:16px;">
                <button class="btn-secondary" onclick="playClick(); showMenu()">⬅️ Volver</button>
            </div>
        </div>
    `;
}

function startWeakSystemDrill(system) {
    const pool = questions.filter(q => (q.System || "Otros") === system);
    if (!pool.length) {
        alert("No hay preguntas para este sistema.");
        return;
    }
    filteredQuestions = pool;

    // sesión inteligente dentro del sistema: 20
    mode = "review";
    studySettings.reviewRandom = true;
    saveStudySettings();

    const session = buildSmartSession(filteredQuestions, Math.min(20, filteredQuestions.length));
    reviewQueue = [...session];
    shuffle(reviewQueue);
    reviewCurrent = null;
    nextReviewQuestion();
}


/* ----------------- INICIALIZACIÓN ----------------- */

function initApp() {
    loadAppSettings();
    loadStudySettings();
    loadFastWeights();
    updateCurrentUserInfo();
    initAudio();

    document.body.className = appSettings.visualTheme;

    document.getElementById("settingsBtn").onclick = () => {
        playClick();
        showSettings();
    };

    document.getElementById("manageUsersBtn").onclick = () => {
        playClick();
        showUserManagement();
    };

    document.getElementById("themeToggleBtn").onclick = () => {
        playClick();
        toggleThemeQuick();
    };

    showMenu();
}

/* ----------------- CAMBIO RÁPIDO DE TEMA ----------------- */

function toggleThemeQuick() {
    if (appSettings.visualTheme === "airbus") appSettings.visualTheme = "dark";
    else if (appSettings.visualTheme === "dark") appSettings.visualTheme = "light";
    else appSettings.visualTheme = "airbus";

    saveAppSettings();
    document.body.className = appSettings.visualTheme;
}

/* ----------------- ARRANQUE ----------------- */

window.onload = () => {
    initApp();
};