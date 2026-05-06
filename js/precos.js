// ============================================================
// ABA DE CONTROLE DE PREÇOS (Histórico Híbrido)
// Funções com sufixo "Hist" para evitar conflitos
// ============================================================

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

    <div class="bg-white p-6 rounded-xl shadow-sm border">
      <div class="flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Produto</label>
          <select id="filtro-preco-produto" onchange="carregarTabelaHistoricoPrecos()" class="p-2 border rounded-lg text-sm font-medium bg-slate-50">
            <option value="">Todos</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data Início</label>
          <input type="date" id="filtro-preco-inicio" onchange="carregarTabelaHistoricoPrecos()" class="p-2 border rounded-lg text-sm bg-slate-50">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data Fim</label>
          <input type="date" id="filtro-preco-fim" onchange="carregarTabelaHistoricoPrecos()" class="p-2 border rounded-lg text-sm bg-slate-50">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label>
          <select id="filtro-preco-origem" onchange="carregarTabelaHistoricoPrecos()" class="p-2 border rounded-lg text-sm font-medium bg-slate-50">
            <option value="">Todas</option>
            <option value="manual">Manual</option>
            <option value="automatico">Automática (O.C.)</option>
          </select>
        </div>
        <button onclick="imprimirRelatorioHistoricoPrecos()" class="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2 shadow">
          <i data-lucide="printer" class="w-4 h-4"></i> Imprimir Relatório
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-100 text-slate-600">
            <tr>
              <th class="p-3">Data</th>
              <th class="p-3">Produto</th>
              <th class="p-3 text-right">Preço Unit.</th>
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
  carregarTabelaHistoricoPrecos();
  lucide.createIcons();
}

function preencherSelectsHistoricoPrecos() {
  const optionsProd = STATE.produtos.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  document.getElementById('preco-produto').innerHTML = '<option value="">Selecione...</option>' + optionsProd;
  document.getElementById('filtro-preco-produto').innerHTML = '<option value="">Todos</option>' + optionsProd;

  const optionsForn = STATE.fornecedores.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
  document.getElementById('preco-fornecedor').innerHTML = '<option value="">-- Nenhum --</option>' + optionsForn;
}

function carregarTabelaHistoricoPrecos() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';

  let registros = STATE.historico_precos.filter(r => {
    if (produtoId && (Number(r.produto_id) || 0) !== produtoId) return false;
    if (dataIni && r.data_preco < dataIni) return false;
    if (dataFim && r.data_preco > dataFim) return false;
    if (origem && r.origem !== origem) return false;
    return true;
  });

  registros.sort((a, b) => new Date(b.data_preco) - new Date(a.data_preco));

  const tbody = document.getElementById('tabela-historico-precos');
  tbody.innerHTML = registros.map(r => {
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
      : `<span class="text-xs text-slate-400 italic">—</span>`;

    return `<tr class="border-b hover:bg-slate-50 transition">
      <td class="p-3">${dataExibicao}</td>
      <td class="p-3 font-medium">${nomeProduto}</td>
      <td class="p-3 text-right font-bold">${formatMoney(Number(r.preco_unitario))}</td>
      <td class="p-3 text-xs">${nomeFornecedor}</td>
      <td class="p-3 text-center">${origemBadge}</td>
      <td class="p-3 text-center">${acoes}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="p-6 text-center text-slate-400">Nenhum registro encontrado.</td></tr>`;

  lucide.createIcons();
}

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
      payload.id = parseInt(editId);
      const { error } = await sb.from('jsp_historico_precos').update(payload).eq('id', payload.id);
      if (error) throw error;
      showToast('Registro atualizado!');
    } else {
      const { error } = await sb.from('jsp_historico_precos').insert([payload]);
      if (error) throw error;
      showToast('Preço manual lançado!');
    }

    limparFormPrecoHist();
    await loadData();
    carregarTabelaHistoricoPrecos();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

function editarPrecoManualHist(id) {
  const registro = STATE.historico_precos.find(r => r.id == id);
  if (!registro) return;

  document.getElementById('preco-edit-id').value = registro.id;
  document.getElementById('preco-produto').value = registro.produto_id || '';
  document.getElementById('preco-data').value = registro.data_preco;
  document.getElementById('preco-valor').value = registro.preco_unitario;
  document.getElementById('preco-fornecedor').value = registro.fornecedor_id || '';
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
    carregarTabelaHistoricoPrecos();
  } catch (err) {
    showToast('Erro: ' + err.message, true);
  } finally {
    showLoading(false);
  }
}

function imprimirRelatorioHistoricoPrecos() {
  const produtoId = parseInt(document.getElementById('filtro-preco-produto')?.value) || null;
  const dataIni = document.getElementById('filtro-preco-inicio')?.value || '';
  const dataFim = document.getElementById('filtro-preco-fim')?.value || '';
  const origem = document.getElementById('filtro-preco-origem')?.value || '';

  const registros = STATE.historico_precos.filter(r => {
    if (produtoId && parseInt(r.produto_id) !== produtoId) return false;
    if (dataIni && r.data_preco < dataIni) return false;
    if (dataFim && r.data_preco > dataFim) return false;
    if (origem && r.origem !== origem) return false;
    return true;
  }).sort((a, b) => new Date(a.data_preco) - new Date(b.data_preco));

  if (registros.length === 0) {
    showToast('Nenhum dado para imprimir.', true);
    return;
  }

  const agrupado = {};
  registros.forEach(r => {
    const prodId = parseInt(r.produto_id);
    const prod = STATE.produtos.find(p => parseInt(p.id) === prodId);
    const nome = prod ? prod.nome : `Produto #${r.produto_id || '?'}`;
    if (!agrupado[nome]) agrupado[nome] = [];
    agrupado[nome].push(r);
  });

  let html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="text-align: center; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; margin-bottom: 20px;">
        <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
        <h2 style="margin: 10px 0 0 0; color: #1e293b;">Relatório de Histórico de Preços</h2>
        <p style="margin: 0; font-size: 12px; color: #64748b;">Período: ${dataIni || 'Início'} a ${dataFim || 'Fim'} | Origem: ${origem || 'Todas'}</p>
      </div>
  `;

  for (const [produto, items] of Object.entries(agrupado)) {
    html += `<h3 style="margin-top: 20px; color: #1d4ed8;">${produto}</h3>
      <table width="100%" style="border-collapse: collapse; font-size: 12px; margin-bottom: 15px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Data</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">Preço Unit.</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1;">Fornecedor</th>
            <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Origem</th>
          </tr>
        </thead>
        <tbody>
    `;
    items.forEach(item => {
      let dataFormatada = '—';
      if (item.data_preco) {
        try {
          dataFormatada = new Date(item.data_preco + 'T00:00:00').toLocaleDateString('pt-BR');
        } catch (e) {
          dataFormatada = item.data_preco;
        }
      }

      const fornId = parseInt(item.fornecedor_id);
      const forn = STATE.fornecedores.find(f => parseInt(f.id) === fornId);
      const nomeForn = forn ? forn.nome : '—';
      const origemLabel = item.origem === 'automatico' ? 'O.C.' : 'Manual';

      html += `<tr>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${dataFormatada}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(item.preco_unitario)}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1;">${nomeForn}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: center;">${origemLabel}</td>
      </tr>`;
    });
    html += '</tbody></table>';
  }

  html += '</div>';
  document.getElementById('print-area').innerHTML = html;
  setTimeout(() => window.print(), 300);
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
