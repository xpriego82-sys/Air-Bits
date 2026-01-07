/* ============================================================
   Air&Bits — APP.JS (PARTE 1/6)
   Variables globales, audio, vibración, usuarios, ajustes, CSV
   ============================================================ */

/* ----------------- VARIABLES GLOBALES ----------------- */

let questions = [];
let filteredQuestions = [];

let mode = null;
let currentIndex = 0;

let examQuestions = [];
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

function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
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
        filteredQuestions = [...questions];

        alert("Banco de preguntas importado correctamente.");
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

    filteredQuestions = questions.filter(q => {
        if (cat && q.Category !== cat) return false;
        if (ac && q.Aircraft !== ac) return false;
        if (sys && q.System !== sys) return false;
        if (diff && q.Difficulty !== diff) return false;
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

            <h2>Filtros</h2>

            <div class="filter-grid">

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
            ${createModeCard("📝", "Examen", "40 preguntas aleatorias cronometradas", "startExamMode")}
            ${createModeCard("❌", "Falladas", "Solo tus errores", "startFailedMode")}
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

function showQuestion() {
    const q = filteredQuestions[currentIndex];
    if (!q) {
        showMenu();
        return;
    }

    document.getElementById("app").innerHTML = `
        <div class="card question-card">

            <div class="q-meta">${q.Category || ""} • ${q.Aircraft || ""} • ${q.System || ""}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;
}

/* ----------------- MODO REPASO ----------------- */

function startReviewMode() {
    if (!filteredQuestions.length) {
        alert("No hay preguntas filtradas.");
        return;
    }

    mode = "review";
    currentIndex = 0;
    showQuestion();
}

/* ----------------- MODO EXAMEN ----------------- */

function startExamMode() {
    if (filteredQuestions.length < 40) {
        alert("Necesitas al menos 40 preguntas filtradas.");
        return;
    }

    mode = "exam";
    examQuestions = shuffle([...filteredQuestions]).slice(0, 40);
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

            <div class="q-meta">Pregunta ${examIndex + 1} / 40</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>
        </div>
    `;
}

function finishExam() {
    clearInterval(examTimerInterval);

    const correct = examQuestions.filter(q => q._correct).length;
    const total = examQuestions.length;
    const percent = Math.round((correct / total) * 100);

    document.getElementById("app").innerHTML = `
        <div class="card exam-result">

            <h2>📝 Examen finalizado</h2>

            <div class="result-number">${percent}%</div>

            <div class="result-details">
                <p><strong>Correctas:</strong> ${correct} / ${total}</p>
                <p><strong>Falladas:</strong> ${total - correct}</p>
            </div>

            <button class="btn-primary" onclick="playClick(); showMenu()">Volver al menú</button>
        </div>
    `;
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

/* ----------------- MODO INTELIGENTE ----------------- */

function startSmartMode() {
    if (!filteredQuestions.length) {
        alert("No hay preguntas filtradas.");
        return;
    }

    filteredQuestions.sort((a, b) => {
        const wa = a._wrongCount || 0;
        const wb = b._wrongCount || 0;
        return wb - wa;
    });

    mode = "review";
    currentIndex = 0;
    showQuestion();
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

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;
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

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;
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

            <div class="q-meta">${q.Category} • ${q.Aircraft} • ${q.System}</div>

            <div class="question-text">${q.Question}</div>

            <div class="options modern-options">
                ${createOption("A", q.OptionA)}
                ${createOption("B", q.OptionB)}
                ${createOption("C", q.OptionC)}
                ${createOption("D", q.OptionD)}
            </div>

            <div id="feedback" class="feedback-area"></div>

            <button class="btn-secondary" onclick="playClick(); showMenu()">Volver</button>
        </div>
    `;
}

/* ----------------- MODO DRILL POR SISTEMA ----------------- */

function startSystemDrillMode() {
    const systems = uniqueOptions(questions.map(q => q.System));

    document.getElementById("app").innerHTML = `
        <div class="card">
            <h2>Entrenar por sistema</h2>

            <div class="filter-grid">
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

/* ----------------- AVANCE ENTRE PREGUNTAS ----------------- */

function nextQuestion() {
    if (mode === "review") {
        currentIndex++;
        if (currentIndex >= filteredQuestions.length) {
            alert("Has completado el repaso.");
            showMenu();
        } else {
            showQuestion();
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
        user.stats[key] = { correct: 0, wrong: 0 };
    }

    if (correct) user.stats[key].correct++;
    else user.stats[key].wrong++;

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
    if (!q._srsLevel) q._srsLevel = 0;

    if (correct) {
        q._srsLevel++;
    } else {
        q._srsLevel = Math.max(0, q._srsLevel - 1);
    }

    const intervals = [0, 1, 3, 7, 14, 30]; // días
    const idx = Math.min(q._srsLevel, intervals.length - 1);
    const days = intervals[idx];

    q._srsNext = Date.now() + days * 24 * 60 * 60 * 1000;
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
    const rows = [];

    for (const q of questions) {
        const key = q.ID || q.Question;
        const s = stats[key];

        if (!s) continue;

        const total = s.correct + s.wrong;
        if (total === 0) continue;

        const acc = Math.round((s.correct / total) * 100);

        rows.push({
            system: q.System,
            question: q.Question,
            total,
            accuracy: acc
        });
    }

    rows.sort((a, b) => a.accuracy - b.accuracy);

    document.getElementById("app").innerHTML = `
        <div class="card">
            <h2>🩻 Análisis de debilidades</h2>

            <table>
                <tr>
                    <th>Sistema</th>
                    <th>Pregunta</th>
                    <th>Intentos</th>
                    <th>Precisión</th>
                </tr>

                ${rows.map(r => `
                    <tr>
                        <td>${r.system}</td>
                        <td>${r.question}</td>
                        <td>${r.total}</td>
                        <td data-acc="${r.accuracy}">${r.accuracy}%</td>
                    </tr>
                `).join("")}
            </table>

            <button class="btn-secondary" onclick="playClick(); showMenu()">⬅️ Volver</button>
        </div>
    `;
}

/* ----------------- INICIALIZACIÓN ----------------- */

function initApp() {
    loadAppSettings();
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