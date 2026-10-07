// =====================================================================
// MODULO DE VALES / ADIANTAMENTOS
// Sempre em R$ direto (nunca dias/metros/percentual).
// Compartilhado por sistema.html e mobile.html.
// Depende de: equipe-core.js (rvValesAbertos, rvSimularAbatimentos, rvMoney),
// STATE, sb, formatMoney, showToast, showLoading, loadData,
// getColaboradoresUnificados, getNextIdNum, lucide.
// =====================================================================
(function (global) {
    'use strict';

    var TIPO_LABEL = { diaria: 'Diaria', metro: 'Metro', empreita: 'Empreita' };
    var PREFIXO_VALE = 'Vale / Adiantamento - ';

    function vMoney(v) { return formatMoney(rvMoney(v)); }
    function vToday() {
        var d = new Date();
        var m = String(d.getMonth() + 1).padStart(2, '0');
        var dia = String(d.getDate()).padStart(2, '0');
        return d.getFullYear() + '-' + m + '-' + dia;
    }
    function vEscape(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function vUuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'vale-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    }

    function todosVales() { return (STATE.vales || []); }
    function valesColaborador(colabId) {
        return todosVales().filter(function (v) {
            return String(v.colaborador_id) === String(colabId) && v.status !== 'ESTORNADO';
        });
    }
    function valeEhLog(log) {
        return !!(log && log.tipo === 'despesa' && log.produto_nome &&
            window.rvUp(log.produto_nome).indexOf(window.rvUp(PREFIXO_VALE)) === 0);
    }
    function categoriaPorTipo(tipo) {
        if (tipo === 'metro') return 'Mão de Obra (Terceirizado)';
        if (tipo === 'empreita') return 'Mão de Obra (Empreita)';
        return 'Mão de Obra';
    }
    function colaboradorInfo(id) {
        var lista = (typeof getColaboradoresUnificados === 'function') ? getColaboradoresUnificados() : [];
        return lista.find(function (c) { return String(c.id) === String(id); }) || null;
    }
    function nomeValeLog(nome) { return PREFIXO_VALE + nome; }

    // ------------------------------------------------------------------
    // Abatimento (usado no fechamento de diaria/metro/empreita)
    // ------------------------------------------------------------------
    // Aplica o abatimento FIFO no banco e no STATE apos um fechamento.
    async function registrarAbatimentosVale(colabId, fechamentoUid, sim) {
        if (!sim || !sim.itens || sim.itens.length === 0 || !fechamentoUid) return;
        for (var i = 0; i < sim.itens.length; i++) {
            var item = sim.itens[i];
            var vale = item.vale;
            var aberto = rvMoney(vale.valor_aberto);
            var novoAberto = rvMoney(aberto - item.valor);
            if (novoAberto < 0) novoAberto = 0;
            var novoStatus = novoAberto <= 0 ? 'ABATIDO' : 'ABERTO';

            var abat = {
                vale_id: vale.id,
                fechamento_uid: fechamentoUid,
                colaborador_id: String(colabId),
                valor: item.valor
            };
            var resAbat = await sb.from('jsp_vale_abatimentos').insert([abat]);
            var resVale = await sb.from('jsp_vales')
                .update({ valor_aberto: novoAberto, status: novoStatus })
                .eq('id', vale.id);

            if (resAbat.error || resVale.error) {
                throw (resAbat.error || resVale.error);
            }

            // Atualiza o STATE local
            vale.valor_aberto = novoAberto;
            vale.status = novoStatus;
            if (!STATE.vale_abatimentos) STATE.vale_abatimentos = [];
            STATE.vale_abatimentos.push(abat);
        }
    }

    // Reverte os abatimentos de um fechamento (estorno). Nunca falha em silencio.
    async function reverterAbatimentosVale(fechamentoUid) {
        if (!fechamentoUid) return;
        var lista = (STATE.vale_abatimentos || []).filter(function (a) {
            return String(a.fechamento_uid) === String(fechamentoUid);
        });
        if (lista.length === 0) return;
        for (var i = 0; i < lista.length; i++) {
            var abat = lista[i];
            var vale = todosVales().find(function (v) { return String(v.id) === String(abat.vale_id); });
            if (vale) {
                var novoAberto = rvMoney(rvMoney(vale.valor_aberto) + rvMoney(abat.valor));
                if (novoAberto > rvMoney(vale.valor)) novoAberto = rvMoney(vale.valor);
                var novoStatus = vale.status === 'ESTORNADO' ? 'ESTORNADO' : 'ABERTO';
                await sb.from('jsp_vales')
                    .update({ valor_aberto: novoAberto, status: novoStatus })
                    .eq('id', vale.id);
                vale.valor_aberto = novoAberto;
                vale.status = novoStatus;
            }
        }
        // Remove todos os abatimentos deste fechamento em uma unica chamada
        var del = await sb.from('jsp_vale_abatimentos').delete().eq('fechamento_uid', fechamentoUid);
        if (del && del.error) {
            showToast('Valores de vale restaurados, mas nao foi possivel remover os abatimentos: ' + del.error.message, true);
        }
        STATE.vale_abatimentos = (STATE.vale_abatimentos || []).filter(function (a) {
            return String(a.fechamento_uid) !== String(fechamentoUid);
        });
    }

    // ------------------------------------------------------------------
    // Resumo dentro das modais de calculo
    // ------------------------------------------------------------------
    function renderResumoValeModal(containerId, colabId, bruto, opts) {
        var el = document.getElementById(containerId);
        var abertos = rvValesAbertos(todosVales(), colabId);
        var sim = rvSimularAbatimentos(abertos, bruto);
        var hideLiquido = !!(opts && opts.hideLiquido);
        if (!el) return sim;

        var linhas = '';
        abertos.forEach(function (v) {
            var dataStr = v.data ? new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
            linhas += '<div class="flex justify-between text-xs py-0.5">' +
                '<span class="text-slate-600">' + dataStr + ' - ' + vEscape(TIPO_LABEL[v.tipo] || '') + '</span>' +
                '<span class="font-bold text-rose-700">' + vMoney(v.valor_aberto) + '</span>' +
                '</div>';
        });
        if (!linhas) linhas = '<div class="text-xs text-slate-400">Nenhum vale em aberto.</div>';

        var totalAberto = rvMoney(abertos.reduce(function (s, v) { return s + rvMoney(v.valor_aberto); }, 0));

        var totaisHtml =
            '<div class="border-t border-rose-200 mt-2 pt-2 text-xs">' +
                '<div class="flex justify-between"><span class="text-slate-600">Vales em aberto:</span>' +
                    '<span class="font-bold text-rose-700">' + vMoney(totalAberto) + '</span></div>' +
                '<div class="flex justify-between"><span class="text-slate-600">Abatimento neste fechamento:</span>' +
                    '<span class="font-bold text-rose-700">' + vMoney(sim.total) + '</span></div>';
        if (!hideLiquido) {
            totaisHtml +=
                '<div class="flex justify-between text-sm"><span class="font-bold text-slate-700">Liquido a pagar:</span>' +
                    '<span class="font-black text-green-700">' + vMoney(sim.saldoLiquido) + '</span></div>';
        }
        totaisHtml += '</div>';

        el.innerHTML =
            '<div class="border border-rose-200 bg-rose-50 rounded-xl p-3">' +
                '<div class="flex items-center justify-between mb-1">' +
                    '<span class="text-xs font-black text-rose-800 uppercase flex items-center gap-1">' +
                        '<i data-lucide="hand-coins" class="w-4 h-4"></i> Vales / Adiantamentos</span>' +
                    '<button type="button" onclick="abrirModalVale(\'' + colabId + '\')" ' +
                        'class="text-[10px] bg-rose-700 hover:bg-rose-800 text-white px-2 py-1 rounded font-bold">+ Lancar Vale</button>' +
                '</div>' +
                linhas +
                totaisHtml +
            '</div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return sim;
    }

    // ------------------------------------------------------------------
    // Modal de cadastro / lista de vales
    // ------------------------------------------------------------------
    function garantirModalVale() {
        if (document.getElementById('modal-vale')) return;
        var div = document.createElement('div');
        div.id = 'modal-vale';
        div.className = 'hidden fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4';
        div.innerHTML =
            '<div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden">' +
                '<div class="bg-rose-700 p-4 text-white flex justify-between items-center shrink-0">' +
                    '<h3 class="font-black text-lg flex items-center gap-2"><i data-lucide="hand-coins" class="w-5 h-5"></i> <span id="vale-modal-title">Lancar Vale / Adiantamento</span></h3>' +
                    '<button onclick="fecharModalVale()" class="text-white hover:bg-white/20 p-2 rounded-lg transition"><i data-lucide="x" class="w-5 h-5"></i></button>' +
                '</div>' +
                '<div class="p-5 overflow-y-auto flex-1 bg-slate-50">' +
                    '<input type="hidden" id="vale-edit-id">' +
                    '<input type="hidden" id="vale-colaborador-id">' +
                    '<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">' +
                        '<div class="md:col-span-2" id="vale-colab-wrap">' +
                            '<label class="block text-xs font-bold text-slate-500 uppercase mb-1">Colaborador</label>' +
                            '<select id="vale-colaborador" onchange="onChangeValeColaborador()" class="w-full p-2 border rounded-lg text-sm font-bold bg-slate-50"></select>' +
                        '</div>' +
                        '<div>' +
                            '<label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>' +
                            '<input type="date" id="vale-data" class="w-full p-2 border rounded-lg text-sm font-bold bg-slate-50">' +
                        '</div>' +
                        '<div>' +
                            '<label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>' +
                            '<input type="number" step="0.01" min="0" id="vale-valor" placeholder="0,00" class="w-full p-2 border rounded-lg text-sm font-black bg-slate-50">' +
                        '</div>' +
                        '<div class="md:col-span-2">' +
                            '<label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observacao (opcional)</label>' +
                            '<input type="text" id="vale-observacao" placeholder="Ex: Adiantamento solicitado em dinheiro" class="w-full p-2 border rounded-lg text-sm bg-slate-50">' +
                        '</div>' +
                        '<div class="md:col-span-2 flex justify-end">' +
                            '<button onclick="salvarVale()" id="vale-save-btn" class="bg-rose-700 hover:bg-rose-800 text-white px-5 py-2 rounded-lg font-bold flex items-center gap-2"><i data-lucide="save" class="w-4 h-4"></i> Lancar Vale</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">' +
                        '<div class="px-4 py-2 bg-slate-100 flex justify-between items-center">' +
                            '<span class="text-xs font-bold text-slate-600 uppercase">Vales do colaborador</span>' +
                            '<span class="text-xs font-black text-rose-700">Em aberto: <span id="vale-total-aberto">R$ 0,00</span></span>' +
                        '</div>' +
                        '<table class="w-full text-sm"><thead class="bg-slate-50 text-slate-500 border-b"><tr>' +
                            '<th class="p-2 text-left text-xs font-bold uppercase">Data</th>' +
                            '<th class="p-2 text-center text-xs font-bold uppercase">Valor</th>' +
                            '<th class="p-2 text-center text-xs font-bold uppercase">Em aberto</th>' +
                            '<th class="p-2 text-center text-xs font-bold uppercase">Status</th>' +
                            '<th class="p-2 text-center text-xs font-bold uppercase">Acoes</th>' +
                        '</tr></thead><tbody id="vale-lista-body" class="divide-y"></tbody></table>' +
                        '<div id="vale-sem-registros" class="p-6 text-center text-slate-400 text-sm hidden">Nenhum vale lancado.</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(div);
        if (typeof RVModals !== 'undefined') RVModals.registerAll();
    }

    function popularSelectVale(selecionadoId) {
        var sel = document.getElementById('vale-colaborador');
        if (!sel) return;
        var lista = (typeof getColaboradoresUnificados === 'function') ? getColaboradoresUnificados() : [];
        lista.sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); });
        sel.innerHTML = '<option value="">-- Selecione o colaborador --</option>' +
            lista.map(function (c) {
                var t = c.tipo === 'metro' ? 'Metro' : (c.tipo === 'empreita' ? 'Empreita' : 'Diaria');
                return '<option value="' + vEscape(c.id) + '">' + vEscape(c.nome) + ' (' + t + ')</option>';
            }).join('');
        if (selecionadoId) sel.value = selecionadoId;
    }

    function abrirModalVale(colabId) {
        garantirModalVale();
        popularSelectVale(colabId || '');
        var wrap = document.getElementById('vale-colab-wrap');
        var sel = document.getElementById('vale-colaborador');
        document.getElementById('vale-edit-id').value = '';
        document.getElementById('vale-colaborador-id').value = colabId || '';
        document.getElementById('vale-data').value = vToday();
        document.getElementById('vale-valor').value = '';
        document.getElementById('vale-observacao').value = '';
        document.getElementById('vale-modal-title').innerText = 'Lancar Vale / Adiantamento';
        document.getElementById('vale-save-btn').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Lancar Vale';
        if (colabId) {
            if (wrap) wrap.style.display = 'none';
            sel.disabled = false;
        } else {
            if (wrap) wrap.style.display = '';
            sel.disabled = false;
        }
        renderTabelaVales(colabId || (sel ? sel.value : ''));
        if (typeof RVModals !== 'undefined') RVModals.clearDirty('modal-vale');
        document.getElementById('modal-vale').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function fecharModalVale() {
        var m = document.getElementById('modal-vale');
        if (m) m.classList.add('hidden');
    }

    function onChangeValeColaborador() {
        var id = document.getElementById('vale-colaborador').value;
        document.getElementById('vale-colaborador-id').value = id;
        renderTabelaVales(id);
    }

    function renderTabelaVales(colabId) {
        var tbody = document.getElementById('vale-lista-body');
        if (!tbody) return;
        var sem = document.getElementById('vale-sem-registros');
        var totalEl = document.getElementById('vale-total-aberto');
        var lista = valesColaborador(colabId);
        lista.sort(function (a, b) { return String(b.data || '').localeCompare(String(a.data || '')); });
        tbody.innerHTML = '';
        var totalAberto = 0;
        lista.forEach(function (v) {
            totalAberto += rvMoney(v.valor_aberto);
            var dataStr = v.data ? new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
            var badge = v.status === 'ABATIDO'
                ? '<span class="px-2 py-1 rounded text-[9px] font-bold bg-green-100 text-green-700">ABATIDO</span>'
                : '<span class="px-2 py-1 rounded text-[9px] font-bold bg-orange-100 text-orange-700">ABERTO</span>';
            var podeEditar = rvMoney(v.valor_aberto) >= rvMoney(v.valor);
            var acoes =
                '<button onclick="imprimirReciboVale(\'' + v.id + '\')" class="text-slate-500 hover:text-rose-700 p-1" title="Recibo"><i data-lucide="receipt" class="w-4 h-4"></i></button>' +
                (podeEditar ? '<button onclick="editarVale(\'' + v.id + '\')" class="text-slate-500 hover:text-blue-600 p-1" title="Editar"><i data-lucide="edit-3" class="w-4 h-4"></i></button>' : '') +
                '<button onclick="estornarVale(\'' + v.id + '\')" class="text-slate-500 hover:text-red-600 p-1" title="Estornar"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>';
            var tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50';
            tr.innerHTML =
                '<td class="p-2 text-xs font-bold text-slate-700">' + dataStr + '</td>' +
                '<td class="p-2 text-center text-xs font-bold text-slate-700">' + vMoney(v.valor) + '</td>' +
                '<td class="p-2 text-center text-xs font-black text-rose-700">' + vMoney(v.valor_aberto) + '</td>' +
                '<td class="p-2 text-center">' + badge + '</td>' +
                '<td class="p-2 text-center"><div class="flex items-center justify-center gap-1">' + acoes + '</div></td>';
            tbody.appendChild(tr);
        });
        if (sem) sem.classList.toggle('hidden', lista.length > 0);
        if (totalEl) totalEl.innerText = formatMoney(totalAberto);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function salvarVale() {
        var editId = document.getElementById('vale-edit-id').value;
        var sel = document.getElementById('vale-colaborador');
        var colabId = (document.getElementById('vale-colaborador-id').value || (sel ? sel.value : '')).trim();
        var valor = parseFloat(document.getElementById('vale-valor').value);
        var data = document.getElementById('vale-data').value || vToday();
        var obs = (document.getElementById('vale-observacao').value || '').trim();

        if (!colabId) return showToast('Selecione o colaborador.', true);
        if (isNaN(valor) || valor <= 0) return showToast('Informe um valor valido.', true);

        var info = colaboradorInfo(colabId);
        var nome = info ? info.nome : ((STATE.equipe || []).find(function (e) { return String(e.id) === String(colabId); }) || {}).nome || 'Colaborador';
        var tipo = info ? info.tipo : 'diaria';
        var origem = info ? info.table_origin : 'equipe';
        var obraId = info && info.obra_atual_id != null ? String(info.obra_atual_id) : null;

        showLoading(true);
        try {
            if (editId) {
                var valeAtual = todosVales().find(function (v) { return String(v.id) === String(editId); });
                if (!valeAtual) throw new Error('Vale nao encontrado.');
                if (rvMoney(valeAtual.valor_aberto) < rvMoney(valeAtual.valor))
                    throw new Error('Vale ja utilizado em fechamento. Estorne o fechamento antes.');

                var upd = await sb.from('jsp_vales').update({
                    valor: valor,
                    valor_aberto: valor,
                    data: data,
                    observacao: obs || null
                }).eq('id', editId);
                if (upd.error) throw upd.error;

                if (valeAtual.log_uid) {
                    var updLog = await sb.from('jsp_logs').update({ valor_total: valor }).eq('uid', valeAtual.log_uid).eq('tipo', 'despesa');
                    if (updLog.error) throw updLog.error;
                }
                valeAtual.valor = valor;
                valeAtual.valor_aberto = valor;
                valeAtual.data = data;
                valeAtual.observacao = obs || null;
                await loadData();
                renderTabelaVales(colabId);
                showLoading(false);
                if (typeof RVModals !== 'undefined') RVModals.clearDirty('modal-vale');
                showToast('Vale atualizado.');
                return;
            }

            var logId = getNextIdNum(STATE.logs).toString();
            var descricao = nomeValeLog(nome);
            var insLog = await sb.from('jsp_logs').insert([{
                id: logId,
                obra_id: (info && info.obra_atual_id != null && !isNaN(parseInt(info.obra_atual_id, 10))) ? parseInt(info.obra_atual_id, 10) : null,
                tipo: 'despesa',
                produto_nome: descricao,
                valor_total: valor,
                data: new Date(data + 'T12:00:00').toISOString(),
                vencimento: new Date(data + 'T12:00:00').toISOString(),
                status_financeiro: 'PENDENTE',
                categoria: categoriaPorTipo(tipo),
                observacao: 'Vale / Adiantamento - Colaborador: ' + nome + ' - Tipo: ' + (TIPO_LABEL[tipo] || tipo) + (obs ? ' - ' + obs : '')
            }]).select('uid');
            if (insLog.error) throw insLog.error;

            var insVale = await sb.from('jsp_vales').insert([{
                id: vUuid(),
                colaborador_id: String(colabId),
                origem: origem,
                tipo: tipo,
                colaborador_nome: nome,
                valor: valor,
                valor_aberto: valor,
                data: data,
                obra_id: obraId,
                observacao: obs || null,
                log_uid: (insLog.data && insLog.data[0]) ? insLog.data[0].uid : null,
                status: 'ABERTO'
            }]);
            if (insVale.error) {
                // Compensa: cancela o log recem criado
                await sb.from('jsp_logs').update({ status_financeiro: 'CANCELADO' }).eq('id', logId).eq('tipo', 'despesa');
                throw insVale.error;
            }

            await loadData();
            document.getElementById('vale-valor').value = '';
            document.getElementById('vale-observacao').value = '';
            renderTabelaVales(colabId);
            showLoading(false);
            if (typeof RVModals !== 'undefined') RVModals.clearDirty('modal-vale');
            showToast('Vale lancado! Despesa criada como pendente no financeiro.');
        } catch (err) {
            showLoading(false);
            showToast('Erro ao salvar vale: ' + (err.message || err), true);
        }
    }

    function editarVale(id) {
        var v = todosVales().find(function (x) { return String(x.id) === String(id); });
        if (!v) return showToast('Vale nao encontrado.', true);
        if (rvMoney(v.valor_aberto) < rvMoney(v.valor))
            return showToast('Vale ja utilizado em fechamento. Estorne o fechamento antes.', true);
        garantirModalVale();
        popularSelectVale(v.colaborador_id);
        document.getElementById('vale-edit-id').value = v.id;
        document.getElementById('vale-colaborador-id').value = v.colaborador_id;
        var wrap = document.getElementById('vale-colab-wrap');
        if (wrap) wrap.style.display = 'none';
        document.getElementById('vale-data').value = v.data || vToday();
        document.getElementById('vale-valor').value = v.valor;
        document.getElementById('vale-observacao').value = v.observacao || '';
        document.getElementById('vale-modal-title').innerText = 'Editar Vale / Adiantamento';
        document.getElementById('vale-save-btn').innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Atualizar Vale';
        renderTabelaVales(v.colaborador_id);
        if (typeof RVModals !== 'undefined') RVModals.clearDirty('modal-vale');
        document.getElementById('modal-vale').classList.remove('hidden');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function estornarVale(id) {
        var v = todosVales().find(function (x) { return String(x.id) === String(id); });
        if (!v) return showToast('Vale nao encontrado.', true);
        if (v.status === 'ESTORNADO') return showToast('Vale ja estornado.', true);
        if (rvMoney(v.valor_aberto) < rvMoney(v.valor))
            return showToast('Vale ja utilizado em fechamento. Estorne o fechamento antes.', true);

        var log = (STATE.logs || []).find(function (l) { return v.log_uid && String(l.uid) === String(v.log_uid); });
        if (log && log.status_financeiro === 'PAGO')
            return showToast('Vale ja baixado no financeiro. Estorne a baixa antes.', true);

        if (!(await RVUI.confirm('Estornar o vale de ' + vMoney(v.valor) + ' de ' + (v.colaborador_nome || '') + '? A despesa sera cancelada no financeiro.', { danger: true, confirmText: 'Estornar' }))) return;

        showLoading(true);
        try {
            var resV = await sb.from('jsp_vales').update({ status: 'ESTORNADO', valor_aberto: 0 }).eq('id', id);
            if (resV.error) throw resV.error;
            if (log) {
                await sb.from('jsp_logs').update({ status_financeiro: 'CANCELADO' })
                    .eq('uid', v.log_uid).eq('tipo', 'despesa');
            }
            v.status = 'ESTORNADO';
            v.valor_aberto = 0;
            await loadData();
            renderTabelaVales(v.colaborador_id);
            showLoading(false);
            showToast('Vale estornado.');
        } catch (err) {
            showLoading(false);
            showToast('Erro ao estornar vale: ' + (err.message || err), true);
        }
    }

    function imprimirReciboVale(id) {
        var v = todosVales().find(function (x) { return String(x.id) === String(id); });
        if (!v) return showToast('Vale nao encontrado.', true);
        var info = colaboradorInfo(v.colaborador_id) || {};
        var cpf = info.cpf || info.cpf_cnpj || '';
        var nomeColab = (v.colaborador_nome || info.nome || '').toUpperCase();
        var hoje = new Date().toLocaleDateString('pt-BR');
        var dataStr = v.data ? new Date(v.data + 'T00:00:00').toLocaleDateString('pt-BR') : hoje;
        var valor = formatMoney(v.valor);
        var html = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; width: 100%; border: 2px solid #1e293b; padding: 30px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                    <img src="logo.png" style="height: 60px;" />
                    <div style="text-align: right;">
                        <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 900;">RECIBO DE VALE / ADIANTAMENTO</h1>
                        <p style="margin: 5px 0 0 0; font-size: 18px; color: #be123c; font-weight: bold;">VALOR: ${valor}</p>
                    </div>
                </div>

                <div style="font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 40px;">
                    Recebi(emos) de <strong>RV NEGÓCIOS E COMPANHIA LTDA</strong> (CNPJ: 61.893.912/0001-24), a importância de <strong>${valor}</strong>,
                    a título de <strong>vale / adiantamento</strong> de pagamento, em ${dataStr}. Este valor será descontado no próximo fechamento de pagamento do colaborador.
                </div>
                ${v.observacao ? `<div style="font-size: 13px; color: #475569; margin-bottom: 30px;"><strong>Observação:</strong> ${vEscape(v.observacao)}</div>` : ''}

                <div style="font-size: 14px; margin-bottom: 40px;">
                    Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos legais.
                </div>

                <div style="text-align: center; margin-bottom: 30px; font-size: 14px;">
                    Jataí - GO, ${hoje}.
                </div>

                <div style="margin-top: 60px; display: flex; justify-content: center;">
                    <div style="text-align: center; width: 60%; border-top: 1px solid #000; padding-top: 10px;">
                        <strong>${nomeColab}</strong><br>
                        <span style="font-size: 12px; color: #64748b;">CPF: ${cpf || '_______________________'}</span>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('print-area').innerHTML = html;
        document.body.classList.add('rv-printing');
        var finalizar = function () {
            document.body.classList.remove('rv-printing');
            window.removeEventListener('afterprint', finalizar);
        };
        window.addEventListener('afterprint', finalizar);
        setTimeout(function () { window.print(); }, 300);
        setTimeout(finalizar, 60000);
    }

    var api = {
        abrirModalVale: abrirModalVale,
        fecharModalVale: fecharModalVale,
        onChangeValeColaborador: onChangeValeColaborador,
        salvarVale: salvarVale,
        editarVale: editarVale,
        estornarVale: estornarVale,
        imprimirReciboVale: imprimirReciboVale,
        renderResumoValeModal: renderResumoValeModal,
        registrarAbatimentosVale: registrarAbatimentosVale,
        reverterAbatimentosVale: reverterAbatimentosVale,
        valesColaborador: valesColaborador,
        valeEhLog: valeEhLog,
        nomeValeLog: nomeValeLog,
        categoriaPorTipo: categoriaPorTipo,
        PREFIXO_VALE: PREFIXO_VALE
    };
    global.RVVales = api;
    global.abrirModalVale = abrirModalVale;
    global.fecharModalVale = fecharModalVale;
    global.onChangeValeColaborador = onChangeValeColaborador;
    global.salvarVale = salvarVale;
    global.editarVale = editarVale;
    global.estornarVale = estornarVale;
    global.imprimirReciboVale = imprimirReciboVale;
    global.renderResumoValeModal = renderResumoValeModal;
    global.registrarAbatimentosVale = registrarAbatimentosVale;
    global.reverterAbatimentosVale = reverterAbatimentosVale;
    global.valeEhLog = valeEhLog;
    global.nomeValeLog = nomeValeLog;
})(typeof window !== 'undefined' ? window : globalThis);
