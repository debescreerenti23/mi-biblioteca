/* ==========================================================================
   1. VARIABLES GLOBALES Y ESTADO
   ========================================================================== */
const frasesLectura = [
    "Un libro es un regalo que puedes abrir una y otra vez.",
    "Leer es soñar de la mano de otro.",
    "No hay dos personas que lean el mismo libro.",
    "La lectura es una conversación con los hombres más ilustres.",
    "Un hogar sin libros es como un cuerpo sin alma.",
    "Para viajar lejos, no hay mejor nave que un libro.",
    "Leer te da un lugar a donde ir cuando tienes que quedarte donde estás.",
    "La lectura es a la mente lo que el ejercicio al cuerpo."
];

let misLibros = JSON.parse(localStorage.getItem('biblioteca_personal')) || [];
let timeoutBusqueda;
let libroActualId = null;

/* ==========================================================================
   2. UI & EFECTOS (Frase, Temas, PDF)
   ========================================================================== */
function generarFraseAleatoria() {
    const fraseElemento = document.getElementById('frase-lectura');
    if (!fraseElemento) return;

    const frase = frasesLectura[Math.floor(Math.random() * frasesLectura.length)];
    fraseElemento.textContent = ""; 
    
    let i = 0;
    function escribir() {
        if (i < frase.length) {
            fraseElemento.textContent += frase.charAt(i);
            i++;
            setTimeout(escribir, 50); // Corregido el cierre del paréntesis
        }
    }
    escribir();
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const btn = document.getElementById('theme-btn');
    if(btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Mi Biblioteca Personal", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 28);

    const nombresEstado = {
        'leyendo': 'Leyendo ahora',
        'leidos': 'Leído',
        'futuro': 'Pendiente'
    };

    const filas = misLibros.map(l => [
        l.titulo,
        l.autor,
        nombresEstado[l.estado] || l.estado,
        "★".repeat(l.rating) + "☆".repeat(5 - l.rating),
        l.notas || "-"
    ]);

    doc.autoTable({
        startY: 35,
        head: [['Título', 'Autor', 'Estado', 'Rating', 'Notas']],
        body: filas,
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }, 
    });

    doc.save("Mi_Biblioteca_Personal.pdf");
}

/* ==========================================================================
   3. BÚSQUEDA Y API (OPEN LIBRARY)
   ========================================================================== */
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
            console.error("Error en búsqueda:", e);
        }
    }, 500);
}

function añadirLibroOpenLibrary(book) {
    const nuevoLibro = {
        id: Date.now(),
        titulo: book.title,
        autor: book.author_name ? book.author_name[0] : "Anónimo",
        portada: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : "https://via.placeholder.com/150x200?text=Sin+Portada",
        descripcion: book.first_sentence ? book.first_sentence[0] : "Sin descripción disponible.",
        estado: 'futuro',
        rating: 0,
        notas: ""
    };

    if (misLibros.find(l => l.titulo === nuevoLibro.titulo)) {
        alert("Este libro ya está en tu biblioteca.");
    } else {
        misLibros.push(nuevoLibro);
        guardarYRenderizar();
    }
    document.getElementById('book-input').value = "";
    document.getElementById('sugerencias').style.display = 'none';
}

/* ==========================================================================
   4. GESTIÓN DE LA BIBLIOTECA (CRUD)
   ========================================================================== */
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
        
        let estrellasHTML = '';
        for (let i = 1; i <= 5; i++) {
            estrellasHTML += `<span class="${i <= libro.rating ? 'active' : ''}" onclick="event.stopPropagation(); puntuarDirecto(${libro.id}, ${i})">★</span>`;
        }

        card.innerHTML = `
            <img src="${libro.portada}" onclick="verDetalles(${libro.id})" style="cursor:pointer">
            <div class="libro-info">
                <strong class="libro-titulo">${libro.titulo}</strong>
                <p>${libro.autor}</p>
                <div class="stars-card">${estrellasHTML}</div>
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

function cambiarEstado(id, nuevo) {
    misLibros = misLibros.map(l => l.id === id ? {...l, estado: nuevo} : l);
    guardarYRenderizar();
}

function eliminarLibro(id) {
    if(confirm("¿Eliminar este libro de tu colección?")) {
        misLibros = misLibros.filter(l => l.id !== id);
        guardarYRenderizar();
    }
}

function guardarYRenderizar() {
    localStorage.setItem('biblioteca_personal', JSON.stringify(misLibros));
    renderizarBiblioteca();
}

/* ==========================================================================
   5. DETALLES Y MODAL
   ========================================================================== */
function verDetalles(id) {
    const libro = misLibros.find(l => l.id === id);
    if (!libro) return;
    libroActualId = id;

    document.getElementById('modal-portada').src = libro.portada;
    document.getElementById('modal-titulo').textContent = libro.titulo;
    document.getElementById('modal-autor').textContent = libro.autor;
    document.getElementById('modal-descripcion').textContent = libro.descripcion;
    document.getElementById('notas-personales').value = libro.notas || "";

    actualizarEstrellasModal(libro.rating || 0);
    document.getElementById('modal-libro').style.display = "block";
}

function puntuar(estrellas) {
    const libro = misLibros.find(l => l.id === libroActualId);
    if (libro) {
        libro.rating = estrellas;
        actualizarEstrellasModal(estrellas);
        guardarYRenderizar();
    }
}

function puntuarDirecto(id, estrellas) {
    const libro = misLibros.find(l => l.id === id);
    if (libro) {
        libro.rating = estrellas;
        guardarYRenderizar();
    }
}

function actualizarEstrellasModal(rating) {
    const stars = document.querySelectorAll('#modal-stars span');
    stars.forEach((s, i) => s.classList.toggle('active', i < rating));
}

function guardarNotas() {
    const libro = misLibros.find(l => l.id === libroActualId);
    if (libro) {
        libro.notas = document.getElementById('notas-personales').value;
        guardarYRenderizar();
        alert("Notas guardadas correctamente.");
    }
}

function cerrarModal() {
    document.getElementById('modal-libro').style.display = "none";
    document.getElementById('modal-portada').src = "";
}

/* ==========================================================================
   6. INICIALIZACIÓN (EVENT LISTENERS)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Año del footer
    const yearSpan = document.getElementById('year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    
    // Cerrar modal al hacer clic fuera
    window.onclick = (event) => {
        const modal = document.getElementById('modal-libro');
        if (event.target == modal) cerrarModal();
    };

    // Carga inicial
    renderizarBiblioteca();
    generarFraseAleatoria();
    
    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    const btn = document.getElementById('theme-btn');
    if(btn) btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
});