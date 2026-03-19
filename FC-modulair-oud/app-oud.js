// ══════════════════════════════════════════════════
// OPSLAG — LocalStorage (privacy-vriendelijk, geen server)
// ══════════════════════════════════════════════════
const DOCENT_CODE = 'docent2024'; // Pas aan voor productie

function laadData() {
  return JSON.parse(localStorage.getItem('omgekeerde-klas-data') || 'null') || {
    opdrachten: [],
    tokens: [],
    resultaten: {}
  };
}
function slaDataOp(d) { localStorage.setItem('omgekeerde-klas-data', JSON.stringify(d)); }
function nieuwId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

// ══════════════════════════════════════════════════
// NAVIGATIE
// ══════════════════════════════════════════════════
let huidigScherm = 'scherm-portaal';
function toonScherm(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('actief'));
  document.getElementById(id).classList.add('actief');
  huidigScherm = id;
}
function toonPanel(id) {
  document.querySelectorAll('#scherm-dashboard .panel').forEach(p => p.classList.remove('actief'));
  document.getElementById(id).classList.add('actief');
  if (id === 'panel-tokens') renderTokenPanel();
}
function editorTab(naam, el) {
  document.querySelectorAll('#panel-opdracht-editor .tab').forEach(t => t.classList.remove('actief'));
  el.classList.add('actief');
  document.getElementById('editor-inhoud').classList.toggle('actief', naam === 'inhoud');
  document.getElementById('editor-resultaten').classList.toggle('actief', naam === 'resultaten');
  if (naam === 'resultaten') renderResultaten();
}

// ══════════════════════════════════════════════════
// DOCENT LOGIN
// ══════════════════════════════════════════════════
function docentLogin() {
  const ww = document.getElementById('docent-ww').value.trim();
  const m = document.getElementById('docent-melding');
  if (ww === DOCENT_CODE) {
    toonScherm('scherm-dashboard');
    laadDashboard();
    document.getElementById('docent-ww').value = '';
    m.className = 'melding';
  } else {
    m.textContent = 'Onjuiste toegangscode. Probeer opnieuw.';
    m.className = 'melding fout zichtbaar';
  }
}
document.getElementById('docent-ww').addEventListener('keydown', e => { if(e.key==='Enter') docentLogin(); });

function uitloggen() {
  toonScherm('scherm-portaal');
}

// ══════════════════════════════════════════════════
// DASHBOARD LADEN
// ══════════════════════════════════════════════════
let huidigOpdrachtId = null;

function laadDashboard() {
  const data = laadData();
  const lijst = document.getElementById('opdracht-lijst');
  lijst.innerHTML = '';
  data.opdrachten.forEach(o => {
    const div = document.createElement('div');
    div.className = 'opdracht-item' + (o.id === huidigOpdrachtId ? ' actief' : '');
    div.innerHTML = `<span class="oi-titel">${o.titel || '(naamloos)'}</span><span class="oi-meta">${(data.resultaten[o.id]||[]).length} inzendingen</span>`;
    div.onclick = () => openOpdracht(o.id);
    lijst.appendChild(div);
  });
  // Stats
  const alleResultaten = Object.values(data.resultaten).flat().length;
  document.getElementById('stat-opdrachten').textContent = data.opdrachten.length;
  document.getElementById('stat-tokens').textContent = data.tokens.filter(t=>!t.gebruikt).length;
  document.getElementById('stat-inzendingen').textContent = alleResultaten;
}

function openOpdracht(id) {
  huidigOpdrachtId = id;
  const data = laadData();
  const o = data.opdrachten.find(x => x.id === id);
  if (!o) return;
  document.getElementById('opdracht-titel').value = o.titel || '';
  document.getElementById('opdracht-instructie').value = o.instructie || '';
  renderVragenEditor(o.vragen || []);
  toonPanel('panel-opdracht-editor');
  laadDashboard();
  // reset naar inhoud-tab
  editorTab('inhoud', document.querySelector('.tab'));
}

