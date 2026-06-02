// =========================================================
// 1. CONFIGURACIÓN CONSTANTE (Ajusta la firma aquí)
// =========================================================
// Nota de pdf-lib: El eje Y empieza desde ABAJO de la hoja.
const FIRMA_CONFIG = {
    paginaIndex: 2,  // 0 = Pág 1, 1 = Pág 2, 2 = Pág 3
    x: 80,           // Ajusta hacia la derecha
    y: 120,          // Ajusta hacia arriba (ej: 100 está cerca del pie de página)
    width: 140,      
    height: 50       
};

const SUPABASE_URL = 'https://fqydtjwqkmdatfsauomh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_-FdijJSiBiKFSY4I4F-LJw_fB89m4Cj';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// 2. INICIALIZAR EL CANVAS DE FIRMA
// =========================================================
const canvas = document.getElementById('signature-pad');
const signaturePad = new SignaturePad(canvas, {
    penColor: "rgb(0, 0, 0)",
    backgroundColor: "rgba(0,0,0,0)" // Transparente
});

// Arregla resolución en pantallas retina
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear();
}
window.onresize = resizeCanvas;
resizeCanvas();

// =========================================================
// 3. HELPERS PARA RELLENAR PDF SIN CRASHEAR
// =========================================================
const fillText = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(value.toString());
    } catch (e) {
        console.warn(`[PDF-LIB] Campo de texto '${fieldName}' no encontrado.`);
    }
};

const fillCheck = (form, fieldName, condition) => {
    try {
        const field = form.getCheckBox(fieldName);
        if (field && condition) field.check();
    } catch (e) {
        console.warn(`[PDF-LIB] Checkbox '${fieldName}' no encontrado.`);
    }
};

