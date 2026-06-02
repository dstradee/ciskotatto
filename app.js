// =========================================================
// 1. CONFIGURACIÓN CONSTANTE (Ajusta la firma aquí)
// =========================================================
const FIRMA_CONFIG = {
    paginaIndex: 2,  // 0 = Pág 1, 1 = Pág 2, 2 = Pág 3
    x: 80,           // Ajusta hacia la derecha
    y: 120,          // Ajusta hacia arriba (0 es el borde inferior de la hoja)
    width: 140,      
    height: 50       
};

const SUPABASE_URL = 'https://fqydtjwqkmdatfsauomh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_-FdijJSiBiKFSY4I4F-LJw_fB89m4Cj';

// ARREGLO: Cambiamos el nombre a supabaseClient para no chocar con la librería
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// 2. INICIALIZAR EL CANVAS DE FIRMA
// =========================================================// =========================================================
// 1. CONFIGURACIÓN CONSTANTE (Ajusta la firma aquí)
// =========================================================
const FIRMA_CONFIG = {
    paginaIndex: 2,  // 0 = Pág 1, 1 = Pág 2, 2 = Pág 3 del BOJA
    x: 80,           // Mueve izquierda/derecha
    y: 120,          // Mueve arriba/abajo (0 es abajo del todo en pdf-lib)
    width: 140,      
    height: 50       
};

const SUPABASE_URL = 'https://fqydtjwqkmdatfsauomh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_-FdijJSiBiKFSY4I4F-LJw_fB89m4Cj';

// Instancia única
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// 2. INICIALIZAR EL CANVAS DE FIRMA
// =========================================================
const canvas = document.getElementById('signature-pad');
let signaturePad;

function iniciarFirma() {
    signaturePad = new SignaturePad(canvas, {
        penColor: "rgb(0, 0, 0)",
        backgroundColor: "rgba(255, 255, 255, 1)" // Fondo blanco sólido para que se vea claro
    });
    
    // Función para ajustar el tamaño y que no se deforme la línea
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
}

// Iniciar al cargar el archivo
iniciarFirma();

// Botón para limpiar
document.getElementById('btn-limpiar-firma').addEventListener('click', () => {
    signaturePad.clear();
});


// =========================================================
// 3. AUTOCOMPLETAR DATOS DE PRUEBA
// =========================================================
document.getElementById('btn-rellenar-pruebas').addEventListener('click', () => {
    // Datos del Centro
    document.getElementById('centro_nombre').value = "Ciskotattoo (PRUEBA)";
    document.getElementById('centro_nif').value = "B12345678";
    document.getElementById('centro_dir_linea1').value = "Calle Falsa 123";
    document.getElementById('centro_dir_linea2').value = "Local 1";
    document.getElementById('centro_dir_linea3').value = "Cádiz";
    document.getElementById('centro_dir_linea4').value = "Cádiz / 11001";
    
    // Datos Tatuador
    document.getElementById('tatuador_nombre').value = "Judith (Prueba)";
    document.getElementById('tatuador_dni').value = "87654321X";
    document.getElementById('tatuador_titulo').value = "Higiénico Sanitario";
    document.getElementById('tatuador_categoria').value = "Aplicadora de Tatuaje";
    document.getElementById('tatuador_dir_linea1').value = "Calle Falsa 123";
    document.getElementById('tatuador_dir_linea2').value = "Local 1";
    document.getElementById('tatuador_dir_linea3').value = "Cádiz / 11001";
    document.getElementById('tatuador_contacto').value = "600123456";

    // Detalles del servicio por defecto
    document.getElementById('como_se_realiza').value = "Técnica de línea y sombreado con máquina rotativa.";
    document.getElementById('materiales').value = "Agujas Kwadron estériles, Tinta Dynamic Black Lote #999.";
    document.getElementById('efectos').value = "Enrojecimiento e inflamación temporal de la piel.";
    document.getElementById('riesgos').value = "Posible infección si no se siguen los cuidados.";
    document.getElementById('medidas').value = "Lavar con jabón neutro, secar con papel, aplicar crema cicatrizante.";
    document.getElementById('presupuesto').value = "150€ (Prueba)";
    document.getElementById('otra_info').value = "Ninguna";
    document.getElementById('fecha_ciudad').value = "Cádiz";
    
    alert("✅ Datos del estudio cargados. Ahora rellena los datos del cliente y firma.");
});