function openNieuweOpdracht() {
  const data = laadData();
  const nieuwe = { id: nieuwId(), titel: '', instructie: '', vragen: [], aangemaakt: Date.now() };
  data.opdrachten.push(nieuwe);
  slaDataOp(data);
  huidigOpdrachtId = nieuwe.id;
  laadDashboard();
  openOpdracht(nieuwe.id);
}

function verwijderOpdracht() {
  if (!huidigOpdrachtId) return;
  if (!confirm('Weet u zeker dat u deze opdracht wilt verwijderen?')) return;
  const data = laadData();
  data.opdrachten = data.opdrachten.filter(o => o.id !== huidigOpdrachtId);
  delete data.resultaten[huidigOpdrachtId];
  slaDataOp(data);
  huidigOpdrachtId = null;
  laadDashboard();
  toonPanel('panel-welkom');
}

// ══════════════════════════════════════════════════
// VRAAG EDITOR
// ══════════════════════════════════════════════════
let huidigVragen = [];

function renderVragenEditor(vragen) {
  huidigVragen = vragen;
  const c = document.getElementById('vragen-container');
  c.innerHTML = '';
  vragen.forEach((v, i) => {
    const div = document.createElement('div');
    div.className = 'vraag-editor';
    div.id = 'vraag-' + i;
    if (v.type === 'mc') {
      const opties = v.opties || ['','','',''];
      div.innerHTML = `
        <div class="vraag-editor-kop">
          <span class="vraag-nummer">Vraag ${i+1} — Meerkeuze</span>
          <button class="knop klein gevaar" onclick="verwijderVraag(${i})">Verwijder</button>
        </div>
        <div class="veld mb-1"><label>Vraagstelling</label>
          <textarea class="invoer" rows="2" placeholder="bv. Welk werkwoord is correct gespeld?" onchange="updateVraag(${i},'tekst',this.value)">${v.tekst||''}</textarea></div>
        <label style="margin-bottom:0.4rem;">Antwoordopties <span style="font-weight:400;text-transform:none;">(✓ = correct antwoord)</span></label>
        ${opties.map((opt,j) => `
          <div class="optie-rij">
            <span class="optie-letter">${'ABCD'[j]}</span>
            <input class="invoer" placeholder="Optie ${j+1}" value="${opt}" onchange="updateOptie(${i},${j},this.value)">
            <input type="radio" class="correcte-radio" name="correct-${i}" ${v.correct===j?'checked':''} onchange="updateCorrect(${i},${j})" title="Correct antwoord">
          </div>`).join('')}
        <div class="veld mt-1"><label>Feedback (optioneel)</label>
          <input class="invoer" placeholder="bv. Het correcte antwoord is B omdat..." value="${v.feedback||''}" onchange="updateVraag(${i},'feedback',this.value)"></div>`;
    } else {
      div.innerHTML = `
        <div class="vraag-editor-kop">
          <span class="vraag-nummer">Vraag ${i+1} — Open vraag</span>
          <button class="knop klein gevaar" onclick="verwijderVraag(${i})">Verwijder</button>
        </div>
        <div class="veld mb-1"><label>Vraagstelling</label>
          <textarea class="invoer" rows="2" placeholder="bv. Leg in eigen woorden uit..." onchange="updateVraag(${i},'tekst',this.value)">${v.tekst||''}</textarea></div>
        <div class="veld"><label>Modelantwoord / feedback (optioneel)</label>
          <textarea class="invoer" rows="2" placeholder="Dit antwoord wordt na inzending getoond aan de leerling." onchange="updateVraag(${i},'feedback',this.value)">${v.feedback||''}</textarea></div>`;
    }
    c.appendChild(div);
  });
  if (!vragen.length) c.innerHTML = '<p class="tekst-grijs" style="padding:1rem 0;">Nog geen vragen. Voeg meerkeuze- of open vragen toe.</p>';
}

