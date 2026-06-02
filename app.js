// =========================================================
// 1. CONFIGURACIÓN SUPABASE Y VARIABLES GLOBALES
// =========================================================
const SUPABASE_URL = 'https://fqydtjwqkmdatfsauomh.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_-FdijJSiBiKFSY4I4F-LJw_fB89m4Cj';
const supabaseBoja = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let borradorActual = null;
let tatuadorActual = null;
let esMenorBoolean = false;

// Datos Fijos del Estudio (Edita estos datos con los reales de tu negocio)
const DATOS_CENTRO = {
    centro_nombre: 'CISKOTATTOO',
    centro_nif: 'B12345678', // Cambiar
    centro_tipo_via: 'Calle',
    centro_nombre_via: 'Principal', // Cambiar
    centro_numero: '1',
    centro_poblacion: 'Cádiz',
    centro_provincia: 'Cádiz',
    centro_cp: '11000'
};

// =========================================================
// 2. INICIALIZACIÓN (LEER URL Y TRAER DATOS)
// =========================================================
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get('draft_id');

    if (!draftId) {
        document.getElementById('loading-screen').innerHTML = `<h2 class="text-xl font-heading text-red-600 font-bold">Enlace Inválido</h2><p class="text-sm mt-2">Falta el identificador de la sesión.</p>`;
        return;
    }

    try {
        // Pedir el borrador y los datos del tatuador asociado
        const { data: draft, error } = await supabaseBoja
            .from('borradores_boja')
            .select('*, tatuadores(*)')
            .eq('id', draftId)
            .single();

        if (error || !draft) throw new Error("Borrador no encontrado o ya utilizado.");
        if (draft.estado === 'Completado') throw new Error("Este consentimiento ya fue firmado.");

        borradorActual = draft;
        tatuadorActual = draft.tatuadores;

        // Mostrar nombre del tatuador en la UI
        document.getElementById('ui-tat-nombre').innerText = tatuadorActual.nombre.toUpperCase();

        // Ocultar carga y mostrar formulario
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('consent-form').classList.remove('hidden');

    } catch (err) {
        document.getElementById('loading-screen').innerHTML = `<h2 class="text-xl font-heading text-red-600 font-bold">Error</h2><p class="text-sm mt-2">${err.message}</p>`;
    }
});

// =========================================================
// 3. LÓGICA EDAD (REPRESENTANTE LEGAL)
// =========================================================
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
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
// 4. HELPERS PDF (Indestructibles)
// =========================================================
const fillText = (form, fieldName, value) => {
    try {
        const field = form.getTextField(fieldName);
        if (field && value) field.setText(value.toString());
    } catch (e) { /* Ignora silenciosamente si la plantilla no tiene el campo */ }
};

const fillMark = (form, fieldName, isChecked) => {
    if (!isChecked) return;
    try {
        const field = form.getTextField(fieldName);
        if (field) field.setText('X');
    } catch (e) {
        try { form.getCheckBox(fieldName).check(); } catch (e2) {}
    }
};

