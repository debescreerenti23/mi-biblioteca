/**
 * BIBLIOTECA VIRTUAL PRO - main.js
 * Desarrollado por javilindj
 * Incluye: API Google Books, Autocompletado, Persistencia y Modal de Detalles.
 */

// --- 1. ESTADO DE LA APLICACIÓN ---
let misLibros = JSON.parse(localStorage.getItem('biblioteca_personal')) || [];
let timeoutBusqueda; 

/**
 * --- 2. LÓGICA DE AUTOCOMPLETADO (Búsqueda en vivo) ---
 */

function manejarAutocompletado() {
    const input = document.getElementById('book-input');
    const query = input.value.trim();
    const dropdown = document.getElementById('sugerencias');

    clearTimeout(timeoutBusqueda);

    if (query.length < 3) {
        dropdown.style.display = 'none';
        return;
    }

    // Debouncing: Esperar 400ms para no saturar la API
    timeoutBusqueda = setTimeout(async () => {
        try {
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`);
            const data = await response.json();
            mostrarSugerencias(data.items);
        } catch (error) {
            console.error("Error en autocompletado:", error);
        }
    }, 400);
}

function mostrarSugerencias(libros) {
    const dropdown = document.getElementById('sugerencias');
    dropdown.innerHTML = "";

    if (!libros || libros.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    libros.forEach(item => {
        const info = item.volumeInfo;
        const div = document.createElement('div');
        div.className = 'sugerencia-item';
        
        const portada = info.imageLinks ? info.imageLinks.smallThumbnail.replace('http:', 'https:') : "https://via.placeholder.com/40x60?text=No+Img";

        div.innerHTML = `
            <img src="${portada}" alt="portada" style="pointer-events: none;">
            <div class="sugerencia-texto" style="pointer-events: none;">
                <strong>${info.title}</strong><br>
                <small>${info.authors ? info.authors[0] : 'Desconocido'}</small>
            </div>
        `;

        div.onclick = (e) => {
            e.stopPropagation();
            seleccionarLibro(item);
            dropdown.style.display = 'none';
            document.getElementById('book-input').value = "";
        };

        dropdown.appendChild(div);
    });

    dropdown.style.display = 'block';
}

/**
 * --- 3. GESTIÓN DE LIBROS ---
 */

function seleccionarLibro(item) {
    const info = item.volumeInfo;
    
    // Evitar que el usuario añada el mismo libro dos veces
    if (misLibros.find(l => l.titulo === info.title)) {
        alert("Este libro ya está en tu lista.");
        return;
    }

    const nuevoLibro = {
        id: Date.now(),
        titulo: info.title,
        autor: info.authors ? info.authors[0] : "Autor desconocido",
        portada: info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : "https://via.placeholder.com/150x200?text=Sin+Portada",
        descripcion: info.description || "Este libro no tiene una descripción disponible en Google Books.",
        estado: 'futuro'
    };

    misLibros.push(nuevoLibro);
    guardarYRenderizar();
}

async function buscarLibro() {
    const input = document.getElementById('book-input');
    const query = input.value.trim();
    if (!query) return;

    document.getElementById('sugerencias').style.display = 'none';

    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            seleccionarLibro(data.items[0]);
            input.value = "";
        }
    } catch (e) { console.error(e); }
}

function cambiarEstado(id, nuevoEstado) {
    misLibros = misLibros.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l);
    guardarYRenderizar();
}

function eliminarLibro(id) {
    if (confirm("¿Eliminar este libro?")) {
        misLibros = misLibros.filter(l => l.id !== id);
        guardarYRenderizar();
    }
}

/**
 * --- 4. MODAL DE DETALLES ---
 */

function verDetalles(id) {
    const libro = misLibros.find(l => l.id === id);
    if (!libro) return;

    document.getElementById('modal-titulo').innerText = libro.titulo;
    document.getElementById('modal-autor').innerText = libro.autor;
    document.getElementById('modal-descripcion').innerHTML = libro.descripcion;
    document.getElementById('modal-portada').src = libro.portada;

    document.getElementById('modal-libro').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-libro').style.display = 'none';
}

/**
 * --- 5. RENDERIZADO Y ARRANQUE ---
 */

function renderizarBiblioteca() {
    const secciones = {
        leyendo: document.getElementById('lista-leyendo'),
        leidos: document.getElementById('lista-leidos'),
        futuro: document.getElementById('lista-futuro')
    };

    Object.values(secciones).forEach(s => { if(s) s.innerHTML = ""; });

    misLibros.forEach(libro => {
        const card = document.createElement('div');
        card.className = 'libro-card';
        card.innerHTML = `
            <img src="${libro.portada}" alt="${libro.titulo}" onclick="verDetalles(${libro.id})" style="cursor:pointer">
            <div class="libro-info">
                <p class="libro-titulo">${libro.titulo}</p>
                <p class="libro-autor">${libro.autor}</p>
            </div>
            <div class="libro-acciones">
                <select class="btn-status" onchange="cambiarEstado(${libro.id}, this.value)">
                    <option value="futuro" ${libro.estado === 'futuro' ? 'selected' : ''}>Pendiente</option>
                    <option value="leyendo" ${libro.estado === 'leyendo' ? 'selected' : ''}>Leyendo</option>
                    <option value="leidos" ${libro.estado === 'leidos' ? 'selected' : ''}>Leído</option>
                </select>
                <button class="btn-eliminar" onclick="eliminarLibro(${libro.id})">&times;</button>
            </div>
        `;
        secciones[libro.estado].appendChild(card);
    });
}

function guardarYRenderizar() {
    localStorage.setItem('biblioteca_personal', JSON.stringify(misLibros));
    renderizarBiblioteca();
}

// Eventos globales
window.onclick = (e) => {
    if (e.target == document.getElementById('modal-libro')) cerrarModal();
    if (!e.target.closest('.search-box')) document.getElementById('sugerencias').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    renderizarBiblioteca();
    document.getElementById('book-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarLibro();
    });
});

/**
 * --- LÓGICA DE MODO OSCURO ---
 */
function toggleTheme() {
    const body = document.body;
    const btn = document.getElementById('theme-btn');
    
    // Cambiamos el atributo data-theme
    if (body.getAttribute('data-theme') === 'dark') {
        body.setAttribute('data-theme', 'light');
        btn.innerText = "🌙";
        localStorage.setItem('theme-biblioteca', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        btn.innerText = "☀️";
        localStorage.setItem('theme-biblioteca', 'dark');
    }
}

// Aplicar el tema guardado al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme-biblioteca') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-btn').innerText = savedTheme === 'dark' ? "☀️" : "🌙";
    
    renderizarBiblioteca(); // Tu función de siempre
});