function voegVraagToe(type) {
  if (type === 'mc') huidigVragen.push({ type:'mc', tekst:'', opties:['','','',''], correct:0, feedback:'' });
  else huidigVragen.push({ type:'open', tekst:'', feedback:'' });
  renderVragenEditor(huidigVragen);
}
function verwijderVraag(i) { huidigVragen.splice(i,1); renderVragenEditor(huidigVragen); }
function updateVraag(i,k,v) { huidigVragen[i][k] = v; }
function updateOptie(i,j,v) { huidigVragen[i].opties[j] = v; }
function updateCorrect(i,j) { huidigVragen[i].correct = j; }

function slaOpdraachtOp() {
  if (!huidigOpdrachtId) return;
  const data = laadData();
  const o = data.opdrachten.find(x => x.id === huidigOpdrachtId);
  if (!o) return;
  o.titel = document.getElementById('opdracht-titel').value.trim();
  o.instructie = document.getElementById('opdracht-instructie').value.trim();
  o.vragen = huidigVragen;
  slaDataOp(data);
  laadDashboard();
  const m = document.getElementById('editor-melding');
  m.textContent = 'Opdracht opgeslagen ✓';
  m.className = 'melding succes zichtbaar';
  setTimeout(() => m.className = 'melding', 2500);
}

// ══════════════════════════════════════════════════
// RESULTATEN
// ══════════════════════════════════════════════════
function renderResultaten() {
  if (!huidigOpdrachtId) return;
  const data = laadData();
  const o = data.opdrachten.find(x => x.id === huidigOpdrachtId);
  const resultaten = data.resultaten[huidigOpdrachtId] || [];
  const c = document.getElementById('resultaten-tabel-container');
  const sc = document.getElementById('resultaat-stats');
  
  const mcVragen = (o.vragen||[]).filter(v=>v.type==='mc');
  const gemiddeld = resultaten.length && mcVragen.length ? 
    Math.round(resultaten.reduce((s,r) => {
      const goed = r.antwoorden.filter((a,i) => {
        const v = o.vragen[i]; return v && v.type==='mc' && a===v.correct;
      }).length;
      return s + (goed / Math.max(mcVragen.length,1)) * 100;
    }, 0) / resultaten.length) : '--';

  sc.innerHTML = `
    <div class="stat-kaart"><div class="stat-getal">${resultaten.length}</div><div class="stat-label">Inzendingen</div></div>
    <div class="stat-kaart"><div class="stat-getal">${mcVragen.length}</div><div class="stat-label">MC-vragen</div></div>
    <div class="stat-kaart"><div class="stat-getal">${gemiddeld}${gemiddeld!=='--'?'%':''}</div><div class="stat-label">Gem. score</div></div>`;

  if (!resultaten.length) { c.innerHTML = '<p class="tekst-grijs">Nog geen inzendingen ontvangen.</p>'; return; }

  let html = `<table class="tabel"><thead><tr>
    <th>Token</th><th>Tijdstip</th>
    ${(o.vragen||[]).map((v,i) => `<th>V${i+1}</th>`).join('')}
    <th>Score</th></tr></thead><tbody>`;
  
  resultaten.forEach(r => {
    const dt = new Date(r.tijdstip).toLocaleString('nl-NL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    let goed = 0; let totaalMC = 0;
    const cellen = (o.vragen||[]).map((v,i) => {
      if (v.type === 'mc') {
        totaalMC++;
        const ok = r.antwoorden[i] === v.correct;
        if (ok) goed++;
        return `<td><span class="badge ${ok?'groen':'rood'}">${ok?'✓':'✗'}</span></td>`;
      }
      return `<td><span class="badge grijs" title="${r.antwoorden[i]||'—'}">open</span></td>`;
    }).join('');
    const pct = totaalMC ? Math.round(goed/totaalMC*100) + '%' : '—';
    html += `<tr><td><span style="font-family:'DM Mono',monospace;font-size:0.8rem;">${r.token}</span></td><td class="tekst-grijs">${dt}</td>${cellen}<td><strong>${pct}</strong></td></tr>`;
  });
  html += '</tbody></table>';
  c.innerHTML = html;
}

// ══════════════════════════════════════════════════
// TOKENS
// ══════════════════════════════════════════════════
function genereerToken() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let t = 'NK-';
  for (let i = 0; i < 4; i++) t += letters[Math.floor(Math.random() * letters.length)];
  return t;
}