// =========================================================
// 5. GENERACIÓN Y SUBIDA DEL PDF
// =========================================================
document.getElementById('consent-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!document.getElementById('check_firma_digital').checked) {
        return alert("⚠️ Debes marcar la casilla de firma electrónica.");
    }

    const btn = document.getElementById('btn-submit');
    const textoBtnOriginal = btn.innerText;
    btn.innerText = "⏳ Generando documento cifrado...";
    btn.disabled = true;

    try {
        // Cargar Plantilla
        const urlPlantilla = 'plantilla_boja.pdf';
        const plantillaBytes = await fetch(urlPlantilla).then(res => {
            if(!res.ok) throw new Error("Error cargando plantilla PDF.");
            return res.arrayBuffer();
        });

        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(plantillaBytes);
        const form = pdfDoc.getForm();

        const ahora = new Date();
        const fechaStr = ahora.toLocaleDateString('es-ES');
        const horaStr = ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'});

        // 1. INYECTAR DATOS DEL CENTRO (Hardcodeados arriba)
        Object.keys(DATOS_CENTRO).forEach(key => fillText(form, key, DATOS_CENTRO[key]));

        // 2. INYECTAR DATOS DEL TATUADOR (Extraídos de Supabase)
        fillText(form, 'tatuador_nombre', tatuadorActual.nombre);
        fillText(form, 'tatuador_dni', tatuadorActual.boja_dni);
        fillText(form, 'tatuador_titulo', tatuadorActual.boja_titulo);
        fillText(form, 'tatuador_numero', tatuadorActual.boja_categoria); // Usamos categoria para número/colegiado
        fillText(form, 'tatuador_poblacion', tatuadorActual.boja_poblacion);
        fillText(form, 'tatuador_provincia', tatuadorActual.boja_provincia);
        fillText(form, 'tatuador_cp', tatuadorActual.boja_cp);
        fillText(form, 'tatuador_telefono', tatuadorActual.boja_telefono);

        // 3. INYECTAR DATOS DEL BORRADOR (Técnica y Zona)
        fillText(form, 'zona_anatomica', borradorActual.zona_anatomica);
        fillText(form, 'materiales', borradorActual.materiales);
        
        fillMark(form, 'check_tatuaje', borradorActual.tecnica === 'TATUAJE');
        fillMark(form, 'check_micro', borradorActual.tecnica === 'MICRO');
        fillMark(form, 'check_piercing', borradorActual.tecnica === 'PIERCING');

        // Textos por defecto estandarizados para el cliente
        fillText(form, 'como_se_realiza', "Procedimiento higiénico-sanitario estándar según Decreto 71/2017.");
        fillText(form, 'efectos', "Enrojecimiento e inflamación local temporal.");
        fillText(form, 'riesgos', "Alergias o infección por falta de cuidados posteriores.");
        fillText(form, 'medidas', "Lavar con jabón neutro, secar con papel, aplicar crema.");
        fillText(form, 'presupuesto', "Según lo acordado verbalmente/presupuesto previo.");

        // 4. INYECTAR DATOS DEL CLIENTE (Inputs HTML)
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
        
        fillMark(form, 'cliente_sexo_h', document.getElementById('cliente_sexo_h').checked);
        fillMark(form, 'cliente_sexo_m', document.getElementById('cliente_sexo_m').checked);

        // Representante
        let repNombre = '';
        let repDni = '';
        if (esMenorBoolean) {
            repNombre = document.getElementById('rep_nombre').value.toUpperCase();
            repDni = document.getElementById('rep_dni').value.toUpperCase();

            fillText(form, 'rep_nombre', repNombre);
            fillText(form, 'rep_dni', repDni);
            fillText(form, 'rep_tipo_via', document.getElementById('rep_tipo_via').value);
            fillText(form, 'rep_nombre_via', document.getElementById('rep_nombre_via').value);
            fillText(form, 'rep_numero', document.getElementById('rep_numero').value);
            fillText(form, 'rep_poblacion', document.getElementById('rep_poblacion').value);
            fillText(form, 'rep_provincia', document.getElementById('rep_provincia').value);
            fillText(form, 'rep_cp', document.getElementById('rep_cp').value);
            fillText(form, 'rep_telefono', document.getElementById('rep_telefono').value);

            fillMark(form, 'rep_sexo_h', document.getElementById('rep_sexo_h').checked);
            fillMark(form, 'rep_sexo_m', document.getElementById('rep_sexo_m').checked);
        }

        // Cuestionario
        const perm = document.getElementById('permanente').value;
        fillMark(form, 'permanente_si', perm === 'SI'); fillMark(form, 'permanente_no', perm === 'NO');

        const todaVida = document.getElementById('toda_vida').value;
        fillMark(form, 'toda_vida_si', todaVida === 'SI'); fillMark(form, 'toda_vida_no', todaVida === 'NO');

        const alt = document.getElementById('alteracion').value;
        fillMark(form, 'alteracion_si', alt === 'SI'); fillMark(form, 'alteracion_no', alt === 'NO');

        const ret = document.getElementById('retoques').value;
        fillMark(form, 'retoques_si', ret === 'SI'); fillMark(form, 'retoques_no', ret === 'NO');

        // 5. CIERRE Y FIRMA ELECTRÓNICA DE TEXTO
        const firmanteNombre = esMenorBoolean ? repNombre : clienteNombre;
        const firmanteDni = esMenorBoolean ? repDni : clienteDni;

        fillText(form, 'nombre_final', firmanteNombre);
        fillText(form, 'tecnica_final', borradorActual.tecnica);
        fillText(form, 'fecha_ciudad', document.getElementById('fecha_ciudad').value);
        fillText(form, 'fecha_dia', ahora.getDate().toString());
        fillText(form, 'fecha_mes', (ahora.getMonth() + 1).toString());
        fillText(form, 'fecha_anio', ahora.getFullYear().toString());

        // Inyección de firmas como texto en los recuadros correspondientes del AcroForm
        const strFirmaCliente = `Firmado electrónicamente por ${firmanteNombre} con DNI ${firmanteDni} el ${fechaStr} a las ${horaStr}.`;
        const strFirmaTatuador = `Firmado electrónicamente por ${tatuadorActual.nombre} con DNI ${tatuadorActual.boja_dni} el ${fechaStr} a las ${horaStr}.`;

        fillText(form, 'firma_cliente_texto', strFirmaCliente);
        fillText(form, 'firma_tatuador_texto', strFirmaTatuador);

        // Bloquear campos y forzar renderizado
        form.getFields().forEach(c => c.enableReadOnly());
        form.updateFieldAppearances();

        // 6. GENERAR Y SUBIR
        const pdfModificadoBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfModificadoBytes], { type: 'application/pdf' });
        const nombreArchivoPdf = `${firmanteDni}_${borradorActual.id.substring(0,8)}.pdf`;

        btn.innerText = "☁️ Archivando en la Nube...";
        
        const { error: uploadError } = await supabaseBoja.storage
            .from('consentimientos')
            .upload(nombreArchivoPdf, pdfBlob, { contentType: 'application/pdf', cacheControl: '3600' });

        if (uploadError) throw new Error("Error subiendo PDF: " + uploadError.message);

        const { data: publicUrlData } = supabaseBoja.storage.from('consentimientos').getPublicUrl(nombreArchivoPdf);
        
        // 7. GUARDAR EN BASE DE DATOS Y COMPLETAR BORRADOR
        await Promise.all([
            supabaseBoja.from('clientes_tatuaje').insert([{
                dni: clienteDni, nombre: clienteNombre, telefono: document.getElementById('cliente_telefono').value,
                es_menor: esMenorBoolean, dni_representante: esMenorBoolean ? repDni : null, pdf_url: publicUrlData.publicUrl
            }]),
            supabaseBoja.from('borradores_boja').update({ estado: 'Completado' }).eq('id', borradorActual.id)
        ]);

        // 8. DESCARGA FINAL
        const objectUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a'); a.href = objectUrl; a.download = nombreArchivoPdf;
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(objectUrl);

        document.getElementById('consent-form').innerHTML = `
            <div class="text-center py-10">
                <div class="text-5xl mb-4">✅</div>
                <h2 class="text-2xl font-heading font-bold text-brand-dark">Proceso Completado</h2>
                <p class="mt-2 text-sm text-brand-accent">El documento ha sido archivado legalmente y descargado en tu dispositivo.</p>
            </div>
        `;

    } catch (error) {
        console.error(error);
        alert("❌ Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = textoBtnOriginal;
    }
});
