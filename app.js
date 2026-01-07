// ===== Air&Bits App Bootstrap =====

// Placeholder minimal logic: menu render only
let menuUI = { section: 'study' };

function showMenu() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="menu-layout">
      <aside class="menu-sidebar">
        <button class="menu-nav-btn ${menuUI.section==='study'?'active':''}" onclick="setSection('study')">📚 Estudio</button>
        <button class="menu-nav-btn ${menuUI.section==='exam'?'active':''}" onclick="setSection('exam')">📝 Exámenes</button>
        <button class="menu-nav-btn ${menuUI.section==='analytics'?'active':''}" onclick="setSection('analytics')">📈 Análisis</button>
        <button class="menu-nav-btn ${menuUI.section==='settings'?'active':''}" onclick="setSection('settings')">⚙️ Ajustes</button>
      </aside>

      <section class="menu-main">
        <div class="card">
          <h2>${menuUI.section.toUpperCase()}</h2>
          <p>Pantalla inicial lista. Aquí va el contenido real.</p>
        </div>
      </section>
    </div>
  `;
}

function setSection(s) {
  menuUI.section = s;
  showMenu();
}

// ===== INIT (CRÍTICO PARA iOS) =====
document.addEventListener('DOMContentLoaded', () => {
  showMenu();
});
