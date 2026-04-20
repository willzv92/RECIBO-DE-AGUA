// =============================================
//  RECIBO SEDAPAL — app.js
// =============================================

// --- Inicialización ---

document.addEventListener('DOMContentLoaded', () => {
  poblarAnios();
  inicializarInputsNumericos();
  inicializarSubtotalesLive();
});

// =============================================
//  AÑOS Y PERÍODO
// =============================================

function poblarAnios() {
  const select = document.getElementById('anio');
  const anioActual = new Date().getFullYear();
  for (let y = 2025; y <= 2125; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === anioActual) opt.selected = true;
    select.appendChild(opt);
  }
}

function getPeriodo() {
  const mes  = document.getElementById('mes').value;
  const anio = document.getElementById('anio').value;
  if (!mes) return '';
  return mes + ' ' + anio;
}

// =============================================
//  FORMATO DE NÚMEROS
// =============================================

function unformatValue(valor) {
  if (!valor) return NaN;
  let str = valor.toString().trim();

  const tienePunto = str.includes('.');
  const tieneComa  = str.includes(',');

  if (tienePunto && tieneComa) {
    const ultimoPunto = str.lastIndexOf('.');
    const ultimaComa  = str.lastIndexOf(',');
    if (ultimaComa > ultimoPunto) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (tieneComa) {
    const partes = str.split(',');
    if (partes.length === 2 && partes[1].length === 3 && partes[0].length > 0) {
      str = str.replace(',', '');
    } else {
      str = str.replace(',', '.');
    }
  }
  return parseFloat(str);
}

function formatValue(valor) {
  if (isNaN(valor)) return '';
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

function normalizarDecimal(input) {
  const pos     = input.selectionStart;
  const antes   = input.value;
  const despues = antes.replace(/\./g, ',');
  if (antes !== despues) {
    input.value = despues;
    input.setSelectionRange(pos, pos);
  }
}

function formatearInput(input) {
  const raw = input.value.trim();
  const esNegativo = raw.startsWith('-');
  const num = unformatValue(esNegativo ? raw.slice(1) : raw);
  if (!isNaN(num)) {
    input.value = (esNegativo ? '-' : '') + formatValue(num);
  }
}

// IDs de todos los inputs numéricos editables
const IDS_NUMERICOS = [
  'm3_total', 'm3_a',
  'agua_potable', 'alcantarillado',
  'cargo_fijo', 'mora',
  'ajuste_ant', 'ajuste_act',
  'total_recibo'
];

function inicializarInputsNumericos() {
  IDS_NUMERICOS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => normalizarDecimal(el));
  });
}

// =============================================
//  SUBTOTALES EN VIVO
// =============================================

function getVal(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const raw = el.tagName === 'INPUT'
    ? el.value
    : el.textContent.replace('S/ ', '').trim();
  const v = unformatValue(raw);
  return isNaN(v) ? 0 : v;
}

function setSubtotal(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = isNaN(valor) ? '—' : 'S/ ' + formatValue(valor);
}

// =============================================
//  CÁLCULO AUTOMÁTICO DE IGV
// =============================================

const IGV = 0.18;

function calcularIGV() {
  // IGV consumo = 18% de (Agua Potable + Alcantarillado)
  const baseConsumo = getVal('agua_potable') + getVal('alcantarillado');
  const igvConsumo  = baseConsumo * IGV;
  const elIgvC = document.getElementById('igv_consumo');
  if (elIgvC) elIgvC.textContent = baseConsumo > 0 ? 'S/ ' + formatValue(igvConsumo) : '—';

  // IGV fijos = 18% de (Cargo Fijo)
  const baseFijos = getVal('cargo_fijo');
  const igvFijos  = baseFijos * IGV;
  const elIgvF = document.getElementById('igv_fijos');
  if (elIgvF) elIgvF.textContent = baseFijos > 0 ? 'S/ ' + formatValue(igvFijos) : '—';
}

function recalcularSubtotales() {
  calcularIGV(); // primero actualizar IGV automático

  const prop  = getVal('agua_potable') + getVal('alcantarillado') + getVal('igv_consumo');
  const fijo  = getVal('cargo_fijo') + getVal('mora') + getVal('igv_fijos');
  const esp   = getVal('ajuste_ant') + getVal('ajuste_act');
  const total = prop + fijo + esp;

  setSubtotal('total_proporcional', prop);
  setSubtotal('total_fijos',        fijo);
  setSubtotal('total_especiales',   esp);

  // Total calculado y verificación
  const elCalc = document.getElementById('total_calculado');
  elCalc.textContent = 'S/ ' + formatValue(total);

  const totalRecibo = getVal('total_recibo');
  const diffMsg     = document.getElementById('diff_msg');

  if (totalRecibo !== 0) {
    const diff = Math.abs(total - totalRecibo);
    if (diff < 0.02) {
      diffMsg.textContent = '✔ Coincide con el recibo oficial';
      diffMsg.className = 'diff-msg ok';
    } else {
      const signo = total > totalRecibo ? '+' : '';
      diffMsg.textContent = `⚠ Diferencia: S/ ${signo}${formatValue(total - totalRecibo)}`;
      diffMsg.className = 'diff-msg error';
    }
  } else {
    diffMsg.className = 'diff-msg';
  }
}

