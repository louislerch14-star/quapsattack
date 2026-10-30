import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { GoogleGenAI } from "https://esm.run/@google/genai";

const SUPABASE_URL = 'https://xibaufkxapezpuvszpxf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpYmF1Zmt4YXBlenB1dnN6cHhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjEwNzUsImV4cCI6MjEwMzkzNzA3NX0.Tv3IKj95iBsGy5TGTosb7mMT-d_sySuu7QZ4RpNhB5E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let activeChatRoomId = null;
let selectedDateString = null;
let authMode = 'login';
let calendarDate = new Date();

// Pinnwand State
let allPosts = [];
let currentCategory = 'all';
let currentView = 'kanban';
let activeThreadPostId = null;

// ==========================================
// QUPASSI KI CONFIG (Offizielles Google Gen AI SDK)
// ==========================================
const GEMINI_API_KEY = 'AQ.Ab8RN6KT-NV_pdl2kGaEaXme_f7gJXqDCsTje_kuSWahTfqGbg';

document.addEventListener('DOMContentLoaded', async () => {
  checkSession();
});

function playCopySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadUserProfile();
    showMainApp();
    setupRealtimeSubscriptions();
    loadAllData();
  } else {
    showAuthScreen();
  }
}

window.toggleAuthMode = function(mode) {
  authMode = mode;
  document.getElementById('username-field-wrapper').classList.toggle('hidden', mode === 'login');
};

window.handleAuthSubmit = async function(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;

  if (authMode === 'register') {
    const username = document.getElementById('auth-username').value;
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { username: username || email.split('@')[0] } }
    });
    if (error) alert("Fehler: " + error.message);
    else alert("Account erstellt! Du wirst jetzt eingeloggt.");
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Login-Fehler: " + error.message);
    else {
      currentUser = data.user;
      await loadUserProfile();
      showMainApp();
      setupRealtimeSubscriptions();
      loadAllData();
    }
  }
};

window.handleLogout = async function() {
  await supabase.auth.signOut();
  window.location.reload();
};

function showMainApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('main-app-container').classList.remove('hidden');
}
function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('main-app-container').classList.add('hidden');
}

async function loadUserProfile() {
  if (!currentUser) return;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();

  if (profile) {
    currentProfile = profile;
    document.getElementById('sidebar-username').textContent = profile.username;
    
    const role = profile.role || 'mitspieler';
    document.getElementById('user-role-badge').textContent = role.toUpperCase();

    const statusDisplay = profile.custom_status || 'online';
    document.getElementById('sidebar-status-text').textContent = profile.custom_status_text || statusDisplay.toUpperCase();
    
    if (profile.avatar_url) {
      document.getElementById('sidebar-avatar-img').src = profile.avatar_url;
      document.getElementById('edit-avatar-preview').src = profile.avatar_url;
    }

    document.getElementById('edit-username-input').value = profile.username || '';
    document.getElementById('edit-discord-status').value = profile.custom_status || 'online';
    document.getElementById('edit-status-text').value = profile.custom_status_text || '';
    document.getElementById('edit-quote').value = profile.personality_quote || '';

    updateStatusDot(profile.custom_status);
    applyRolePermissions(role);
  }
}

function applyRolePermissions(role) {
  const pinnwandBox = document.getElementById('pinnwand-create-box');
  const calendarAddBtn = document.getElementById('calendar-add-btn');
  const vaultUploadBtn = document.getElementById('vault-upload-btn');

  if (role === 'ban') {
    if (pinnwandBox) pinnwandBox.classList.add('hidden');
    if (calendarAddBtn) calendarAddBtn.classList.add('hidden');
    if (vaultUploadBtn) vaultUploadBtn.classList.add('hidden');
  } else {
    if (pinnwandBox) pinnwandBox.classList.remove('hidden');
    if (calendarAddBtn) calendarAddBtn.classList.remove('hidden');
    if (vaultUploadBtn) vaultUploadBtn.classList.remove('hidden');
  }
}

function updateStatusDot(status) {
  const dot = document.getElementById('sidebar-status-dot');
  if (status === 'dnd') dot.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-appBg";
  else if (status === 'idle') dot.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-appBg";
  else if (status === 'offline') dot.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-gray-500 rounded-full border-2 border-appBg";
  else dot.className = "absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-statusGreen rounded-full border-2 border-appBg";
}

