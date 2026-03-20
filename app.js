/**
 * OMGEKEERDE KLAS — app.js
 * Modulaire architectuur: StorageModule · MediaModule · UIComponents · StateProvider
 * Privacy by Design: Geen persoonsgegevens, alleen anonieme NK-XXXX tokens
 */

'use strict';

/* ════════════════════════════════════════════════════════════
   STORAGE MODULE
   Beheert localStorage met consistente datastructuur
   ════════════════════════════════════════════════════════════ */
const StorageModule = (() => {
  const KEYS = {
    OPDRACHTEN: 'ok_opdrachten',
    TOKENS:     'ok_tokens',
    RESULTATEN: 'ok_resultaten',
  };

  const _read = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const _write = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[StorageModule] schrijffout:', e);
      return false;
    }
  };

  /* Opdrachten */
  const getOpdrachten = () => _read(KEYS.OPDRACHTEN) || [];

  const getOpdracht = (id) => getOpdrachten().find(o => o.id === id) || null;

  const slaOpdracht = (opdracht) => {
    const lijst = getOpdrachten();
    const idx = lijst.findIndex(o => o.id === opdracht.id);
    if (idx >= 0) lijst[idx] = opdracht;
    else lijst.push(opdracht);
    return _write(KEYS.OPDRACHTEN, lijst);
  };

  const verwijderOpdracht = (id) => {
    const lijst = getOpdrachten().filter(o => o.id !== id);
    return _write(KEYS.OPDRACHTEN, lijst);
  };

  /* Tokens */
  const getTokens = () => _read(KEYS.TOKENS) || [];

  const slaTokens = (tokens) => _write(KEYS.TOKENS, tokens);

  const getToken = (code) => getTokens().find(t => t.code === code) || null;

  const markeerTokenGebruikt = (code) => {
    const tokens = getTokens();
    const t = tokens.find(t => t.code === code);
    if (t) { t.gebruikt = true; _write(KEYS.TOKENS, tokens); }
  };

  /* Resultaten */
  const getResultaten = () => _read(KEYS.RESULTATEN) || [];

  const slaResultaat = (resultaat) => {
    const lijst = getResultaten();
    const idx = lijst.findIndex(r => r.token === resultaat.token);
    if (idx >= 0) lijst[idx] = resultaat;
    else lijst.push(resultaat);
    return _write(KEYS.RESULTATEN, lijst);
  };

  const getResultaatVoorToken = (token) =>
    getResultaten().find(r => r.token === token) || null;

  return {
    getOpdrachten, getOpdracht, slaOpdracht, verwijderOpdracht,
    getTokens, slaTokens, getToken, markeerTokenGebruikt,
    getResultaten, slaResultaat, getResultaatVoorToken,
  };
})();


/* ════════════════════════════════════════════════════════════
   MEDIA MODULE
   Rendert YouTube (click-to-load) of PDF/Web link
   ════════════════════════════════════════════════════════════ */