function genereerTokens() {
  const aantal = parseInt(document.getElementById('token-aantal').value) || 30;
  const data = laadData();
  const bestaand = new Set(data.tokens.map(t=>t.code));
  let nieuw = 0;
  while (nieuw < aantal) {
    const t = genereerToken();
    if (!bestaand.has(t)) {
      data.tokens.push({ code: t, gebruikt: false, aangemaakt: Date.now() });
      bestaand.add(t);
      nieuw++;
    }
  }
  slaDataOp(data);
  renderTokenPanel();
  const m = document.getElementById('token-melding');
  m.textContent = `${nieuw} nieuwe tokens gegenereerd ✓`;
  m.className = 'melding succes zichtbaar';
  setTimeout(() => m.className='melding', 3000);
  laadDashboard();
}

function renderTokenPanel() {
  const data = laadData();
  const c = document.getElementById('token-container');
  if (!data.tokens.length) { c.innerHTML = '<p class="tekst-grijs">Nog geen tokens aangemaakt.</p>'; document.getElementById('token-acties').style.display='none'; return; }
  let html = '<div class="token-lijst">';
  data.tokens.forEach(t => {
    html += `<span class="token-chip ${t.gebruikt?'gebruikt':''}" onclick="kopieerToken('${t.code}')" title="${t.gebruikt?'Gebruikt':'Beschikbaar'}">${t.code}</span>`;
  });
  html += '</div>';
  html += `<p class="tekst-grijs mt-1" style="font-size:0.78rem;">${data.tokens.filter(t=>!t.gebruikt).length} beschikbaar • ${data.tokens.filter(t=>t.gebruikt).length} gebruikt</p>`;
  c.innerHTML = html;
  document.getElementById('token-acties').style.display = 'flex';
}

function kopieerToken(t) {
  navigator.clipboard.writeText(t);
  const chips = document.querySelectorAll('.token-chip');
  chips.forEach(c => { if(c.textContent.trim()===t) { c.style.background='var(--geel)'; setTimeout(()=>c.style.background='',600); } });
}

function kopieerAlleTokens() {
  const data = laadData();
  const tekst = data.tokens.filter(t=>!t.gebruikt).map(t=>t.code).join('\n');
  navigator.clipboard.writeText(tekst);
  const m = document.getElementById('token-melding');
  m.textContent = `${data.tokens.filter(t=>!t.gebruikt).length} tokens gekopieerd naar klembord ✓`;
  m.className = 'melding succes zichtbaar';
  setTimeout(() => m.className='melding', 2500);
}

function verwijderGebruikteTokens() {
  if (!confirm('Verwijder alle gebruikte tokens?')) return;
  const data = laadData();
  data.tokens = data.tokens.filter(t=>!t.gebruikt);
  slaDataOp(data);
  renderTokenPanel();
  laadDashboard();
}