window.saveFullProfile = async function() {
  const username = document.getElementById('edit-username-input').value;
  const discordStatus = document.getElementById('edit-discord-status').value;
  const statusText = document.getElementById('edit-status-text').value;
  const quote = document.getElementById('edit-quote').value;
  const avatarFile = document.getElementById('upload-avatar-file').files[0];

  let avatarUrl = currentProfile?.avatar_url;

  if (avatarFile) {
    const fileExt = avatarFile.name.split('.').pop();
    const filePath = `avatar_${currentUser.id}_${Date.now()}.${fileExt}`;
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(filePath, avatarFile);

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      avatarUrl = urlData.publicUrl;
    }
  }

  const { error } = await supabase.from('profiles').upsert({
    id: currentUser.id,
    username: username,
    custom_status: discordStatus,
    custom_status_text: statusText,
    avatar_url: avatarUrl,
    personality_quote: quote,
    role: currentProfile.role
  });

  if (error) alert("Fehler: " + error.message);
  else {
    await loadUserProfile();
    await loadRoster();
    alert("Profil erfolgreich gespeichert!");
  }
};

window.updateUserRole = async function(targetUserId, newRole) {
  if (currentProfile.role !== 'management') return alert("Nur das Management darf Rollen verteilen!");
  await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
  loadRoster();
};

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active', 'bg-white/10', 'text-white'));
  const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.getAttribute('onclick')?.includes(tabId));
  if (activeBtn) activeBtn.classList.add('active', 'bg-white/10', 'text-white');
};

// ==========================================
// PINNWAND UPGRADED LOGIC
// ==========================================

window.togglePinView = function(view) {
  currentView = view;
  document.getElementById('kanban-view').classList.toggle('hidden', view !== 'kanban');
  document.getElementById('feed-view').classList.toggle('hidden', view !== 'feed');
  
  document.getElementById('view-kanban-btn').className = view === 'kanban' ? "px-3 py-1.5 bg-accentRed text-white rounded-xl text-xs font-bold transition" : "px-3 py-1.5 bg-white/5 border border-white/10 text-textSub rounded-xl text-xs font-bold transition";
  document.getElementById('view-feed-btn').className = view === 'feed' ? "px-3 py-1.5 bg-accentRed text-white rounded-xl text-xs font-bold transition" : "px-3 py-1.5 bg-white/5 border border-white/10 text-textSub rounded-xl text-xs font-bold transition";
};

window.setPinCategory = function(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.className = "cat-pill px-3 py-1 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-textSub hover:text-white";
  });
  event.target.className = "cat-pill px-3 py-1 rounded-lg text-xs font-bold bg-accentRed text-white";
  filterAndRenderPosts();
};

async function loadPinboardPosts() {
  const { data: posts, error } = await supabase
    .from('pinboard_posts')
    .select('*, profiles(username, avatar_url)')
    .order('created_at', { ascending: false });

  if (!error && posts) {
    allPosts = posts;
    filterAndRenderPosts();
  }
}

function filterAndRenderPosts() {
  const searchTerm = document.getElementById('pin-search').value.toLowerCase();
  
  const filtered = allPosts.filter(p => {
    const matchesCat = currentCategory === 'all' || p.category === currentCategory;
    const matchesSearch = !searchTerm || p.content.toLowerCase().includes(searchTerm) || (p.title && p.title.toLowerCase().includes(searchTerm));
    return matchesCat && matchesSearch;
  });

  const columns = ['Geplant', 'In Arbeit', 'Fertig', 'Ideen'];
  columns.forEach(col => {
    const container = document.getElementById(`kanban-${col}`);
    const countEl = document.getElementById(`count-${col}`);
    if (container) container.innerHTML = '';
    
    const colPosts = filtered.filter(p => (p.status || 'Ideen') === col);
    if (countEl) countEl.textContent = colPosts.length;

    colPosts.forEach(post => {
      if (container) container.innerHTML += createPostCardHTML(post);
    });
  });

  const feedContainer = document.getElementById('feed-view');
  if (feedContainer) {
    feedContainer.innerHTML = '';
    filtered.forEach(post => {
      feedContainer.innerHTML += createPostCardHTML(post);
    });
  }
}

