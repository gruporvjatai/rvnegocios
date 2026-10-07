// ============================================================
// ABA DE HISTÓRICO DE PREÇOS (Materiais)
// Layout moderno: KPIs, filtros, ranking, evolução e tabela.
// Lançamento manual em modal.
// ============================================================

let chartInstancia = null;

// ============================================================
// DETECÇÃO DE PREÇOS FORA DO PADRÃO
// Heurística: mesma O.C./produto pode vir em unidades diferentes
// (m³ x caminhão fechado, unidade x pacote) ou conter erro de
// digitação. Sem campo de unidade, marcamos como fora do padrão
// quando o preço unitário destoa da mediana do produto em mais
// de 3x (para cima ou para baixo). Esses registros ficam fora dos
// KPIs/ranking/gráfico por padrão, mas podem ser exibidos no filtro.
// ============================================================
const FATOR_FORA_PADRAO = 3;
let _medianasPrecosCache = { ref: null, map: null };

function medianasPrecosPorProduto() {
  const arr = STATE.historico_precos || [];
  if (_medianasPrecosCache.ref === arr && _medianasPrecosCache.map) return _medianasPrecosCache.map;

  const porProduto = {};
  arr.forEach(r => {
    const pid = Number(r.produto_id) || 0;
    if (!pid) return;
    if (!porProduto[pid]) porProduto[pid] = [];
    porProduto[pid].push(Number(r.preco_unitario));
  });

  const med = {};
  Object.keys(porProduto).forEach(pid => {
    const precos = porProduto[pid];
    if (precos.length < 4) return;
    const ordenado = precos.slice().sort((a, b) => a - b);
    const meio = Math.floor(ordenado.length / 2);
    const m = ordenado.length % 2 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2;
    if (m > 0) med[pid] = m;
  });

  _medianasPrecosCache = { ref: arr, map: med };
  return med;
}

function precoForaDoPadrao(r) {
  const pid = Number(r.produto_id) || 0;
  if (!pid) return false;
  const mediana = medianasPrecosPorProduto()[pid];
  if (!mediana || mediana <= 0) return false;
  const preco = Number(r.preco_unitario);
  if (!(preco > 0)) return true;
  return preco > mediana * FATOR_FORA_PADRAO || preco < mediana / FATOR_FORA_PADRAO;
}

function exibirForaDoPadrao() {
  return !!document.getElementById('filtro-preco-fora-padrao')?.checked;
}

function contarForaDoPadrao(registros) {
  return (registros || []).filter(precoForaDoPadrao).length;
}

// ============================================================
// RENDER DA ABA
// ============================================================
function renderViewHistoricoPrecos() {
  const container = document.getElementById('view-precos');
  if (!container) return;

  container.innerHTML = `
    <!-- CABEÇALHO / AÇÕES -->
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <i data-lucide="trending-up" class="text-blue-700"></i> Histórico de Preços
        </h2>
        <p class="text-sm text-slate-500 mt-1">Evolução dos preços unitários de materiais. Registre compras antigas manualmente ou automaticamente pelas Ordens de Compra confirmadas.</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button onclick="abrirModalPrecoManual()" class="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition">
          <i data-lucide="plus-circle" class="w-4 h-4"></i> Novo Preço Manual
        </button>
        <button onclick="exportarPrecosCSV()" class="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition">
          <i data-lucide="download" class="w-4 h-4"></i> CSV
        </button>
        <button onclick="imprimirRelatorioHistoricoPrecos()" class="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition">
          <i data-lucide="printer" class="w-4 h-4"></i> Relatório
        </button>
      </div>
    </div>

    <!-- KPIs -->
    <div id="resumo-precos" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"></div>

    <!-- FILTROS -->
    <div class="bg-white p-5 rounded-xl shadow-sm border mb-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-700 flex items-center gap-2">
          <i data-lucide="filter" class="w-4 h-4 text-slate-400"></i> Filtros
        </h3>
        <button onclick="limparFiltrosPrecos()" class="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline">Limpar filtros</button>
      </div>
      <label class="flex items-center gap-2 mb-4 text-xs font-semibold text-slate-500 cursor-pointer select-none">
        <input type="checkbox" id="filtro-preco-fora-padrao" onchange="atualizarVisualizacao()" class="accent-blue-700 w-4 h-4">
        Incluir preços fora do padrão (variação acima de 3x a mediana do produto)
      </label>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div class="lg:col-span-2">
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar</label>
          <input type="text" id="filtro-preco-busca" placeholder="Produto, fornecedor ou observação..." oninput="atualizarVisualizacao()" class="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:border-blue-600 outline-none">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Produto</label>
          <select id="filtro-preco-produto" onchange="atualizarVisualizacao()" class="w-full p-2 border rounded-lg text-sm font-medium bg-slate-50 focus:border-blue-600 outline-none">
            <option value="">Todos</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
          <select id="filtro-preco-origem" onchange="atualizarVisualizacao()" class="w-full p-2 border rounded-lg text-sm font-medium bg-slate-50 focus:border-blue-600 outline-none">
            <option value="">Todas</option>
            <option value="manual">Manual</option>
            <option value="automatico">Automática (O.C.)</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">De</label>
            <input type="date" id="filtro-preco-inicio" onchange="atualizarVisualizacao()" class="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:border-blue-600 outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Até</label>
            <input type="date" id="filtro-preco-fim" onchange="atualizarVisualizacao()" class="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:border-blue-600 outline-none">
          </div>
        </div>
      </div>
    </div>

    <!-- RANKING -->
    <div id="ranking-precos" class="mb-6"></div>

    <!-- EVOLUÇÃO -->
    <div class="bg-white p-6 rounded-xl shadow-sm border mb-6">
      <h3 class="font-bold text-slate-700 text-lg mb-4 flex items-center gap-2">
        <i data-lucide="line-chart" class="w-5 h-5 text-blue-600"></i> Evolução do Preço
      </h3>
      <div style="height: 320px;">
        <canvas id="grafico-historico-precos"></canvas>
      </div>
      <p id="grafico-sem-dados" class="text-center text-slate-400 mt-4">Selecione um produto para visualizar o gráfico.</p>
    </div>

    <!-- TABELA -->
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-5 py-4 border-b flex items-center justify-between">
        <h3 class="font-bold text-slate-700 flex items-center gap-2">
          <i data-lucide="list" class="w-4 h-4 text-slate-400"></i> Registros
        </h3>
        <span id="contador-precos" class="text-xs font-bold text-slate-500"></span>
      </div>
      <div class="overflow-auto max-h-[70vh]">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
            <tr>
              <th class="p-3 font-bold uppercase text-xs">Data</th>
              <th class="p-3 font-bold uppercase text-xs">Produto</th>
              <th class="p-3 font-bold uppercase text-xs">Fornecedor</th>
              <th class="p-3 font-bold uppercase text-xs text-center">Origem</th>
              <th class="p-3 font-bold uppercase text-xs text-right">Preço Unit.</th>
              <th class="p-3 font-bold uppercase text-xs text-right">Variação</th>
              <th class="p-3 font-bold uppercase text-xs text-center">Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-historico-precos" class="divide-y"></tbody>
        </table>
      </div>
    </div>
  `;

  garantirModalPrecoManual();
  preencherSelectsHistoricoPrecos();
  atualizarVisualizacao();
  lucide.createIcons();
}