function inicializarSubtotalesLive() {
  IDS_NUMERICOS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', recalcularSubtotales);
    el.addEventListener('blur',  recalcularSubtotales);
  });
}

// =============================================
//  ACTUALIZAR DPTO 2 (m³)
// =============================================

function actualizarDepto2() {
  const m3Total = unformatValue(document.getElementById('m3_total').value);
  const m3A     = unformatValue(document.getElementById('m3_a').value);
  const previewA = document.getElementById('preview_a');
  const previewB = document.getElementById('preview_b');

  if (!isNaN(m3A) && m3A >= 0) {
    previewA.textContent = formatValue(m3A) + ' m³';
    previewA.classList.add('activo');
  } else {
    previewA.textContent = '— m³';
    previewA.classList.remove('activo');
  }

  if (isNaN(m3Total) || isNaN(m3A)) {
    document.getElementById('m3_b').value = '';
    previewB.textContent = '— m³';
    previewB.classList.remove('activo');
    return;
  }

  const m3B = m3Total - m3A;
  if (m3B >= 0) {
    document.getElementById('m3_b').value = formatValue(m3B);
    previewB.textContent = formatValue(m3B) + ' m³';
    previewB.classList.add('activo');
  } else {
    document.getElementById('m3_b').value = '0,00';
    previewB.textContent = '0,00 m³';
    previewB.classList.add('activo');
  }
}

// =============================================
//  CALCULAR REPARTO
// =============================================