// =========================================================
// 4. HELPERS PARA RELLENAR PDF SIN CRASHEAR
// =========================================================
const fillText = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(value.toString());
    } catch (e) {
        console.warn(`[PDF-LIB] Campo '${fieldName}' no encontrado.`);
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
// 5. LÓGICA PRINCIPAL DEL FORMULARIO (GUARDAR)
// =========================================================
document.getElementById('consent-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (signaturePad.isEmpty()) {
        return alert("⚠️ La firma del cliente es obligatoria en el recuadro gris.");
    }

    const btn = document.getElementById('btn-submit');
    const textoBtnOriginal = btn.innerText;
    btn.innerText = "⏳ Procesando documento legal (no cierres)...";
    btn.disabled = true;

    try {
        // A. Cargar la firma como Buffer (PNG)
        const firmaDataUrl = signaturePad.toDataURL('image/png');
        const firmaBytes = await fetch(firmaDataUrl).then(res => res.arrayBuffer());

        // B. Descargar la plantilla vacía
        const urlPlantilla = 'plantilla_boja.pdf';
        const plantillaBytes = await fetch(urlPlantilla).then(res => {
            if(!res.ok) throw new Error("No se encontró el archivo plantilla_boja.pdf en la misma carpeta.");
            return res.arrayBuffer();
        });

        // C. Cargar el PDF
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(plantillaBytes);
        const form = pdfDoc.getForm();

        // D. Extraer datos del HTML y rellenar textos
        const ahora = new Date();
        
        // 1. Datos Centro y Tatuador
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

        // 2. Datos Cliente
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
        
        // 3. Detalles de Servicio
        fillText(form, 'zona_anatomica', document.getElementById('zona_anatomica').value); 
        fillText(form, 'como_se_realiza', document.getElementById('como_se_realiza').value);
        fillText(form, 'materiales', document.getElementById('materiales').value);
        fillText(form, 'efectos', document.getElementById('efectos').value);
        fillText(form, 'riesgos', document.getElementById('riesgos').value);
        fillText(form, 'medidas', document.getElementById('medidas').value);
        fillText(form, 'presupuesto', document.getElementById('presupuesto').value);
        fillText(form, 'otra_info', document.getElementById('otra_info').value);

        // 4. Final del documento
        fillText(form, 'nombre_final', nombreCliente);
        
        const tecnicaSeleccionada = document.querySelector('input[name="tecnica"]:checked');
        const txtTecnicaFinal = tecnicaSeleccionada ? tecnicaSeleccionada.parentElement.innerText.trim() : 'Tatuaje';
        fillText(form, 'tecnica_final', txtTecnicaFinal);

        fillText(form, 'fecha_ciudad', document.getElementById('fecha_ciudad').value);
        fillText(form, 'fecha_dia', ahora.getDate().toString());
        fillText(form, 'fecha_mes', (ahora.getMonth() + 1).toString());
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

        // F. APLANAR FORMULARIO
        form.flatten();

        // G. INCRUSTAR FIRMA EN LA PÁGINA ESPECIFICADA
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
        btn.innerText = "☁️ Guardando en la base de datos...";
        
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('consentimientos')
            .upload(nombreArchivoPdf, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw new Error("Error subiendo PDF a Supabase: " + uploadError.message);

        const { data: publicUrlData } = supabaseClient.storage.from('consentimientos').getPublicUrl(nombreArchivoPdf);
        const pdfUrl = publicUrlData.publicUrl;

        // J. INSERTAR EN LA BASE DE DATOS
        const { error: dbError } = await supabaseClient.from('clientes_tatuaje').insert([{
            dni: dniCliente,
            nombre: nombreCliente,
            telefono: tlfCliente,
            pdf_url: pdfUrl
        }]);

        if (dbError) throw new Error("Error guardando cliente en tabla: " + dbError.message);

        // K. FORZAR DESCARGA LOCAL
        const objectUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = nombreArchivoPdf;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        alert("✅ Documento generado y guardado legalmente.");
        
        document.getElementById('consent-form').reset();
        signaturePad.clear();

    } catch (error) {
        console.error("Error completo:", error);
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = textoBtnOriginal;
    }
});
const canvas = document.getElementById('signature-pad');
const signaturePad = new SignaturePad(canvas, {
    penColor: "rgb(0, 0, 0)",
    backgroundColor: "rgba(0,0,0,0)" // Transparente
});