function preencherSelectsHistoricoPrecos() {
  const optionsProd = (STATE.produtos || [])
    .slice()
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
    .map(p => `<option value="${p.id}">${p.nome}</option>`)
    .join('');

  const filtroProd = document.getElementById('filtro-preco-produto');
  if (filtroProd) filtroProd.innerHTML = '<option value="">Todos</option>' + optionsProd;

  const formProd = document.getElementById('preco-produto');
  if (formProd) formProd.innerHTML = '<option value="">Selecione...</option>' + optionsProd;

  const optionsForn = (STATE.fornecedores || [])
    .slice()
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')))
    .map(f => `<option value="${f.id}">${f.nome}</option>`)
    .join('');

  const formForn = document.getElementById('preco-fornecedor');
  if (formForn) formForn.innerHTML = '<option value="">-- Nenhum --</option>' + optionsForn;
}

// ============================================================
// MODAL DE LANÇAMENTO MANUAL
// ============================================================
function garantirModalPrecoManual() {
  if (document.getElementById('modal-preco-manual')) return;

  const div = document.createElement('div');
  div.id = 'modal-preco-manual';
  div.className = 'hidden fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4';
  div.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] overflow-hidden">
      <div class="bg-blue-700 p-4 text-white flex justify-between items-center shrink-0">
        <h3 class="font-black text-lg flex items-center gap-2">
          <i data-lucide="pen-tool" class="w-5 h-5"></i> <span id="preco-modal-title">Novo Preço Manual</span>
        </h3>
        <button type="button" onclick="fecharModalPrecoManual()" class="text-white hover:bg-white/20 p-2 rounded-lg transition"><i data-lucide="x" class="w-5 h-5"></i></button>
      </div>
      <form id="form-preco-manual" onsubmit="salvarPrecoManualHist(event)" class="flex-1 overflow-y-auto p-5 bg-slate-50">
        <input type="hidden" id="preco-edit-id">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Produto *</label>
            <select id="preco-produto" required class="w-full p-2 border rounded-lg text-sm bg-slate-50 font-medium focus:border-blue-600 outline-none">
              <option value="">Selecione...</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data da Compra/Preço *</label>
            <input type="date" id="preco-data" required class="w-full p-2 border rounded-lg text-sm bg-slate-50 font-medium focus:border-blue-600 outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Preço Unitário (R$) *</label>
            <input type="number" step="0.01" min="0" id="preco-valor" required placeholder="0,00" class="w-full p-2 border rounded-lg text-sm bg-slate-50 font-bold text-green-700 focus:border-blue-600 outline-none">
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor (opcional)</label>
            <select id="preco-fornecedor" class="w-full p-2 border rounded-lg text-sm bg-slate-50 font-medium focus:border-blue-600 outline-none">
              <option value="">-- Nenhum --</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observação (NF, motivo, etc.)</label>
            <input type="text" id="preco-obs" placeholder="Ex: Nota Fiscal 4521" class="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:border-blue-600 outline-none">
          </div>
        </div>
      </form>
      <div class="p-4 border-t bg-slate-50 flex gap-2 shrink-0">
        <button type="button" onclick="fecharModalPrecoManual()" class="flex-1 py-2 bg-white border rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition">Cancelar</button>
        <button type="button" onclick="salvarPrecoManualHist(event)" id="preco-save-btn" class="flex-1 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition">
          <i data-lucide="save" class="w-4 h-4"></i> Salvar
        </button>
      </div>
    </div>`;
  document.body.appendChild(div);
  if (typeof RVModals !== 'undefined') RVModals.registerAll();
}

function abrirModalPrecoManual() {
  garantirModalPrecoManual();
  limparFormPrecoHist();
  document.getElementById('preco-modal-title').innerText = 'Novo Preço Manual';
  document.getElementById('preco-save-btn').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Salvar';
  const dataEl = document.getElementById('preco-data');
  if (dataEl && !dataEl.value) dataEl.value = new Date().toISOString().split('T')[0];
  if (typeof RVModals !== 'undefined') RVModals.clearDirty('modal-preco-manual');
  document.getElementById('modal-preco-manual').classList.remove('hidden');
  lucide.createIcons();
}

function fecharModalPrecoManual() {
  if (typeof RVModals !== 'undefined') { RVModals.requestClose('modal-preco-manual'); return; }
  const m = document.getElementById('modal-preco-manual');
  if (m) m.classList.add('hidden');
}

function limparFormPrecoHist() {
  const edit = document.getElementById('preco-edit-id');
  if (edit) edit.value = '';
  const form = document.getElementById('form-preco-manual');
  if (form) form.reset();
}

// ============================================================
// FILTRO COMPARTILHADO (tabela, ranking, CSV e relatório)
// ============================================================
function obterRegistrosPrecosFiltrados() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';
  const busca = (document.getElementById('filtro-preco-busca')?.value || '').toLowerCase().trim();
  const incluirForaDoPadrao = exibirForaDoPadrao();

  return (STATE.historico_precos || []).filter(r => {
    if (produtoId && (Number(r.produto_id) || 0) !== produtoId) return false;
    if (dataIni && r.data_preco < dataIni) return false;
    if (dataFim && r.data_preco > dataFim) return false;
    if (origem && r.origem !== origem) return false;
    if (!incluirForaDoPadrao && precoForaDoPadrao(r)) return false;
    if (busca) {
      const prod = STATE.produtos.find(p => Number(p.id) === Number(r.produto_id));
      const forn = STATE.fornecedores.find(f => Number(f.id) === Number(r.fornecedor_id));
      const nomeProd = prod ? prod.nome.toLowerCase() : '';
      const nomeForn = forn ? forn.nome.toLowerCase() : '';
      const obs = (r.observacao || '').toLowerCase();
      if (!nomeProd.includes(busca) && !nomeForn.includes(busca) && !obs.includes(busca)) return false;
    }
    return true;
  }).sort((a, b) => new Date(a.data_preco) - new Date(b.data_preco));
}

function limparFiltrosPrecos() {
  ['filtro-preco-busca', 'filtro-preco-produto', 'filtro-preco-origem', 'filtro-preco-inicio', 'filtro-preco-fim']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const chkFora = document.getElementById('filtro-preco-fora-padrao');
  if (chkFora) chkFora.checked = false;
  atualizarVisualizacao();
}

// ============================================================
// ATUALIZAÇÃO GERAL
// ============================================================
function atualizarVisualizacao() {
  carregarTabelaHistoricoPrecos();
  atualizarGrafico();
}

// ============================================================
// TABELA + KPIs
// ============================================================
function carregarTabelaHistoricoPrecos() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const registros = obterRegistrosPrecosFiltrados();

  // Primeiro preço de cada produto (base para variação %)
  const primeiroPrecoPorProduto = {};
  registros.forEach(r => {
    const pid = Number(r.produto_id) || 0;
    if (!(pid in primeiroPrecoPorProduto)) primeiroPrecoPorProduto[pid] = Number(r.preco_unitario);
  });

  const jaBase = {};
  const linhas = registros.map((r) => {
    const preco = Number(r.preco_unitario);
    const temProduto = r.produto_id != null && Number(r.produto_id) > 0;
    const pid = temProduto ? Number(r.produto_id) : null;
    const chave = temProduto ? String(pid) : 'AVULSO';
    let variacaoHtml = '—';
    if (temProduto) {
      const base = primeiroPrecoPorProduto[pid] || preco;
      if (!jaBase[chave]) {
        jaBase[chave] = true;
        variacaoHtml = '<span class="text-slate-400">Base</span>';
      } else if (base > 0) {
        const perc = ((preco - base) / base) * 100;
        const cor = perc > 0 ? 'text-red-600' : (perc < 0 ? 'text-green-600' : 'text-slate-500');
        const sinal = perc > 0 ? '+' : '';
        variacaoHtml = `<span class="${cor} font-bold">${sinal}${perc.toFixed(1)}%</span>`;
      }
    }

    const prod = temProduto ? STATE.produtos.find(p => Number(p.id) === pid) : null;
    const nomeProduto = prod ? prod.nome : (temProduto ? `PRODUTO #${pid}` : 'ITEM AVULSO (SEM PRODUTO)');

    const fornId = Number(r.fornecedor_id);
    const fornecedor = STATE.fornecedores.find(f => Number(f.id) === fornId);
    const nomeFornecedor = fornecedor ? fornecedor.nome : '—';

    let dataExibicao = '—';
    if (r.data_preco) {
      try {
        dataExibicao = new Date(r.data_preco + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      } catch (e) {
        dataExibicao = r.data_preco;
      }
    }

    const obsTitle = (r.observacao || '').replace(/"/g, '&quot;');
    const origemBadge = r.origem === 'automatico'
      ? `<span class="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700" title="${obsTitle || 'Gerado por Ordem de Compra'}">O.C.</span>`
      : `<span class="px-2 py-1 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700" title="${obsTitle || 'Lançamento manual'}">Manual</span>`;

    const acoes = r.origem === 'manual'
      ? `<button onclick="editarPrecoManualHist('${r.id}')" class="p-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><i data-lucide="edit-3" width="14"></i></button>
         <button onclick="excluirPrecoHist('${r.id}')" class="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded ml-1" title="Excluir"><i data-lucide="trash-2" width="14"></i></button>`
      : `<button onclick="editarPrecoManualHist('${r.id}')" class="p-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded" title="Corrigir produto"><i data-lucide="edit-3" width="14"></i></button>`;

    return { ...r, nomeProduto, nomeFornecedor, dataExibicao, variacaoHtml, origemBadge, acoes, foraPadrao: precoForaDoPadrao(r) };
  });

  renderResumoPrecos(registros, produtoId);
  renderRankingPrecos(registros);

  const contador = document.getElementById('contador-precos');
  if (contador) {
    const ocultos = exibirForaDoPadrao() ? 0 : contarForaDoPadrao(STATE.historico_precos || []);
    contador.textContent = `${registros.length} registro(s)` + (ocultos > 0 ? ` · ${ocultos} fora do padrão oculto(s)` : '');
  }

  const tbody = document.getElementById('tabela-historico-precos');
  tbody.innerHTML = linhas.length ? linhas.map(r => `
    <tr class="border-b hover:bg-slate-50 transition">
      <td class="p-3 whitespace-nowrap">${r.dataExibicao}</td>
      <td class="p-3 font-medium">${r.nomeProduto}</td>
      <td class="p-3 text-xs text-slate-500">${r.nomeFornecedor}</td>
      <td class="p-3 text-center">${r.origemBadge}</td>
      <td class="p-3 text-right font-bold whitespace-nowrap">${formatMoney(Number(r.preco_unitario))}${r.foraPadrao ? '<span class="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 align-middle" title="Destoa da mediana do produto em mais de 3x (provavel unidade de compra diferente ou erro de digitacao)">FORA DO PADRÃO</span>' : ''}</td>
      <td class="p-3 text-right whitespace-nowrap">${r.variacaoHtml}</td>
      <td class="p-3 text-center whitespace-nowrap">${r.acoes}</td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="p-10 text-center text-slate-400">Nenhum registro encontrado para os filtros aplicados.</td></tr>`;

  lucide.createIcons();
}

