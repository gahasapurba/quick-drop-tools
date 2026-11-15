// ==============================================================================
// QUICK DROP - SUPABASE REALTIME CLIENT (MULTI-FILE SUPPORT)
// ==============================================================================

let supabaseClient = null;
let currentTab = 'text';
let selectedFiles = []; // Mendukung multi-file & multi-foto

// DOM Elements
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const streamList = document.getElementById('streamList');
const emptyState = document.getElementById('emptyState');

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupGlobalPasteHandler();
  initSupabase();
});

// 1. Inisialisasi Supabase Client
function initSupabase() {
  const localUrl = localStorage.getItem('qd_supabase_url');
  const localKey = localStorage.getItem('qd_supabase_key');

  const url = localUrl || window.DEFAULT_CONFIG?.supabaseUrl;
  const key = localKey || window.DEFAULT_CONFIG?.supabaseAnonKey;

  if (!url || !key) {
    statusText.textContent = 'Klik ⚙️ untuk atur Supabase';
    statusIndicator.classList.remove('connected');
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(url, key);
    statusIndicator.classList.add('connected');
    statusText.textContent = '⚡ Supabase Realtime Aktif';

    fetchDrops();
    subscribeRealtime();
  } catch (err) {
    console.error('Error init Supabase:', err);
    statusText.textContent = 'Koneksi gagal';
    statusIndicator.classList.remove('connected');
    showToast('Gagal koneksi ke Supabase: ' + err.message, 'error');
  }
}

// Settings Modal
function openSettings() {
  const modal = document.getElementById('settingsModal');
  const currentUrl = localStorage.getItem('qd_supabase_url') || (window.DEFAULT_CONFIG?.supabaseUrl || '');
  const currentKey = localStorage.getItem('qd_supabase_key') || (window.DEFAULT_CONFIG?.supabaseAnonKey || '');

  document.getElementById('supabaseUrlInput').value = currentUrl;
  document.getElementById('supabaseKeyInput').value = currentKey;
  if (modal) modal.classList.add('open');
}

function closeSettings() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('open');
}

function saveSettings() {
  const url = document.getElementById('supabaseUrlInput').value.trim();
  const key = document.getElementById('supabaseKeyInput').value.trim();

  if (!url || !key) {
    showToast('URL dan Key wajib diisi!', 'error');
    return;
  }

  localStorage.setItem('qd_supabase_url', url);
  localStorage.setItem('qd_supabase_key', key);
  closeSettings();
  showToast('Pengaturan disimpan! Menghubungkan...', 'success');
  initSupabase();
}

// 2. Fetch drops list dari Supabase
async function fetchDrops() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('drops')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      console.warn('Fetch warning:', error.message);
      showToast('Gagal mengambil data drops: ' + error.message, 'error');
      return;
    }

    renderDrops(data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

// 3. Supabase Realtime Subscription (WebSocket 0.1s instant sync)
function subscribeRealtime() {
  if (!supabaseClient) return;

  supabaseClient
    .channel('public:drops')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drops' }, payload => {
      prependDropItem(payload.new);
      showToast('⚡ Drop baru diterima!', 'success');
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'drops' }, payload => {
      const el = document.getElementById(`drop-${payload.old.id}`);
      if (el) el.remove();
      allDropsCache = allDropsCache.filter(i => i.id !== payload.old.id);
      updateStorageUsage(allDropsCache);
      checkEmptyState();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        statusIndicator.classList.add('connected');
        statusText.textContent = '⚡ Realtime Terhubung';
      }
    });
}

// 4. Render drops & Storage Meter
const MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1 GB Supabase Free Tier limit
let allDropsCache = [];