// ══════════════════════════════════════════════════
// QR CODE
// ══════════════════════════════════════════════════
const QRGen = (() => {
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x; GF_LOG[x] = i;
      x = x << 1; if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255];
  })();
  const gfMul = (a,b) => a && b ? GF_EXP[GF_LOG[a]+GF_LOG[b]] : 0;
  const gfPoly = (deg) => {
    let g = [1];
    for (let i=0;i<deg;i++) { const ng=[]; for(let j=0;j<=g.length;j++) ng[j]=(g[j]||0)^gfMul(g[j-1]||0,GF_EXP[i]); g=ng; }
    return g;
  };
  const rsEncode = (data, nec) => {
    const g = gfPoly(nec);
    const r = [...data, ...new Array(nec).fill(0)];
    for (let i=0;i<data.length;i++) { const c=r[i]; if(!c) continue; for(let j=0;j<g.length;j++) r[i+j]^=gfMul(g[j],c); }
    return r.slice(data.length);
  };

  const VER_INFO = [
    null,
    {cap:17, ec:10, blocks:[[1,19,13]]},
    {cap:32, ec:16, blocks:[[1,34,22]]},
    {cap:53, ec:26, blocks:[[1,55,34]]},
    {cap:78, ec:36, blocks:[[2,33,24]]},
    {cap:106,ec:48, blocks:[[2,43,33]]},
    {cap:134,ec:64, blocks:[[4,27,21]]},
    {cap:154,ec:72, blocks:[[4,31,22],[1,37,26]]},
  ];

  function selectVersion(len) {
    for (let v=1;v<VER_INFO.length;v++) if (VER_INFO[v] && len<=VER_INFO[v].cap) return v;
    return null;
  }

  function encode(text) {
    const bytes = new TextEncoder().encode(text);
    const ver = selectVersion(bytes.length);
    if (!ver) return null;
    const info = VER_INFO[ver];
    const size = 17 + ver*4;

    const bits = [];
    const push = (v,n) => { for(let i=n-1;i>=0;i--) bits.push((v>>i)&1); };
    push(0b0100,4);
    push(bytes.length, ver<10?8:16);
    bytes.forEach(b=>push(b,8));
    push(0,4);
    while(bits.length%8) bits.push(0);
    const cw = [];
    for(let i=0;i<bits.length;i+=8) { let v=0; for(let j=0;j<8;j++) v=(v<<1)|bits[i+j]; cw.push(v); }
    const pad=[0xEC,0x11];
    while(cw.length < info.blocks.reduce((s,[n,_,k])=>s+n*k,0)) cw.push(pad[cw.length%2?1:0]);

    const allDC=[],allEC=[];
    let dOff=0;
    info.blocks.forEach(([n,total,k])=>{
      const ecLen=total-k;
      for(let i=0;i<n;i++) { const d=cw.slice(dOff,dOff+k); dOff+=k; allDC.push(d); allEC.push(rsEncode(d,ecLen)); }
    });
    const maxDC=Math.max(...allDC.map(d=>d.length));
    const maxEC=Math.max(...allEC.map(e=>e.length));
    const final=[];
    for(let i=0;i<maxDC;i++) allDC.forEach(d=>{if(i<d.length)final.push(d[i]);});
    for(let i=0;i<maxEC;i++) allEC.forEach(e=>{if(i<e.length)final.push(e[i]);});
    const finalBits=[];
    final.forEach(b=>{ for(let i=7;i>=0;i--) finalBits.push((b>>i)&1); });
    while(finalBits.length%(8*info.ec/info.ec|0) && finalBits.length<size*size) finalBits.push(0);

    const mat = Array.from({length:size},()=>new Array(size).fill(null));
    const func= Array.from({length:size},()=>new Array(size).fill(false));

    const setFn=(r,c,v)=>{ mat[r][c]=v?1:0; func[r][c]=true; };

    const finder=(r,c)=>{
      for(let dr=-1;dr<=7;dr++) for(let dc=-1;dc<=7;dc++) {
        const rr=r+dr,cc=c+dc;
        if(rr<0||rr>=size||cc<0||cc>=size) continue;
        const inside=dr>=0&&dr<=6&&dc>=0&&dc<=6;
        const border=dr===0||dr===6||dc===0||dc===6;
        const inner=dr>=2&&dr<=4&&dc>=2&&dc<=4;
        setFn(rr,cc,inside&&(border||inner));
      }
    };
    finder(0,0); finder(0,size-7); finder(size-7,0);

    for(let i=8;i<size-8;i++){setFn(6,i,i%2===0);setFn(i,6,i%2===0);}

    if(ver>=2){
      const alignPos=[[],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38]];
      const positions=alignPos[ver]||[];
      for(const r of positions) for(const c of positions){
        if(func[r][c]) continue;
        for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
          const isOuter=Math.abs(dr)===2||Math.abs(dc)===2, isCenter=dr===0&&dc===0;
          setFn(r+dr,c+dc,isOuter||isCenter);
        }
      }
    }

    for(let i=0;i<9;i++){setFn(8,i,0);setFn(i,8,0);}
    for(let i=size-8;i<size;i++){setFn(8,i,0);setFn(i,8,0);}
    setFn(size-8,8,1);

    let bi=0;
    for(let right=size-1;right>=1;right-=2){
      if(right===6) right=5;
      for(let vert=0;vert<size;vert++){
        for(let j=0;j<2;j++){
          const c=right-j, r=(right<6?vert:size-1-vert);
          if(!func[r][c]&&bi<finalBits.length) mat[r][c]=finalBits[bi++];
        }
      }
    }

    for(let r=0;r<size;r++) for(let c=0;c<size;c++) if(!func[r][c]&&mat[r][c]!==null&&(r+c)%2===0) mat[r][c]^=1;

    const fmt=[1,0,1,0,1,0,0,0,0,0,1,0,0,1,0];
    const fi=[0,1,2,3,4,5,7,8,size-7,size-6,size-5,size-4,size-3,size-2,size-1];
    fi.forEach((pos,i)=>{ mat[8][pos]=fmt[i]; mat[pos][8]=fmt[14-i]; });
    mat[size-8][8]=1;

    return {mat,size};
  }

  function toSVG(text, px=200) {
    const result = encode(text);
    if (!result) return '<p>URL te lang voor QR</p>';
    const {mat,size} = result;
    const cell = px/size;
    let rects='';
    for(let r=0;r<size;r++) for(let c=0;c<size;c++)
      if(mat[r][c]===1) rects+=`<rect x="${c*cell}" y="${r*cell}" width="${cell}" height="${cell}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" style="display:block;">
      <rect width="${px}" height="${px}" fill="white"/>
      <g fill="black">${rects}</g></svg>`;
  }

  return {toSVG};
})();