function renderResumoPrecos(registros, produtoId) {
  const resumoDiv = document.getElementById('resumo-precos');
  if (!resumoDiv) return;

  const card = (label, valor, corTexto, bg, icone) => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg ${bg} flex items-center justify-center shrink-0">
        <i data-lucide="${icone}" class="w-5 h-5 ${corTexto}"></i>
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">${label}</div>
        <div class="font-black ${corTexto} truncate">${valor}</div>
      </div>
    </div>`;

  if (!registros.length) {
    resumoDiv.innerHTML = `<div class="col-span-full bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">Nenhum registro para resumir.</div>`;
    return;
  }

  const precos = registros.map(r => Number(r.preco_unitario));
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const avg = precos.reduce((a, b) => a + b, 0) / precos.length;

  let quarto;
  if (produtoId) {
    const primeiro = Number(registros[0].preco_unitario);
    const ultimo = Number(registros[registros.length - 1].preco_unitario);
    const variacao = primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : 0;
    const cor = variacao > 0 ? 'text-red-600' : (variacao < 0 ? 'text-green-600' : 'text-slate-600');
    const bg = variacao > 0 ? 'bg-red-50' : (variacao < 0 ? 'bg-green-50' : 'bg-slate-100');
    quarto = card('Variação no Período', `${variacao > 0 ? '+' : ''}${variacao.toFixed(1)}%`, cor, bg, 'activity');
  } else {
    quarto = card('Registros', String(registros.length), 'text-slate-700', 'bg-slate-100', 'hash');
  }

  resumoDiv.innerHTML =
    card('Menor Preço', formatMoney(min), 'text-green-700', 'bg-green-50', 'trending-down') +
    card('Maior Preço', formatMoney(max), 'text-red-700', 'bg-red-50', 'trending-up') +
    card('Média', formatMoney(avg), 'text-slate-700', 'bg-slate-100', 'minus') +
    quarto;
}

// ============================================================
// RANKING DE VARIAÇÃO (maiores altas e quedas)
// ============================================================
function renderRankingPrecos(registros) {
  const el = document.getElementById('ranking-precos');
  if (!el) return;

  const grupos = {};
  let avulsos = 0;
  registros.forEach(r => {
    const temProduto = r.produto_id != null && Number(r.produto_id) > 0;
    if (!temProduto) { avulsos++; return; }
    const pid = Number(r.produto_id);
    if (!grupos[pid]) grupos[pid] = [];
    grupos[pid].push(Number(r.preco_unitario));
  });

  const lista = Object.entries(grupos)
    .filter(([, ps]) => ps.length >= 2)
    .map(([pid, ps]) => {
      const primeiro = ps[0];
      const ultimo = ps[ps.length - 1];
      const variacao = primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : 0;
      const prod = STATE.produtos.find(p => Number(p.id) === Number(pid));
      return { pid: Number(pid), nome: prod ? prod.nome : `PRODUTO #${pid}`, primeiro, ultimo, variacao };
    });

  if (!lista.length && avulsos === 0) { el.innerHTML = ''; return; }

  const altas = [...lista].filter(x => x.variacao > 0).sort((a, b) => b.variacao - a.variacao).slice(0, 5);
  const quedas = [...lista].filter(x => x.variacao < 0).sort((a, b) => a.variacao - b.variacao).slice(0, 5);

  const linhaRank = (x, cor) => `
    <tr class="border-b last:border-0 hover:bg-slate-100 cursor-pointer transition" onclick="filtrarPrecoPorProduto(${x.pid})" title="Ver evolução de ${x.nome}">
      <td class="py-1.5 pr-2 font-medium text-slate-700">${x.nome}</td>
      <td class="py-1.5 px-2 text-right text-xs text-slate-500 whitespace-nowrap">${formatMoney(x.primeiro)} → ${formatMoney(x.ultimo)}</td>
      <td class="py-1.5 pl-2 text-right font-bold ${cor} whitespace-nowrap">${x.variacao > 0 ? '+' : ''}${x.variacao.toFixed(1)}%</td>
    </tr>`;

  const coluna = (titulo, arr, cor, icone) => `
    <div>
      <div class="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
        <i data-lucide="${icone}" class="w-3.5 h-3.5 ${cor}"></i> ${titulo}
      </div>
      ${arr.length
        ? `<table class="w-full text-sm"><tbody>${arr.map(x => linhaRank(x, cor)).join('')}</tbody></table>`
        : '<div class="text-xs text-slate-400 py-2">Sem variações no período.</div>'}
    </div>`;

  const avisoAvulso = avulsos > 0
    ? `<div class="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1"><i data-lucide="package" class="w-3.5 h-3.5"></i> ${avulsos} registro(s) sem produto vinculado (item avulso) não participam do ranking.</div>`
    : '';

  el.innerHTML = `
    <div class="bg-white p-5 rounded-xl shadow-sm border">
      <div class="font-bold text-slate-700 mb-3 flex items-center gap-2">
        <i data-lucide="bar-chart-3" class="w-4 h-4 text-blue-600"></i> Ranking de Variação no Período
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${coluna('Maiores Altas', altas, 'text-red-600', 'trending-up')}
        ${coluna('Maiores Quedas', quedas, 'text-green-600', 'trending-down')}
      </div>
      ${avisoAvulso}
    </div>`;
}

