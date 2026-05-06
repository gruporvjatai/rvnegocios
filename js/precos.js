// ============================================================
// ABA DE CONTROLE DE PREÇOS (Histórico Híbrido)
// Com gráfico, variação percentual e relatório profissional
// ============================================================

let chartInstancia = null;

function renderViewHistoricoPrecos() {
  const container = document.getElementById('view-precos');
  if (!container) return;

  container.innerHTML = `
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <i data-lucide="trending-up" class="text-blue-700"></i> Histórico de Preços (Materiais)
      </h2>
      <p class="text-sm text-slate-500 mt-2">Acompanhe a evolução dos preços unitários. Registre compras antigas manualmente ou automaticamente pelas Ordens de Compra confirmadas.</p>
    </div>

    <!-- GRÁFICO
    <div class="bg-white p-6 rounded-xl shadow-sm border mb-6">
      <h3 class="font-bold text-slate-700 text-lg mb-4 flex items-center gap-2">
        <i data-lucide="line-chart" class="w-5 h-5 text-blue-600"></i> Evolução do Preço
      </h3>
      <div style="height: 300px;">
        <canvas id="grafico-historico-precos"></canvas>
      </div>
      <p id="grafico-sem-dados" class="text-center text-slate-400 mt-4 hidden">Selecione um produto para visualizar o gráfico.</p>
    </div>-->

    <!-- FORMULÁRIO DE LANÇAMENTO MANUAL -->
    <div class="bg-white p-6 rounded-xl shadow-sm border mb-6">
      <h3 class="font-bold text-slate-700 text-lg mb-4 flex items-center gap-2">
        <i data-lucide="pen-tool" class="w-5 h-5 text-indigo-600"></i> Lançar Preço Manual (Externo / Sem O.C.)
      </h3>
      <form id="form-preco-manual" onsubmit="salvarPrecoManualHist(event)" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <input type="hidden" id="preco-edit-id">
        <div>
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
          <input type="number" step="0.01" id="preco-valor" required placeholder="0.00" class="w-full p-2 border rounded-lg text-sm bg-slate-50 font-bold text-green-700 focus:border-blue-600 outline-none">
        </div>
        <div class="flex items-end gap-2">
          <button type="submit" class="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded-lg font-bold shadow transition flex items-center gap-2">
            <i data-lucide="save" class="w-4 h-4"></i> Salvar
          </button>
          <button type="button" onclick="limparFormPrecoHist()" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold transition">Limpar</button>
        </div>
        <div class="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Fornecedor (opcional)</label>
            <select id="preco-fornecedor" class="w-full p-2 border rounded-lg text-sm bg-slate-50 font-medium focus:border-blue-600 outline-none">
              <option value="">-- Nenhum --</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observação (NF, motivo, etc.)</label>
            <input type="text" id="preco-obs" placeholder="Ex: Nota Fiscal 4521" class="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:border-blue-600 outline-none">
          </div>
        </div>
      </form>
    </div>

    <!-- FILTROS E TABELA -->
    <div class="bg-white p-6 rounded-xl shadow-sm border">
      <div class="flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Produto</label>
          <select id="filtro-preco-produto" onchange="atualizarVisualizacao()" class="p-2 border rounded-lg text-sm font-medium bg-slate-50">
            <option value="">Todos</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label>
          <input type="date" id="filtro-preco-inicio" onchange="atualizarVisualizacao()" class="p-2 border rounded-lg text-sm bg-slate-50">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fim</label>
          <input type="date" id="filtro-preco-fim" onchange="atualizarVisualizacao()" class="p-2 border rounded-lg text-sm bg-slate-50">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
          <select id="filtro-preco-origem" onchange="atualizarVisualizacao()" class="p-2 border rounded-lg text-sm font-medium bg-slate-50">
            <option value="">Todas</option>
            <option value="manual">Manual</option>
            <option value="automatico">Automática (O.C.)</option>
          </select>
        </div>
        <button onclick="imprimirRelatorioHistoricoPrecos()" class="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow">
          <i data-lucide="printer" class="w-4 h-4"></i> Imprimir Relatório
        </button>
      </div>

      <!-- RESUMO RÁPIDO -->
      <div id="resumo-precos" class="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-center"></div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-100 text-slate-600">
            <tr>
              <th class="p-3">Data</th>
              <th class="p-3">Produto</th>
              <th class="p-3 text-right">Preço Unit.</th>
              <th class="p-3 text-right">Variação %</th>
              <th class="p-3">Fornecedor</th>
              <th class="p-3 text-center">Origem</th>
              <th class="p-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody id="tabela-historico-precos" class="divide-y"></tbody>
        </table>
      </div>
    </div>
  `;

  preencherSelectsHistoricoPrecos();
  atualizarVisualizacao();
  lucide.createIcons();
}