function updateStorageUsage(items) {
  allDropsCache = items || [];
  let totalBytes = 0;

  allDropsCache.forEach(item => {
    if (item.file_size) totalBytes += Number(item.file_size);
  });

  const percent = Math.min(100, (totalBytes / MAX_STORAGE_BYTES) * 100);
  const formattedUsed = formatBytes(totalBytes);
  const percentRounded = percent.toFixed(1);

  // Update text & bar
  const storageValText = document.getElementById('storageValText');
  const storageProgressBar = document.getElementById('storageProgressBar');
  const warningBanner = document.getElementById('storageWarningBanner');
  const warningText = document.getElementById('warningText');

  if (storageValText) {
    storageValText.textContent = `${formattedUsed} / 1 GB (${percentRounded}%)`;
  }

  if (storageProgressBar) {
    storageProgressBar.style.width = `${Math.max(1, percent)}%`;
    storageProgressBar.classList.toggle('warning', percent >= 80 && percent < 95);
    storageProgressBar.classList.toggle('danger', percent >= 95);
  }

  // Warning Banner (80% & 95%)
  if (warningBanner) {
    if (percent >= 95) {
      warningBanner.style.display = 'flex';
      warningBanner.className = 'storage-warning-banner critical';
      warningText.innerHTML = `
        <strong>⚠️ Storage Kritis! (${percentRounded}% Terpakai)</strong>
        <p>Kapasitas hampir habis (${formattedUsed} dari 1 GB). Hapus file/foto lama agar bisa kirim file baru.</p>
      `;
    } else if (percent >= 80) {
      warningBanner.style.display = 'flex';
      warningBanner.className = 'storage-warning-banner';
      warningText.innerHTML = `
        <strong>⚠️ Storage Mendekati Batas (${percentRounded}% Terpakai)</strong>
        <p>Kamu sudah menggunakan ${formattedUsed} dari 1 GB kuota Supabase.</p>
      `;
    } else {
      warningBanner.style.display = 'none';
    }
  }
}

function renderDrops(items) {
  streamList.innerHTML = '';
  updateStorageUsage(items);

  if (!items || items.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  items.forEach(item => {
    streamList.appendChild(createDropElement(item));
  });
}

function prependDropItem(item) {
  emptyState.style.display = 'none';
  const el = createDropElement(item);
  streamList.prepend(el);

  allDropsCache.unshift(item);
  updateStorageUsage(allDropsCache);
}

function checkEmptyState() {
  if (streamList.children.length === 0) {
    emptyState.style.display = 'flex';
  }
  updateStorageUsage(allDropsCache);
}

function createDropElement(item) {
  const card = document.createElement('div');
  card.className = 'stream-item';
  card.id = `drop-${item.id}`;

  const timeAgo = formatTime(item.created_at);

  let typeBadge = '';
  let contentHtml = '';
  let copyActionBtn = '';

  if (item.type === 'text') {
    typeBadge = `<span>📝 Teks</span>`;
    contentHtml = `<div class="item-text-body" id="text-val-${item.id}">${escapeHtml(item.content)}</div>`;
    copyActionBtn = `
      <button class="action-btn" onclick="copyTextToClipboard('${item.id}')" title="Copy teks ke clipboard">
        📋 <span>Copy Teks</span>
      </button>
    `;
  } else if (item.type === 'image') {
    typeBadge = `<span>🖼️ Gambar</span>`;
    contentHtml = `
      <div class="item-image-wrapper">
        <img src="${item.file_url}" id="img-${item.id}" alt="Dropped Image" loading="lazy" onclick="window.open('${item.file_url}', '_blank')">
      </div>
      ${item.content ? `<div class="item-text-body" style="border-left-color: var(--success);">${escapeHtml(item.content)}</div>` : ''}
    `;
    copyActionBtn = `
      <button class="action-btn" onclick="copyImageToClipboard('${item.file_url}', this)" title="Copy image langsung ke clipboard">
        📸 <span>Copy Image</span>
      </button>
      <a href="${item.file_url}" target="_blank" download="${item.file_name || 'image.png'}" class="action-btn" style="text-decoration:none;">
        💾 <span>Download</span>
      </a>
    `;
  } else if (item.type === 'file') {
    typeBadge = `<span>📁 File</span>`;
    const sizeStr = item.file_size ? formatBytes(item.file_size) : '';
    contentHtml = `
      <div class="item-file-wrapper">
        <div class="file-icon">📄</div>
        <div class="file-info">
          <div class="file-name" title="${escapeHtml(item.file_name)}">${escapeHtml(item.file_name)}</div>
          <div class="file-size">${sizeStr}</div>
        </div>
      </div>
    `;
    copyActionBtn = `
      <a href="${item.file_url}" target="_blank" download="${item.file_name || 'download'}" class="action-btn" style="text-decoration:none;">
        ⬇️ <span>Download</span>
      </a>
    `;
  }

  card.innerHTML = `
    <div class="item-meta">
      <div class="item-badge">${typeBadge} • ${timeAgo}</div>
      <div class="item-actions">
        ${copyActionBtn}
        <button class="action-btn btn-delete" onclick="deleteDrop('${item.id}', '${item.file_url || ''}')" title="Hapus">
          🗑️
        </button>
      </div>
    </div>
    ${contentHtml}
  `;

  return card;
}

// 5. 1-Click Copy Teks
async function copyTextToClipboard(id) {
  const textEl = document.getElementById(`text-val-${id}`);
  if (!textEl) return;

  const text = textEl.innerText;
  try {
    await navigator.clipboard.writeText(text);
    showToast('✅ Teks berhasil di-copy ke clipboard!', 'success');
  } catch (err) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast('✅ Teks berhasil di-copy!', 'success');
  }
}