function createPostCardHTML(post) {
  const role = currentProfile?.role || 'mitspieler';
  const isOwner = currentUser && post.author_id === currentUser.id;
  const canDelete = role === 'management' || role === 'admin' || (role === 'mitspieler' && isOwner);
  const canPin = role === 'management' || role === 'admin';
  const isPinned = post.pinned;

  let reactions = post.reactions || { '👍': 0, '❤️': 0, '🔥': 0, '💀': 0 };
  
  return `
    <div class="glass-card p-4 rounded-2xl space-y-3 ${isPinned ? 'pinned-glow' : 'border-white/10'} relative">
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <img src="${post.profiles?.avatar_url || 'https://i.imgur.com/6VBx3io.png'}" class="w-6 h-6 rounded-full object-cover">
          <span class="font-bold text-white">${post.profiles?.username || 'Member'}</span>
          <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-accentRed/10 border border-accentRed/30 text-accentRed">#${post.category || 'allgemein'}</span>
        </div>
        <div class="flex items-center gap-2">
          ${isPinned ? '<span class="text-[10px] text-accentRed font-bold">📌 Fixiert</span>' : ''}
          ${canPin ? `<button onclick="togglePinPost('${post.id}', ${!isPinned})" class="text-xs text-yellow-400 hover:text-white" title="Anpinnen">📌</button>` : ''}
          ${canDelete ? `<button onclick="deletePost('${post.id}')" class="text-xs text-red-400 hover:text-red-600" title="Löschen">🗑️</button>` : ''}
        </div>
      </div>

      ${post.title ? `<h3 class="font-bold text-sm text-white">${post.title}</h3>` : ''}
      <p class="text-xs text-textSub leading-relaxed">${post.content}</p>

      ${post.coordinates ? `
        <button onclick="copyCoords('${post.coordinates}')" class="w-full text-left bg-black/40 hover:bg-black/60 border border-white/10 p-2 rounded-xl font-mono text-[11px] text-accentRed flex items-center justify-between transition">
          <span>📍 Koord: ${post.coordinates}</span>
          <span class="text-[9px] text-textSub bg-white/5 px-2 py-0.5 rounded">Kopieren 📋</span>
        </button>
      ` : ''}

      <div class="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
        <div class="flex items-center gap-1.5">
          <button onclick="reactToPost('${post.id}', '👍')" class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[11px]">👍 ${reactions['👍'] || 0}</button>
          <button onclick="reactToPost('${post.id}', '❤️')" class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[11px]">❤️ ${reactions['❤️'] || 0}</button>
          <button onclick="reactToPost('${post.id}', '🔥')" class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[11px]">🔥 ${reactions['🔥'] || 0}</button>
          <button onclick="reactToPost('${post.id}', '💀')" class="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[11px]">💀 ${reactions['💀'] || 0}</button>
        </div>
        
        <button onclick="openThreadModal('${post.id}')" class="text-[11px] text-textSub hover:text-white transition">💬 Antworten (${post.reply_count || 0})</button>
      </div>
    </div>
  `;
};

window.copyCoords = function(coords) {
  navigator.clipboard.writeText(coords);
  playCopySound();
  alert(`Koordinaten in Zwischenablage kopiert: ${coords} 📋`);
};

window.createNewPost = async function() {
  if (currentProfile?.role === 'ban') return alert("Gebannte User können keine Beiträge erstellen!");
  const title = document.getElementById('post-title').value;
  const content = document.getElementById('post-content').value;
  const coords = document.getElementById('post-coords').value;
  const category = document.getElementById('post-category-select').value;
  const status = document.getElementById('post-status-select').value;

  if (!content) return alert("Bitte verfasse einen Text!");

  const { error } = await supabase.from('pinboard_posts').insert([{
    author_id: currentUser.id,
    title: title || '',
    content: content,
    coordinates: coords || '',
    category: category || 'allgemein',
    status: status || 'Ideen',
    pinned: false,
    reactions: { '👍': 0, '❤️': 0, '🔥': 0, '💀': 0 },
    reply_count: 0
  }]);

  if (error) {
    alert("Fehler beim Erstellen: " + error.message);
  } else {
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-coords').value = '';
    loadPinboardPosts();
  }
};

