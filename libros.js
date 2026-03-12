let misLibros = JSON.parse(localStorage.getItem('biblioteca_personal')) || [];
let timeoutBusqueda;
let libroActualId = null; // Variable global para saber qué libro está abierto en el modal

// 1. AUTOCOMPLETADO USANDO OPEN LIBRARY
async function manejarAutocompletado() {
    const query = document.getElementById('book-input').value.trim();
    const dropdown = document.getElementById('sugerencias');

    clearTimeout(timeoutBusqueda);
    if (query.length < 3) {
        dropdown.style.display = 'none';
        return;
    }

    timeoutBusqueda = setTimeout(async () => {
        try {
            const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();

            if (data.docs && data.docs.length > 0) {
                dropdown.innerHTML = "";
                data.docs.forEach(book => {
                    const div = document.createElement('div');
                    div.className = 'sugerencia-item';
                    
                    const coverId = book.cover_i;
                    const img = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-S.jpg` : "https://via.placeholder.com/40x60?text=No+Img";

                    div.innerHTML = `
                        <img src="${img}">
                        <div class="sugerencia-texto">
                            <strong>${book.title}</strong><br>
                            <small>${book.author_name ? book.author_name[0] : 'Autor desconocido'}</small>
                        </div>
                    `;
                    div.onclick = () => añadirLibroOpenLibrary(book);
                    dropdown.appendChild(div);
                });
                dropdown.style.display = 'block';
            }
        } catch (e) {
            console.error("Error en Open Library:", e);
        }
    }, 500);
}

// 2. PROCESAR EL LIBRO SELECCIONADO
function añadirLibroOpenLibrary(book) {
    const nuevoLibro = {
        id: Date.now(),
        titulo: book.title,
        autor: book.author_name ? book.author_name[0] : "Anónimo",
        portada: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : "https://via.placeholder.com/150x200?text=Sin+Portada",
        descripcion: book.first_sentence ? book.first_sentence[0] : "Sin descripción disponible en la biblioteca.",
        estado: 'futuro',
        rating: 0,   // Nuevo campo
        notas: ""    // Nuevo campo
    };

    if (misLibros.find(l => l.titulo === nuevoLibro.titulo)) {
        alert("Ya tienes este libro.");
    } else {
        misLibros.push(nuevoLibro);
        guardarYRenderizar();
    }
    
    document.getElementById('book-input').value = "";
    document.getElementById('sugerencias').style.display = 'none';
}

// 3. RENDERIZADO Y LÓGICA DE INTERFAZ
function renderizarBiblioteca() {
    const listas = {
        leyendo: document.getElementById('lista-leyendo'),
        leidos: document.getElementById('lista-leidos'),
        futuro: document.getElementById('lista-futuro')
    };

    Object.values(listas).forEach(l => { if(l) l.innerHTML = ""; });

    misLibros.forEach(libro => {
        const card = document.createElement('div');
        card.className = 'libro-card';
        card.innerHTML = `
            <img src="${libro.portada}" onclick="verDetalles(${libro.id})" style="cursor:pointer">
            <div class="libro-info">
                <strong class="libro-titulo">${libro.titulo}</strong>
                <p>${libro.autor}</p>
                <div class="stars-preview">${'★'.repeat(libro.rating)}${'☆'.repeat(5 - libro.rating)}</div>
            </div>
            <div class="libro-acciones">
                <div class="select-wrapper">
                    <select class="btn-status" onchange="cambiarEstado(${libro.id}, this.value)">
                        <option value="futuro" ${libro.estado === 'futuro' ? 'selected' : ''}>Pendiente</option>
                        <option value="leyendo" ${libro.estado === 'leyendo' ? 'selected' : ''}>Leyendo</option>
                        <option value="leidos" ${libro.estado === 'leidos' ? 'selected' : ''}>Leído</option>
                    </select>
                </div>
                <button class="btn-eliminar" onclick="eliminarLibro(${libro.id})">×</button>
            </div>
        `;
        if(listas[libro.estado]) listas[libro.estado].appendChild(card);
    });
}

// 4. LÓGICA DEL MODAL (NOTAS Y ESTRELLAS)
function verDetalles(id) {
    const libro = misLibros.find(l => l.id === id);
    if (!libro) return;

    libroActualId = id; // Guardamos qué libro estamos viendo

    // Rellenamos el modal con la info del libro
    document.getElementById('modal-portada').src = libro.portada;
    document.getElementById('modal-titulo').textContent = libro.titulo;
    document.getElementById('modal-autor').textContent = libro.autor;
    document.getElementById('modal-descripcion').textContent = libro.descripcion;
    document.getElementById('notas-personales').value = libro.notas || "";

    // Marcamos las estrellas guardadas
    marcarEstrellas(libro.rating || 0);

    // Mostramos el modal
    document.getElementById('modal-libro').style.display = "block";
}

function puntuar(estrellas) {
    const libro = misLibros.find(l => l.id === libroActualId);
    if (libro) {
        libro.rating = estrellas;
        marcarEstrellas(estrellas);
        guardarYRenderizar();
    }
}

function marcarEstrellas(rating) {
    const stars = document.querySelectorAll('#modal-stars span');
    stars.forEach((s, i) => {
        s.classList.toggle('active', i < rating);
    });
}

function guardarNotas() {
    const libro = misLibros.find(l => l.id === libroActualId);
    const texto = document.getElementById('notas-personales').value;
    if (libro) {
        libro.notas = texto;
        guardarYRenderizar();
        alert("¡Notas guardadas!");
    }
}

function cerrarModal() {
    document.getElementById('modal-libro').style.display = "none";
    document.getElementById('modal-portada').src = ""; // Limpieza para evitar el "texto fantasma"
}

// FUNCIONES AUXILIARES
function cambiarEstado(id, nuevo) {
    misLibros = misLibros.map(l => l.id === id ? {...l, estado: nuevo} : l);
    guardarYRenderizar();
}

function eliminarLibro(id) {
    if(confirm("¿Seguro que quieres eliminar este libro?")) {
        misLibros = misLibros.filter(l => l.id !== id);
        guardarYRenderizar();
    }
}

function guardarYRenderizar() {
    localStorage.setItem('biblioteca_personal', JSON.stringify(misLibros));
    renderizarBiblioteca();
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Actualizar icono del botón
    const btn = document.getElementById('theme-btn');
    btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    // Cerrar modal al hacer clic fuera de él
    window.onclick = (event) => {
        const modal = document.getElementById('modal-libro');
        if (event.target == modal) cerrarModal();
    };
});

window.onload = () => {
    renderizarBiblioteca();
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('theme-btn').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
};