function calcular() {

  if (!document.getElementById('mes').value) {
    mostrarError('Por favor, selecciona el mes de facturación.');
    return;
  }

  const m3Total = unformatValue(document.getElementById('m3_total').value);
  const m3A     = unformatValue(document.getElementById('m3_a').value);

  if (isNaN(m3Total) || m3Total <= 0) {
    mostrarError('Ingresa el consumo total (m³).');
    return;
  }
  if (isNaN(m3A) || m3A < 0) {
    mostrarError('Ingresa el consumo del Dpto 1 (ArqCopy).');
    return;
  }
  if (m3A > m3Total) {
    mostrarError('El consumo del Dpto 1 no puede superar el total.');
    return;
  }

  const m3B   = m3Total - m3A;
  const porcA = m3A / m3Total;
  const porcB = m3B / m3Total;

  // Leer conceptos (IGV se lee desde los divs calculados)
  const aguaPotable   = getVal('agua_potable');
  const alcantarillado = getVal('alcantarillado');
  const igvConsumo    = getVal('igv_consumo');
  const cargoFijo     = getVal('cargo_fijo');
  const mora          = getVal('mora');
  const igvFijos      = getVal('igv_fijos');
  const ajusteAnt     = getVal('ajuste_ant');
  const ajusteAct     = getVal('ajuste_act');

  const totalProp = aguaPotable + alcantarillado + igvConsumo;
  const totalFijo = cargoFijo + mora + igvFijos;
  const totalEsp  = ajusteAnt + ajusteAct;
  const totalGral = totalProp + totalFijo + totalEsp;

  // Reparto proporcional
  const propA = totalProp * porcA;
  const propB = totalProp * porcB;

  // Reparto fijo 50/50
  const fijoA = (totalFijo + totalEsp) / 2;
  const fijoB = (totalFijo + totalEsp) / 2;

  // Totales exactos y redondeados a S/ 0,10
  const montoA   = propA + fijoA;
  const montoB   = propB + fijoB;
  const montoA_r = redondear10(montoA);
  const montoB_r = redondear10(montoB);

  // ---- Tabla de detalle ----
  const conceptos = [
    { grupo: 'PROPORCIONALES AL CONSUMO (m³)' },
    { label: 'Volumen de Agua Potable',    tag: 'prop', total: aguaPotable,    a: aguaPotable * porcA,    b: aguaPotable * porcB,    cls: 'fila-prop' },
    { label: 'Servicio de Alcantarillado', tag: 'prop', total: alcantarillado, a: alcantarillado * porcA, b: alcantarillado * porcB, cls: 'fila-prop' },
    { label: 'IGV sobre Consumo',          tag: 'prop', total: igvConsumo,     a: igvConsumo * porcA,     b: igvConsumo * porcB,     cls: 'fila-prop' },
    { grupo: 'FIJOS (50 / 50)' },
    { label: 'Cargo Fijo',                 tag: 'fijo', total: cargoFijo, a: cargoFijo / 2, b: cargoFijo / 2, cls: 'fila-fijo' },
    { label: 'Mora',                       tag: 'fijo', total: mora,      a: mora / 2,      b: mora / 2,      cls: 'fila-fijo' },
    { label: 'IGV sobre Cargos Fijos',     tag: 'fijo', total: igvFijos,  a: igvFijos / 2,  b: igvFijos / 2,  cls: 'fila-fijo' },
    { grupo: 'ESPECIALES (50 / 50)' },
    { label: 'Redondeo Mes Anterior',      tag: 'esp', total: ajusteAnt, a: ajusteAnt / 2, b: ajusteAnt / 2, cls: 'fila-esp' },
    { label: 'Redondeo Mes Actual',        tag: 'esp', total: ajusteAct, a: ajusteAct / 2, b: ajusteAct / 2, cls: 'fila-esp' },
  ];

  const tagLabel = { prop: 'Proporcional', fijo: '50 / 50', esp: '50 / 50' };

  const tbody = document.getElementById('tbody_detalle');
  tbody.innerHTML = '';

  conceptos.forEach(c => {
    if (c.grupo !== undefined) {
      const tr = document.createElement('tr');
      tr.className = 'tbody-group-header';
      tr.innerHTML = `<td colspan="5">${c.grupo}</td>`;
      tbody.appendChild(tr);
      return;
    }
    if (c.total === 0) return;

    const tr = document.createElement('tr');
    tr.className = c.cls;
    tr.innerHTML = `
      <td class="texto-izq">${c.label}</td>
      <td><span class="tag-criterio tag-${c.tag}">${tagLabel[c.tag]}</span></td>
      <td>${formatValue(c.total)}</td>
      <td>${formatValue(c.a)}</td>
      <td>${formatValue(c.b)}</td>
    `;
    tbody.appendChild(tr);
  });

  // tfoot
  document.getElementById('tfoot_total').textContent = formatValue(totalGral);
  document.getElementById('tfoot_a').textContent     = formatValue(montoA_r);
  document.getElementById('tfoot_b').textContent     = formatValue(montoB_r);

  // Tabla resumen
  document.getElementById('td_m3_a').textContent    = formatValue(m3A);
  document.getElementById('td_m3_b').textContent    = formatValue(m3B);
  document.getElementById('td_porc_a').textContent  = fmtPorc(porcA);
  document.getElementById('td_porc_b').textContent  = fmtPorc(porcB);
  document.getElementById('td_prop_a').textContent  = formatValue(propA);
  document.getElementById('td_prop_b').textContent  = formatValue(propB);
  document.getElementById('td_fijo_a').textContent  = formatValue(fijoA);
  document.getElementById('td_fijo_b').textContent  = formatValue(fijoB);
  document.getElementById('td_monto_a').textContent = formatValue(montoA_r);
  document.getElementById('td_monto_b').textContent = formatValue(montoB_r);

  // Chips
  const periodo = getPeriodo() || '(sin especificar)';
  document.getElementById('resumen_periodo').textContent = 'Período: ' + periodo;
  document.getElementById('chip_m3').textContent    = formatValue(m3Total) + ' m³';
  document.getElementById('chip_monto').textContent = 'S/ ' + formatValue(totalGral);
  document.getElementById('chip_prop').textContent  = 'S/ ' + formatValue(totalProp);
  document.getElementById('chip_fijo').textContent  = 'S/ ' + formatValue((totalFijo + totalEsp) / 2);

  // Barra
  document.getElementById('barra_a').style.width = (porcA * 100).toFixed(2) + '%';

  // Mostrar
  const resultado = document.getElementById('resultado');
  resultado.style.display = 'block';
  resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
//  HELPERS
// =============================================

/**
 * Redondea al múltiplo de S/ 0,10 más cercano.
 * Centésimos ≥ 0,05 → sube; < 0,05 → baja.
 */
function redondear10(valor) {
  return Math.round(valor * 10) / 10;
}

function fmtPorc(valor) {
  return (valor * 100).toFixed(2).replace('.', ',') + '%';
}

function mostrarError(mensaje) {
  alert('⚠️ ' + mensaje);
}