window.deletePost = async function(postId) {
  if (confirm("Beitrag wirklich löschen?")) {
    await supabase.from('pinboard_posts').delete().eq('id', postId);
    loadPinboardPosts();
  }
};

window.togglePinPost = async function(postId, pinState) {
  await supabase.from('pinboard_posts').update({ pinned: pinState }).eq('id', postId);
  loadPinboardPosts();
};

window.reactToPost = async function(postId, emoji) {
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  
  let reactions = post.reactions ? { ...post.reactions } : { '👍': 0, '❤️': 0, '🔥': 0, '💀': 0 };
  reactions[emoji] = (reactions[emoji] || 0) + 1;

  const { error } = await supabase.from('pinboard_posts').update({ reactions }).eq('id', postId);
  if (!error) loadPinboardPosts();
};

// THREAD / ANTWORTEN LOGIC
window.openThreadModal = async function(postId) {
  activeThreadPostId = postId;
  document.getElementById('thread-modal').classList.remove('hidden');
  await loadThreadReplies(postId);
};

window.closeThreadModal = function() {
  document.getElementById('thread-modal').classList.add('hidden');
  activeThreadPostId = null;
};

async function loadThreadReplies(postId) {
  const container = document.getElementById('thread-messages-list');
  container.innerHTML = '<p class="text-xs text-textSub">Lade Antworten...</p>';

  const { data: replies } = await supabase
    .from('pinboard_replies')
    .select('*, profiles(username, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  container.innerHTML = '';
  if (replies && replies.length > 0) {
    replies.forEach(r => {
      container.innerHTML += `
        <div class="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
          <div class="flex items-center gap-2">
            <img src="${r.profiles?.avatar_url || 'https://i.imgur.com/6VBx3io.png'}" class="w-5 h-5 rounded-full object-cover">
            <span class="font-bold text-xs text-white">${r.profiles?.username || 'Member'}</span>
            <span class="text-[9px] text-textSub">${new Date(r.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
          <p class="text-xs text-textSub pl-7">${r.content}</p>
        </div>
      `;
    });
  } else {
    container.innerHTML = '<p class="text-xs text-textSub">Noch keine Antworten. Schreib die erste!</p>';
  }
}

window.sendThreadReply = async function(e) {
  e.preventDefault();
  const input = document.getElementById('thread-reply-input');
  const text = input.value.trim();
  if (!text || !activeThreadPostId) return;

  const { error } = await supabase.from('pinboard_replies').insert([{
    post_id: activeThreadPostId,
    author_id: currentUser.id,
    content: text
  }]);

  if (!error) {
    input.value = '';
    const post = allPosts.find(p => p.id === activeThreadPostId);
    if (post) {
      const newCount = (post.reply_count || 0) + 1;
      await supabase.from('pinboard_posts').update({ reply_count: newCount }).eq('id', activeThreadPostId);
    }
    await loadThreadReplies(activeThreadPostId);
    loadPinboardPosts();
  } else {
    alert("Fehler beim Senden: " + error.message);
  }
};

// KALENDER, MEDIATHEK & ROSTER LOGIC
window.changeMonth = function(direction) {
  calendarDate.setMonth(calendarDate.getMonth() + direction);
  renderCalendar();
};

async function renderCalendar() {
  const grid = document.getElementById('calendar-days-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  document.getElementById('calendar-month-year').textContent = calendarDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 1; i <= daysInMonth; i++) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(i).padStart(2, '0');
    const dayStr = `${year}-${mm}-${dd}`;

    grid.innerHTML += `
      <div onclick="selectCalendarDate('${dayStr}', ${i})" class="p-3 rounded-xl border border-white/5 bg-white/5 text-center cursor-pointer hover:border-accentRed hover:bg-accentRed/10 transition">
        <span class="font-bold text-sm">${i}</span>
      </div>
    `;
  }
}

window.selectCalendarDate = async function(dateStr, dayNum) {
  selectedDateString = dateStr;
  document.getElementById('selected-date-title').textContent = `Termine am ${dayNum}. ${calendarDate.toLocaleDateString('de-DE', { month: 'long' })}`;

  const { data: events } = await supabase.from('calendar_events').select('*').eq('event_day', dateStr);
  const container = document.getElementById('day-events-container');
  container.innerHTML = '';

  const role = currentProfile?.role || 'mitspieler';

  if (events && events.length > 0) {
    events.forEach(e => {
      const isOwner = currentUser && e.creator_id === currentUser.id;
      const canDelete = role === 'management' || role === 'admin' || (role === 'mitspieler' && isOwner);

      container.innerHTML += `
        <div class="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
          <div>
            <h5 class="font-bold text-xs text-white">${e.title}</h5>
            <p class="text-[10px] text-textSub">${e.description || 'Keine Beschreibung'}</p>
          </div>
          ${canDelete ? `<button onclick="deleteCalendarEvent('${e.id}')" class="text-xs text-red-400 hover:text-red-600 transition" title="Löschen">🗑️</button>` : ''}
        </div>
      `;
    });
  } else {
    container.innerHTML = `<p class="text-xs text-textSub">Keine Termine an diesem Tag.</p>`;
    if (role !== 'ban') {
      container.innerHTML += `<button onclick="openAddEventModal('${dateStr}')" class="px-3 py-1.5 bg-accentRed/20 text-accentRed border border-accentRed/40 rounded-xl text-xs font-bold w-full mt-2">+ Termin eintragen</button>`;
    }
  }
};

window.openAddEventModal = function(dateStr) {
  if (currentProfile?.role === 'ban') return;
  if (dateStr) document.getElementById('event-date-input').value = dateStr;
  document.getElementById('event-modal').classList.remove('hidden');
};
window.closeAddEventModal = () => document.getElementById('event-modal').classList.add('hidden');

window.saveNewCalendarEvent = async function() {
  const title = document.getElementById('event-title').value;
  const dateVal = document.getElementById('event-date-input').value;
  const desc = document.getElementById('event-desc').value;

  if (!title || !dateVal) return alert("Bitte Titel & Datum angeben!");

  await supabase.from('calendar_events').insert([{
    creator_id: currentUser.id,
    title,
    event_date: new Date(dateVal).toISOString(),
    event_day: dateVal,
    description: desc
  }]);

  closeAddEventModal();
  if (selectedDateString) selectCalendarDate(selectedDateString, parseInt(dateVal.split('-')[2]));
};

window.deleteCalendarEvent = async function(eventId) {
  if (confirm("Termin löschen?")) {
    await supabase.from('calendar_events').delete().eq('id', eventId);
    if (selectedDateString) selectCalendarDate(selectedDateString, parseInt(selectedDateString.split('-')[2]));
  }
};

// MEDIATHEK
async function loadMediaVault() {
  const { data: vault } = await supabase.from('vault_items').select('*, profiles(username)');
  const grid = document.getElementById('media-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const role = currentProfile?.role || 'mitspieler';

  if (vault) {
    vault.forEach(m => {
      const isOwner = currentUser && m.uploader_id === currentUser.id;
      const canDelete = role === 'management' || role === 'admin' || (role === 'mitspieler' && isOwner);

      grid.innerHTML += `
        <div class="glass-card rounded-2xl overflow-hidden border-white/10 p-3 space-y-2 relative">
          <img src="${m.media_url}" class="h-40 w-full object-cover rounded-xl">
          <div class="flex items-center justify-between">
            <div class="truncate">
              <h5 class="font-bold text-xs text-white truncate">${m.title}</h5>
              <p class="text-[10px] text-textSub">Von ${m.profiles?.username || 'Member'}</p>
            </div>
            ${canDelete ? `<button onclick="deleteVaultItem('${m.id}')" class="text-xs text-red-400 hover:text-red-600 transition" title="Löschen">🗑️</button>` : ''}
          </div>
        </div>
      `;
    });
  }
}

window.openUploadModal = () => document.getElementById('upload-modal').classList.remove('hidden');
window.closeUploadModal = () => document.getElementById('upload-modal').classList.add('hidden');

window.uploadMediaToVault = async function() {
  const title = document.getElementById('upload-media-title').value;
  const file = document.getElementById('upload-media-file').files[0];
  if (!title || !file) return alert("Titel und Datei wählen!");

  const filePath = `vault_${Date.now()}.${file.name.split('.').pop()}`;
  const { error } = await supabase.storage.from('vault').upload(filePath, file);

  if (!error) {
    const { data: urlData } = supabase.storage.from('vault').getPublicUrl(filePath);
    await supabase.from('vault_items').insert([{ uploader_id: currentUser.id, title, media_url: urlData.publicUrl }]);
    closeUploadModal();
    loadMediaVault();
  } else {
    alert("Fehler: " + error.message);
  }
};

window.deleteVaultItem = async function(itemId) {
  if (confirm("Datei löschen?")) {
    await supabase.from('vault_items').delete().eq('id', itemId);
    loadMediaVault();
  }
};

// MESSENGER & GRUPPEN LOGIC
async function loadChatRooms() {
  if (!currentUser) return;
  const { data: rooms } = await supabase.from('chat_rooms').select('*');
  const list = document.getElementById('chat-rooms-list');
  if (!list) return;
  list.innerHTML = '';

  if (rooms && rooms.length > 0) {
    if (!activeChatRoomId && rooms.length > 0) {
      activeChatRoomId = rooms[0].id;
      document.getElementById('active-chat-title').textContent = rooms[0].name;
      loadChatMessages(rooms[0].id);
    }

    rooms.forEach(r => {
      const isActive = r.id === activeChatRoomId;
      list.innerHTML += `
        <button onclick="selectRoom('${r.id}', '${r.name}')" class="w-full text-left p-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between ${isActive ? 'bg-accentRed text-white shadow-lg shadow-accentRed/20' : 'text-textSub hover:bg-white/5 hover:text-white'}">
          <span>💬 ${r.name}</span>
        </button>
      `;
    });
  } else {
    await supabase.from('chat_rooms').insert([{ name: 'Quapsattack Main Crew', is_group: true, creator_id: currentUser.id }]);
    loadChatRooms();
  }
}

window.selectRoom = (id, name) => { 
  activeChatRoomId = id; 
  document.getElementById('active-chat-title').textContent = name; 
  loadChatMessages(id);
  loadChatRooms(); 
};

async function loadChatMessages(roomId) {
  const { data: msgs } = await supabase.from('chat_messages').select('*, profiles(username)').eq('room_id', roomId).order('created_at', { ascending: true });
  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  container.innerHTML = '';

  const role = currentProfile?.role || 'mitspieler';

  if (msgs) {
    msgs.forEach(m => {
      const isOwner = currentUser && m.sender_id === currentUser.id;
      const canDelete = role === 'management' || role === 'admin' || (role === 'mitspieler' && isOwner);

      container.innerHTML += `
        <div class="text-xs flex items-center justify-between group bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/5 transition">
          <div>
            <strong class="text-accentRed">${m.profiles?.username || 'User'}:</strong> 
            <span class="text-white ml-2">${m.content}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[9px] text-textSub">${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            ${canDelete ? `<button onclick="deleteChatMessage('${m.id}')" class="text-red-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100" title="Nachricht löschen">🗑️</button>` : ''}
          </div>
        </div>
      `;
    });
  }
  container.scrollTop = container.scrollHeight;
}

window.sendChatMessage = async function(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  if (!input.value.trim() || !activeChatRoomId) return;
  await supabase.from('chat_messages').insert([{ room_id: activeChatRoomId, sender_id: currentUser.id, content: input.value.trim() }]);
  input.value = '';
};

window.deleteChatMessage = async function(msgId) {
  if (confirm("Möchtest du diese Nachricht wirklich löschen?")) {
    const { error } = await supabase.from('chat_messages').delete().eq('id', msgId);
    if (!error && activeChatRoomId) loadChatMessages(activeChatRoomId);
  }
};

// GRUPPEN ERSTELLEN MODAL
window.openNewGroupModal = async function() {
  document.getElementById('group-modal').classList.remove('hidden');
  const container = document.getElementById('group-members-checkboxes');
  container.innerHTML = '<p class="text-xs text-textSub">Lade Mitglieder...</p>';

  const { data: profiles } = await supabase.from('profiles').select('*').neq('id', currentUser.id);
  container.innerHTML = '';

  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      container.innerHTML += `
        <label class="flex items-center gap-2 p-2 rounded-xl bg-black/40 border border-white/5 cursor-pointer hover:border-white/20 transition">
          <input type="checkbox" value="${p.id}" class="group-member-checkbox accent-accentRed">
          <img src="${p.avatar_url || 'https://i.imgur.com/6VBx3io.png'}" class="w-6 h-6 rounded-full object-cover">
          <span class="text-xs font-bold text-white">${p.username}</span>
        </label>
      `;
    });
  } else {
    container.innerHTML = '<p class="text-xs text-textSub">Keine anderen Spieler gefunden.</p>';
  }
};