function preencherSelectsHistoricoPrecos() {
  const optionsProd = STATE.produtos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  document.getElementById('preco-produto').innerHTML = '<option value="">Selecione...</option>' + optionsProd;
  document.getElementById('filtro-preco-produto').innerHTML = '<option value="">Todos</option>' + optionsProd;

  const optionsForn = STATE.fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  document.getElementById('preco-fornecedor').innerHTML = '<option value="">-- Nenhum --</option>' + optionsForn;
}

// ========== FUNÇÃO UNIFICADA DE ATUALIZAÇÃO ==========
function atualizarVisualizacao() {
  carregarTabelaHistoricoPrecos();
  atualizarGrafico();
}

// ========== TABELA COM VARIAÇÃO PERCENTUAL ==========
function carregarTabelaHistoricoPrecos() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';

  let registros = (STATE.historico_precos || []).filter(r => {
    if (produtoId && (Number(r.produto_id) || 0) !== produtoId) return false;
    if (dataIni && r.data_preco < dataIni) return false;
    if (dataFim && r.data_preco > dataFim) return false;
    if (origem && r.origem !== origem) return false;
    return true;
  });

  registros.sort((a, b) => new Date(a.data_preco) - new Date(b.data_preco));

  // Calcular variação percentual em relação ao primeiro registro do período
  let primeiroPreco = null;
  const linhas = registros.map((r, idx) => {
    const preco = Number(r.preco_unitario);
    let variacaoHtml = '—';
    if (idx === 0) {
      primeiroPreco = preco;
      variacaoHtml = '<span class="text-slate-400">Base</span>';
    } else if (primeiroPreco && primeiroPreco > 0) {
      const perc = ((preco - primeiroPreco) / primeiroPreco) * 100;
      const cor = perc > 0 ? 'text-red-600' : (perc < 0 ? 'text-green-600' : 'text-slate-500');
      const sinal = perc > 0 ? '+' : '';
      variacaoHtml = `<span class="${cor} font-bold">${sinal}${perc.toFixed(1)}%</span>`;
    }

    const prodId = Number(r.produto_id);
    const produto = STATE.produtos.find(p => Number(p.id) === prodId);
    const nomeProduto = produto ? produto.nome : `Produto #${prodId || '?'}`;

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

    const origemBadge = r.origem === 'automatico' 
      ? '<span class="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700">O.C.</span>' 
      : '<span class="px-2 py-1 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Manual</span>';

    const acoes = r.origem === 'manual' 
  ? `<button onclick="editarPrecoManualHist('${r.id}')" class="p-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded" title="Editar"><i data-lucide="edit-3" width="14"></i></button>
     <button onclick="excluirPrecoHist('${r.id}')" class="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded ml-1" title="Excluir"><i data-lucide="trash-2" width="14"></i></button>`
  : `<button onclick="editarPrecoManualHist('${r.id}')" class="p-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded" title="Corrigir Produto"><i data-lucide="edit-3" width="14"></i></button>`;

    return { ...r, nomeProduto, nomeFornecedor, dataExibicao, variacaoHtml, origemBadge, acoes };
  });

  // Preencher resumo rápido
  const resumoDiv = document.getElementById('resumo-precos');
  if (registros.length > 0) {
    const precos = registros.map(r => Number(r.preco_unitario));
    const min = Math.min(...precos);
    const max = Math.max(...precos);
    const avg = precos.reduce((a, b) => a + b, 0) / precos.length;
    const variacaoTotal = primeiroPreco ? ((precos[precos.length - 1] - primeiroPreco) / primeiroPreco) * 100 : 0;

    resumoDiv.innerHTML = `
      <div><div class="text-xs text-slate-500 uppercase">Menor Preço</div><div class="font-bold text-green-700">${formatMoney(min)}</div></div>
      <div><div class="text-xs text-slate-500 uppercase">Maior Preço</div><div class="font-bold text-red-700">${formatMoney(max)}</div></div>
      <div><div class="text-xs text-slate-500 uppercase">Média</div><div class="font-bold text-slate-700">${formatMoney(avg)}</div></div>
      <div><div class="text-xs text-slate-500 uppercase">Variação Total</div><div class="font-bold ${variacaoTotal > 0 ? 'text-red-600' : 'text-green-600'}">${variacaoTotal.toFixed(1)}%</div></div>
    `;
  } else {
    resumoDiv.innerHTML = `<div class="col-span-full text-slate-400 text-sm py-2">Nenhum registro para exibir resumo.</div>`;
  }

  const tbody = document.getElementById('tabela-historico-precos');
  tbody.innerHTML = linhas.length ? linhas.map(r => `
    <tr class="border-b hover:bg-slate-50 transition">
      <td class="p-3">${r.dataExibicao}</td>
      <td class="p-3 font-medium">${r.nomeProduto}</td>
      <td class="p-3 text-right font-bold">${formatMoney(Number(r.preco_unitario))}</td>
      <td class="p-3 text-right">${r.variacaoHtml}</td>
      <td class="p-3 text-xs">${r.nomeFornecedor}</td>
      <td class="p-3 text-center">${r.origemBadge}</td>
      <td class="p-3 text-center">${r.acoes}</td>
    </tr>
  `).join('') : `<tr><td colspan="7" class="p-6 text-center text-slate-400">Nenhum registro encontrado.</td></tr>`;

  lucide.createIcons();
}

