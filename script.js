// script.js

import { petsCollection, storage } from './firebase.js';
import { addDoc, getDocs } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js';


class Pet {
  constructor(id, nome, especie, status, raca, caracteristicas, ultimaLocalizacao, ultimaData, detalhes, recompensa, telefone, imageUrl, emoji) {
    this.id = id; // Firestore document ID
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
    this.imageUrl = imageUrl; // URL of the uploaded image
    this.emoji = emoji;

    // Set emoji if not provided (e.g., when creating a new pet)
    if (!this.emoji) {
        switch(this.especie) {
            case "Cachorro":
                this.emoji = "🐕";
                break;
            case "Gato":
                this.emoji = "🐈";
                break;
            default:
                this.emoji = "🐦";
        }
    }
  }
}

let pets = [];
let selectedFile = null; // To store the selected image file for upload

// Function to handle image selection from the hidden input
function handleImageSelection(event) {
    selectedFile = event.target.files[0];
    const uploadAreaText = document.getElementById('uploadAreaText');
    if (selectedFile) {
        uploadAreaText.textContent = `Arquivo selecionado: ${selectedFile.name}`;
    } else {
        uploadAreaText.textContent = 'Clique para enviar uma foto';
    }
}
window.handleImageSelection = handleImageSelection; // Make it globally accessible for HTML

// Function to upload image to Firebase Storage
async function uploadImage(file) {
    if (!file) return null;

    // Create a unique name for the file in Storage
    const storageRef = ref(storage, `pet_images/${Date.now()}_${file.name}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the public download URL
    return await getDownloadURL(snapshot.ref);
}

// Function to fetch pet data from Firestore
async function getPetData() {
    pets = []; // Clear existing pets
    try {
        const querySnapshot = await getDocs(petsCollection);
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            pets.push(new Pet(
                doc.id, // Store Firestore document ID
                data.nome,
                data.especie,
                data.status,
                data.raca,
                data.caracteristicas,
                data.ultimaLocalizacao,
                data.ultimaData,
                data.detalhes,
                data.recompensa,
                data.telefone,
                data.imageUrl, // Retrieve image URL
                data.emoji
            ));
        });
        renderPets(pets); // Re-render the pets grid
    } catch (error) {
        console.error("Erro ao carregar dados dos pets:", error);
        showToast("Erro ao carregar pets. Tente novamente.");
    }
}

// Fetch data when the script loads
getPetData();

let filtroAtivo = 'todos';

// Function to render pets in the grid
function renderPets(array) {
    const grid = document.getElementById('pets-grid');
    if (!grid) return; // Ensure grid element exists

    grid.innerHTML = array.map(p => `
      <div class="pet-card" onclick="showToast('Ver detalhes de ${p.nome}')">
        <div class="pet-img">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.nome}" style="width:100%; height:100%; object-fit:cover;">` : p.emoji}
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
    `).join('');
}

// Function to filter pets based on type
function filterPets(tipo, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    filtroAtivo = tipo;
    const filtrado = tipo === 'todos' ? pets
      : tipo === 'encontrado' ? pets.filter(p => p.status !== 'encontrado')
      : pets.filter(p => p.especie === tipo);
    renderPets(filtrado);
}
window.filterPets = filterPets; // Make it globally accessible for HTML

// MODAL functions
function openModal(id) {
    document.getElementById('modal-' + id).classList.add('open');
}
window.openModal = openModal;

function closeModal(id) {
    document.getElementById('modal-' + id).classList.remove('open');
}
window.closeModal = closeModal;

// TOAST functions
let toastTimer;
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}
window.showToast = showToast; // Make it globally accessible

// Function to handle pet registration
async function cadastrar(e) {
    e.preventDefault(); // Prevent default form submission

    try {
        let imageUrl = null;
        if (selectedFile) {
            showToast("Fazendo upload da imagem...");
            // Upload image to Storage first
            imageUrl = await uploadImage(selectedFile);
        }

        // Create pet data object
        const newPetData = new Pet(
            null, // ID will be generated by Firestore
            document.getElementById('nomeForm').value,
            document.getElementById('especieForm').value,
            "perdido", // Default status for new registrations
            document.getElementById('racaForm').value,
            document.getElementById('caracteristicasForm').value,
            document.getElementById('ultimaLocalizacaoForm').value,
            document.getElementById('ultimaDataForm').value,
            document.getElementById('detalhesForm').value,
            document.getElementById('recompensaForm').value,
            document.getElementById('telefoneForm').value,
            imageUrl // Include the uploaded image URL in Firestore
        );

        // Add pet data to Firestore
        // Use spread operator to convert Pet instance to a plain object
        await addDoc(petsCollection, { ...newPetData });

        showToast("Pet cadastrado com sucesso! Você receberá notificações quando houver novidades.");
        
        // Clear form fields and reset selected file
        document.querySelector('.form-grid').reset();
        selectedFile = null;
        document.getElementById('uploadAreaText').textContent = 'Clique para enviar uma foto'; // Reset upload area text

        // Refresh the displayed pet list
        await getPetData();

    } catch (error) {
        console.error("Erro ao cadastrar pet:", error);
        showToast("Erro ao cadastrar pet. Tente novamente.");
    }
}

window.cadastrar = cadastrar; // Make it globally accessible for HTML

// PWA registration (assuming sw.js exists and is correctly configured)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