function toonQR() {
  if (!huidigOpdrachtId) return;
  const data = laadData();
  const o = data.opdrachten.find(x=>x.id===huidigOpdrachtId);
  const link = `${location.origin}${location.pathname}?opdracht=${huidigOpdrachtId}`;

  document.getElementById('qr-opdracht-naam').textContent = o ? (o.titel || '(naamloos)') : '';
  document.getElementById('qr-link-input').value = link;

  const svg = QRGen.toSVG(link, 200);
  document.getElementById('qr-svg-container').innerHTML = svg;

  document.getElementById('print-opdracht-titel').textContent = o ? (o.titel || '') : '';
  document.getElementById('print-opdracht-instructie').textContent = o ? (o.instructie || '') : '';
  document.getElementById('print-link').textContent = link;
  document.getElementById('print-qr-svg').innerHTML = QRGen.toSVG(link, 200);

  document.getElementById('qr-modal').classList.add('open');
}

function sluitQR() { document.getElementById('qr-modal').classList.remove('open'); }

function kopieerDeelLink() {
  const link = document.getElementById('qr-link-input').value;
  navigator.clipboard.writeText(link).then(() => {
    const knop = document.getElementById('kopieer-knop');
    knop.textContent = 'Gekopieerd ✓';
    knop.style.background = 'var(--groen)';
    setTimeout(() => { knop.textContent = 'Kopieer'; knop.style.background = ''; }, 2000);
  });
}

function printQR() {
  const printDiv = document.getElementById('print-qr');
  const origBody = document.body.innerHTML;
  document.body.innerHTML = printDiv.innerHTML;
  window.print();
  document.body.innerHTML = origBody;
  location.reload(); 
}

// ══════════════════════════════════════════════════
// STUDENT LOGIN
// ══════════════════════════════════════════════════
let studentToken = null;
let huidigOpdracht = null;
let studentAntwoorden = [];
let huidigVraagIndex = 0;
let ingediend = false;

