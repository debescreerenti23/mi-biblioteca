/**
 * BIBLIOTECA VIRTUAL - main.js
 * Desarrollado por javilindj
 * Funcionalidades: Búsqueda API Google Books, Autocompletado, Gestión de estados y Persistencia.
 */

// --- 1. ESTADO DE LA APLICACIÓN ---
let misLibros = JSON.parse(localStorage.getItem('biblioteca_personal')) || [];
let timeoutBusqueda; // Para controlar el debouncing del autocompletado

/**
 * --- 2. LÓGICA DE BÚSQUEDA Y API ---
 */

// Función que se dispara al escribir en el input (oninput)
function manejarAutocompletado() {
    const input = document.getElementById('book-input');
    const query = input.value.trim();
    const dropdown = document.getElementById('sugerencias');

    // Limpiamos el timer anterior para evitar múltiples llamadas seguidas
    clearTimeout(timeoutBusqueda);

    // Si hay menos de 3 letras, ocultamos las sugerencias
    if (query.length < 3) {
        dropdown.style.display = 'none';
        return;
    }

    // Esperamos 400ms después de que el usuario deja de escribir para llamar a la API
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

// Muestra las coincidencias en el desplegable
function mostrarSugerencias(libros) {
    const dropdown = document.getElementById('sugerencias');
    
    // Si no hay libros o la búsqueda está vacía, escondemos y salimos
    if (!libros || libros.length === 0) {
        dropdown.innerHTML = "";
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = ""; // Limpiamos contenido previo

    libros.forEach(item => {
        const info = item.volumeInfo;
        const div = document.createElement('div');
        div.className = 'sugerencia-item';
        
        // Verificación ultra-segura de la imagen
        let portadaUrl = "https://via.placeholder.com/40x60?text=No+Img";
        if (info.imageLinks && info.imageLinks.smallThumbnail) {
            portadaUrl = info.imageLinks.smallThumbnail.replace('http:', 'https:');
        }

        div.innerHTML = `
            <img src="${portadaUrl}" alt="portada" style="pointer-events: none;">
            <div class="sugerencia-texto" style="pointer-events: none;">
                <strong>${info.title || 'Título desconocido'}</strong><br>
                <small>${info.authors ? info.authors[0] : 'Autor desconocido'}</small>
            </div>
        `;

        // Al hacer clic, añadimos el libro
        div.onclick = (e) => {
            e.stopPropagation(); // Evita interferencias
            seleccionarLibro(item);
            dropdown.style.display = 'none';
            document.getElementById('book-input').value = "";
        };

        dropdown.appendChild(div);
    });

    dropdown.style.display = 'block';
}

/**
 * --- 3. GESTIÓN DE LA COLECCIÓN ---
 */

// Crea el objeto libro y lo guarda en el array principal
function seleccionarLibro(item) {
    const info = item.volumeInfo;
    
    // Evitar duplicados (opcional)
    const existe = misLibros.find(l => l.titulo === info.title);
    if (existe) {
        alert("Este libro ya está en tu biblioteca.");
        return;
    }

    const nuevoLibro = {
        id: Date.now(),
        titulo: info.title,
        autor: info.authors ? info.authors[0] : "Autor desconocido",
        portada: info.imageLinks ? info.imageLinks.thumbnail.replace('http:', 'https:') : "https://via.placeholder.com/150x200?text=Sin+Portada",
        descripcion: info.description || "Sin descripción disponible.",
        estado: 'futuro' // Por defecto: Pendiente
    };

    misLibros.push(nuevoLibro);
    guardarYRenderizar();
}

// Función para el botón "Añadir" manual o tecla Enter
async function buscarLibro() {
    const input = document.getElementById('book-input');
    const query = input.value.trim();
    if (!query) return;

    // Ocultamos el dropdown si estaba abierto
    document.getElementById('sugerencias').style.display = 'none';

    try {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`);
        const data = await response.json();
        if (data.items && data.items.length > 0) {
            seleccionarLibro(data.items[0]);
            input.value = "";
        } else {
            alert("No se encontraron resultados.");
        }
    } catch (e) {
        console.error("Error en búsqueda manual:", e);
    }
}

// Cambiar de categoría (Leyendo, Leído, Futuro)
function cambiarEstado(id, nuevoEstado) {
    misLibros = misLibros.map(libro => {
        if (libro.id === id) {
            return { ...libro, estado: nuevoEstado };
        }
        return libro;
    });
    guardarYRenderizar();
}

// Borrar libro
function eliminarLibro(id) {
    if (confirm("¿Seguro que quieres eliminar este libro de tu biblioteca?")) {
        misLibros = misLibros.filter(libro => libro.id !== id);
        guardarYRenderizar();
    }
}

/**
 * --- 4. RENDERIZADO Y PERSISTENCIA ---
 */

function renderizarBiblioteca() {
    const secciones = {
        leyendo: document.getElementById('lista-leyendo'),
        leidos: document.getElementById('lista-leidos'),
        futuro: document.getElementById('lista-futuro')
    };

    // Limpiar HTML actual
    Object.values(secciones).forEach(s => { if(s) s.innerHTML = ""; });

    misLibros.forEach(libro => {
        const card = document.createElement('div');
        card.className = 'libro-card';
        card.innerHTML = `
            <img src="${libro.portada}" alt="${libro.titulo}">
            <div class="libro-info">
                <p class="libro-titulo">${libro.titulo}</p>
                <p class="libro-autor">${libro.autor}</p>
            </div>
            <div class="libro-acciones">
                <select class="btn-status" onchange="cambiarEstado(${libro.id}, this.value)">
                    <option value="futuro" ${libro.estado === 'futuro' ? 'selected' : ''}>⏳ Pendiente</option>
                    <option value="leyendo" ${libro.estado === 'leyendo' ? 'selected' : ''}>📖 Leyendo</option>
                    <option value="leidos" ${libro.estado === 'leidos' ? 'selected' : ''}>✅ Leído</option>
                </select>
                <button class="btn-eliminar" onclick="eliminarLibro(${libro.id})">&times;</button>
            </div>
        `;
        
        // Verificamos que la sección existe antes de inyectar
        if (secciones[libro.estado]) {
            secciones[libro.estado].appendChild(card);
        }
    });
}

function guardarYRenderizar() {
    localStorage.setItem('biblioteca_personal', JSON.stringify(misLibros));
    renderizarBiblioteca();
}

// Cerrar sugerencias al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        document.getElementById('sugerencias').style.display = 'none';
    }
});

// Soporte para tecla Enter en el buscador
document.addEventListener('DOMContentLoaded', () => {
    renderizarBiblioteca();
    
    document.getElementById('book-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarLibro();
    });
});