function filtrarPrecoPorProduto(pid) {
  const sel = document.getElementById('filtro-preco-produto');
  if (!sel) return;
  sel.value = String(pid);
  atualizarVisualizacao();
}

// ============================================================
// GRÁFICO (Chart.js)
// ============================================================
function atualizarGrafico() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const canvas = document.getElementById('grafico-historico-precos');
  const semDados = document.getElementById('grafico-sem-dados');
  if (!canvas || !semDados) return;

  if (chartInstancia) {
    chartInstancia.destroy();
    chartInstancia = null;
  }

  if (!produtoId) {
    canvas.style.display = 'none';
    semDados.textContent = 'Selecione um produto para visualizar o gráfico.';
    semDados.classList.remove('hidden');
    return;
  }

  const registros = obterRegistrosPrecosFiltrados();
  if (registros.length < 2) {
    canvas.style.display = 'none';
    semDados.textContent = 'Registros insuficientes para este produto no período.';
    semDados.classList.remove('hidden');
    return;
  }

  canvas.style.display = 'block';
  semDados.classList.add('hidden');

  const labels = registros.map(r => {
    try {
      return new Date(r.data_preco + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
      return r.data_preco;
    }
  });
  const precos = registros.map(r => Number(r.preco_unitario));
  const media = precos.reduce((a, b) => a + b, 0) / precos.length;

  chartInstancia = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Preço Unitário (R$)',
          data: precos,
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29, 78, 216, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#1d4ed8',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        },
        {
          label: `Média (${formatMoney(media)})`,
          data: labels.map(() => media),
          borderColor: '#f59e0b',
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (ctx.datasetIndex === 1) return `Média: ${formatMoney(ctx.raw)}`;
              const r = registros[ctx.dataIndex] || {};
              const forn = STATE.fornecedores.find(f => Number(f.id) === Number(r.fornecedor_id));
              const linhas = [`Preço: ${formatMoney(ctx.raw)}`, `Origem: ${r.origem === 'automatico' ? 'O.C.' : 'Manual'}`];
              if (forn) linhas.push(`Fornecedor: ${forn.nome}`);
              if (r.observacao) linhas.push(r.observacao);
              return linhas;
            }
          }
        },
        legend: {
          display: true,
          labels: { boxWidth: 12, usePointStyle: true, font: { size: 11 } }
        }
      },
      scales: {
        x: { display: true, grid: { display: false } },
        y: { beginAtZero: false, ticks: { callback: (val) => `R$ ${val}` } }
      }
    }
  });
}

