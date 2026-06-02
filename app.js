// =========================================================
// 1. CONFIGURACIÓN SUPABASE
// =========================================================
const SUPABASE_URL = 'https://fqydtjwqkmdatfsauomh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_-FdijJSiBiKFSY4I4F-LJw_fB89m4Cj';

// Usamos supabaseBoja para evitar conflictos con otras páginas
const supabaseBoja = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================
// 2. LÓGICA DE EDAD (MENORES DE EDAD)
// =========================================================
let esMenorBoolean = false;

function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) {
        edad--;
    }
    return edad;
}

document.getElementById('cliente_nacimiento').addEventListener('change', function(e) {
    if (!e.target.value) return;
    
    const edad = calcularEdad(e.target.value);
    const bloqueRep = document.getElementById('bloque_representante');
    
    // IDs del representante que serán obligatorios si es menor
    const repCamposReq = ['rep_nombre', 'rep_dni', 'rep_tipo_via', 'rep_nombre_via', 'rep_numero', 'rep_poblacion', 'rep_provincia', 'rep_cp', 'rep_telefono'];

    if (edad < 18) {
        esMenorBoolean = true;
        bloqueRep.classList.remove('hidden');
        repCamposReq.forEach(id => document.getElementById(id).required = true);
    } else {
        esMenorBoolean = false;
        bloqueRep.classList.add('hidden');
        repCamposReq.forEach(id => document.getElementById(id).required = false);
    }
});

// =========================================================
// 3. HELPERS PARA RELLENAR PDF SIN CRASHEAR
// =========================================================
const fillText = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(value.toString());
    } catch (e) {
        console.warn(`[PDF-LIB] Campo texto '${fieldName}' no encontrado.`);
    }
};

const fillCheck = (form, fieldName, isChecked) => {
    try {
        const field = form.getCheckBox(fieldName);
        if (field && isChecked) field.check();
    } catch (e) {
        console.warn(`[PDF-LIB] Checkbox '${fieldName}' no encontrado.`);
    }
};