function studentLogin() {
  const invoer = document.getElementById('student-token').value.trim().toUpperCase();
  const m = document.getElementById('student-melding');
  const data = laadData();

  if (!invoer) { m.textContent = 'Voer een token in.'; m.className='melding fout zichtbaar'; return; }

  const tokenObj = data.tokens.find(t => t.code === invoer);
  if (!tokenObj) { m.textContent = 'Onbekend token. Controleer of je het juist hebt ingevoerd.'; m.className='melding fout zichtbaar'; return; }
  if (tokenObj.gebruikt) { m.textContent = 'Dit token is al gebruikt. Vraag je docent om een nieuw token.'; m.className='melding fout zichtbaar'; return; }

  const params = new URLSearchParams(location.search);
  const opdrachtId = params.get('opdracht');
  const opdracht = opdrachtId 
    ? data.opdrachten.find(o => o.id === opdrachtId)
    : data.opdrachten[data.opdrachten.length - 1]; 

  if (!opdracht) { m.textContent = 'Geen actieve opdracht gevonden. Vraag je docent om de QR-code.'; m.className='melding fout zichtbaar'; return; }
  if (!opdracht.vragen || !opdracht.vragen.length) { m.textContent = 'Deze opdracht bevat nog geen vragen.'; m.className='melding fout zichtbaar'; return; }

  studentToken = invoer;
  huidigOpdracht = opdracht;
  studentAntwoorden = new Array(opdracht.vragen.length).fill(null);
  huidigVraagIndex = 0;
  ingediend = false;

  toonScherm('scherm-student-taak');
  renderStudentTaak();
  m.className = 'melding';
  document.getElementById('student-token').value = '';
}

function renderStudentTaak() {
  document.getElementById('taak-titel-kop').textContent = huidigOpdracht.titel || 'Opdracht';
  document.getElementById('taak-token-badge').textContent = studentToken;
  
  if (huidigOpdracht.instructie) {
    document.getElementById('taak-instructie-blok').style.display = 'block';
    document.getElementById('taak-instructie-tekst').textContent = huidigOpdracht.instructie;
  }

  updateVoortgang();
  renderAlleVragen();
}

function renderAlleVragen() {
  const c = document.getElementById('taak-vragen');
  c.innerHTML = '';
  huidigOpdracht.vragen.forEach((v,i) => {
    const div = document.createElement('div');
    div.className = 'vraag-kaart';
    div.id = 'student-vraag-' + i;
    
    let html = `<div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:var(--grijs-donker);margin-bottom:0.6rem;">Vraag ${i+1} van ${huidigOpdracht.vragen.length}</div>
      <div class="vraag-tekst">${v.tekst || '(geen tekst)'}</div>`;

    if (v.type === 'mc') {
      html += (v.opties||[]).map((opt,j) => opt ? 
        `<button class="optie-knop" id="optie-${i}-${j}" onclick="kiesOptie(${i},${j})">${'ABCD'[j]}. ${opt}</button>` : '').join('');
    } else {
      html += `<div class="open-antwoord"><label>Jouw antwoord</label>
        <textarea class="invoer" rows="3" placeholder="Schrijf hier je antwoord..." oninput="updateOpenAntwoord(${i},this.value)">${studentAntwoorden[i]||''}</textarea></div>`;
    }
    div.innerHTML = html;
    c.appendChild(div);
  });

  const knopDiv = document.createElement('div');
  knopDiv.style.cssText = 'padding:1.5rem 0;text-align:center;';
  knopDiv.innerHTML = `<button class="knop primair" style="padding:0.8rem 2.5rem;font-size:0.9rem;" id="inzend-knop" onclick="inzenden()">Inzenden →</button>`;
  c.appendChild(knopDiv);
}

function kiesOptie(vraagIdx, optieIdx) {
  if (ingediend) return;
  studentAntwoorden[vraagIdx] = optieIdx;
  const v = huidigOpdracht.vragen[vraagIdx];
  (v.opties||[]).forEach((_,j) => {
    const btn = document.getElementById(`optie-${vraagIdx}-${j}`);
    if (btn) btn.className = 'optie-knop' + (j === optieIdx ? ' geselecteerd' : '');
  });
  updateVoortgang();
}

