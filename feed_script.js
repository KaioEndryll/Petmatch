  import { petsCollection, chatCollection } from './firebase.js';
  import { getDocs, addDoc, query, where, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

  // ── Anonymous name generator ──────────────────────────────────────
  const ANON_ANIMALS = ['🐶','🐱','🦊','🐻','🐼','🐨','🦁','🐯','🐸','🐺','🦝','🐮'];

  function createSession() {
    let s = localStorage.getItem('pm_session');
    if (!s) {
      const emoji = ANON_ANIMALS[Math.floor(Math.random() * ANON_ANIMALS.length)];
      const num   = Math.floor(Math.random() * 900) + 100;
      s = JSON.stringify({ emoji, name: `Colaborador ${num}` });
      localStorage.setItem('pm_session', s); // persist so same name is reused next visit
    }
    return JSON.parse(s);
  }
  const ME = createSession();

  // ── Chat helpers ───────────────────────────────────────────────────

  // Stores the Firestore unsubscribe functions so we don't create duplicate listeners
  const chatListeners = {};

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Renders messages directly from a data array (called by onSnapshot)
  function renderMessages(petId, msgs) {
    const container = document.getElementById(`chat-msgs-${petId}`);
    if (!container) return;
    if (msgs.length === 0) {
      container.innerHTML = `<div class="chat-empty">Nenhuma mensagem ainda. Seja o primeiro a ajudar! 🐾</div>`;
      return;
    }
    container.innerHTML = msgs.map(m => `
      <div class="chat-msg">
        <div class="chat-msg-avatar">${m.emoji}</div>
        <div class="chat-msg-bubble">
          <div class="chat-msg-name">${m.name}</div>
          <div class="chat-msg-text">${escapeHtml(m.text)}</div>
          <div class="chat-msg-time">${formatTime(m.ts)}</div>
        </div>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }

  // Starts a real-time listener for a pet's chat — auto-updates when new messages arrive
  function listenToChat(petId) {
    if (chatListeners[petId]) return; // already listening, don't duplicate

    const q = query(
      chatCollection,
      where('petId', '==', petId),
      orderBy('ts', 'asc')
    );

    chatListeners[petId] = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => doc.data());
      renderMessages(petId, msgs);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  window.sendMessage = async function(petId) {
    const input = document.getElementById(`chat-input-${petId}`);
    const text  = input.value.trim();
    if (!text) return;

    input.value = '';
    input.disabled = true; // prevent double-sends while saving

    try {
      await addDoc(chatCollection, {
        petId,             // which pet this message belongs to
        emoji: ME.emoji,   // sender's anonymous emoji
        name:  ME.name,    // sender's anonymous name e.g. "Colaborador 342"
        text,
        ts: Date.now()
      });
      toast('💬 Mensagem enviada!');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
      toast('⚠️ Erro ao enviar. Tente novamente.');
    } finally {
      input.disabled = false;
      input.focus();
    }
    // No need to call renderMessages manually — onSnapshot fires automatically
  };

  window.handleChatKey = function(event, petId) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(petId);
    }
  };

  // ── Image Mosaic builder ───────────────────────────────────────────
  function buildMosaic(imageUrls, emoji) {
    const imgs = (imageUrls || []).filter(Boolean);
    const n = imgs.length;

    if (n === 0) {
      return `<div class="post-mosaic mosaic-0">${emoji}</div>`;
    }
    if (n === 1) {
      return `<div class="post-mosaic mosaic-1">
        <img src="${imgs[0]}" alt="Foto do pet" loading="lazy">
      </div>`;
    }
    if (n === 2) {
      return `<div class="post-mosaic mosaic-2">
        <img src="${imgs[0]}" alt="Foto 1" loading="lazy">
        <img src="${imgs[1]}" alt="Foto 2" loading="lazy">
      </div>`;
    }
    if (n === 3) {
      return `<div class="post-mosaic mosaic-3">
        <img src="${imgs[0]}" alt="Foto 1" loading="lazy">
        <img src="${imgs[1]}" alt="Foto 2" loading="lazy">
        <img src="${imgs[2]}" alt="Foto 3" loading="lazy">
      </div>`;
    }
    // 4+
    const extra = n - 4;
    return `<div class="post-mosaic mosaic-4plus">
      <img src="${imgs[0]}" alt="Foto 1" loading="lazy">
      <img src="${imgs[1]}" alt="Foto 2" loading="lazy">
      <img src="${imgs[2]}" alt="Foto 3" loading="lazy">
      <div class="${extra > 0 ? 'mosaic-more' : ''}">
        <img src="${imgs[3]}" alt="Foto 4" loading="lazy">
        ${extra > 0 ? `<div class="mosaic-more-overlay">+${extra}</div>` : ''}
      </div>
    </div>`;
  }

  // ── Post builder ───────────────────────────────────────────────────
  function timeAgo(dateStr) {
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return `${diff} dias atrás`;
  }

  function formatReward(v) {
    return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
  }

  function buildPost(p) {
    const waCleaned = (p.telefone || '').replace(/\D/g, '');
    const waMsg = encodeURIComponent(`Olá! Vi o seu pet ${p.nome} no PetMatch e quero ajudar! 🐾`);

    return `
      <div class="post-card" id="post-${p.id}">

        <!-- Header -->
        <div class="post-header">
          <div class="post-avatar">${p.emoji || '🐾'}</div>
          <div class="post-meta">
            <div class="post-author">${p.nome} · ${p.raca || 'Raça não informada'}</div>
            <div class="post-sub">
              <span>${p.especie || ''}</span>
              <span class="post-sub-dot">·</span>
              <span>📅 ${timeAgo(p.ultimaData)}</span>
              <span class="post-sub-dot">·</span>
              <span>📍 ${p.ultimaLocalizacao || ''}</span>
            </div>
          </div>
          <span class="post-status ps-perdido">🔴 Perdido</span>
        </div>

        <!-- MOSAIC (hero image) -->
        ${buildMosaic(p.imageUrls, p.emoji || '🐾')}

        <!-- Body text -->
        <div class="post-body">
          <div class="post-title">${p.nome} está desaparecido(a) — você pode ajudar!</div>
          <div class="post-desc">${p.detalhes || 'Sem descrição adicional.'}</div>
          ${p.caracteristicas ? `<div class="post-desc" style="margin-top:-4px;">🔎 <em>${p.caracteristicas}</em></div>` : ''}
          <div class="post-tags" style="margin-top:10px;">
            <span class="post-tag">🐾 ${p.especie}</span>
            <span class="post-tag">${p.raca || 'SRD'}</span>
            <span class="post-tag">📅 ${p.ultimaData || ''}</span>
          </div>
        </div>

        <!-- Info grid -->
        <div class="post-info-grid">
          <div class="post-info-item">
            <span class="post-info-label">Última localização</span>
            <span class="post-info-value">📍 ${p.ultimaLocalizacao || '—'}</span>
          </div>
          <div class="post-info-item">
            <span class="post-info-label">Desapareceu em</span>
            <span class="post-info-value">📅 ${p.ultimaData || '—'}</span>
          </div>
          <div class="post-info-item">
            <span class="post-info-label">Espécie</span>
            <span class="post-info-value">${p.especie || '—'}</span>
          </div>
          <div class="post-info-item">
            <span class="post-info-label">Raça</span>
            <span class="post-info-value">${p.raca || '—'}</span>
          </div>
        </div>

        <!-- Reward -->
        <div class="post-reward">
          <span class="post-reward-icon">💰</span>
          <span class="post-reward-label">Recompensa oferecida</span>
          <span class="post-reward-value">${formatReward(p.recompensa)}</span>
        </div>

        <!-- Contact bar -->
        <div class="post-contact">
          <div class="post-contact-info">📞 Contato: <strong>${p.telefone || '—'}</strong></div>
          <a class="btn-whatsapp" href="https://wa.me/55${waCleaned}?text=${waMsg}" target="_blank" rel="noopener">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.083.532 4.043 1.464 5.754L0 24l6.395-1.679A11.942 11.942 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.372l-.359-.213-3.728.978.995-3.642-.234-.374A9.818 9.818 0 1112 21.818z"/></svg>
            WhatsApp
          </a>
        </div> 

        <!-- Anonymous chat -->
        <div class="post-chat">
          <div class="chat-label">💬 Chat anônimo</div>
          <div class="chat-messages" id="chat-msgs-${p.id}"></div>
          <div class="chat-input-row">
            <div class="chat-anon-avatar">${ME.emoji}</div>
            <input
              class="chat-input"
              id="chat-input-${p.id}"
              type="text"
              placeholder="Escreva uma mensagem anônima..."
              maxlength="300"
              onkeydown="handleChatKey(event, '${p.id}')"
            >
            <button class="chat-send-btn" onclick="sendMessage('${p.id}')">➤</button>
          </div>
        </div>

      </div>
    `;
  }

  // ── Render & filter ────────────────────────────────────────────────
  let allPets = [];
  let activeFilter = 'todos';
  const likedPosts   = new Set(JSON.parse(localStorage.getItem('pm_likes')  || '[]'));
  const sharedPosts  = new Set(JSON.parse(localStorage.getItem('pm_shares') || '[]'));

  function renderPosts(arr) {
    const container = document.getElementById('posts-container');
    // Only show "perdido"
    const perdidos = arr.filter(p => p.status !== 'encontrado');
    if (perdidos.length === 0) {
      container.innerHTML = `<div class="loading-state">🐾 Nenhum pet perdido neste filtro.</div>`;
      return;
    }
    container.innerHTML = perdidos.map(buildPost).join('');
    // Render chats and apply liked states
    perdidos.forEach(p => {
      listenToChat(p.id); // start real-time Firestore listener for this pet's chat
      if (likedPosts.has(p.id)) {
        const btn = document.getElementById(`like-btn-${p.id}`);
        if (btn) { btn.classList.add('liked'); btn.textContent = '❤️ Curtido'; }
      }
    });
  }

  window.quickFilter = function(tipo, el) {
    document.querySelectorAll('.feed-tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    activeFilter = tipo;
    const filtered = tipo === 'todos' ? allPets : allPets.filter(p => p.especie === tipo);
    renderPosts(filtered);
  };

  // ── Sidebar helpers ────────────────────────────────────────────────
  function updateSidebar(pets) {
    const perdidos    = pets.filter(p => p.status !== 'encontrado');
    const encontrados = pets.filter(p => p.status === 'encontrado');
    const totalRecomp = perdidos.reduce((s, p) => s + parseFloat(p.recompensa || 0), 0);

    document.getElementById('stat-perdidos').textContent    = perdidos.length;
    document.getElementById('stat-total').textContent       = pets.length;
    document.getElementById('stat-encontrados').textContent = encontrados.length;
    document.getElementById('stat-recompensa').textContent  = 'R$' + (totalRecomp >= 1000
      ? (totalRecomp/1000).toFixed(1) + 'k'
      : totalRecomp.toFixed(0));

    const recent = perdidos.slice(0, 5);
    document.getElementById('sidebar-recent').innerHTML = recent.length
      ? recent.map(p => `
          <div class="alert-item">
            <div class="alert-emoji">${p.emoji || '🐾'}</div>
            <div class="alert-info">
              <div class="alert-name">${p.nome}</div>
              <div class="alert-loc">${p.ultimaLocalizacao || ''}</div>
            </div>
            <span class="alert-badge">PERDIDO</span>
          </div>
        `).join('')
      : `<div style="font-size:13px;color:var(--muted);">Nenhum alerta.</div>`;
  }

  // ── Toast ──────────────────────────────────────────────────────────
  let toastT;
  window.toast = function(msg) {
    const el = document.getElementById('fb-toast');
    document.getElementById('fb-toast-text').textContent = msg;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 3000);
  };

  // ── Load from Firebase ─────────────────────────────────────────────
  async function loadPets() {
    try {
      const snap = await getDocs(petsCollection);
      allPets = snap.docs.map(doc => {
        const d = doc.data();
        if (!d.emoji) {
          d.emoji = d.especie === 'Cachorro' ? '🐕' : d.especie === 'Gato' ? '🐈' : '🐦';
        }
        return { ...d, id: doc.id };
      });
      renderPosts(allPets);
      updateSidebar(allPets);
    } catch (err) {
      console.error('Erro Firebase:', err);
      document.getElementById('posts-container').innerHTML =
        `<div class="loading-state">⚠️ Erro ao carregar posts. Verifique sua conexão.</div>`;
    }
  }

  loadPets();