// ============================================================
// RELATÓRIO IMPRESSO
// ============================================================
function imprimirRelatorioHistoricoPrecos() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';

  const registros = obterRegistrosPrecosFiltrados();
  if (registros.length === 0) {
    showToast('Nenhum dado para imprimir.', true);
    return;
  }

  let graficoImagem = '';
  const canvasGrafico = document.getElementById('grafico-historico-precos');
  if (canvasGrafico && canvasGrafico.style.display !== 'none') {
    graficoImagem = canvasGrafico.toDataURL('image/png');
  }

  const agrupado = {};
  registros.forEach(r => {
    const temProduto = r.produto_id != null && Number(r.produto_id) > 0;
    const prodId = temProduto ? Number(r.produto_id) : null;
    const chave = temProduto ? `P:${prodId}` : 'AVULSO';
    const prod = temProduto ? STATE.produtos.find(p => Number(p.id) === prodId) : null;
    const nome = prod ? prod.nome : (temProduto ? `PRODUTO #${prodId}` : 'ITEM AVULSO (SEM PRODUTO)');
    if (!agrupado[chave]) agrupado[chave] = { nome, items: [] };
    agrupado[chave].items.push(r);
  });

  let html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <img src="logo.png" style="height: 70px;" />
          <div style="font-size: 12px; color: #475569; margin-top: 5px;">CNPJ: 61.893.912/0001-24</div>
          <div style="font-size: 12px; color: #475569;">Rua Mineiros, 530 | Jataí - GO | (64) 99981-5852</div>
        </div>
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a;">DEMONSTRATIVO DE EVOLUÇÃO DE PREÇOS</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #1d4ed8; font-weight: bold;">Período: ${dataIni || 'Início'} a ${dataFim || 'Fim'}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Origem: ${origem || 'Todas'} | Produto: ${produtoId ? (STATE.produtos.find(p => Number(p.id) === produtoId)?.nome || 'Desconhecido') : 'Todos'}</p>
        </div>
      </div>
  `;

  if (graficoImagem) {
    html += `
      <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <h3 style="font-size: 14px; color: #1d4ed8; margin: 0 0 10px 0;">Evolução Gráfica</h3>
        <img src="${graficoImagem}" style="width: 100%; max-height: 300px; object-fit: contain;" />
      </div>
    `;
  }

  for (const grupo of Object.values(agrupado)) {
    const produto = grupo.nome;
    const items = grupo.items;
    const precos = items.map(i => Number(i.preco_unitario));
    const min = Math.min(...precos);
    const max = Math.max(...precos);
    const avg = precos.reduce((a, b) => a + b, 0) / precos.length;
    const primeiro = precos[0];
    const ultimo = precos[precos.length - 1];
    const variacaoTotal = primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : 0;

    html += `
      <h3 style="font-size: 16px; color: #1d4ed8; border-left: 4px solid #1d4ed8; padding-left: 10px; margin-top: 30px;">${produto.toUpperCase()}</h3>
      <table width="100%" style="border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
        <tr>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Menor Preço:</strong> ${formatMoney(min)}</td>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Maior Preço:</strong> ${formatMoney(max)}</td>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Preço Médio:</strong> ${formatMoney(avg)}</td>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Variação Total:</strong> <span style="color: ${variacaoTotal > 0 ? '#b91c1c' : '#15803d'}">${variacaoTotal.toFixed(1)}%</span></td>
        </tr>
      </table>
      <table width="100%" style="border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Data</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Preço Unit.</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right;">Variação %</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Fornecedor</th>
            <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Origem</th>
          </tr>
        </thead>
        <tbody>
    `;

    let primeiroPrecoTabela = null;
    items.forEach((item, idx) => {
      const preco = Number(item.preco_unitario);
      let variacaoHtml = '—';
      if (idx === 0) {
        primeiroPrecoTabela = preco;
        variacaoHtml = 'Base';
      } else if (primeiroPrecoTabela && primeiroPrecoTabela > 0) {
        const perc = ((preco - primeiroPrecoTabela) / primeiroPrecoTabela) * 100;
        const sinal = perc > 0 ? '+' : '';
        variacaoHtml = `${sinal}${perc.toFixed(1)}%`;
      }

      let dataFormatada = '—';
      if (item.data_preco) {
        try {
          dataFormatada = new Date(item.data_preco + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch (e) {
          dataFormatada = item.data_preco;
        }
      }

      const fornId = Number(item.fornecedor_id);
      const forn = STATE.fornecedores.find(f => Number(f.id) === fornId);
      const nomeForn = forn ? forn.nome : '—';
      const origemLabel = item.origem === 'automatico' ? 'O.C.' : 'Manual';

      html += `<tr>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${dataFormatada}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(preco)}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${variacaoHtml}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${nomeForn}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${origemLabel}</td>
      </tr>`;
    });

    html += '</tbody></table>';
  }

  html += `
      <div style="text-align: center; margin-top: 50px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
        Documento gerado em ${new Date().toLocaleDateString('pt-BR')} pela RV Negócios.<br>
        Este demonstrativo reflete os preços registrados no sistema.
      </div>
    </div>
  `;

  document.getElementById('print-area').innerHTML = html;
  setTimeout(() => window.print(), 500);
}

// ============================================================
// EXPORTAÇÃO CSV
// ============================================================
function exportarPrecosCSV() {
  const registros = obterRegistrosPrecosFiltrados();
  if (!registros.length) {
    showToast('Nenhum dado para exportar.', true);
    return;
  }

  const linhas = [['Data', 'Produto', 'Preco Unitario', 'Fornecedor', 'Origem', 'Observacao', 'Fora do Padrao']];
  registros.forEach(r => {
    const temProduto = r.produto_id != null && Number(r.produto_id) > 0;
    const prod = temProduto ? STATE.produtos.find(p => Number(p.id) === Number(r.produto_id)) : null;
    const forn = r.fornecedor_id ? STATE.fornecedores.find(f => Number(f.id) === Number(r.fornecedor_id)) : null;
    const nome = prod ? prod.nome : (temProduto ? `PRODUTO #${r.produto_id}` : 'ITEM AVULSO (SEM PRODUTO)');
    linhas.push([
      r.data_preco || '',
      nome,
      Number(r.preco_unitario).toFixed(2).replace('.', ','),
      forn ? forn.nome : '',
      r.origem === 'automatico' ? 'O.C.' : 'Manual',
      r.observacao || '',
      precoForaDoPadrao(r) ? 'Sim' : 'Nao'
    ]);
  });

  const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historico-precos_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exportado.');
}

