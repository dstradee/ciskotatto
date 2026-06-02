// =========================================================
// 1. CONFIGURACIÓN CONSTANTE (Coordenadas de la firma)
// =========================================================
const FIRMA_CONFIG = {
    paginaIndex: 2,  // 0 = Pág 1, 1 = Pág 2, 2 = Pág 3 del BOJA
    x: 80,           // Mueve el sello a izquierda o derecha
    y: 130           // Mueve el sello arriba o abajo
};

const SUPABASE_URL = 'https://fqydtjwqkmdatfsauomh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_-FdijJSiBiKFSY4I4F-LJw_fB89m4Cj';

// Instancia única de Supabase
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
// 3. HELPERS TODOTERRENO PARA RELLENAR PDF
// =========================================================
const fillText = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(value.toString());
    } catch (e) {
        console.warn(`[Aviso] Campo de texto '${fieldName}' no encontrado.`);
    }
};

// NUEVO HELPER ESPECIAL PARA LA "X" EN CAMPOS DE TEXTO
const fillMark = (form, fieldName, isChecked) => {
    if (!isChecked) return; // Si no está marcado en la web, se queda en blanco
    
    try {
        // Intenta escribir una "X" en el campo de texto que has creado en el PDF
        const field = form.getTextField(fieldName);
        if (field) field.setText('X');
    } catch (e) {
        // Fallback por si alguno se te olvidó cambiarlo y sigue siendo checkbox
        try {
            form.getCheckBox(fieldName).check();
        } catch (e2) {
            console.warn(`[Aviso] Campo para la marca '${fieldName}' no encontrado.`);
        }
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
    btn.innerText = "⏳ Generando documento seguro...";
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

        const ahora = new Date();
        const fechaStr = ahora.toLocaleDateString('es-ES');
        const horaStr = ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});

        // B. MAPEO: Centro y Tatuador
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

        // C. MAPEO: Cliente
        const clienteNombre = document.getElementById('cliente_nombre').value.toUpperCase();
        const clienteDni = document.getElementById('cliente_dni').value.toUpperCase();
        
        fillText(form, 'cliente_nombre', clienteNombre);
        fillText(form, 'cliente_nacimiento', document.getElementById('cliente_nacimiento').value);
        fillText(form, 'cliente_dni', clienteDni);
        fillText(form, 'cliente_tipo_via', document.getElementById('cliente_tipo_via').value);
        fillText(form, 'cliente_nombre_via', document.getElementById('cliente_nombre_via').value);
        fillText(form, 'cliente_numero', document.getElementById('cliente_numero').value);
        fillText(form, 'cliente_poblacion', document.getElementById('cliente_poblacion').value);
        fillText(form, 'cliente_provincia', document.getElementById('cliente_provincia').value);
        fillText(form, 'cliente_cp', document.getElementById('cliente_cp').value);
        fillText(form, 'cliente_telefono', document.getElementById('cliente_telefono').value);

        // D. MAPEO: Casillas de Verificación (Con la nueva función "X")
        fillMark(form, 'cliente_sexo_h', document.getElementById('cliente_sexo_h').checked);
        fillMark(form, 'cliente_sexo_m', document.getElementById('cliente_sexo_m').checked);

        // Representante (si procede)
        let repNombre = '';
        let repDni = '';
        if (esMenorBoolean) {
            repNombre = document.getElementById('rep_nombre').value.toUpperCase();
            repDni = document.getElementById('rep_dni').value.toUpperCase();

            fillText(form, 'rep_nombre', repNombre);
            fillText(form, 'rep_dni', repDni);
            fillMark(form, 'rep_sexo_h', document.getElementById('rep_sexo_h').checked);
            fillMark(form, 'rep_sexo_m', document.getElementById('rep_sexo_m').checked);
            fillText(form, 'rep_tipo_via', document.getElementById('rep_tipo_via').value);
            fillText(form, 'rep_nombre_via', document.getElementById('rep_nombre_via').value);
            fillText(form, 'rep_numero', document.getElementById('rep_numero').value);
            fillText(form, 'rep_poblacion', document.getElementById('rep_poblacion').value);
            fillText(form, 'rep_provincia', document.getElementById('rep_provincia').value);
            fillText(form, 'rep_cp', document.getElementById('rep_cp').value);
            fillText(form, 'rep_telefono', document.getElementById('rep_telefono').value);
        }

        // Técnica
        fillMark(form, 'check_tatuaje', document.getElementById('check_tatuaje').checked);
        fillMark(form, 'check_micro', document.getElementById('check_micro').checked);
        fillMark(form, 'check_piercing', document.getElementById('check_piercing').checked);
        fillText(form, 'zona_anatomica', document.getElementById('zona_anatomica').value);

        // Cuestionario de Salud (SI/NO usando los <select> del HTML)
        const perm = document.getElementById('permanente').value;
        fillMark(form, 'permanente_si', perm === 'SI');
        fillMark(form, 'permanente_no', perm === 'NO');

        const todaVida = document.getElementById('toda_vida').value;
        fillMark(form, 'toda_vida_si', todaVida === 'SI');
        fillMark(form, 'toda_vida_no', todaVida === 'NO');

        const alt = document.getElementById('alteracion').value;
        fillMark(form, 'alteracion_si', alt === 'SI');
        fillMark(form, 'alteracion_no', alt === 'NO');

        const ret = document.getElementById('retoques').value;
        fillMark(form, 'retoques_si', ret === 'SI');
        fillMark(form, 'retoques_no', ret === 'NO');

        // Textareas
        fillText(form, 'como_se_realiza', document.getElementById('como_se_realiza').value);
        fillText(form, 'materiales', document.getElementById('materiales').value);
        fillText(form, 'efectos', document.getElementById('efectos').value);
        fillText(form, 'riesgos', document.getElementById('riesgos').value);
        fillText(form, 'medidas', document.getElementById('medidas').value);
        fillText(form, 'presupuesto', document.getElementById('presupuesto').value);

        // Nombres finales y fechas
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

        // E. SELLO DE FIRMA DIGITAL
        const strFirmaCliente = `Firmado electrónicamente por ${firmanteNombre} con DNI ${firmanteDni} el ${fechaStr} a las ${horaStr}.`;
        const strFirmaTatuador = `Firmado electrónicamente por ${document.getElementById('tatuador_nombre').value} con DNI ${document.getElementById('tatuador_dni').value} el ${fechaStr} a las ${horaStr}.`;

        fillText(form, 'firma_cliente_texto', strFirmaCliente);
        fillText(form, 'firma_tatuador_texto', strFirmaTatuador);

        // F. BLOQUEAR CAMPOS Y FORZAR DIBUJADO DE LAS "X"
        const camposDelPdf = form.getFields();
        camposDelPdf.forEach(campo => {
            campo.enableReadOnly();
        });
        
        // Imprescindible para que las "X" se peguen a la hoja visualmente
        form.updateFieldAppearances();

        // G. GENERAR BLOB
        const pdfModificadoBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfModificadoBytes], { type: 'application/pdf' });
        const nombreArchivoPdf = `${firmanteDni}_${Date.now()}.pdf`;

        // H. SUBIR A SUPABASE
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

        // I. GUARDAR EN TABLA
        const { error: dbError } = await supabaseBoja.from('clientes_tatuaje').insert([{
            dni: clienteDni,
            nombre: clienteNombre,
            telefono: document.getElementById('cliente_telefono').value,
            es_menor: esMenorBoolean,
            dni_representante: esMenorBoolean ? repDni : null,
            pdf_url: pdfUrl
        }]);

        if (dbError) throw new Error("Error en tabla: " + dbError.message);

        // J. DESCARGAR
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
        document.getElementById('bloque_representante').classList.add('hidden');

    } catch (error) {
        console.error("Error:", error);
        alert("❌ Ocurrió un error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = textoBtnOriginal;
    }
});