// Arregla resolución en pantallas retina y móviles
function resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
    signaturePad.clear();
}
window.addEventListener("resize", resizeCanvas);
// Retardo mínimo para asegurar que el CSS ha cargado el tamaño antes de encenderlo
setTimeout(resizeCanvas, 100);

// =========================================================
// 3. HELPERS PARA RELLENAR PDF SIN CRASHEAR
// =========================================================
const fillText = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(value.toString());
    } catch (e) {
        console.warn(`[PDF-LIB] Campo '${fieldName}' no encontrado.`);
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
    btn.innerText = "⏳ Procesando documento legal (no cierres)...";
    btn.disabled = true;

    try {
        // A. Cargar la firma como Buffer (PNG)
        const firmaDataUrl = signaturePad.toDataURL('image/png');
        const firmaBytes = await fetch(firmaDataUrl).then(res => res.arrayBuffer());

        // B. Descargar la plantilla vacía
        const urlPlantilla = 'plantilla_boja.pdf';
        const plantillaBytes = await fetch(urlPlantilla).then(res => {
            if(!res.ok) throw new Error("No se encontró el archivo plantilla_boja.pdf en la misma carpeta.");
            return res.arrayBuffer();
        });

        // C. Cargar el PDF
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(plantillaBytes);
        const form = pdfDoc.getForm();

        // D. Extraer datos del HTML y rellenar textos
        const ahora = new Date();
        
        // 1. Datos Centro y Tatuador
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

        // 2. Datos Cliente
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
        
        // 3. Detalles de Servicio
        fillText(form, 'zona_anatomica', document.getElementById('zona_anatomica').value); 
        fillText(form, 'como_se_realiza', document.getElementById('como_se_realiza').value);
        fillText(form, 'materiales', document.getElementById('materiales').value);
        fillText(form, 'efectos', document.getElementById('efectos').value);
        fillText(form, 'riesgos', document.getElementById('riesgos').value);
        fillText(form, 'medidas', document.getElementById('medidas').value);
        fillText(form, 'presupuesto', document.getElementById('presupuesto').value);
        fillText(form, 'otra_info', document.getElementById('otra_info').value);

        // 4. Final del documento
        fillText(form, 'nombre_final', nombreCliente);
        
        const tecnicaSeleccionada = document.querySelector('input[name="tecnica"]:checked');
        const txtTecnicaFinal = tecnicaSeleccionada ? tecnicaSeleccionada.parentElement.innerText.trim() : 'Tatuaje';
        fillText(form, 'tecnica_final', txtTecnicaFinal);

        fillText(form, 'fecha_ciudad', document.getElementById('fecha_ciudad').value);
        fillText(form, 'fecha_dia', ahora.getDate().toString());
        fillText(form, 'fecha_mes', (ahora.getMonth() + 1).toString());
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

        // F. APLANAR FORMULARIO
        form.flatten();

        // G. INCRUSTAR FIRMA EN LA PÁGINA ESPECIFICADA
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
        btn.innerText = "☁️ Guardando en la base de datos...";
        
        // USAMOS supabaseClient EN VEZ DE supabase
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('consentimientos')
            .upload(nombreArchivoPdf, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw new Error("Error subiendo PDF: " + uploadError.message);

        // Obtener URL Pública
        const { data: publicUrlData } = supabaseClient.storage.from('consentimientos').getPublicUrl(nombreArchivoPdf);
        const pdfUrl = publicUrlData.publicUrl;

        // J. INSERTAR EN LA BASE DE DATOS
        const { error: dbError } = await supabaseClient.from('clientes_tatuaje').insert([{
            dni: dniCliente,
            nombre: nombreCliente,
            telefono: tlfCliente,
            pdf_url: pdfUrl
        }]);

        if (dbError) throw new Error("Error guardando cliente: " + dbError.message);

        // K. FORZAR DESCARGA LOCAL
        const objectUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = nombreArchivoPdf;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        alert("✅ Documento generado y guardado legalmente.");
        
        // Limpiar para el siguiente cliente
        document.getElementById('consent-form').reset();
        signaturePad.clear();

    } catch (error) {
        console.error("Error completo:", error);
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = textoBtnOriginal;
    }
});
