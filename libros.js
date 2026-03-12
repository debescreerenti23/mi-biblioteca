let misLibros = JSON.parse(localStorage.getItem('biblioteca_personal')) || [];
let timeoutBusqueda;

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
            // Buscamos en Open Library (limitado a 5 resultados para velocidad)
            const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`);
            const data = await response.json();

            if (data.docs && data.docs.length > 0) {
                dropdown.innerHTML = "";
                data.docs.forEach(book => {
                    const div = document.createElement('div');
                    div.className = 'sugerencia-item';
                    
                    // Open Library usa IDs de portada (covers)
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
        // Portada en tamaño grande (L)
        portada: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : "https://via.placeholder.com/150x200?text=Sin+Portada",
        // Open Library no siempre da descripción en el search, así que ponemos un texto genérico
        descripcion: book.first_sentence ? book.first_sentence[0] : "Título disponible en la biblioteca abierta.",
        estado: 'futuro'
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
            <img src="${libro.portada}" onclick="verDetalles(${libro.id})">
            <div class="libro-info">
                <strong>${libro.titulo}</strong>
                <p>${libro.autor}</p>
            </div>
            <div class="libro-acciones">
                <div class="select-wrapper">
                    <select class="select-relieve" onchange="cambiarEstado(${libro.id}, this.value)">
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

// FUNCIONES AUXILIARES
function cambiarEstado(id, nuevo) {
    misLibros = misLibros.map(l => l.id === id ? {...l, estado: nuevo} : l);
    guardarYRenderizar();
}

function eliminarLibro(id) {
    misLibros = misLibros.filter(l => l.id !== id);
    guardarYRenderizar();
}

function guardarYRenderizar() {
    localStorage.setItem('biblioteca_personal', JSON.stringify(misLibros));
    renderizarBiblioteca();
}

function verDetalles(id) {
    const libro = misLibros.find(l => l.id === id);
    alert(`${libro.titulo}\n\n${libro.descripcion}`);
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
});

window.onload = () => {
    renderizarBiblioteca();
    document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
};