// ========== GRÁFICO COM CHART.JS ==========
function atualizarGrafico() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';

  let registros = (STATE.historico_precos || []).filter(r => {
    if (produtoId && (Number(r.produto_id) || 0) !== produtoId) return false;
    if (dataIni && r.data_preco < dataIni) return false;
    if (dataFim && r.data_preco > dataFim) return false;
    if (origem && r.origem !== origem) return false;
    return true;
  });

  registros.sort((a, b) => new Date(a.data_preco) - new Date(b.data_preco));

  const canvas = document.getElementById('grafico-historico-precos');
  const semDados = document.getElementById('grafico-sem-dados');
  if (!canvas || !semDados) return;

  if (chartInstancia) {
    chartInstancia.destroy();
    chartInstancia = null;
  }

  if (registros.length < 2) {
    canvas.style.display = 'none';
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

  chartInstancia = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
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
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `R$ ${Number(ctx.raw).toFixed(2)}`
          }
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          display: true,
          grid: { display: false }
        },
        y: {
          beginAtZero: false,
          ticks: {
            callback: (val) => `R$ ${val}`
          }
        }
      }
    }
  });
}

// ========== RELATÓRIO PROFISSIONAL IMPRESSO ==========
function imprimirRelatorioHistoricoPrecos() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';

  const registros = (STATE.historico_precos || []).filter(r => {
    if (produtoId && (Number(r.produto_id) || 0) !== produtoId) return false;
    if (dataIni && r.data_preco < dataIni) return false;
    if (dataFim && r.data_preco > dataFim) return false;
    if (origem && r.origem !== origem) return false;
    return true;
  }).sort((a, b) => new Date(a.data_preco) - new Date(b.data_preco));

  if (registros.length === 0) {
    showToast('Nenhum dado para imprimir.', true);
    return;
  }

  // Captura gráfico como imagem (base64) se existir
  let graficoImagem = '';
  const canvasGrafico = document.getElementById('grafico-historico-precos');
  if (canvasGrafico && canvasGrafico.style.display !== 'none') {
    graficoImagem = canvasGrafico.toDataURL('image/png');
  }

  // Agrupa por produto
  const agrupado = {};
  registros.forEach(r => {
    const prodId = Number(r.produto_id);
    const prod = STATE.produtos.find(p => Number(p.id) === prodId);
    const nome = prod ? prod.nome : `Produto #${r.produto_id || '?'}`;
    if (!agrupado[nome]) agrupado[nome] = [];
    agrupado[nome].push(r);
  });

  let html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1e293b;">
      <!-- CABEÇALHO PROFISSIONAL -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 70px;" />
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

  // Insere o gráfico se disponível
  if (graficoImagem) {
    html += `
      <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;">
        <h3 style="font-size: 14px; color: #1d4ed8; margin: 0 0 10px 0;">Evolução Gráfica</h3>
        <img src="${graficoImagem}" style="width: 100%; max-height: 300px; object-fit: contain;" />
      </div>
    `;
  }

  // Para cada produto, monta tabela e resumo
  for (const [produto, items] of Object.entries(agrupado)) {
    const precos = items.map(i => Number(i.preco_unitario));
    const min = Math.min(...precos);
    const max = Math.max(...precos);
    const avg = precos.reduce((a, b) => a + b, 0) / precos.length;
    const primeiro = precos[0];
    const ultimo = precos[precos.length - 1];
    const variacaoTotal = primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : 0;

    html += `
      <h3 style="font-size: 16px; color: #1d4ed8; border-left: 4px solid #1d4ed8; padding-left: 10px; margin-top: 30px;">${produto.toUpperCase()}</h3>
      
      <!-- Cartão de resumo -->
      <table width="100%" style="border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
        <tr>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Menor Preço:</strong> ${formatMoney(min)}</td>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Maior Preço:</strong> ${formatMoney(max)}</td>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Preço Médio:</strong> ${formatMoney(avg)}</td>
          <td style="padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0;"><strong>Variação Total:</strong> <span style="color: ${variacaoTotal > 0 ? '#b91c1c' : '#15803d'}">${variacaoTotal.toFixed(1)}%</span></td>
        </tr>
      </table>

      <!-- Tabela detalhada -->
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

// ========== CRUD MANUAL (já existente, mantido) ==========
async function salvarPrecoManualHist(e) {
  e.preventDefault();
  const editId = document.getElementById('preco-edit-id').value;
  const produtoId = parseInt(document.getElementById('preco-produto').value) || null;
  const fornecedorId = parseInt(document.getElementById('preco-fornecedor').value) || null;

  const dataYMD = document.getElementById('preco-data').value;
  const valor = parseFloat(document.getElementById('preco-valor').value);
  const obs = document.getElementById('preco-obs').value.trim();

  if (!produtoId || !dataYMD || isNaN(valor) || valor <= 0) {
    return showToast('Preencha todos os campos obrigatórios corretamente.', true);
  }

  showLoading(true);

  const payload = {
    produto_id: produtoId,
    data_preco: dataYMD,
    preco_unitario: valor,
    fornecedor_id: fornecedorId,
    origem: 'manual',
    observacao: obs || null,
  };

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
    await loadData();
    atualizarVisualizacao();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

function editarPrecoManualHist(id) {
  // Converte para número para garantir compatibilidade
  const idNumerico = Number(id);
  const registro = STATE.historico_precos.find(r => Number(r.id) === idNumerico);
  if (!registro) {
    showToast('Registro não encontrado.', true);
    return;
  }

  document.getElementById('preco-edit-id').value = registro.id;
  // Garantir que os selects recebam valores numéricos (convertendo para string, pois .value espera string)
  document.getElementById('preco-produto').value = registro.produto_id ? String(registro.produto_id) : '';
  document.getElementById('preco-data').value = registro.data_preco;
  document.getElementById('preco-valor').value = registro.preco_unitario;
  document.getElementById('preco-fornecedor').value = registro.fornecedor_id ? String(registro.fornecedor_id) : '';
  document.getElementById('preco-obs').value = registro.observacao || '';

  document.getElementById('form-preco-manual').scrollIntoView({ behavior: 'smooth' });
}

function limparFormPrecoHist() {
  document.getElementById('preco-edit-id').value = '';
  document.getElementById('form-preco-manual').reset();
}

async function excluirPrecoHist(id) {
  if (!confirm('Deseja excluir este registro de preço?')) return;
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

// ========== Integração automática (chamada após confirmação de OC) ==========
async function registrarPrecosAutomaticos(ocId) {
  const itensOC = STATE.logs.filter(l => String(l.id) === String(ocId) && l.tipo === 'compra');
  if (!itensOC.length) return;

  const inserts = [];
  const dataOC = itensOC[0]?.data ? new Date(itensOC[0].data).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  for (const item of itensOC) {
    const produto = STATE.produtos.find(p => p.nome.trim().toLowerCase() === item.produto_nome.trim().toLowerCase());
    const precoUnitario = parseFloat(item.valor_total) / parseFloat(item.quantidade);
    inserts.push({
      produto_id: produto ? Number(produto.id) : null,
      data_preco: dataOC,
      preco_unitario: precoUnitario,
      fornecedor_id: item.fornecedor_id ? Number(item.fornecedor_id) : null,
      origem: 'automatico',
      observacao: `O.C. #${ocId}`
    });
  }

  if (inserts.length > 0) {
    const { error } = await sb.from('jsp_historico_precos').insert(inserts);
    if (error) {
      console.error('Erro ao registrar preços automáticos:', error);
    } else {
      const { data } = await fetchAllRecords('jsp_historico_precos');
      STATE.historico_precos = data || [];
    }
  }
}
