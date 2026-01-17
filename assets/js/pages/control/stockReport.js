// stockReport.js (versão atualizada com export CSV/XLSX/PDF corrigidos e melhorias não-invasivas)
import { database } from '../register/firebaseConfig.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const HISTORICO_REF = ref(database, 'historyControl');

// DOM (guarded)
const monthInput = document.getElementById('report-month');
const productSelect = document.getElementById('report-product');
const applyBtn = document.getElementById('report-apply');

const summaryEl = document.getElementById('report-summary');
const dailyTableBody = document.querySelector('#dailyTable tbody');
const dailyChartEl = document.getElementById('dailyChart');

// Safety: checagem mínima de elementos necessários
if (!monthInput || !productSelect || !applyBtn || !summaryEl || !dailyTableBody || !dailyChartEl) {
    console.warn('stockReport.js: elementos do DOM do relatório ausentes. Verifique IDs: report-month, report-product, report-apply, report-summary, #dailyTable tbody, dailyChart.');
}

const dailyChartCtx = dailyChartEl && dailyChartEl.getContext ? dailyChartEl.getContext('2d') : null;

let currentHist = {}; // cache do historyControl
let chart = null;

/* ========== ADICIONADO: variáveis de cache/export ========== */
let lastAgg = null;   // guarda último aggregate (para export)
let lastMeta = null;  // { year, monthIdx, productFilter }
/* ========================================================= */

// util
const pad = (n) => String(n).padStart(2, '0');

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ========== parsing robusto de timestamp ========== */
function parseTimestamp(ts) {
    if (!ts && ts !== 0) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts === 'object' && ts.seconds !== undefined) {
        const ms = Number(ts.seconds) * 1000 + (Number(ts.nanoseconds || 0) / 1e6);
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }
    const n = Number(ts);
    if (!isNaN(n)) {
        const ms = n < 1e12 ? n * 1000 : n;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
}
/* ========================================================= */

// popula productSelect com produtos únicos do histórico
function populateProductList(hist) {
    if (!productSelect) return;
    const current = productSelect.value || '';
    const prods = new Set();
    Object.values(hist || {}).forEach(block => {
        if (!block || !block.registros) return;
        Object.values(block.registros).forEach(r => { if (r && r.product) prods.add(String(r.product)); });
    });
    const arr = Array.from(prods).sort();
    const options = ['<option value="">Todos</option>', ...arr.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`)];
    productSelect.innerHTML = options.join('');
    if (arr.includes(current)) productSelect.value = current; else productSelect.value = '';
}

// agrega dados por dia para um mês/ano e produto opcional
function aggregateDaily(hist, year, month0Index, productFilter = '') {
    const daysInMonth = new Date(year, month0Index + 1, 0).getDate();
    const daily = {};
    for (let d = 1; d <= daysInMonth; d++) {
        const keyDate = `${year}-${pad(month0Index + 1)}-${pad(d)}`;
        daily[keyDate] = { total: 0, remaining: 0 };
    }

    Object.values(hist || {}).forEach(block => {
        if (!block || !block.registros) return;
        Object.values(block.registros).forEach(r => {
            if (!r) return;
            const date = parseTimestamp(r.timestamp);
            if (!date) return;
            if (date.getFullYear() !== year) return;
            if (date.getMonth() !== month0Index) return;
            if (productFilter && productFilter !== '' && !(String(r.product || '').toLowerCase().includes(productFilter.toLowerCase()))) return;

            const keyDate = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
            const qty = Number(r.quantity || 0);
            const saida = Number(r.saida || 0);
            const restante = Math.max(0, qty - saida);
            daily[keyDate].total += qty;
            daily[keyDate].remaining += restante;
        });
    });

    const labels = [], totals = [], remains = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const key = `${year}-${pad(month0Index + 1)}-${pad(d)}`;
        labels.push(`${pad(d)}/${pad(month0Index + 1)}`);
        totals.push(daily[key].total);
        remains.push(daily[key].remaining);
    }

    return { labels, totals, remains, dailyObj: daily };
}

// renderiza resumo cards, tabela e gráfico
function renderReportFor(monthValue, productFilter = '') {
    if (!summaryEl || !dailyTableBody) return;

    if (!monthValue) {
        summaryEl.innerHTML = `<div class="card">Selecione um mês para gerar o relatório</div>`;
        return;
    }

    const [yearStr, monthStr] = monthValue.split('-');
    const year = Number(yearStr);
    const monthIdx = Number(monthStr) - 1;
    const agg = aggregateDaily(currentHist, year, monthIdx, productFilter);

    const totalMes = agg.totals.reduce((a, b) => a + b, 0);
    const totalRemain = agg.remains.reduce((a, b) => a + b, 0);

    const bestDayInfo = agg.totals.map((v, i) => ({ value: v, index: i })).filter(d => d.value > 0).sort((a, b) => b.value - a.value)[0];
    const bestDayLabel = bestDayInfo ? agg.labels[bestDayInfo.index] : '-';
    const worstDayInfo = agg.totals.map((v, i) => ({ value: v, index: i })).filter(d => d.value > 0).sort((a, b) => a.value - b.value)[0];
    const worstDayLabel = worstDayInfo ? agg.labels[worstDayInfo.index] : '-';

    const monthlyAgg = aggregateMonthly(currentHist, productFilter);
    const { best: bestMonth, worst: worstMonth } = getBestAndWorstMonth(monthlyAgg);

    summaryEl.innerHTML = `
    <div class="card"><small class="muted">Total no mês</small><h3>${totalMes}</h3></div>
    <div class="card"><small class="muted">Total restante (túnel)</small><h3>${totalRemain}</h3></div>
    <div class="card"><small class="muted">Dia com maior entrada</small><h3>${bestDayLabel}</h3></div>
    <div class="card"><small class="muted">Dia com menor entrada</small><h3>${worstDayLabel}</h3></div>

    <div class="card"><small class="muted">Mês com maior entrada</small><h3>${bestMonth}</h3></div>
    <div class="card"><small class="muted">Mês com menor entrada</small><h3>${worstMonth}</h3></div>
`;


    dailyTableBody.innerHTML = '';
    agg.labels.forEach((lab, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(lab)}</td><td>${agg.totals[i]}</td><td>${agg.remains[i]}</td>`;
        dailyTableBody.appendChild(tr);
    });

    if (!dailyChartCtx) return;
    if (chart) chart.destroy();

    chart = new Chart(dailyChartCtx, {
        type: 'bar',
        data: {
            labels: agg.labels, datasets: [
                { type: 'bar', label: 'Total Caixas', data: agg.totals, yAxisID: 'y', borderRadius: 6 },
                { type: 'line', label: 'Caixas Restantes (túnel)', data: agg.remains, yAxisID: 'y', tension: 0.3, pointRadius: 3, fill: false }
            ]
        },
        options: {
            responsive: true,
            interaction: { mode: 'index', intersect: false },
            stacked: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Caixas' } } },
            plugins: { legend: { position: 'top' }, tooltip: { enabled: true } }
        }
    });

    lastAgg = agg;
    lastMeta = { year, monthIdx, productFilter };
}