window.closeNewGroupModal = function() {
  document.getElementById('group-modal').classList.add('hidden');
};

window.createChatGroup = async function() {
  const groupName = document.getElementById('group-name-input').value.trim();
  if (!groupName) return alert("Bitte einen Gruppennamen eingeben!");

  const checkboxes = document.querySelectorAll('.group-member-checkbox:checked');
  const memberIds = Array.from(checkboxes).map(cb => cb.value);
  memberIds.push(currentUser.id);

  const { data: roomData, error: roomErr } = await supabase.from('chat_rooms').insert([{
    name: groupName,
    is_group: true,
    creator_id: currentUser.id
  }]).select().single();

  if (roomErr) {
    alert("Fehler beim Erstellen: " + roomErr.message);
    return;
  }

  const memberInserts = memberIds.map(uid => ({ room_id: roomData.id, user_id: uid }));
  await supabase.from('chat_room_members').insert(memberInserts);

  closeNewGroupModal();
  document.getElementById('group-name-input').value = '';
  loadChatRooms();
  selectRoom(roomData.id, groupName);
  alert(`Gruppe "${groupName}" erfolgreich erstellt! 🚀`);
};

// DIREKTCHAT (PM) MIT EINEM USER
window.startDirectMessage = async function(targetUserId, targetUsername) {
  const dmName = `💬 PM: ${targetUsername}`;
  
  const { data: existingRoom } = await supabase.from('chat_rooms').select('*').eq('name', dmName).maybeSingle();

  if (existingRoom) {
    switchTab('messenger');
    selectRoom(existingRoom.id, existingRoom.name);
  } else {
    const { data: newRoom, error } = await supabase.from('chat_rooms').insert([{
      name: dmName,
      is_group: false,
      creator_id: currentUser.id
    }]).select().single();

    if (!error && newRoom) {
      switchTab('messenger');
      loadChatRooms();
      selectRoom(newRoom.id, newRoom.name);
    }
  }
};