function updateOpenAntwoord(i, val) {
  studentAntwoorden[i] = val;
  updateVoortgang();
}

function updateVoortgang() {
  const beantwoord = studentAntwoorden.filter(a => a !== null && a !== '').length;
  const totaal = huidigOpdracht.vragen.length;
  const pct = totaal ? Math.round(beantwoord/totaal*100) : 0;
  document.getElementById('student-voortgang').style.width = pct + '%';
  document.getElementById('voortgang-tekst').textContent = `${beantwoord}/${totaal} beantwoord`;
}

function inzenden() {
  if (ingediend) return;

  const onbeantwoord = [];
  huidigOpdracht.vragen.forEach((v, i) => {
    const a = studentAntwoorden[i];
    if (a === null || a === '' || a === undefined) onbeantwoord.push(i + 1);
  });

  if (onbeantwoord.length > 0) {
    onbeantwoord.forEach(nr => {
      const kaart = document.getElementById('student-vraag-' + (nr-1));
      if (kaart) {
        kaart.style.borderColor = 'var(--rood)';
        kaart.style.borderWidth = '2px';
        setTimeout(() => { kaart.style.borderColor = ''; kaart.style.borderWidth = ''; }, 3000);
      }
    });
    const m = document.getElementById('student-taak-melding');
    m.textContent = `Vul eerst alle vragen in. Vraag ${onbeantwoord.join(', ')} ${onbeantwoord.length === 1 ? 'is' : 'zijn'} nog leeg.`;
    m.className = 'melding fout zichtbaar';
    m.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => m.className = 'melding', 4000);
    return;
  }

  document.getElementById('bevestig-modal').classList.add('open');
}

function bevestigInzenden() {
  document.getElementById('bevestig-modal').classList.remove('open');
  ingediend = true;

  huidigOpdracht.vragen.forEach((v, i) => {
    if (v.type === 'mc') {
      (v.opties||[]).forEach((_,j) => {
        const btn = document.getElementById(`optie-${i}-${j}`);
        if (btn) { btn.disabled = true; btn.classList.remove('geselecteerd'); btn.style.opacity = '0.6'; }
      });
    } else {
      const ta = document.querySelector(`#student-vraag-${i} textarea`);
      if (ta) ta.disabled = true;
    }
  });

  const inzendKnop = document.getElementById('inzend-knop');
  if (inzendKnop) inzendKnop.style.display = 'none';

  const data = laadData();
  const tokenObj = data.tokens.find(t => t.code === studentToken);
  if (tokenObj) tokenObj.gebruikt = true;
  if (!data.resultaten[huidigOpdracht.id]) data.resultaten[huidigOpdracht.id] = [];
  data.resultaten[huidigOpdracht.id].push({ token: studentToken, tijdstip: Date.now(), antwoorden: studentAntwoorden });
  slaDataOp(data);

  document.getElementById('taak-afsluiting').style.display = 'block';
  document.getElementById('afsluiting-score').textContent = '✓';
  document.getElementById('afsluiting-tekst').textContent = 'Jouw antwoorden zijn opgeslagen. De docent bespreekt de antwoorden in de les.';
  document.getElementById('taak-afsluiting').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('student-voortgang').style.width = '100%';
}

function studentUitloggen() {
  studentToken = null; huidigOpdracht = null; studentAntwoorden = []; ingediend = false;
  toonScherm('scherm-portaal');
}

// ══════════════════════════════════════════════════
// URL-PARAMETER
// ══════════════════════════════════════════════════
(function() {
  const params = new URLSearchParams(location.search);
  if (params.get('opdracht')) {
    toonScherm('scherm-student-login');
    const m = document.getElementById('student-melding');
    m.textContent = 'Je bent uitgenodigd voor een opdracht. Voer je token in om te starten.';
    m.className = 'melding info zichtbaar';
  }
})();