// 6. 1-Click Copy Image langsung ke OS Clipboard
async function copyImageToClipboard(imageUrl, btnElement) {
  const originalText = btnElement ? btnElement.innerHTML : '';
  if (btnElement) btnElement.innerHTML = '⏳ <span>Copying...</span>';

  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();

    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      pngBlob = await convertImageToPngBlob(blob);
    }

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob })
    ]);

    showToast('✨ Gambar berhasil di-copy! Siap di-paste (Cmd+V)', 'success');
  } catch (err) {
    console.error('Error copy image:', err);
    showToast('Gunakan klik kanan > Copy Image', 'error');
  } finally {
    if (btnElement) btnElement.innerHTML = originalText;
  }
}

function convertImageToPngBlob(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(png => {
        if (png) resolve(png);
        else reject(new Error('Canvas to PNG failed'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// 7. Send Drop (Text / Multi-Files / Multi-Images)
async function sendDrop() {
  if (!supabaseClient) {
    showToast('Supabase belum terhubung', 'error');
    return;
  }

  const sendBtn = document.getElementById('sendDropBtn');
  sendBtn.disabled = true;

  try {
    if (currentTab === 'text') {
      sendBtn.innerHTML = '⏳ Mengirim...';
      const textInput = document.getElementById('dropText');
      const text = textInput.value.trim();
      if (!text) {
        showToast('Teks tidak boleh kosong', 'error');
        return;
      }

      const { error } = await supabaseClient.from('drops').insert([
        { type: 'text', content: text }
      ]);

      if (error) throw error;
      textInput.value = '';
      showToast('🚀 Teks terkirim!', 'success');
    } else {
      if (!selectedFiles || selectedFiles.length === 0) {
        showToast('Pilih foto / file terlebih dahulu', 'error');
        return;
      }

      const totalFiles = selectedFiles.length;
      let successCount = 0;

      // Upload satu per satu secara berurutan
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        sendBtn.innerHTML = `⏳ Mengunggah (${i + 1}/${totalFiles})...`;

        const isImg = file.type.startsWith('image/');
        const fileExt = file.name.split('.').pop() || 'dat';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        // Upload ke Supabase Storage Bucket 'drop-files'
        const { error: uploadErr } = await supabaseClient.storage
          .from('drop-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadErr) {
          console.error('Upload item error:', uploadErr);
          throw uploadErr;
        }

        // Ambil Public URL
        const { data: publicUrlData } = supabaseClient.storage
          .from('drop-files')
          .getPublicUrl(filePath);

        const fileUrl = publicUrlData.publicUrl;

        // Simpan metadata ke tabel drops
        const { error: insertErr } = await supabaseClient.from('drops').insert([
          {
            type: isImg ? 'image' : 'file',
            file_url: fileUrl,
            file_name: file.name,
            file_size: file.size,
            content: ''
          }
        ]);

        if (insertErr) throw insertErr;
        successCount++;
      }

      resetFileInput();
      showToast(`🎉 Berhasil mengirim ${successCount} item!`, 'success');
    }
  } catch (err) {
    console.error('Send error:', err);
    showToast('Gagal mengirim: ' + err.message, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '🚀 Kirim Drop';
  }
}

// 8. Hapus Drop (dengan Delay & Tombol Undo/Batal)
let pendingDeletions = new Map(); // id -> { timeoutId, item, element }
let pendingClearAll = null; // { timeoutId, items }

function deleteDrop(id, fileUrl) {
  if (!supabaseClient) return;

  // Cari item di cache
  const item = allDropsCache.find(i => i.id === id);
  const el = document.getElementById(`drop-${id}`);

  if (!item) return;

  // Sembunyikan item sementara dari layar (optimistic remove)
  if (el) el.style.display = 'none';

  // Hapus dari cache sementara dan update storage counter
  const prevDrops = [...allDropsCache];
  allDropsCache = allDropsCache.filter(i => i.id !== id);
  updateStorageUsage(allDropsCache);
  checkEmptyState();

  // Pasang timer 5 detik untuk eksekusi penghapusan permanen
  const timeoutId = setTimeout(async () => {
    pendingDeletions.delete(id);
    try {
      const { error } = await supabaseClient.from('drops').delete().eq('id', id);
      if (error) throw error;

      if (fileUrl && fileUrl.includes('/drop-files/')) {
        const path = fileUrl.split('/drop-files/')[1];
        if (path) {
          await supabaseClient.storage.from('drop-files').remove([decodeURIComponent(path)]);
        }
      }
    } catch (err) {
      console.error('Permanent delete error:', err);
    }
  }, 5000);

  pendingDeletions.set(id, { timeoutId, item, element: el });

  // Tampilkan toast dengan tombol Batal / Undo
  showToastWithAction('🗑️ Drop akan dihapus dalam 5s...', 'Batal ↩️', () => {
    // Batalkan penghapusan
    if (pendingDeletions.has(id)) {
      clearTimeout(pendingDeletions.get(id).timeoutId);
      pendingDeletions.delete(id);

      if (el) el.style.display = 'flex';
      allDropsCache = prevDrops;
      updateStorageUsage(allDropsCache);
      checkEmptyState();
      showToast('✅ Penghapusan dibatalkan!', 'info');
    }
  }, 5000);
}

function clearAllDrops() {
  if (!supabaseClient) return;
  if (allDropsCache.length === 0) {
    showToast('Tidak ada data untuk dibersihkan', 'info');
    return;
  }

  // Simpan data lama untuk kemungkinan di-undo
  const savedDrops = [...allDropsCache];

  // Sembunyikan semua item sementara
  streamList.innerHTML = '';
  allDropsCache = [];
  updateStorageUsage([]);
  checkEmptyState();

  // Pasang timer 5 detik untuk eksekusi permanen
  const timeoutId = setTimeout(async () => {
    pendingClearAll = null;
    try {
      const { error } = await supabaseClient.from('drops').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;

      // Hapus file di storage juga
      const filePaths = savedDrops
        .filter(item => item.file_url && item.file_url.includes('/drop-files/'))
        .map(item => decodeURIComponent(item.file_url.split('/drop-files/')[1]))
        .filter(Boolean);

      if (filePaths.length > 0) {
        await supabaseClient.storage.from('drop-files').remove(filePaths);
      }
    } catch (err) {
      console.error('Permanent clear error:', err);
    }
  }, 5000);

  pendingClearAll = { timeoutId, items: savedDrops };

  // Tampilkan toast dengan tombol Batal / Undo
  showToastWithAction(`🗑️ Menghapus semua (${savedDrops.length} item) dalam 5s...`, 'Batal ↩️', () => {
    if (pendingClearAll) {
      clearTimeout(pendingClearAll.timeoutId);
      const restored = pendingClearAll.items;
      pendingClearAll = null;

      renderDrops(restored);
      showToast('✅ Pembersihan dibatalkan!', 'info');
    }
  }, 5000);
}

// 9. Global Paste Event (Bisa langsung Cmd+V di web)
function setupGlobalPasteHandler() {
  window.addEventListener('paste', async (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    const items = e.clipboardData.items;
    let foundImages = [];

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) foundImages.push(file);
      }
    }

    if (foundImages.length > 0) {
      switchTab('file');
      appendSelectedFiles(foundImages);
      showToast(`📸 ${foundImages.length} gambar terdeteksi dari clipboard!`, 'success');
      e.preventDefault();
      return;
    }

    const pastedText = e.clipboardData.getData('text');
    if (pastedText) {
      switchTab('text');
      const textArea = document.getElementById('dropText');
      textArea.value = pastedText;
      textArea.focus();
      showToast('📋 Teks di-paste ke box input', 'success');
    }
  });
}

// 10. Multi-File Selection & Preview Grid
function appendSelectedFiles(files) {
  if (!files || files.length === 0) return;
  selectedFiles = selectedFiles.concat(Array.from(files));
  renderFilesPreview();
}

function removeSelectedFile(index) {
  selectedFiles.splice(index, 1);
  renderFilesPreview();
}

function renderFilesPreview() {
  const container = document.getElementById('filesPreviewContainer');
  const grid = document.getElementById('filesPreviewGrid');
  const countText = document.getElementById('previewCountText');

  if (selectedFiles.length === 0) {
    container.style.display = 'none';
    grid.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  countText.textContent = `${selectedFiles.length} file dipilih`;
  grid.innerHTML = '';

  selectedFiles.forEach((file, index) => {
    const card = document.createElement('div');
    card.className = 'preview-card';

    const isImg = file.type.startsWith('image/');
    let mediaHtml = isImg ? `<img src="${URL.createObjectURL(file)}" alt="Thumb">` : `<div style="font-size: 2rem; text-align: center; padding: 0.5rem 0;">📄</div>`;

    card.innerHTML = `
      <button class="card-remove" onclick="removeSelectedFile(${index})">✕</button>
      ${mediaHtml}
      <span class="card-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
      <span style="font-size: 0.7rem; color: var(--text-dim);">${formatBytes(file.size)}</span>
    `;

    grid.appendChild(card);
  });
}

function resetFileInput() {
  selectedFiles = [];
  document.getElementById('fileInput').value = '';
  renderFilesPreview();
}

// 11. UI Events
function setupEventListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) appendSelectedFiles(e.target.files);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) appendSelectedFiles(e.dataTransfer.files);
  });

  document.getElementById('dropText').addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendDrop();
  });
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === `${tab}Tab`);
  });
}

// Utilities
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function showToastWithAction(message, actionLabel, actionCallback, durationMs = 5000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast warning';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  const actionBtn = document.createElement('button');
  actionBtn.className = 'toast-undo-btn';
  actionBtn.textContent = actionLabel;
  actionBtn.onclick = () => {
    toast.remove();
    actionCallback();
  };
  toast.appendChild(actionBtn);

  container.appendChild(toast);
  setTimeout(() => toast.remove(), durationMs);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatTime(isoString) {
  if (!isoString) return 'Baru saja';
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 10) return 'Baru saja';
  if (diffSec < 60) return `${diffSec}d lalu`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;
  return date.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