// ROSTER
async function loadRoster() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const grid = document.getElementById('roster-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const isManagement = currentProfile?.role === 'management';

  if (profiles) {
    profiles.forEach(p => {
      const userRole = p.role || 'mitspieler';
      let roleHtml = `<span class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 uppercase">${userRole}</span>`;
      
      if (isManagement) {
        roleHtml = `
          <select onchange="updateUserRole('${p.id}', this.value)" class="bg-black/55 border border-white/15 rounded-lg px-2 py-1 text-[10px] font-mono text-white outline-none">
            <option value="management" ${userRole === 'management' ? 'selected' : ''}>Management</option>
            <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="mitspieler" ${userRole === 'mitspieler' ? 'selected' : ''}>Mitspieler</option>
            <option value="ban" ${userRole === 'ban' ? 'selected' : ''}>Ban</option>
          </select>
        `;
      }

      grid.innerHTML += `
        <div class="glass-card p-4 rounded-2xl border-white/10 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img src="${p.avatar_url || 'https://i.imgur.com/6VBx3io.png'}" class="w-10 h-10 rounded-xl object-cover">
              <div>
                <h4 class="font-bold text-sm text-white">${p.username}</h4>
                <p class="text-[10px] text-textSub">${p.custom_status_text || p.custom_status || 'Online'}</p>
              </div>
            </div>
            <div>${roleHtml}</div>
          </div>
          <div class="flex gap-2">
            ${p.id !== currentUser?.id ? `<button onclick="startDirectMessage('${p.id}', '${p.username}')" class="flex-1 py-1.5 bg-accentRed/20 hover:bg-accentRed text-accentRed hover:text-white border border-accentRed/40 text-xs font-bold rounded-lg transition">💬 PM</button>` : ''}
            <button onclick="alert('BOOM! 💥\\n\\n${p.username}: \\\"${p.personality_quote || 'Profi Coder'}\\\ "')" class="flex-1 py-1.5 bg-white/5 border border-white/10 text-xs font-bold text-white rounded-lg hover:bg-accentRed/20 transition">💥 BOOM Check</button>
          </div>
        </div>
      `;
    });
  }
}