const MediaModule = (() => {

  /** Extraheer YouTube video-ID uit diverse URL-formaten */
  const _youtubeVideoId = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) {
        const v = u.searchParams.get('v');
        if (v) return v;
        const m = u.pathname.match(/\/(?:embed|shorts|v)\/([^/?&]+)/);
        if (m) return m[1];
      }
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.slice(1).split('?')[0] || null;
      }
    } catch { /* ongeldige URL */ }
    return null;
  };

  /**
   * Render YouTube als compacte horizontale balk met directe link.
   * Betrouwbaarder dan embedding: werkt altijd, ongeacht de privacy-instellingen van de video.
   */
  const renderYoutube = (url) => {
    const videoId = _youtubeVideoId(url);
    if (!videoId) return renderFout('Ongeldige YouTube URL. Controleer de link.');

    const extern = `https://www.youtube.com/watch?v=${videoId}`;

    return `
      <a href="${extern}" target="_blank" rel="noopener noreferrer"
        style="display:flex;align-items:center;gap:10px;width:100%;height:48px;background:#0f0f0f;color:#fff;text-decoration:none;padding:0 14px;box-sizing:border-box;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#ff0000"/>
          <path d="M9.5 7.5l7 4.5-7 4.5V7.5z" fill="white"/>
        </svg>
        <span style="flex:1;font-size:.82rem;font-family:var(--font-sans);font-weight:500;">Bekijk op YouTube</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13L13 3M13 3H7M13 3v6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </a>`
  };

  /**
   * Render PDF/Web bron als ingesloten iframe met fallback-knop.
   * Veel sites blokkeren iframes via X-Frame-Options; de fallback
   * toont dan automatisch een duidelijke "open in nieuw tabblad" knop.
   */
  const renderLink = (url) => {
    const isPdf  = url.toLowerCase().includes('.pdf');
    const label  = isPdf ? 'PDF openen' : 'Bron openen';
    const iframeId = `iframe-${Math.random().toString(36).slice(2,8)}`;

    if (isPdf) {
      // PDF: direct in iframe via Google Docs viewer als veilige fallback
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;">
          <iframe id="${iframeId}" src="${viewerUrl}"
            style="flex:1;border:none;min-height:400px;"
            title="PDF document"
            loading="lazy"
            onerror="document.getElementById('${iframeId}-fb').style.display='flex'">
          </iframe>
          <div id="${iframeId}-fb" style="display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;">
            <p style="color:var(--grey-400);font-size:.85rem;">PDF kan niet worden ingesloten.</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="media-link-btn">${label}</a>
          </div>
        </div>`;
    }

    // Webpagina: compacte horizontale balk met domeinnaam en openknop
    let hostname = url;
    try { hostname = new URL(url).hostname; } catch { /* ongeldige URL, gebruik ruwe string */ }

    return `
      <div style="display:flex;align-items:center;gap:10px;width:100%;height:48px;background:#0f0f0f;padding:0 14px;box-sizing:border-box;">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0;">
          <circle cx="9" cy="9" r="7.5" stroke="#888" stroke-width="1.3"/>
          <ellipse cx="9" cy="9" rx="3" ry="7.5" stroke="#888" stroke-width="1.3"/>
          <line x1="1.5" y1="9" x2="16.5" y2="9" stroke="#888" stroke-width="1.3"/>
        </svg>
        <span style="flex:1;font-size:.8rem;font-family:var(--font-mono);color:var(--grey-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${hostname}</span>
        <a href="${url}" target="_blank" rel="noopener noreferrer"
          style="font-size:.78rem;font-family:var(--font-sans);font-weight:500;color:#fff;text-decoration:none;white-space:nowrap;flex-shrink:0;">
          Openen ↗
        </a>
      </div>`;
  };

  /** Render lege staat */
  const renderLeeg = () => `
    <div class="media-placeholder">
      <div class="media-placeholder-icon">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><rect x="3" y="3" width="30" height="30" rx="3" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="14" r="3" stroke="currentColor" stroke-width="1.4"/><path d="M3 26l9-8 5 5 5-6 11 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <p>Geen mediabron voor deze vraag</p>
    </div>`;

  /** Render foutmelding */
  const renderFout = (bericht) => `
    <div class="media-placeholder">
      <p style="color:var(--red-600);">⚠ ${bericht}</p>
    </div>`;

  /** Hoofdrender-functie: kies viewer op basis van type */
  const render = (mediaConfig) => {
    if (!mediaConfig || mediaConfig.type === 'geen' || !mediaConfig.url) {
      return { html: renderLeeg(), type: 'geen' };
    }
    if (mediaConfig.type === 'youtube') {
      return { html: renderYoutube(mediaConfig.url), type: 'youtube' };
    }
    if (mediaConfig.type === 'pdf') {
      return { html: renderLink(mediaConfig.url), type: 'pdf' };
    }
    return { html: renderLeeg(), type: 'geen' };
  };

  return { render };
})();


/* ════════════════════════════════════════════════════════════
   UI COMPONENTS
   Herbruikbare UI-functies
   ════════════════════════════════════════════════════════════ */
const UIComponents = (() => {

  /** Toon/verberg element */
  const toggle = (el, zichtbaar) => {
    if (!el) return;
    zichtbaar ? el.classList.remove('hidden') : el.classList.add('hidden');
  };

  /** Open modaal */
  const openModal = (overlayId) => {
    const el = document.getElementById(overlayId);
    if (!el) return;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
    // Zet focus op eerste focusbaar element
    setTimeout(() => {
      const first = el.querySelector('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
    }, 50);
    // Sluit bij klik buiten modaal
    el.addEventListener('click', (e) => {
      if (e.target === el) sluitModal(overlayId);
    }, { once: true });
  };

  /** Sluit modaal */
  const sluitModal = (overlayId) => {
    const el = document.getElementById(overlayId);
    if (!el) return;
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
  };

  /** Toon foutmelding */
  const toonFout = (elId, bericht) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = bericht;
    el.classList.remove('hidden');
  };

  /** Verberg foutmelding */
  const verbergFout = (elId) => {
    const el = document.getElementById(elId);
    if (el) el.classList.add('hidden');
  };

  /** Maak token chip HTML */
  const tokenChip = (token) => {
    const el = document.createElement('div');
    el.className = `token-chip${token.gebruikt ? ' used' : ''}`;
    el.textContent = token.code;
    el.setAttribute('title', 'Klik om te kopiëren');
    el.setAttribute('tabindex', '0');
    el.addEventListener('click', () => {
      navigator.clipboard?.writeText(token.code).then(() => {
        el.textContent = '✓ Gekopieerd';
        setTimeout(() => { el.textContent = token.code; }, 1400);
      });
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') el.click();
    });
    return el;
  };

  /** Genereer uniek ID */
  const uid = () => Math.random().toString(36).substr(2, 9);

  /** Escape HTML voor veilige rendering */
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  };

  /** Woordtelling */
  const telWoorden = (tekst) =>
    tekst.trim() === '' ? 0 : tekst.trim().split(/\s+/).length;

  return { toggle, openModal, sluitModal, toonFout, verbergFout, tokenChip, uid, escapeHtml, telWoorden };
})();


/* ════════════════════════════════════════════════════════════
   STATE PROVIDER (Leerlingenomgeving)
   Beheert huidige voortgang van de leerling in geheugen + storage
   ════════════════════════════════════════════════════════════ */
const StateProvider = (() => {
  let _state = {
    token: null,
    opdrachtId: null,
    huidigVraagIndex: 0,
    antwoorden: {},    // { vraagId: antwoord }
    ingezonden: false,
  };

  const get = () => ({ ..._state });

  const setToken = (token, opdrachtId) => {
    _state.token = token;
    _state.opdrachtId = opdrachtId;
    _state.huidigVraagIndex = 0;
    _state.antwoorden = {};
    _state.ingezonden = false;
    _persisteer();
  };

  const slaAntwoord = (vraagId, antwoord) => {
    _state.antwoorden[vraagId] = antwoord;
    _persisteer();
  };

  const setVraagIndex = (index) => {
    _state.huidigVraagIndex = index;
  };

  const markeerIngezonden = () => {
    _state.ingezonden = true;
    _persisteer();
  };

  /** Herstel voortgang uit localStorage (na reload) */
  const herstel = (token) => {
    const resultaat = StorageModule.getResultaatVoorToken(token);
    if (resultaat && !resultaat.definitief) {
      _state = {
        token: resultaat.token,
        opdrachtId: resultaat.opdrachtId,
        huidigVraagIndex: 0,
        antwoorden: resultaat.antwoorden || {},
        ingezonden: false,
      };
      return true;
    }
    return false;
  };

  const _persisteer = () => {
    if (!_state.token) return;
    StorageModule.slaResultaat({
      token: _state.token,
      opdrachtId: _state.opdrachtId,
      antwoorden: _state.antwoorden,
      ingezonden: _state.ingezonden,
      datum: new Date().toISOString(),
    });
  };

  return { get, setToken, slaAntwoord, setVraagIndex, markeerIngezonden, herstel };
})();


/* ════════════════════════════════════════════════════════════
   AUTH MODULE
   Eenvoudige PIN-beveiliging voor de docentomgeving.
   Geen wachtwoorden verstuurd — alles lokaal in sessionStorage.
   ════════════════════════════════════════════════════════════ */
const AuthModule = (() => {
  const PIN_KEY      = 'ok_docent_pin';
  const SESSION_KEY  = 'ok_docent_sessie';
  const STANDAARD_PIN = '1234';

  const getPin     = () => localStorage.getItem(PIN_KEY) || STANDAARD_PIN;
  const setPin     = (pin) => localStorage.setItem(PIN_KEY, pin);
  const isIngelogd = () => sessionStorage.getItem(SESSION_KEY) === 'ja';
  const inloggen   = () => sessionStorage.setItem(SESSION_KEY, 'ja');
  const uitloggen  = () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); };

  const controleerPin = (invoer) => invoer === getPin();

  return { getPin, setPin, isIngelogd, inloggen, uitloggen, controleerPin };
})();


/* ════════════════════════════════════════════════════════════
   TOKEN GENERATOR
   Genereert anonieme NK-XXXX tokens
   ════════════════════════════════════════════════════════════ */
const TokenGenerator = (() => {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Zonder verwarrende tekens

  const genereer = () => {
    let code = 'NK-';
    for (let i = 0; i < 4; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return code;
  };

  const genereerUniek = (bestaande, aantal) => {
    const set = new Set(bestaande.map(t => t.code));
    const nieuw = [];
    let pogingen = 0;
    while (nieuw.length < aantal && pogingen < 10000) {
      const code = genereer();
      if (!set.has(code)) { set.add(code); nieuw.push(code); }
      pogingen++;
    }
    return nieuw;
  };

  const valideer = (code) => /^NK-[A-Z2-9]{4}$/.test(code.toUpperCase().trim());

  return { genereer, genereerUniek, valideer };
})();


/* ════════════════════════════════════════════════════════════
   PORTAAL CONTROLLER
   ════════════════════════════════════════════════════════════ */
const PortaalController = (() => {
  const init = () => {
    if (!document.body.classList.contains('screen-portal')) return;
    // Toetsenbordnavigatie op kaarten
    document.querySelectorAll('.portal-card').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
  };
  return { init };
})();


/* ════════════════════════════════════════════════════════════
   DOCENT CONTROLLER
   ════════════════════════════════════════════════════════════ */
const DocentController = (() => {

  let _bewerkOpdracht = null;    // opdracht bezig met bewerken
  let _bewerkVraagIdx = null;    // vraagindex bezig met bewerken

  const init = () => {
    if (!document.body.classList.contains('screen-teacher')) return;
    _initPinLogin();
  };

  /* ── PIN Login ── */
  const _initPinLogin = () => {
    const overlay = document.getElementById('teacher-login-overlay');
    const pinInput = document.getElementById('docent-pin');
    const btnLogin = document.getElementById('btn-pin-login');

    if (!overlay) return;

    if (AuthModule.isIngelogd()) {
      overlay.style.display = 'none';
      _initDashboard();
      return;
    }

    overlay.style.display = 'flex';

    const doPinLogin = () => {
      const invoer = pinInput?.value || '';
      if (!invoer) { UIComponents.toonFout('pin-error', 'Voer een PIN-code in.'); return; }
      if (AuthModule.controleerPin(invoer)) {
        AuthModule.inloggen();
        overlay.style.display = 'none';
        _initDashboard();
      } else {
        UIComponents.toonFout('pin-error', 'Onjuiste PIN-code. Probeer het opnieuw.');
        pinInput.value = '';
        pinInput.focus();
      }
    };

    btnLogin?.addEventListener('click', doPinLogin);
    pinInput?.addEventListener('keydown', e => { if (e.key === 'Enter') doPinLogin(); });
    setTimeout(() => pinInput?.focus(), 100);
  };

  const _initDashboard = () => {
    _initNavigatie();
    _initOpdrachtenPanel();
    _initTokensPanel();
    _initResultatenPanel();
    _initInstellingenPanel();
    _initVraagModal();
    _renderOpdrachten();

    document.getElementById('btn-uitloggen')?.addEventListener('click', () => {
      AuthModule.uitloggen();
    });
    document.getElementById('btn-uitloggen-instellingen')?.addEventListener('click', () => {
      AuthModule.uitloggen();
    });
  };

  /* ── Navigatie ── */
  const _initNavigatie = () => {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const panel = btn.dataset.panel;
        document.querySelectorAll('.nav-item').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-current', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
        document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
        const target = document.getElementById(`panel-${panel}`);
        if (target) {
          target.classList.remove('hidden');
          if (panel === 'tokens') _renderTokens();
          if (panel === 'resultaten') _renderResultaten();
        }
      });
    });

    // Escape sluit modalen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        UIComponents.sluitModal('modal-opdracht');
        UIComponents.sluitModal('modal-vraag');
      }
    });
  };

  /* ── OPDRACHTEN PANEL ── */
  const _initOpdrachtenPanel = () => {
    document.getElementById('btn-nieuwe-opdracht')?.addEventListener('click', () => {
      _bewerkOpdracht = {
        id: UIComponents.uid(),
        naam: '',
        beschrijving: '',
        vragen: [],
        aangemaakt: new Date().toISOString(),
      };
      _openOpdrachtModal();
    });

    document.getElementById('modal-opdracht-close')?.addEventListener('click', () => {
      UIComponents.sluitModal('modal-opdracht');
    });

    document.getElementById('btn-annuleer-opdracht')?.addEventListener('click', () => {
      UIComponents.sluitModal('modal-opdracht');
    });

    document.getElementById('btn-sla-opdracht-op')?.addEventListener('click', _slaOpdrachtOp);

    document.getElementById('btn-voeg-vraag-toe')?.addEventListener('click', () => {
      _bewerkVraagIdx = null;
      _openVraagModal(null);
    });
  };

  const _openOpdrachtModal = (bestaand = null) => {
    const titel = document.getElementById('modal-opdracht-title');
    const naam  = document.getElementById('opdracht-naam');
    const desc  = document.getElementById('opdracht-beschrijving');

    if (bestaand) {
      _bewerkOpdracht = JSON.parse(JSON.stringify(bestaand)); // diepe kopie
      titel.textContent = 'Opdracht bewerken';
      naam.value  = bestaand.naam;
      desc.value  = bestaand.beschrijving || '';
    } else {
      titel.textContent = 'Nieuwe opdracht';
      naam.value  = '';
      desc.value  = '';
    }

    _renderVragenEditor();
    UIComponents.openModal('modal-opdracht');
    naam.focus();
  };

  const _renderVragenEditor = () => {
    const container = document.getElementById('vraag-list');
    if (!container) return;
    const vragen = _bewerkOpdracht?.vragen || [];

    if (vragen.length === 0) {
      container.innerHTML = '<div class="empty-inline">Voeg hieronder vragen toe om de opdracht te vullen.</div>';
      return;
    }

    container.innerHTML = '';
    vragen.forEach((vraag, idx) => {
      const item = document.createElement('div');
      item.className = 'vraag-editor-item';
      item.innerHTML = `
        <div class="vraag-nr">${idx + 1}</div>
        <div class="vraag-info">
          <div class="vraag-preview">${UIComponents.escapeHtml(vraag.tekst || '(Lege vraag)')}</div>
          <div class="vraag-badges">
            <span class="badge badge-${vraag.type}">${vraag.type === 'open' ? 'Open' : 'Meerkeuze'}</span>
            ${vraag.media?.type !== 'geen' ? `<span class="badge badge-media">📎 ${vraag.media.type}</span>` : ''}
          </div>
        </div>
        <div class="vraag-editor-actions">
          <button class="btn btn-ghost btn-sm" data-idx="${idx}" data-action="bewerk" aria-label="Vraag ${idx+1} bewerken">Bewerk</button>
          <button class="btn btn-danger btn-sm" data-idx="${idx}" data-action="verwijder" aria-label="Vraag ${idx+1} verwijderen">✕</button>
        </div>`;
      container.appendChild(item);
    });

    container.querySelectorAll('[data-action="bewerk"]').forEach(btn => {
      btn.addEventListener('click', () => {
        _bewerkVraagIdx = parseInt(btn.dataset.idx);
        _openVraagModal(_bewerkOpdracht.vragen[_bewerkVraagIdx]);
      });
    });

    container.querySelectorAll('[data-action="verwijder"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        _bewerkOpdracht.vragen.splice(idx, 1);
        _renderVragenEditor();
      });
    });
  };

  const _slaOpdrachtOp = () => {
    const naam = document.getElementById('opdracht-naam')?.value.trim();
    if (!naam) {
      document.getElementById('opdracht-naam')?.focus();
      return;
    }
    _bewerkOpdracht.naam = naam;
    _bewerkOpdracht.beschrijving = document.getElementById('opdracht-beschrijving')?.value.trim();
    StorageModule.slaOpdracht(_bewerkOpdracht);
    UIComponents.sluitModal('modal-opdracht');
    _renderOpdrachten();
  };

  const _renderOpdrachten = () => {
    const opdrachten = StorageModule.getOpdrachten();
    const lijst = document.getElementById('opdracht-list');
    const leeg  = document.getElementById('empty-opdrachten');
    if (!lijst) return;

    UIComponents.toggle(leeg, opdrachten.length === 0);

    lijst.innerHTML = '';
    opdrachten.forEach(opdracht => {
      const item = document.createElement('div');
      item.className = 'opdracht-item';
      item.innerHTML = `
        <div class="opdracht-info">
          <div class="opdracht-naam">${UIComponents.escapeHtml(opdracht.naam)}</div>
          <div class="opdracht-meta">${opdracht.vragen?.length || 0} vragen · ${new Date(opdracht.aangemaakt).toLocaleDateString('nl-NL')}</div>
        </div>
        <div class="opdracht-actions">
          <button class="btn btn-secondary btn-sm" data-id="${opdracht.id}" data-action="bewerk">Bewerken</button>
          <button class="btn btn-danger btn-sm" data-id="${opdracht.id}" data-action="verwijder">Verwijderen</button>
        </div>`;
      lijst.appendChild(item);
    });

    lijst.querySelectorAll('[data-action="bewerk"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const o = StorageModule.getOpdracht(btn.dataset.id);
        if (o) _openOpdrachtModal(o);
      });
    });

    lijst.querySelectorAll('[data-action="verwijder"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('Weet je zeker dat je deze opdracht wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
          StorageModule.verwijderOpdracht(btn.dataset.id);
          _renderOpdrachten();
        }
      });
    });
  };

  /* ── VRAAG MODAL ── */
  const _initVraagModal = () => {
    document.getElementById('modal-vraag-close')?.addEventListener('click', () => {
      UIComponents.sluitModal('modal-vraag');
    });

    document.getElementById('btn-annuleer-vraag')?.addEventListener('click', () => {
      UIComponents.sluitModal('modal-vraag');
    });

    // Vraagtype toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        UIComponents.toggle(
          document.getElementById('meerkeuze-config'),
          btn.dataset.type === 'meerkeuze'
        );
      });
    });

    // Media type knoppen
    document.querySelectorAll('.media-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.media-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.media;
        UIComponents.toggle(document.getElementById('media-youtube-input'), type === 'youtube');
        UIComponents.toggle(document.getElementById('media-pdf-input'), type === 'pdf');
      });
    });

    // Optie toevoegen
    document.getElementById('btn-voeg-optie-toe')?.addEventListener('click', _voegOptieToe);

    // Sla vraag op
    document.getElementById('btn-sla-vraag-op')?.addEventListener('click', _slaVraagOp);
  };

  const _openVraagModal = (bestaand = null) => {
    const titel = document.getElementById('modal-vraag-title');
    titel.textContent = bestaand ? 'Vraag bewerken' : 'Nieuwe vraag';

    // Reset formulier
    document.getElementById('vraag-tekst').value = bestaand?.tekst || '';

    // Vraagtype
    const isOpen = !bestaand || bestaand.type === 'open';
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      const actief = btn.dataset.type === (isOpen ? 'open' : 'meerkeuze');
      btn.classList.toggle('active', actief);
      btn.setAttribute('aria-checked', actief ? 'true' : 'false');
    });
    UIComponents.toggle(document.getElementById('meerkeuze-config'), !isOpen);

    // Meerkeuze opties
    const optiesList = document.getElementById('opties-list');
    optiesList.innerHTML = '';
    const opties = bestaand?.opties?.length ? bestaand.opties : [
      { tekst: '', correct: false },
      { tekst: '', correct: false }
    ];
    opties.forEach((optie, idx) => {
      _renderOptieRij(idx, optie.tekst, optie.correct, bestaand?.correctOptie);
    });

    // Media
    const media = bestaand?.media || { type: 'geen', url: '' };
    document.querySelectorAll('.media-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.media === media.type);
    });
    UIComponents.toggle(document.getElementById('media-youtube-input'), media.type === 'youtube');
    UIComponents.toggle(document.getElementById('media-pdf-input'), media.type === 'pdf');
    if (document.getElementById('youtube-url')) {
      document.getElementById('youtube-url').value = media.type === 'youtube' ? media.url : '';
    }
    if (document.getElementById('pdf-url')) {
      document.getElementById('pdf-url').value = media.type === 'pdf' ? media.url : '';
    }

    UIComponents.openModal('modal-vraag');
  };

  const _renderOptieRij = (idx, tekst = '', correct = false) => {
    const letters = 'ABCDE';
    const rij = document.createElement('div');
    rij.className = 'optie-row';
    rij.innerHTML = `
      <span class="optie-label">${letters[idx] || idx}</span>
      <input class="form-input" type="text" placeholder="Optie ${letters[idx] || idx}" value="${UIComponents.escapeHtml(tekst)}" data-index="${idx}" style="flex:1;">
      <label class="optie-correct">
        <input type="radio" name="correct-optie" value="${idx}" ${correct ? 'checked' : ''}> Correct
      </label>
      ${idx >= 2 ? `<button class="btn btn-danger btn-sm" data-remove="${idx}" aria-label="Verwijder optie">✕</button>` : ''}`;
    document.getElementById('opties-list').appendChild(rij);

    const removeBtn = rij.querySelector(`[data-remove]`);
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        rij.remove();
        _hernummerOpties();
      });
    }
  };

  const _voegOptieToe = () => {
    const huidig = document.querySelectorAll('.optie-row').length;
    if (huidig < 5) _renderOptieRij(huidig);
  };

  const _hernummerOpties = () => {
    const letters = 'ABCDE';
    document.querySelectorAll('.optie-row').forEach((rij, idx) => {
      const label = rij.querySelector('.optie-label');
      const input = rij.querySelector('input[type="text"]');
      const radio = rij.querySelector('input[type="radio"]');
      if (label) label.textContent = letters[idx] || idx;
      if (input) { input.placeholder = `Optie ${letters[idx] || idx}`; input.dataset.index = idx; }
      if (radio) radio.value = idx;
    });
  };

  const _slaVraagOp = () => {
    if (!_bewerkOpdracht) return;

    const tekst = document.getElementById('vraag-tekst')?.value.trim();
    if (!tekst) {
      document.getElementById('vraag-tekst')?.focus();
      return;
    }

    const actieveType = document.querySelector('.toggle-btn.active')?.dataset.type || 'open';

    // Media
    const actieveMedia = document.querySelector('.media-type-btn.active')?.dataset.media || 'geen';
    let mediaUrl = '';
    if (actieveMedia === 'youtube') mediaUrl = document.getElementById('youtube-url')?.value.trim() || '';
    if (actieveMedia === 'pdf') mediaUrl = document.getElementById('pdf-url')?.value.trim() || '';

    // Opties (meerkeuze)
    const optieInputs = document.querySelectorAll('.optie-row input[type="text"]');
    const correctRadio = document.querySelector('input[name="correct-optie"]:checked');
    const opties = Array.from(optieInputs).map((inp, idx) => ({
      tekst: inp.value.trim(),
      correct: correctRadio ? parseInt(correctRadio.value) === idx : false,
    }));

    const vraag = {
      id: _bewerkVraagIdx !== null ? _bewerkOpdracht.vragen[_bewerkVraagIdx]?.id || UIComponents.uid() : UIComponents.uid(),
      tekst,
      type: actieveType,
      opties: actieveType === 'meerkeuze' ? opties : [],
      correctOptie: actieveType === 'meerkeuze' && correctRadio ? parseInt(correctRadio.value) : null,
      media: { type: actieveMedia, url: mediaUrl },
    };

    if (_bewerkVraagIdx !== null) {
      _bewerkOpdracht.vragen[_bewerkVraagIdx] = vraag;
    } else {
      _bewerkOpdracht.vragen.push(vraag);
    }

    UIComponents.sluitModal('modal-vraag');
    _renderVragenEditor();
  };

  /* ── TOKENS PANEL ── */
  const _initTokensPanel = () => {
    document.getElementById('btn-genereer-tokens')?.addEventListener('click', _genereerTokens);
    _vulOpdrachtSelect('token-opdracht');

    document.getElementById('btn-export-csv')?.addEventListener('click', () => {
      const tokens = StorageModule.getTokens();
      const rijen = [
        ['code', 'opdracht', 'gebruikt'],
        ...tokens.map(token => {
          const opdrachtNaam = StorageModule.getOpdracht(token.opdrachtId)?.naam || 'Geen';
          return [token.code, opdrachtNaam, token.gebruikt ? 'ja' : 'nee'];
        })
      ];
      const csv = rijen.map(r => r.map(v => `"${v}"`).join(',')).join('\r\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'tokens.csv';
      a.click();
    });

    document.getElementById('btn-print-tokens')?.addEventListener('click', () => {
      const tokens = StorageModule.getTokens();
      const codes = tokens.map(t => `<div style="font-family:monospace;font-size:14px;padding:8px 12px;border:1px solid #ccc;">${t.code}</div>`).join('');
      const venster = window.open('', '_blank');
      venster.document.write(`<!DOCTYPE html><html><head><title>Tokens</title><style>body{margin:16px;}div.grid{display:grid;grid-template-columns:repeat(6,auto);gap:8px;}</style></head><body><div class="grid">${codes}</div><script>window.print();<\/script></body></html>`);
      venster.document.close();
    });
  };

  const _vulOpdrachtSelect = (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    const opdrachten = StorageModule.getOpdrachten();
    const existingOptions = select.querySelectorAll('option:not([value=""])');
    existingOptions.forEach(o => o.remove());
    opdrachten.forEach(o => {
      const opt = document.createElement('option');
      opt.value = o.id;
      opt.textContent = o.naam;
      select.appendChild(opt);
    });
  };

  const _genereerTokens = () => {
    const opdrachtId = document.getElementById('token-opdracht')?.value;
    const aantalInput = document.getElementById('token-aantal')?.value;
    const aantal = parseInt(aantalInput) || 25;

    const bestaand = StorageModule.getTokens();
    const nieuweTokens = TokenGenerator.genereerUniek(bestaand, aantal);
    const nieuweLijst = [
      ...bestaand,
      ...nieuweTokens.map(code => ({ code, opdrachtId: opdrachtId || null, gebruikt: false }))
    ];
    StorageModule.slaTokens(nieuweLijst);
    _renderTokens();
  };

  const _renderTokens = () => {
    _vulOpdrachtSelect('token-opdracht');
    const tokens = StorageModule.getTokens();
    const grid = document.getElementById('token-grid');
    const leeg = document.getElementById('empty-tokens');
    if (!grid) return;

    UIComponents.toggle(leeg, tokens.length === 0);
    grid.innerHTML = '';

    tokens.forEach(token => {
      const opdracht = StorageModule.getOpdracht(token.opdrachtId);
      const opdrachtNaam = opdracht?.naam ?? null;

      const el = document.createElement('div');
      el.className = `token-chip${token.gebruikt ? ' used' : ''}`;
      el.setAttribute('title', 'Klik om te kopiëren');
      el.setAttribute('tabindex', '0');

      const regel1 = document.createElement('span');
      regel1.style.cssText = 'font-family:var(--font-mono);font-size:1rem;font-weight:600;letter-spacing:0.1em;';
      regel1.textContent = token.code;

      const regel2 = document.createElement('span');
      regel2.style.cssText = `font-size:0.75rem;${opdrachtNaam ? 'color:var(--text-secondary);' : 'color:var(--grey-400);'}`;
      regel2.textContent = opdrachtNaam ?? 'Geen opdracht';

      const regel3 = document.createElement('span');
      regel3.style.cssText = `font-size:0.72rem;font-weight:500;${token.gebruikt ? 'color:#f59e0b;' : 'color:var(--green-600);'}`;
      regel3.textContent = token.gebruikt ? '● In gebruik' : '○ Beschikbaar';

      el.appendChild(regel1);
      el.appendChild(regel2);
      el.appendChild(regel3);

      el.addEventListener('click', () => {
        navigator.clipboard?.writeText(token.code).then(() => {
          regel1.textContent = '✓ Gekopieerd';
          setTimeout(() => { regel1.textContent = token.code; }, 1400);
        });
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') el.click();
      });

      grid.appendChild(el);
    });
  };

  /* ── INSTELLINGEN PANEL ── */
  const _initInstellingenPanel = () => {
    document.getElementById('btn-sla-pin-op')?.addEventListener('click', () => {
      const huidig   = document.getElementById('pin-huidig')?.value || '';
      const nieuw    = document.getElementById('pin-nieuw')?.value || '';
      const bevestig = document.getElementById('pin-bevestig')?.value || '';

      UIComponents.verbergFout('pin-wijzig-error');
      UIComponents.verbergFout('pin-wijzig-ok');

      if (!AuthModule.controleerPin(huidig)) {
        UIComponents.toonFout('pin-wijzig-error', 'Huidige PIN is onjuist.');
        return;
      }
      if (nieuw.length < 4) {
        UIComponents.toonFout('pin-wijzig-error', 'Nieuwe PIN moet minimaal 4 tekens zijn.');
        return;
      }
      if (nieuw !== bevestig) {
        UIComponents.toonFout('pin-wijzig-error', 'Nieuwe PIN en bevestiging komen niet overeen.');
        return;
      }
      AuthModule.setPin(nieuw);
      document.getElementById('pin-huidig').value  = '';
      document.getElementById('pin-nieuw').value   = '';
      document.getElementById('pin-bevestig').value = '';
      UIComponents.toonFout('pin-wijzig-ok', '✓ PIN succesvol gewijzigd.');
    });
  };

  /* ── RESULTATEN PANEL ── */
  const _initResultatenPanel = () => {
    _vulOpdrachtSelect('resultaat-filter');
    document.getElementById('resultaat-filter')?.addEventListener('change', _renderResultaten);
  };

  const _renderResultatenItem = (res) => {
    const opdracht = StorageModule.getOpdracht(res.opdrachtId);
    const vragen   = opdracht?.vragen || [];
    const beantwoord = vragen.filter(v => res.antwoorden?.[v.id] !== undefined && res.antwoorden?.[v.id] !== '').length;
    const datum = new Date(res.datum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'resultaat-item';

    // Bouw antwoorden HTML
    const antwoordenHtml = vragen.map((vraag, qi) => {
      const antwoord = res.antwoorden?.[vraag.id];
      const heeftAntwoord = antwoord !== undefined && antwoord !== null && antwoord !== '';
      const letters = 'ABCDE';

      let antwoordTekst = '';
      let antwoordKlasse = '';
      if (!heeftAntwoord) {
        antwoordTekst = '— niet beantwoord —';
        antwoordKlasse = 'antwoord-leeg';
      } else if (vraag.type === 'meerkeuze') {
        const optieIdx = parseInt(antwoord);
        const optie = vraag.opties?.[optieIdx];
        const isCorrect = optieIdx === vraag.correctOptie;
        antwoordTekst = `${letters[optieIdx] || optieIdx}. ${optie?.tekst || ''}`;
        antwoordKlasse = vraag.correctOptie !== null
          ? (isCorrect ? 'antwoord-correct' : 'antwoord-fout')
          : '';
      } else {
        antwoordTekst = antwoord;
      }

      return `
        <div class="antwoord-item">
          <div class="antwoord-vraag-nr">Vraag ${qi + 1}</div>
          <div class="antwoord-vraag">${UIComponents.escapeHtml(vraag.tekst)}</div>
          <div class="antwoord-waarde ${antwoordKlasse}">${UIComponents.escapeHtml(antwoordTekst)}</div>
        </div>`;
    }).join('');

    item.innerHTML = `
      <div class="resultaat-header" role="button" tabindex="0" aria-expanded="false">
        <div class="resultaat-token-col">
          <span class="resultaat-token">${UIComponents.escapeHtml(res.token)}</span>
        </div>
        <div class="resultaat-info-col">
          <span class="resultaat-stats">${beantwoord} / ${vragen.length} vragen beantwoord</span>
        </div>
        <div class="resultaat-meta-col">
          <span class="resultaat-datum">${datum}</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="resultaat-chevron" style="flex-shrink:0;transition:transform .2s;"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      </div>
      <div class="resultaat-antwoorden" style="display:none;">${antwoordenHtml}</div>`;

    const header   = item.querySelector('.resultaat-header');
    const antwoorden = item.querySelector('.resultaat-antwoorden');
    const chevron  = item.querySelector('.resultaat-chevron');

    header.addEventListener('click', () => {
      const open = antwoorden.style.display !== 'none';
      antwoorden.style.display = open ? 'none' : 'flex';
      chevron.style.transform = open ? '' : 'rotate(180deg)';
      header.setAttribute('aria-expanded', String(!open));
    });
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
    });

    return item;
  };

  const _renderResultaten = () => {
    _vulOpdrachtSelect('resultaat-filter');
    const filterOpdrachtId = document.getElementById('resultaat-filter')?.value || '';

    const alleResultaten = StorageModule.getResultaten().filter(r => r.ingezonden);
    const opdrachten     = StorageModule.getOpdrachten();

    const lijst = document.getElementById('resultaten-list');
    const leeg  = document.getElementById('empty-resultaten');
    if (!lijst) return;

    // Groepeer ingezonden resultaten per opdrachtId
    const perOpdracht = new Map();
    alleResultaten.forEach(res => {
      if (!perOpdracht.has(res.opdrachtId)) perOpdracht.set(res.opdrachtId, []);
      perOpdracht.get(res.opdrachtId).push(res);
    });

    // Toon leeg-state alleen als er helemaal geen inzendingen zijn
    UIComponents.toggle(leeg, alleResultaten.length === 0);
    lijst.innerHTML = '';

    opdrachten.forEach(opdracht => {
      // Als er een filter actief is, toon alleen die sectie
      if (filterOpdrachtId && opdracht.id !== filterOpdrachtId) return;

      const resultatenVoorOpdracht = perOpdracht.get(opdracht.id) || [];
      const aantalInzendingen = resultatenVoorOpdracht.length;

      const sectie = document.createElement('div');
      sectie.className = 'resultaten-sectie';

      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'resultaten-sectie-header';
      sectionHeader.innerHTML = `
        <span>${UIComponents.escapeHtml(opdracht.naam)}</span>
        <span>${aantalInzendingen} ${aantalInzendingen === 1 ? 'inzending' : 'inzendingen'}</span>`;
      sectie.appendChild(sectionHeader);

      if (aantalInzendingen === 0) {
        const leegBericht = document.createElement('p');
        leegBericht.style.cssText = 'font-size:.8rem;color:var(--grey-400);font-style:italic;';
        leegBericht.textContent = 'Nog geen inzendingen';
        sectie.appendChild(leegBericht);
      } else {
        resultatenVoorOpdracht.forEach(res => {
          sectie.appendChild(_renderResultatenItem(res));
        });
      }

      lijst.appendChild(sectie);
    });
  };

  /* ── Init ── */
  const _initAlles = () => { init(); };

  return { init: _initAlles };
})();


/* ════════════════════════════════════════════════════════════
   LEERLING CONTROLLER
   ════════════════════════════════════════════════════════════ */
const LeerlingController = (() => {

  let _opdracht = null;
  let _mediaCollapsed = false;

  const init = () => {
    if (!document.body.classList.contains('screen-student')) return;
    _initLogin();
  };

  /* ── Login ── */
  const _initLogin = () => {
    const input  = document.getElementById('token-input');
    const btn    = document.getElementById('btn-token-login');

    if (!input || !btn) return;

    // Auto-opmaak: grote letters + koppelstreep na NK
    input.addEventListener('input', () => {
      let val = input.value.toUpperCase().replace(/[^A-Z2-9\-]/g, '');
      if (val.length > 2 && !val.startsWith('NK-')) {
        val = 'NK-' + val.replace('NK', '').replace('-', '');
      }
      input.value = val.slice(0, 7);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });

    btn.addEventListener('click', _loginMetToken);
  };

  const _loginMetToken = () => {
    const input = document.getElementById('token-input');
    const code  = input?.value.trim().toUpperCase();

    UIComponents.verbergFout('token-error');

    if (!TokenGenerator.valideer(code)) {
      UIComponents.toonFout('token-error', 'Ongeldig token. Formaat: NK- gevolgd door 4 tekens (bijv. NK-A7B3).');
      input?.focus();
      return;
    }

    const token = StorageModule.getToken(code);
    if (!token) {
      UIComponents.toonFout('token-error', 'Token niet gevonden. Vraag je docent om het juiste token.');
      input?.focus();
      return;
    }

    const opdrachtId = token.opdrachtId;
    const opdracht   = opdrachtId ? StorageModule.getOpdracht(opdrachtId) : null;

    // Controleer of eerder begonnen
    const hersteld = StateProvider.herstel(code);

    if (!hersteld) {
      StateProvider.setToken(code, opdrachtId);
    }

    StorageModule.markeerTokenGebruikt(code);

    // Resultaat ingezonden? Toon terugkijkmodus
    const resultaat = StorageModule.getResultaatVoorToken(code);
    if (resultaat?.ingezonden) {
      _startWerkruimte(opdracht || _maakLegeOpdracht(), code, true);
      return;
    }

    _startWerkruimte(opdracht || _maakLegeOpdracht(), code, false);
  };

  const _maakLegeOpdracht = () => ({
    id: 'demo',
    naam: 'Demonstratie Opdracht',
    beschrijving: '',
    vragen: [{
      id: 'demo-1',
      tekst: 'Geen opdracht gekoppeld aan dit token. Vraag je docent om het token aan een opdracht te koppelen.',
      type: 'open',
      opties: [],
      media: { type: 'geen', url: '' }
    }]
  });

  /* ── Werkruimte ── */
  const _startWerkruimte = (opdracht, token, terugkijkModus = false) => {
    _opdracht = opdracht;

    UIComponents.toggle(document.getElementById('student-login'), false);
    UIComponents.toggle(document.getElementById('student-workspace'), true);

    // Meta header
    const meta = document.getElementById('student-meta');
    if (meta) {
      meta.innerHTML = `
        <span>${UIComponents.escapeHtml(opdracht.naam)}</span>
        <span class="student-token-display">${UIComponents.escapeHtml(token)}</span>`;
    }

    _renderVraagNav();
    _toonVraag(StateProvider.get().huidigVraagIndex);
    _initWerkruimteKnoppen(terugkijkModus);
  };

  const _initWerkruimteKnoppen = (terugkijkModus) => {
    document.getElementById('btn-vorige')?.addEventListener('click', _vorigeVraag);
    document.getElementById('btn-volgende')?.addEventListener('click', () => {
      const state = StateProvider.get();
      if (state.huidigVraagIndex < _opdracht.vragen.length - 1) {
        _volgendeVraag();
      } else {
        _inzenden();
      }
    });

    document.getElementById('btn-toggle-media')?.addEventListener('click', _toggleMedia);

    if (terugkijkModus) {
      document.getElementById('btn-volgende').textContent = 'Volgende →';
      const actions = document.querySelector('.vraag-actions');
      if (actions) {
        const info = document.createElement('p');
        info.style.cssText = 'font-size:.75rem;color:var(--text-tertiary);text-align:center;margin:0 auto;';
        info.textContent = 'Terugkijkmodus — antwoorden ingezonden';
        actions.appendChild(info);
      }
    }

    document.getElementById('btn-terug-opdracht')?.addEventListener('click', () => {
      UIComponents.toggle(document.getElementById('student-done'), false);
      UIComponents.toggle(document.getElementById('student-workspace'), true);
      _toonVraag(0);
    });
  };

  const _toonVraag = (idx) => {
    if (!_opdracht) return;
    const vraag = _opdracht.vragen[idx];
    if (!vraag) return;

    StateProvider.setVraagIndex(idx);

    if (StateProvider.get().ingezonden === true) {
      const volgende = document.getElementById('btn-volgende');
      if (volgende) {
        volgende.disabled = true;
        volgende.textContent = 'Ingezonden \u2713';
      }
    }

    const total = _opdracht.vragen.length;

    // Progress
    const bar   = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    const pct   = Math.round((idx + 1) / total * 100);
    if (bar)   { bar.style.width = `${pct}%`; bar.setAttribute('aria-valuenow', pct); }
    if (label) label.textContent = `${idx + 1} / ${total}`;

    // Vraagnummer en tekst
    const numEl  = document.getElementById('vraag-nummer');
    const tekstEl = document.getElementById('vraag-tekst');
    if (numEl)  numEl.textContent  = `Vraag ${idx + 1} van ${total}`;
    if (tekstEl) tekstEl.textContent = vraag.tekst;

    // Navigatiebuttons
    const vorige   = document.getElementById('btn-vorige');
    const volgende = document.getElementById('btn-volgende');
    if (vorige)   vorige.disabled = idx === 0;
    if (volgende) volgende.textContent = idx === total - 1 ? 'Inzenden ✓' : 'Volgende →';

    // Antwoord velden
    const openDiv = document.getElementById('antwoord-open');
    const mcDiv   = document.getElementById('antwoord-meerkeuze');

    UIComponents.toggle(openDiv, vraag.type === 'open');
    UIComponents.toggle(mcDiv,   vraag.type === 'meerkeuze');

    const bestaandAntwoord = StateProvider.get().antwoorden[vraag.id];

    if (vraag.type === 'open') {
      const ta = document.getElementById('open-antwoord');
      if (ta) {
        ta.value = bestaandAntwoord || '';
        _updateWoordtelling(ta);
        ta.oninput = () => {
          _updateWoordtelling(ta);
          StateProvider.slaAntwoord(vraag.id, ta.value);
          _updateVraagNavStatus(idx);
        };
        ta.focus();
      }
    } else if (vraag.type === 'meerkeuze') {
      mcDiv.innerHTML = '';
      (vraag.opties || []).forEach((optie, oi) => {
        const letters = 'ABCDE';
        const optieEl = document.createElement('label');
        optieEl.className = `mc-optie${bestaandAntwoord === oi ? ' selected' : ''}`;
        optieEl.innerHTML = `
          <input type="radio" name="mc-antwoord" value="${oi}" ${bestaandAntwoord === oi ? 'checked' : ''}>
          <span class="mc-label-letter">${letters[oi]}</span>
          <span class="mc-label-text">${UIComponents.escapeHtml(optie.tekst)}</span>`;

        const radio = optieEl.querySelector('input');
        radio.addEventListener('change', () => {
          document.querySelectorAll('.mc-optie').forEach(o => o.classList.remove('selected'));
          optieEl.classList.add('selected');
          StateProvider.slaAntwoord(vraag.id, oi);
          _updateVraagNavStatus(idx);
        });

        mcDiv.appendChild(optieEl);
      });
    }

    // Media
    _renderMedia(vraag.media);

    // Nav actief
    document.querySelectorAll('.vraag-nav-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.idx) === idx);
    });
  };

  const _updateWoordtelling = (ta) => {
    const count = document.getElementById('word-count');
    if (count) count.textContent = `${UIComponents.telWoorden(ta.value)} woorden`;
  };

  const _updateVraagNavStatus = (idx) => {
    const vraag = _opdracht.vragen[idx];
    if (!vraag) return;
    const antw = StateProvider.get().antwoorden[vraag.id];
    const btn  = document.querySelector(`.vraag-nav-btn[data-idx="${idx}"]`);
    if (!btn) return;
    const heeftAntwoord = antw !== undefined && antw !== null && antw !== '';
    btn.classList.toggle('beantwoord', heeftAntwoord);
  };

  const _renderVraagNav = () => {
    const nav = document.getElementById('vraag-nav');
    if (!nav || !_opdracht) return;
    nav.innerHTML = '';
    _opdracht.vragen.forEach((_, idx) => {
      const btn = document.createElement('button');
      btn.className = 'vraag-nav-btn';
      btn.dataset.idx = idx;
      btn.textContent = idx + 1;
      btn.setAttribute('aria-label', `Naar vraag ${idx + 1}`);
      btn.addEventListener('click', () => _toonVraag(idx));
      nav.appendChild(btn);
    });
  };

  const _renderMedia = (media) => {
    const panel = document.getElementById('media-panel');
    const body  = document.getElementById('media-panel-body');
    const label = document.getElementById('media-type-label');
    if (!panel || !body) return;

    const rendered = MediaModule.render(media);
    body.innerHTML  = rendered.html;

    const typeLabels = { geen: 'Geen bron', youtube: 'Video', pdf: 'Document / Bron' };
    if (label) label.textContent = typeLabels[rendered.type] || 'Bron';

    // Toon/verberg media paneel automatisch
    if (rendered.type === 'geen') {
      panel.style.width = '0';
      panel.style.overflow = 'hidden';
      panel.style.borderRight = 'none';
    } else {
      panel.style.width = _mediaCollapsed ? '48px' : '';
      panel.style.overflow = '';
      panel.style.borderRight = '';
    }
  };

  const _toggleMedia = () => {
    const panel = document.getElementById('media-panel');
    if (!panel) return;
    _mediaCollapsed = !_mediaCollapsed;
    panel.classList.toggle('collapsed', _mediaCollapsed);
  };

  const _vorigeVraag = () => {
    const state = StateProvider.get();
    if (state.huidigVraagIndex > 0) {
      _toonVraag(state.huidigVraagIndex - 1);
    }
  };

  const _volgendeVraag = () => {
    const state = StateProvider.get();
    if (state.huidigVraagIndex < _opdracht.vragen.length - 1) {
      _toonVraag(state.huidigVraagIndex + 1);
    }
  };

  const _inzenden = () => {
    const bevestigd = confirm('Weet je zeker dat je je antwoorden wilt inzenden? Dit kan niet ongedaan worden gemaakt, je kunt daarna niet meer wijzigen.');
    if (!bevestigd) return;

    StateProvider.markeerIngezonden();

    UIComponents.toggle(document.getElementById('student-workspace'), false);
    UIComponents.toggle(document.getElementById('student-done'), true);

    const tokenDisplay = document.getElementById('done-token-display');
    if (tokenDisplay) tokenDisplay.textContent = StateProvider.get().token;
  };

  return { init };
})();


/* ════════════════════════════════════════════════════════════
   BOOTSTRAP — detecteer scherm en start juiste controller
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  PortaalController.init();
  DocentController.init();
  LeerlingController.init();
});