// event handlers
if (applyBtn) applyBtn.addEventListener('click', () => renderReportFor(monthInput.value, productSelect.value));

function ensureLibs() {
    if (typeof window.XLSX === 'undefined') { console.warn('XLSX não encontrado'); return false; }
    if (typeof window.html2canvas === 'undefined') { console.warn('html2canvas não encontrado'); return false; }
    if (!window.jspdf || !window.jspdf.jsPDF) { console.warn('jsPDF não encontrado'); return false; }
    return true;
}

/* ===== Exports CSV / XLSX ===== */
const setupExports = () => {
    const btnCsv = document.getElementById('export-csv');
    btnCsv?.addEventListener('click', () => {
        if (!lastAgg) return alert('Gere o relatório primeiro.');
        const rows = [['Dia', 'Total Caixas', 'Caixas Restantes'], ...lastAgg.labels.map((l, i) => [l, lastAgg.totals[i], lastAgg.remains[i]])];
        const csv = rows.map(r => r.join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `relatorio-estoque-${(new Date()).toISOString().slice(0, 10)}.csv`;
        a.click();
    });

    const btnXlsx = document.getElementById('export-xlsx');
    btnXlsx?.addEventListener('click', () => {
        if (!lastAgg) return alert('Gere o relatório primeiro.');
        if (!ensureLibs()) return alert('Bibliotecas não carregadas.');
        const XLSX = window.XLSX;
        const wsData = [['Dia', 'Total Caixas', 'Caixas Restantes'], ...lastAgg.labels.map((l, i) => [l, lastAgg.totals[i], lastAgg.remains[i]])];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
        XLSX.writeFile(wb, `relatorio-estoque-${(new Date()).toISOString().slice(0, 10)}.xlsx`);
    });
};
setupExports();

/* ===== Export PDF com html2canvas ===== */
/* ===== Export PDF com html2canvas (logotipo centralizado + height maior) ===== */
try {
    const btnPdf = document.getElementById('export-pdf');
    btnPdf?.addEventListener('click', async () => {
        try {
            if (!lastAgg) return alert('Gere o relatório primeiro.');
            if (!ensureLibs()) return alert('Bibliotecas não carregadas.');

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pageWidth = 210; // A4 width em mm
            let y = 15;

            // ---------- LOGO via html2canvas (SVG + PNG fallback) ----------
            const logoSvgUrl = new URL(
                '../../assets/img/global/svg/brand/brand-with-text.svg',
                window.location.href
            ).href;
            const logoPngUrl = new URL(
                '../../assets/img/global/png/brand-with-text.png',
                window.location.href
            ).href;

            const logoImg = document.createElement('img');
            logoImg.src = logoSvgUrl;
            logoImg.crossOrigin = 'anonymous';
            logoImg.onerror = () => { logoImg.src = logoPngUrl; };

            const logoDiv = document.createElement('div');
            logoDiv.style.display = 'inline-block';
            logoDiv.style.padding = '0';
            logoDiv.appendChild(logoImg);
            document.body.appendChild(logoDiv);

            const canvas = await html2canvas(logoDiv, { useCORS: true, backgroundColor: null });
            const imgData = canvas.toDataURL('image/png');
            document.body.removeChild(logoDiv);

            // calcula largura proporcional para height aumentado
            const logoHeight = 40; // altura desejada em mm
            const logoWidth = (canvas.width * logoHeight) / canvas.height;
            const x = (pageWidth - logoWidth) / 2; // centralizado horizontalmente

            pdf.addImage(imgData, 'PNG', x, y, logoWidth, logoHeight);
            y += logoHeight + 20; // espaço abaixo do logo
            // -----------------------------------------------------------------

            pdf.setFontSize(16); pdf.setFont(undefined, 'bold');
            pdf.text('Relatório de Estoque — Túnel / Caixas', pageWidth / 2, y, { align: 'center' });
            y += 8;
            pdf.setFontSize(11); pdf.setFont(undefined, 'normal');
            pdf.text(`Período: ${lastMeta.year}-${String(lastMeta.monthIdx + 1).padStart(2, '0')}`, pageWidth / 2, y, { align: 'center' });
            y += 6;
            pdf.text(`Produto: ${lastMeta.productFilter || 'Todos'}`, pageWidth / 2, y, { align: 'center' });
            y += 12;

            const chartImg = dailyChartEl.toDataURL('image/png', 1);
            pdf.addImage(chartImg, 'PNG', 15, y, 180, 70);
            y += 80;

            const drawTableHeader = () => {
                pdf.setFontSize(11); pdf.setFont(undefined, 'bold');
                pdf.text('Dia', 15, y); pdf.text('Total Caixas', 60, y); pdf.text('Caixas Restantes', 120, y);
                y += 4; pdf.line(15, y, 195, y); y += 6; pdf.setFont(undefined, 'normal');
            };

            drawTableHeader();
            lastAgg.labels.forEach((label, i) => {
                if (y > 297 - 15) { pdf.addPage(); y = 20; drawTableHeader(); }
                pdf.text(label, 15, y);
                pdf.text(String(lastAgg.totals[i]), 60, y);
                pdf.text(String(lastAgg.remains[i]), 120, y);
                y += 6;
            });

            pdf.save(`relatorio-estoque-${lastMeta.year}-${String(lastMeta.monthIdx + 1).padStart(2, '0')}.pdf`);
        } catch (err) {
            console.error('Erro ao exportar PDF', err);
            alert('Erro ao gerar PDF. Veja o console.');
        }
    });
} catch (err) {
    console.error('Erro ao registrar export PDF', err);
}

// ===== AGREGAÇÃO MENSAL (VISÃO GERAL) =====
function aggregateMonthly(hist, productFilter = '') {
    const monthly = {};

    Object.values(hist || {}).forEach(block => {
        if (!block?.registros) return;

        Object.values(block.registros).forEach(r => {
            if (!r) return;

            const date = parseTimestamp(r.timestamp);
            if (!date) return;

            if (
                productFilter &&
                !String(r.product || '').toLowerCase().includes(productFilter.toLowerCase())
            ) return;

            const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
            monthly[key] = (monthly[key] || 0) + Number(r.quantity || 0);
        });
    });

    return monthly;
}

function getBestAndWorstMonth(monthlyObj) {
    const entries = Object.entries(monthlyObj).filter(([, v]) => v > 0);
    if (!entries.length) return { best: '-', worst: '-' };

    entries.sort((a, b) => b[1] - a[1]);

    const formatMonth = (key) => {
        const [y, m] = key.split('-');
        return `${m}/${y}`;
    };

    return {
        best: formatMonth(entries[0][0]),
        worst: formatMonth(entries[entries.length - 1][0])
    };
}


// realtime load historyControl
onValue(HISTORICO_REF, snap => {
    currentHist = snap.exists() ? snap.val() : {};
    populateProductList(currentHist);
    if (monthInput && !monthInput.value) { const d = new Date(); monthInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
    if (monthInput) renderReportFor(monthInput.value, productSelect ? productSelect.value : '');
});