// ==========================================
// QUPASSI KI LOGIC (Google Gen AI SDK + Supabase Context)
// ==========================================
window.sendQupasSIMessage = async function(e) {
  e.preventDefault();
  const input = document.getElementById('qupassi-input');
  const prompt = input.value.trim();
  if (!prompt) return;

  const container = document.getElementById('qupassi-messages-container');
  
  container.innerHTML += `
    <div class="bg-white/10 p-3 rounded-xl border border-white/10 text-xs space-y-1 text-right">
      <strong class="text-white">Du:</strong>
      <p class="text-textSub">${prompt}</p>
    </div>
  `;
  input.value = '';
  container.scrollTop = container.scrollHeight;

  const loadingId = 'ai-loading-' + Date.now();
  container.innerHTML += `
    <div id="${loadingId}" class="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-1">
      <strong class="text-accentRed">🤖 QupasSI:</strong>
      <p class="text-textSub animate-pulse">Analysiert Datenbank & denkt nach...</p>
    </div>
  `;
  container.scrollTop = container.scrollHeight;

  try {
    let dbContext = "";
    const lower = prompt.toLowerCase();
    
    if (lower.includes('pinnwand') || lower.includes('beitrag') || lower.includes('task') || lower.includes('projekt')) {
      const { data: posts } = await supabase.from('pinboard_posts').select('title, content, status, category, coordinates');
      dbContext = "Aktuelle Pinnwand-Einträge in der Datenbank: " + JSON.stringify(posts);
    } else if (lower.includes('wer') || lower.includes('spieler') || lower.includes('roster') || lower.includes('rolle')) {
      const { data: profiles } = await supabase.from('profiles').select('username, role, custom_status_text');
      dbContext = "Registrierte Crew-Mitglieder: " + JSON.stringify(profiles);
    }

 // Verwendung des offiziellen Google Gen AI SDKs
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: Du bist QupasSI, die smarte Crew-Assistenz für das Minecraft-Hub Quapsattack. Antworte extrem kurz, direkt und locker in cooler Jugendsprache mit Slang wie digger, bro, emojis wie 💀 oder 🚀. WICHTIG: Nutze KEINE übertriebenen Bindestriche. Gib am Ende GENAU EINEN kurzen Bro-Tipp. Datenbank-Kontext: ${dbContext}\n\nFrage: ${prompt}`,
    });

    const aiReply = response.text || "Yo Bro, da kam leider keine Antwort zurück! 💀";

    document.getElementById(loadingId).remove();
    container.innerHTML += `
      <div class="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-1">
        <strong class="text-accentRed">🤖 QupasSI:</strong>
        <p class="text-white">${aiReply}</p>
      </div>
    `;
    container.scrollTop = container.scrollHeight;

    if (currentUser) {
      await supabase.from('qupas_si_messages').insert([{
        user_id: currentUser.id,
        prompt: prompt,
        response: aiReply
      }]);
    }

  } catch (err) {
    document.getElementById(loadingId).remove();
    container.innerHTML += `
      <div class="bg-white/5 p-3 rounded-xl border border-white/10 text-xs space-y-1">
        <strong class="text-accentRed">🤖 QupasSI:</strong>
        <p class="text-red-400">Fehler bei der API-Verbindung: ${err.message}</p>
      </div>
    `;
  }
};

function setupRealtimeSubscriptions() {
  supabase.channel('public:pinboard_posts').on('postgres_changes', { event: '*', schema: 'public', table: 'pinboard_posts' }, () => loadPinboardPosts()).subscribe();
  supabase.channel('public:chat_messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
    if (payload.new.room_id === activeChatRoomId) loadChatMessages(activeChatRoomId);
  }).subscribe();
  supabase.channel('public:chat_messages_delete').on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
    if (activeChatRoomId) loadChatMessages(activeChatRoomId);
  }).subscribe();
}

function loadAllData() {
  loadPinboardPosts();
  loadChatRooms();
  renderCalendar();
  loadMediaVault();
  loadRoster();
}