// =========================================================
// 4. LÓGICA PRINCIPAL DEL FORMULARIO
// =========================================================
document.getElementById('consent-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (signaturePad.isEmpty()) {
        return alert("⚠️ La firma del cliente es obligatoria.");
    }

    const btn = document.getElementById('btn-submit');
    const textoBtnOriginal = btn.innerText;
    btn.innerText = "⏳ Procesando documento (no cierres)...";
    btn.disabled = true;

    try {
        // A. Cargar la firma como Buffer (PNG)
        const firmaDataUrl = signaturePad.toDataURL('image/png');
        const firmaBytes = await fetch(firmaDataUrl).then(res => res.arrayBuffer());

        // B. Descargar la plantilla vacía
        const urlPlantilla = 'plantilla_boja.pdf'; // Asegúrate de que esté en la raíz del proyecto
        const plantillaBytes = await fetch(urlPlantilla).then(res => {
            if(!res.ok) throw new Error("No se encontró plantilla_boja.pdf");
            return res.arrayBuffer();
        });

        // C. Cargar el PDF
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(plantillaBytes);
        const form = pdfDoc.getForm();

        // D. Extraer datos del HTML y rellenar textos
        const ahora = new Date();
        
        // --- 1. Datos Centro y Tatuador ---
        fillText(form, 'centro_nombre', document.getElementById('centro_nombre').value);
        fillText(form, 'centro_nif', document.getElementById('centro_nif').value);
        fillText(form, 'centro_dir_linea1', document.getElementById('centro_dir_linea1').value);
        fillText(form, 'centro_dir_linea2', document.getElementById('centro_dir_linea2').value);
        fillText(form, 'centro_dir_linea3', document.getElementById('centro_dir_linea3').value);
        fillText(form, 'centro_dir_linea4', document.getElementById('centro_dir_linea4').value);
        
        fillText(form, 'tatuador_nombre', document.getElementById('tatuador_nombre').value);
        fillText(form, 'tatuador_dni', document.getElementById('tatuador_dni').value);
        fillText(form, 'tatuador_titulo', document.getElementById('tatuador_titulo').value);
        fillText(form, 'tatuador_categoria', document.getElementById('tatuador_categoria').value);
        fillText(form, 'tatuador_dir_linea1', document.getElementById('tatuador_dir_linea1').value);
        fillText(form, 'tatuador_dir_linea2', document.getElementById('tatuador_dir_linea2').value);
        fillText(form, 'tatuador_dir_linea3', document.getElementById('tatuador_dir_linea3').value);
        fillText(form, 'tatuador_contacto', document.getElementById('tatuador_contacto').value);

        // --- 2. Datos Cliente ---
        const dniCliente = document.getElementById('cliente_dni').value.toUpperCase();
        const nombreCliente = document.getElementById('cliente_nombre').value;
        const tlfCliente = document.getElementById('cliente_telefono').value;

        fillText(form, 'cliente_nombre', nombreCliente);
        fillText(form, 'cliente_nacimiento', document.getElementById('cliente_nacimiento').value);
        fillText(form, 'cliente_dni', dniCliente);
        fillText(form, 'cliente_dir_linea1', document.getElementById('cliente_dir_linea1').value);
        fillText(form, 'cliente_dir_linea2', document.getElementById('cliente_dir_linea2').value);
        fillText(form, 'cliente_dir_linea3', document.getElementById('cliente_dir_linea3').value);
        fillText(form, 'cliente_dir_linea4', document.getElementById('cliente_dir_linea4').value);
        fillText(form, 'cliente_telefono', tlfCliente);
        fillText(form, 'cliente_email', document.getElementById('cliente_email').value);
        
        // --- 3. Detalles de Servicio ---
        // (Nota: el prompt indica zona_anatomica en los inputs, pero lo mapearé por si acaso a 'zona_anatomica' y a 'como_se_realiza' si hace falta en el BOJA)
        fillText(form, 'zona_anatomica', document.getElementById('zona_anatomica').value); 
        fillText(form, 'como_se_realiza', document.getElementById('como_se_realiza').value);
        fillText(form, 'materiales', document.getElementById('materiales').value);
        fillText(form, 'efectos', document.getElementById('efectos').value);
        fillText(form, 'riesgos', document.getElementById('riesgos').value);
        fillText(form, 'medidas', document.getElementById('medidas').value);
        fillText(form, 'presupuesto', document.getElementById('presupuesto').value);
        fillText(form, 'otra_info', document.getElementById('otra_info').value);

        // --- 4. Final del documento ---
        fillText(form, 'nombre_final', nombreCliente);
        
        // Averiguar técnica seleccionada para la parte final (Tatuaje, Micro, Piercing)
        const tecnicaSeleccionada = document.querySelector('input[name="tecnica"]:checked');
        const txtTecnicaFinal = tecnicaSeleccionada ? tecnicaSeleccionada.parentElement.innerText.trim() : 'Tatuaje';
        fillText(form, 'tecnica_final', txtTecnicaFinal);

        fillText(form, 'fecha_ciudad', document.getElementById('fecha_ciudad').value);
        fillText(form, 'fecha_dia', ahora.getDate().toString());
        fillText(form, 'fecha_mes', (ahora.getMonth() + 1).toString()); // Mes de 1 a 12
        fillText(form, 'fecha_anio', ahora.getFullYear().toString());

        // E. RELLENAR CHECKBOXES
        fillCheck(form, 'cliente_sexo_h', document.getElementById('cliente_sexo_h').checked);
        fillCheck(form, 'cliente_sexo_m', document.getElementById('cliente_sexo_m').checked);

        fillCheck(form, 'check_tatuaje', document.getElementById('check_tatuaje').checked);
        fillCheck(form, 'check_micro', document.getElementById('check_micro').checked);
        fillCheck(form, 'check_piercing', document.getElementById('check_piercing').checked);

        const perm = document.getElementById('permanente').value;
        fillCheck(form, 'permanente_si', perm === 'SI');
        fillCheck(form, 'permanente_no', perm === 'NO');

        const todaVida = document.getElementById('toda_vida').value;
        fillCheck(form, 'toda_vida_si', todaVida === 'SI');
        fillCheck(form, 'toda_vida_no', todaVida === 'NO');

        const alt = document.getElementById('alteracion').value;
        fillCheck(form, 'alteracion_si', alt === 'SI');
        fillCheck(form, 'alteracion_no', alt === 'NO');

        const ret = document.getElementById('retoques').value;
        fillCheck(form, 'retoques_si', ret === 'SI');
        fillCheck(form, 'retoques_no', ret === 'NO');

        // F. APLANAR FORMULARIO (Evita ediciones posteriores)
        form.flatten();

        // G. INCRUSTAR FIRMA EN LA PÁGINA 3
        const imagenPdfFirma = await pdfDoc.embedPng(firmaBytes);
        const paginas = pdfDoc.getPages();
        const paginaFirma = paginas[FIRMA_CONFIG.paginaIndex];

        paginaFirma.drawImage({
            x: FIRMA_CONFIG.x,
            y: FIRMA_CONFIG.y,
            width: FIRMA_CONFIG.width,
            height: FIRMA_CONFIG.height,
            image: imagenPdfFirma,
        });

        // H. GENERAR BLOB
        const pdfModificadoBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfModificadoBytes], { type: 'application/pdf' });
        const nombreArchivoPdf = `${dniCliente}_${Date.now()}.pdf`;

        // I. SUBIR A SUPABASE STORAGE
        btn.innerText = "☁️ Guardando en la nube...";
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('consentimientos')
            .upload(nombreArchivoPdf, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw new Error("Error subiendo PDF: " + uploadError.message);

        // Obtener URL Pública
        const { data: publicUrlData } = supabase.storage.from('consentimientos').getPublicUrl(nombreArchivoPdf);
        const pdfUrl = publicUrlData.publicUrl;

        // J. INSERTAR EN LA BASE DE DATOS
        const { error: dbError } = await supabase.from('clientes_tatuaje').insert([{
            dni: dniCliente,
            nombre: nombreCliente,
            telefono: tlfCliente,
            pdf_url: pdfUrl
        }]);

        if (dbError) throw new Error("Error en BD: " + dbError.message);

        // K. FORZAR DESCARGA LOCAL (Para tenerlo físicamente o imprimirlo)
        const objectUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = nombreArchivoPdf;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        alert("✅ Consentimiento generado, guardado y descargado con éxito.");
        
        // Limpiar para el siguiente cliente
        document.getElementById('consent-form').reset();
        signaturePad.clear();

    } catch (error) {
        console.error(error);
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = textoBtnOriginal;
    }
});