// =========================================================
// 4. EVENTO PRINCIPAL DEL FORMULARIO
// =========================================================
document.getElementById('consent-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!document.getElementById('check_firma_digital').checked) {
        return alert("⚠️ Debes aceptar y firmar electrónicamente marcando la casilla del final.");
    }

    const btn = document.getElementById('btn-submit');
    const textoBtnOriginal = btn.innerText;
    btn.innerText = "⏳ Generando y asegurando documento...";
    btn.disabled = true;

    try {
        // A. Cargar la plantilla PDF local
        const urlPlantilla = 'plantilla_boja.pdf';
        const plantillaBytes = await fetch(urlPlantilla).then(res => {
            if(!res.ok) throw new Error("No se encontró el archivo plantilla_boja.pdf");
            return res.arrayBuffer();
        });

        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(plantillaBytes);
        const form = pdfDoc.getForm();

        // B. Extraer fecha/hora actual
        const ahora = new Date();
        const fechaStr = ahora.toLocaleDateString('es-ES');
        const horaStr = ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});

        // C. MAPEO CASILLA A CASILLA (Centro y Tatuador)
        fillText(form, 'centro_nombre', document.getElementById('centro_nombre').value);
        fillText(form, 'centro_nif', document.getElementById('centro_nif').value);
        fillText(form, 'centro_tipo_via', document.getElementById('centro_tipo_via').value);
        fillText(form, 'centro_nombre_via', document.getElementById('centro_nombre_via').value);
        fillText(form, 'centro_numero', document.getElementById('centro_numero').value);
        fillText(form, 'centro_poblacion', document.getElementById('centro_poblacion').value);
        fillText(form, 'centro_provincia', document.getElementById('centro_provincia').value);
        fillText(form, 'centro_cp', document.getElementById('centro_cp').value);

        fillText(form, 'tatuador_nombre', document.getElementById('tatuador_nombre').value);
        fillText(form, 'tatuador_dni', document.getElementById('tatuador_dni').value);
        fillText(form, 'tatuador_titulo', document.getElementById('tatuador_titulo').value);
        fillText(form, 'tatuador_numero', document.getElementById('tatuador_numero').value);
        fillText(form, 'tatuador_poblacion', document.getElementById('tatuador_poblacion').value);
        fillText(form, 'tatuador_provincia', document.getElementById('tatuador_provincia').value);
        fillText(form, 'tatuador_cp', document.getElementById('tatuador_cp').value);
        fillText(form, 'tatuador_telefono', document.getElementById('tatuador_telefono').value);

        // D. MAPEO (Cliente)
        const clienteNombre = document.getElementById('cliente_nombre').value.toUpperCase();
        const clienteDni = document.getElementById('cliente_dni').value.toUpperCase();
        
        fillText(form, 'cliente_nombre', clienteNombre);
        fillText(form, 'cliente_nacimiento', document.getElementById('cliente_nacimiento').value);
        fillCheck(form, 'cliente_sexo_h', document.getElementById('cliente_sexo_h').checked);
        fillCheck(form, 'cliente_sexo_m', document.getElementById('cliente_sexo_m').checked);
        fillText(form, 'cliente_dni', clienteDni);
        fillText(form, 'cliente_tipo_via', document.getElementById('cliente_tipo_via').value);
        fillText(form, 'cliente_nombre_via', document.getElementById('cliente_nombre_via').value);
        fillText(form, 'cliente_numero', document.getElementById('cliente_numero').value);
        fillText(form, 'cliente_poblacion', document.getElementById('cliente_poblacion').value);
        fillText(form, 'cliente_provincia', document.getElementById('cliente_provincia').value);
        fillText(form, 'cliente_cp', document.getElementById('cliente_cp').value);
        fillText(form, 'cliente_telefono', document.getElementById('cliente_telefono').value);

        // E. MAPEO (Representante Legal, si es menor)
        let repNombre = '';
        let repDni = '';
        
        if (esMenorBoolean) {
            repNombre = document.getElementById('rep_nombre').value.toUpperCase();
            repDni = document.getElementById('rep_dni').value.toUpperCase();

            fillText(form, 'rep_nombre', repNombre);
            fillCheck(form, 'rep_sexo_h', document.getElementById('rep_sexo_h').checked);
            fillCheck(form, 'rep_sexo_m', document.getElementById('rep_sexo_m').checked);
            fillText(form, 'rep_dni', repDni);
            fillText(form, 'rep_tipo_via', document.getElementById('rep_tipo_via').value);
            fillText(form, 'rep_nombre_via', document.getElementById('rep_nombre_via').value);
            fillText(form, 'rep_numero', document.getElementById('rep_numero').value);
            fillText(form, 'rep_poblacion', document.getElementById('rep_poblacion').value);
            fillText(form, 'rep_provincia', document.getElementById('rep_provincia').value);
            fillText(form, 'rep_cp', document.getElementById('rep_cp').value);
            fillText(form, 'rep_telefono', document.getElementById('rep_telefono').value);
        }

        // F. MAPEO (Técnica y Cuestionario)
        fillCheck(form, 'check_tatuaje', document.getElementById('check_tatuaje').checked);
        fillCheck(form, 'check_micro', document.getElementById('check_micro').checked);
        fillCheck(form, 'check_piercing', document.getElementById('check_piercing').checked);
        fillText(form, 'zona_anatomica', document.getElementById('zona_anatomica').value);

        fillCheck(form, 'permanente_si', document.getElementById('permanente_si').checked);
        fillCheck(form, 'permanente_no', document.getElementById('permanente_no').checked);
        fillCheck(form, 'toda_vida_si', document.getElementById('toda_vida_si').checked);
        fillCheck(form, 'toda_vida_no', document.getElementById('toda_vida_no').checked);
        fillCheck(form, 'alteracion_si', document.getElementById('alteracion_si').checked);
        fillCheck(form, 'alteracion_no', document.getElementById('alteracion_no').checked);
        fillCheck(form, 'retoques_si', document.getElementById('retoques_si').checked);
        fillCheck(form, 'retoques_no', document.getElementById('retoques_no').checked);

        // G. MAPEO (Textareas)
        fillText(form, 'como_se_realiza', document.getElementById('como_se_realiza').value);
        fillText(form, 'materiales', document.getElementById('materiales').value);
        fillText(form, 'efectos', document.getElementById('efectos').value);
        fillText(form, 'riesgos', document.getElementById('riesgos').value);
        fillText(form, 'medidas', document.getElementById('medidas').value);
        fillText(form, 'presupuesto', document.getElementById('presupuesto').value);

        // H. CIERRE DEL PDF (Nombres finales y fechas)
        // El firmante final es el Rep si es menor, o el cliente si es mayor
        const firmanteNombre = esMenorBoolean ? repNombre : clienteNombre;
        const firmanteDni = esMenorBoolean ? repDni : clienteDni;

        fillText(form, 'nombre_final', firmanteNombre);

        const tecSeleccionada = document.querySelector('input[name="tecnica"]:checked');
        const txtTecnica = tecSeleccionada ? tecSeleccionada.parentElement.innerText.trim() : 'TATUAJE';
        fillText(form, 'tecnica_final', txtTecnica.toUpperCase());

        fillText(form, 'fecha_ciudad', document.getElementById('fecha_ciudad').value);
        fillText(form, 'fecha_dia', ahora.getDate().toString());
        fillText(form, 'fecha_mes', (ahora.getMonth() + 1).toString());
        fillText(form, 'fecha_anio', ahora.getFullYear().toString());

        // I. INYECCIÓN DEL TEXTO DE FIRMA ELECTRÓNICA
        const strFirmaCliente = `Firmado electrónicamente por ${firmanteNombre} con DNI ${firmanteDni} el ${fechaStr} a las ${horaStr}.`;
        const strFirmaTatuador = `Firmado electrónicamente por ${document.getElementById('tatuador_nombre').value} con DNI ${document.getElementById('tatuador_dni').value} el ${fechaStr} a las ${horaStr}.`;

        fillText(form, 'firma_cliente_texto', strFirmaCliente);
        fillText(form, 'firma_tatuador_texto', strFirmaTatuador);

        // J. APLANAR FORMULARIO
        form.flatten();

        // K. GENERAR BLOB
        const pdfModificadoBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfModificadoBytes], { type: 'application/pdf' });
        const nombreArchivoPdf = `${firmanteDni}_${Date.now()}.pdf`;

        // L. SUBIR A SUPABASE STORAGE
        btn.innerText = "☁️ Subiendo a la base de datos...";
        
        const { error: uploadError } = await supabaseBoja.storage
            .from('consentimientos')
            .upload(nombreArchivoPdf, pdfBlob, {
                contentType: 'application/pdf',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw new Error("Error subiendo PDF: " + uploadError.message);

        const { data: publicUrlData } = supabaseBoja.storage.from('consentimientos').getPublicUrl(nombreArchivoPdf);
        const pdfUrl = publicUrlData.publicUrl;

        // M. INSERTAR EN LA TABLA
        const { error: dbError } = await supabaseBoja.from('clientes_tatuaje').insert([{
            dni: clienteDni,
            nombre: clienteNombre,
            telefono: document.getElementById('cliente_telefono').value,
            es_menor: esMenorBoolean,
            dni_representante: esMenorBoolean ? repDni : null,
            pdf_url: pdfUrl
        }]);

        if (dbError) throw new Error("Error guardando datos en tabla: " + dbError.message);

        // N. DESCARGA FORZADA
        const objectUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = nombreArchivoPdf;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        alert("✅ Documento BOJA generado y archivado legalmente.");
        document.getElementById('consent-form').reset();
        document.getElementById('bloque_representante').classList.add('hidden'); // Resetear bloque menor

    } catch (error) {
        console.error("Error completo:", error);
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = textoBtnOriginal;
    }
});
