// Air&Bits – Safe bootstrap (NO initApp)

let menuUI = { section: "study" };

function setSection(s){
  menuUI.section = s;
  showMenu();
}

function showMenu(){
  const app = document.getElementById("app");
  app.innerHTML = `
    <div class="menu-layout">
      <aside class="menu-sidebar">
        <button class="menu-nav-btn ${menuUI.section==="study"?"active":""}" onclick="setSection('study')">📚 Estudio</button>
        <button class="menu-nav-btn ${menuUI.section==="exam"?"active":""}" onclick="setSection('exam')">📝 Exámenes</button>
        <button class="menu-nav-btn ${menuUI.section==="analytics"?"active":""}" onclick="setSection('analytics')">📈 Análisis</button>
        <button class="menu-nav-btn ${menuUI.section==="settings"?"active":""}" onclick="setSection('settings')">⚙️ Ajustes</button>
      </aside>
      <section class="menu-main">
        <div class="card">
          <h2>${menuUI.section.toUpperCase()}</h2>
          <p>Base estable cargada correctamente.</p>
        </div>
      </section>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  try{
    showMenu();
  }catch(e){
    document.getElementById("app").innerHTML =
      `<div class="card"><pre>${e.stack||e}</pre></div>`;
  }
});