// ============================================================
// CRUD MANUAL (via modal)
// ============================================================
async function salvarPrecoManualHist(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const editId = document.getElementById('preco-edit-id').value;
  const produtoId = parseInt(document.getElementById('preco-produto').value) || null;
  const fornecedorId = parseInt(document.getElementById('preco-fornecedor').value) || null;
  const dataYMD = document.getElementById('preco-data').value;
  const valor = parseFloat(document.getElementById('preco-valor').value);
  const obs = document.getElementById('preco-obs').value.trim();

  if (!produtoId || !dataYMD || isNaN(valor) || valor <= 0) {
    return showToast('Preencha todos os campos obrigatórios corretamente.', true);
  }

  // Aviso de possível duplicidade (mesmo produto, data e valor) em novo lançamento
  if (!editId) {
    const duplicado = (STATE.historico_precos || []).find(r =>
      Number(r.produto_id) === Number(produtoId) &&
      String(r.data_preco) === String(dataYMD) &&
      Number(r.preco_unitario) === Number(valor)
    );
    if (duplicado) {
      const seguir = (typeof RVUI !== 'undefined' && RVUI.confirm)
        ? await RVUI.confirm('Já existe um registro com este produto, data e valor. Deseja lançar mesmo assim?', { confirmText: 'Lançar' })
        : confirm('Já existe um registro com este produto, data e valor. Deseja lançar mesmo assim?');
      if (!seguir) return;
    }
  }

  // Preserva a origem automática quando a edição não altera dados relevantes
  let origem = 'manual';
  if (editId) {
    const atual = STATE.historico_precos.find(r => Number(r.id) === Number(editId));
    if (atual && atual.origem === 'automatico') {
      const mudouProduto = Number(atual.produto_id || 0) !== Number(produtoId);
      const mudouPreco = Number(atual.preco_unitario) !== Number(valor);
      const mudouData = String(atual.data_preco) !== String(dataYMD);
      const mudouForn = Number(atual.fornecedor_id || 0) !== Number(fornecedorId || 0);
      origem = (mudouProduto || mudouPreco || mudouData || mudouForn) ? 'manual' : 'automatico';
    }
  }

  const payload = {
    produto_id: produtoId,
    data_preco: dataYMD,
    preco_unitario: valor,
    fornecedor_id: fornecedorId,
    origem,
    observacao: obs || null,
  };

  showLoading(true);
  try {
    if (editId) {
      const { error } = await sb.from('jsp_historico_precos').update(payload).eq('id', parseInt(editId));
      if (error) throw error;
      showToast('Registro atualizado!');
    } else {
      const { error } = await sb.from('jsp_historico_precos').insert([payload]);
      if (error) throw error;
      showToast('Preço manual lançado!');
    }

    limparFormPrecoHist();
    if (typeof RVModals !== 'undefined') { RVModals.clearDirty('modal-preco-manual'); RVModals.close('modal-preco-manual'); }
    else { const m = document.getElementById('modal-preco-manual'); if (m) m.classList.add('hidden'); }

    await loadData();
    atualizarVisualizacao();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

function editarPrecoManualHist(id) {
  const idNumerico = Number(id);
  const registro = STATE.historico_precos.find(r => Number(r.id) === idNumerico);
  if (!registro) {
    showToast('Registro não encontrado.', true);
    return;
  }

  garantirModalPrecoManual();

  document.getElementById('preco-edit-id').value = registro.id;
  document.getElementById('preco-produto').value = registro.produto_id ? String(registro.produto_id) : '';
  document.getElementById('preco-data').value = registro.data_preco || '';
  document.getElementById('preco-valor').value = registro.preco_unitario;
  document.getElementById('preco-fornecedor').value = registro.fornecedor_id ? String(registro.fornecedor_id) : '';
  document.getElementById('preco-obs').value = registro.observacao || '';

  document.getElementById('preco-modal-title').innerText = registro.origem === 'automatico' ? 'Corrigir Preço de O.C.' : 'Editar Preço Manual';
  document.getElementById('preco-save-btn').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Atualizar';

  if (typeof RVModals !== 'undefined') RVModals.clearDirty('modal-preco-manual');
  document.getElementById('modal-preco-manual').classList.remove('hidden');
  lucide.createIcons();
}

async function excluirPrecoHist(id) {
  const confirmou = (typeof RVUI !== 'undefined' && RVUI.confirm)
    ? await RVUI.confirm('Deseja excluir este registro de preço?', { danger: true, confirmText: 'Excluir' })
    : confirm('Deseja excluir este registro de preço?');
  if (!confirmou) return;
  showLoading(true);
  try {
    const { error } = await sb.from('jsp_historico_precos').delete().eq('id', id);
    if (error) throw error;
    showToast('Registro excluído.');
    await loadData();
    atualizarVisualizacao();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

// ============================================================
// Integração automática (chamada após confirmação de OC)
// ============================================================
async function registrarPrecosAutomaticos(ocId) {
  const itensOC = STATE.logs.filter(l => String(l.id) === String(ocId) && l.tipo === 'compra');
  if (!itensOC.length) return;

  const inserts = [];
  const dataOC = itensOC[0]?.data ? new Date(itensOC[0].data).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  let semProduto = 0;

  for (const item of itensOC) {
    const produtoId = item.produto_id != null && Number(item.produto_id) > 0 ? Number(item.produto_id) : null;
    if (!produtoId) semProduto++;
    const precoUnitario = parseFloat(item.valor_total) / parseFloat(item.quantidade);
    inserts.push({
      produto_id: produtoId,
      data_preco: dataOC,
      preco_unitario: precoUnitario,
      fornecedor_id: item.fornecedor_id ? Number(item.fornecedor_id) : null,
      origem: 'automatico',
      observacao: `O.C. #${ocId}`
    });
  }

  if (semProduto > 0) {
    console.warn(`registrarPrecosAutomaticos: ${semProduto} item(ns) da O.C. #${ocId} sem produto_id (item avulso).`);
  }

  // Deduplicação: evita relançar O.C. já registrada
  const chaveDe = (i) => `${i.produto_id ?? 'null'}|${i.data_preco}|${Number(i.preco_unitario).toFixed(4)}|${i.origem}|${i.observacao ?? ''}`;
  const existentes = new Set((STATE.historico_precos || []).map(chaveDe));
  const vistos = new Set();
  const novos = inserts.filter(i => {
    const k = chaveDe(i);
    if (existentes.has(k) || vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
  const ignorados = inserts.length - novos.length;
  if (ignorados > 0) {
    console.info(`registrarPrecosAutomaticos: ${ignorados} item(ns) duplicado(s) da O.C. #${ocId} ignorado(s).`);
  }

  if (novos.length > 0) {
    const { error } = await sb.from('jsp_historico_precos').insert(novos);
    if (error) {
      console.error('Erro ao registrar preços automáticos:', error);
    } else {
      const { data } = await fetchAllRecords('jsp_historico_precos');
      STATE.historico_precos = data || [];
    }
  }
}
