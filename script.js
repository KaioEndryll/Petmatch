// script.js

import { petsCollection, storage } from './firebase.js';
import { addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js';


class Pet {
  constructor(id, nome, especie, status, raca, caracteristicas, ultimaLocalizacao, ultimaData, detalhes, recompensa, telefone, imageUrl, emoji) {
    this.id = id;
    this.nome = nome;
    this.especie = especie;
    this.status = status;
    this.raca = raca;
    this.caracteristicas = caracteristicas;
    this.ultimaLocalizacao = ultimaLocalizacao;
    this.ultimaData = ultimaData;
    this.detalhes = detalhes;
    this.recompensa = recompensa;
    this.telefone = telefone;
    this.imageUrl = imageUrl;
    this.emoji = emoji;

    if (!this.emoji) {
      switch (this.especie) {
        case 'Cachorro': this.emoji = '🐕'; break;
        case 'Gato':     this.emoji = '🐈'; break;
        default:         this.emoji = '🐦'; break;
      }
    }
  }
}

let pets = [];
let selectedFiles = []; // array de arquivos selecionados

// ──────────────────────────────────────────────
// FOTO — seleção com preview em grade
// ──────────────────────────────────────────────
function handleImageSelection(event) {
  const newFiles = Array.from(event.target.files);
  selectedFiles = [...selectedFiles, ...newFiles];
  renderPhotoPreview();
}

function renderPhotoPreview() {
  const grid = document.getElementById('photoPreviewGrid');
  const placeholder = document.getElementById('uploadPlaceholder');
  const uploadArea = document.getElementById('uploadArea');

  if (selectedFiles.length === 0) {
    grid.style.display = 'none';
    placeholder.style.display = 'block';
    uploadArea.classList.remove('has-files');
    return;
  }

  placeholder.style.display = 'none';
  grid.style.display = 'grid';
  uploadArea.classList.add('has-files');

  grid.innerHTML = selectedFiles.map((file, index) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="preview-item">
        <img src="${url}" alt="Preview ${index + 1}">
        <button class="preview-remove" type="button" onclick="removePhoto(${index})" title="Remover">✕</button>
      </div>
    `;
  }).join('');
}

function removePhoto(index) {
  selectedFiles.splice(index, 1);
  renderPhotoPreview();
  // Atualiza o input para evitar reenvio do arquivo removido
  document.getElementById('petImageForm').value = '';
}

window.handleImageSelection = handleImageSelection;
window.removePhoto = removePhoto;

// ──────────────────────────────────────────────
// FIREBASE — buscar pets
// ──────────────────────────────────────────────
async function uploadImage(file) {
  if (!file) return null;
  const storageRef = ref(storage, `pet_images/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

async function getPetData() {
  pets = [];
  try {
    const querySnapshot = await getDocs(petsCollection);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      pets.push(new Pet(
        doc.id,
        data.nome, data.especie, data.status, data.raca,
        data.caracteristicas, data.ultimaLocalizacao, data.ultimaData,
        data.detalhes, data.recompensa, data.telefone,
        data.imageUrl, data.emoji
      ));
    });
    renderPets(pets);
  } catch (error) {
    console.error('Erro ao carregar dados dos pets:', error);
    showToast('Erro ao carregar pets. Tente novamente.');
  }
}

getPetData();

// ──────────────────────────────────────────────
// CARROSSEL INFINITO
// ──────────────────────────────────────────────
function buildCardHTML(p) {
  return `
    <div class="pet-card" onclick="showToast('Ver detalhes de ${p.nome}')">
      <div class="pet-img">
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${p.nome}" style="width:100%;height:100%;object-fit:cover;">`
          : p.emoji}
      </div>
      <div class="pet-name">${p.nome}</div>
      <div class="pet-body">
        <span class="pet-status ${p.status === 'perdido' ? 'status-perdido' : 'status-encontrado'}">
          ${p.status === 'perdido' ? '🔴 Perdido' : '🟢 Encontrado'}
        </span>
        <div class="pet-specie">${p.especie}</div>
        <div class="pet-info">📍 ${p.ultimaLocalizacao}</div>
        <div class="pet-footer">
          <span class="reward-badge">💰 R$ ${parseFloat(p.recompensa).toFixed(2).replace('.', ',')}</span>
          <span class="pet-date">${p.ultimaData}</span>
        </div>
      </div>
    </div>
  `;
}

function renderPets(array) {
  const track = document.getElementById('pets-grid');
  if (!track) return;

  const isFiltered = array.length !== pets.length;

  if (array.length === 0) {
    track.innerHTML = '<p style="color:var(--muted);padding:40px;">Nenhum pet encontrado.</p>';
    track.classList.add('static-mode');
    return;
  }

  if (isFiltered) {
    // Modo grade estático quando há filtro ativo
    track.classList.add('static-mode');
    track.innerHTML = array.map(buildCardHTML).join('');
  } else {
    // Carrossel infinito: duplicar cards para loop suave
    track.classList.remove('static-mode');
    const cardsHTML = array.map(buildCardHTML).join('');
    track.innerHTML = cardsHTML + cardsHTML; // duplicado para looping
  }
}

let filtroAtivo = 'todos';

function filterPets(tipo, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  filtroAtivo = tipo;

  let filtrado;
  if (tipo === 'todos')       filtrado = pets;
  else if (tipo === 'perdido') filtrado = pets.filter(p => p.status !== 'encontrado');
  else                        filtrado = pets.filter(p => p.especie === tipo);

  renderPets(filtrado);
}
window.filterPets = filterPets;

// ──────────────────────────────────────────────
// MODAL
// ──────────────────────────────────────────────
function openModal(id) { document.getElementById('modal-' + id).classList.add('open'); }
function closeModal(id) { document.getElementById('modal-' + id).classList.remove('open'); }
window.openModal = openModal;
window.closeModal = closeModal;

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-text').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
window.showToast = showToast;

// ──────────────────────────────────────────────
// CADASTRAR
// ──────────────────────────────────────────────
async function cadastrar(event) {
  event.preventDefault();
  try {
    let imageUrl = null;
    if (selectedFiles.length > 0) {
      showToast('Fazendo upload da imagem...');
      imageUrl = await uploadImage(selectedFiles[0]); // envia a primeira
    }

    const newPetData = new Pet(
      null,
      document.getElementById('nomeForm').value,
      document.getElementById('especieForm').value,
      'perdido',
      document.getElementById('racaForm').value,
      document.getElementById('caracteristicasForm').value,
      document.getElementById('ultimaLocalizacaoForm').value,
      document.getElementById('ultimaDataForm').value,
      document.getElementById('detalhesForm').value,
      document.getElementById('recompensaForm').value,
      document.getElementById('telefoneForm').value,
      imageUrl
    );

    await addDoc(petsCollection, { ...newPetData });

    showToast('Pet cadastrado com sucesso! A comunidade será acionada.');

    // Reset form
    document.querySelector('.form-grid').reset();
    selectedFiles = [];
    renderPhotoPreview();

    await getPetData();

  } catch (error) {
    console.error('Erro ao cadastrar pet:', error);
    showToast('Erro ao cadastrar pet. Tente novamente.');
  }
}
window.cadastrar = cadastrar;

// ──────────────────────────────────────────────
// PWA
// ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
