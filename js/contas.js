// =====================================================================
// MODULO DE CONTAS / CARTEIRAS + CARTAO DE CREDITO (FATURAS)
// Compartilhado por sistema.html e mobile.html.
// Depende de: sb, STATE, formatMoney, showToast, showLoading, loadData,
//             getTodayDate, lucide, pdfMake (opcional).
// Backend: SQL 2026-10-06_contas_carteiras.sql (tabelas jsp_contas,
//          jsp_movimentacoes, jsp_faturas + funcoes rv_*).
// =====================================================================
(function (global) {
    'use strict';

    var TIPO_LABEL = { caixa: 'Caixa (Dinheiro)', banco: 'Banco / Conta', cartao_credito: 'Cartao de Credito' };
    var TIPO_CURTO = { caixa: 'CAIXA', banco: 'BANCO', cartao_credito: 'CARTAO' };
    var TIPO_ICON = { caixa: 'wallet', banco: 'landmark', cartao_credito: 'credit-card' };
    var TIPO_COR = { caixa: '#16a34a', banco: '#2563eb', cartao_credito: '#9333ea' };

    var selectedConta = null;
    var verConsolidado = false;
    var filtro = { inicio: '', fim: '' };
    var baixaPendente = null; // { uid, tipo } ou { ocId: true }
    var filtroObra = ''; // '' = todas as obras

    // ---------------- helpers ----------------
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function STATEref() { return (typeof STATE !== 'undefined' && STATE) ? STATE : null; }
    function contas() { var s = STATEref(); return (s && s.contas) ? s.contas : []; }
    function movs() { var s = STATEref(); return (s && s.movimentacoes) ? s.movimentacoes : []; }
    function faturas() { var s = STATEref(); return (s && s.faturas) ? s.faturas : []; }
    function contaById(id) { return contas().find(function (c) { return String(c.id) === String(id); }) || null; }
    function nomeConta(id) { var c = contaById(id); return c ? c.nome : '-'; }
    function isCartao(id) { var c = contaById(id); return !!(c && c.tipo === 'cartao_credito'); }
    function money(v) { return (typeof formatMoney === 'function') ? formatMoney(Number(v) || 0) : ('R$ ' + (Number(v) || 0).toFixed(2)); }
    function hoje() { return (typeof getTodayDate === 'function') ? getTodayDate() : new Date().toISOString().slice(0, 10); }
    function podeGerenciar() {
        if (typeof usuarioPodeGerenciar === 'function') return usuarioPodeGerenciar();
        if (typeof dadosUsuario !== 'undefined' && dadosUsuario) return !!(dadosUsuario.nivel === 'admin' || dadosUsuario.pode_gerenciar === true);
        return false;
    }
    function toast(m, e) { if (typeof showToast === 'function') showToast(m, e); else alert(m); }
    function loading(b) { if (typeof showLoading === 'function') showLoading(b); }
    function icons() { if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons(); }
    function dataMov(m) { return m.data ? String(m.data).slice(0, 10) : ''; }

    function movSigned(m) {
        var v = Number(m.valor) || 0;
        if (m.tipo === 'ENTRADA' || m.tipo === 'TRANSFERENCIA_ENTRADA' || m.tipo === 'AJUSTE_ENTRADA' || m.tipo === 'PAGAMENTO_FATURA') return v;
        return -v;
    }
    function saldoConta(id) {
        var c = contaById(id); if (!c) return 0;
        var s = Number(c.saldo_inicial) || 0;
        movs().forEach(function (m) { if (String(m.conta_id) === String(id)) s += movSigned(m); });
        return s;
    }
    function disponivelCartao(id) {
        var c = contaById(id); if (!c) return 0;
        return (Number(c.limite) || 0) + saldoConta(id);
    }
    function contasAtivas() { return contas().filter(function (c) { return c.ativa !== false; }); }
    function obras() { var s = STATEref(); return (s && s.obras) ? s.obras : []; }
    function nomeObra(id) { if (id == null || id === '') return '-'; var o = obras().find(function (x) { return String(x.id) === String(id); }); return o ? (o.nome || o.nome_obra || '-') : '-'; }
    function contasPorObra() { return contas().filter(function (c) { return !filtroObra || String(c.obra_id) === String(filtroObra); }); }
    function optionsObrasHtml(valor) {
        return '<option value="">-- Selecione --</option>' + obras().map(function (o) {
            return '<option value="' + esc(o.id) + '"' + (String(valor) === String(o.id) ? ' selected' : '') + '>' + esc(o.nome || o.nome_obra || '') + '</option>';
        }).join('');
    }
    function saldoTotalReal(obraId) {
        var t = 0;
        contasAtivas().forEach(function (c) {
            if (obraId && String(c.obra_id) !== String(obraId)) return;
            if (c.tipo === 'cartao_credito') return;
            t += saldoConta(c.id);
        });
        return t;
    }
    function saldoDisponivelGeral(obraId) {
        // ativos (caixa/banco) + disponivel dos cartoes
        var t = 0;
        contasAtivas().forEach(function (c) {
            if (obraId && String(c.obra_id) !== String(obraId)) return;
            t += (c.tipo === 'cartao_credito') ? disponivelCartao(c.id) : saldoConta(c.id);
        });
        return t;
    }
    function movDoLog(uid) {
        return movs().find(function (m) {
            return String(m.log_uid) === String(uid) && m.estornada !== true &&
                (m.origem === 'baixa_receita' || m.origem === 'baixa_despesa');
        }) || null;
    }
    function faturaDeLog(uid) {
        var m = movs().find(function (x) { return String(x.log_uid) === String(uid) && x.origem === 'compra_cartao' && x.estornada !== true; });
        if (!m) return null;
        return faturas().find(function (f) { return String(f.id) === String(m.fatura_id); }) || null;
    }
    function faturaAtual(contaId) {
        var fs = faturas().filter(function (f) { return String(f.conta_id) === String(contaId) && f.status !== 'CANCELADA'; });
        if (!fs.length) return null;
        var aberta = fs.filter(function (f) { return f.status === 'ABERTA'; })
            .sort(function (a, b) { return String(b.competencia).localeCompare(String(a.competencia)); })[0];
        if (aberta) return aberta;
        return fs.sort(function (a, b) { return String(b.competencia).localeCompare(String(a.competencia)); })[0];
    }

    // ---------------- CONTAS: CRUD ----------------
    function abrirModalConta(id) {
        garantirModais();
        var c = id ? contaById(id) : null;
        document.getElementById('cta-id').value = c ? c.id : '';
        document.getElementById('cta-nome').value = c ? (c.nome || '') : '';
        document.getElementById('cta-tipo').value = c ? c.tipo : 'caixa';
        document.getElementById('cta-tipo').disabled = !!c;
        var obraSel = document.getElementById('cta-obra');
        if (obraSel) obraSel.innerHTML = optionsObrasHtml(c ? c.obra_id : (filtroObra || ''));
        document.getElementById('cta-cor').value = c ? (c.cor || '#0f172a') : '#0f172a';
        document.getElementById('cta-limite').value = c && c.limite != null ? c.limite : '';
        document.getElementById('cta-fech').value = c && c.dia_fechamento != null ? c.dia_fechamento : '';
        document.getElementById('cta-venc').value = c && c.dia_vencimento != null ? c.dia_vencimento : '';
        document.getElementById('cta-ativa').checked = c ? (c.ativa !== false) : true;
        document.getElementById('cta-saldo').value = c && c.saldo_inicial != null ? c.saldo_inicial : '';
        document.getElementById('cta-data-saldo').value = c ? (c.data_saldo_inicial ? String(c.data_saldo_inicial).slice(0, 10) : hoje()) : hoje();
        document.getElementById('cta-saldo-wrap').style.display = c ? 'none' : '';
        document.getElementById('modal-conta-title').innerText = c ? 'Editar Conta' : 'Nova Conta';
        document.getElementById('cta-hint').innerText = c ? 'Para mudar o saldo use o botao Ajuste (mantem o historico).' : '';
        document.getElementById('cta-cartao-fields').style.display = (document.getElementById('cta-tipo').value === 'cartao_credito') ? '' : 'none';
        document.getElementById('cta-data-saldo-wrap').style.display = c ? 'none' : '';
        document.getElementById('modal-conta').classList.remove('hidden');
        icons();
    }
    function onChangeTipoConta() {
        var t = document.getElementById('cta-tipo').value;
        document.getElementById('cta-cartao-fields').style.display = (t === 'cartao_credito') ? '' : 'none';
    }
    async function salvarConta() {
        var id = document.getElementById('cta-id').value;
        var nome = (document.getElementById('cta-nome').value || '').trim();
        var tipo = document.getElementById('cta-tipo').value;
        var obra = document.getElementById('cta-obra').value;
        if (!nome) return toast('Informe o nome da conta.', true);
        if (!obra) return toast('Selecione a obra da conta.', true);
        var payload = {
            nome: nome,
            tipo: tipo,
            obra_id: parseInt(obra, 10),
            cor: document.getElementById('cta-cor').value || null,
            ativa: document.getElementById('cta-ativa').checked
        };
        if (tipo === 'cartao_credito') {
            payload.limite = parseFloat(document.getElementById('cta-limite').value) || 0;
            payload.dia_fechamento = parseInt(document.getElementById('cta-fech').value, 10) || null;
            payload.dia_vencimento = parseInt(document.getElementById('cta-venc').value, 10) || null;
        } else {
            payload.limite = null; payload.dia_fechamento = null; payload.dia_vencimento = null;
        }
        loading(true);
        try {
            if (id) {
                var upd = await sb.from('jsp_contas').update(payload).eq('id', id);
                if (upd.error) throw upd.error;
            } else {
                payload.saldo_inicial = parseFloat(document.getElementById('cta-saldo').value) || 0;
                var ds = document.getElementById('cta-data-saldo').value || hoje();
                payload.data_saldo_inicial = ds;
                var ins = await sb.from('jsp_contas').insert([payload]).select();
                if (ins.error) throw ins.error;
            }
            document.getElementById('modal-conta').classList.add('hidden');
            toast(id ? 'Conta atualizada!' : 'Conta criada!');
            await loadData();
            renderAll();
        } catch (e) { loading(false); toast('Erro: ' + (e.message || e), true); return; }
        loading(false);
    }
    async function toggleConta(id) {
        var c = contaById(id); if (!c) return;
        loading(true);
        var r = await sb.from('jsp_contas').update({ ativa: !(c.ativa !== false) }).eq('id', id);
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        await loadData(); renderAll();
    }

    // ---------------- AJUSTE / TRANSFERENCIA ----------------
    function abrirModalAjuste(contaId) {
        garantirModais();
        document.getElementById('aj-conta').value = contaId;
        document.getElementById('aj-contanome').innerText = nomeConta(contaId);
        document.getElementById('aj-tipo').value = 'ENTRADA';
        document.getElementById('aj-valor').value = '';
        document.getElementById('aj-data').value = hoje();
        document.getElementById('aj-desc').value = 'Ajuste de saldo';
        document.getElementById('modal-ajuste').classList.remove('hidden');
    }
    async function salvarAjuste() {
        var contaId = document.getElementById('aj-conta').value;
        var sinal = document.getElementById('aj-tipo').value === 'ENTRADA' ? 1 : -1;
        var valor = parseFloat(document.getElementById('aj-valor').value);
        var data = document.getElementById('aj-data').value || hoje();
        var desc = document.getElementById('aj-desc').value || 'Ajuste de saldo';
        if (!contaId || isNaN(valor) || valor <= 0) return toast('Informe um valor valido.', true);
        loading(true);
        var r = await sb.rpc('rv_ajuste', { p_conta: contaId, p_delta: sinal * valor, p_data: data, p_desc: desc });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        document.getElementById('modal-ajuste').classList.add('hidden');
        toast('Ajuste lancado!'); await loadData(); renderAll();
    }

    function abrirModalTransferencia(contaId) {
        garantirModais();
        var c = contaById(contaId);
        var obra = c ? c.obra_id : (filtroObra || '');
        preencherSelectContas('tr-origem', contaId || '', false, obra);
        onChangeTransfOrigem();
        document.getElementById('tr-valor').value = '';
        document.getElementById('tr-data').value = hoje();
        document.getElementById('tr-desc').value = 'Transferencia entre contas';
        document.getElementById('modal-transferencia').classList.remove('hidden');
    }
    function onChangeTransfOrigem() {
        var origem = document.getElementById('tr-origem').value;
        var c = contaById(origem);
        var obra = c ? c.obra_id : (filtroObra || '');
        var atual = document.getElementById('tr-destino').value;
        preencherSelectContas('tr-destino', atual, true, obra);
    }
    async function salvarTransferencia() {
        var origem = document.getElementById('tr-origem').value;
        var destino = document.getElementById('tr-destino').value;
        var valor = parseFloat(document.getElementById('tr-valor').value);
        var data = document.getElementById('tr-data').value || hoje();
        var desc = document.getElementById('tr-desc').value || 'Transferencia';
        if (!origem || !destino) return toast('Selecione origem e destino.', true);
        if (origem === destino) return toast('Origem e destino iguais.', true);
        if (isNaN(valor) || valor <= 0) return toast('Informe um valor valido.', true);
        loading(true);
        var r = await sb.rpc('rv_transferir', { p_origem: origem, p_destino: destino, p_valor: valor, p_data: data, p_desc: desc });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        document.getElementById('modal-transferencia').classList.add('hidden');
        toast('Transferencia realizada!'); await loadData(); renderAll();
    }

    async function estornarMovimento(id) {
        if (!confirm('Estornar este movimento? Sera criado um lancamento inverso.')) return;
        loading(true);
        var r = await sb.rpc('rv_mov_estornar', { p_mov: id });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        toast('Movimento estornado!'); await loadData(); renderAll();
    }

    // ---------------- BAIXA (receita/despesa) ----------------
    function abrirModalBaixa(uid, tipo) {
        garantirModais();
        var log = (STATE.logs || []).find(function (l) { return String(l.uid) === String(uid); });
        if (!log) return toast('Lancamento nao encontrado.', true);
        if (log.eh_cartao) return toast('Despesa no cartao: a baixa ocorre no pagamento da fatura.', true);
        baixaPendente = { uid: uid, tipo: tipo || log.tipo };
        document.getElementById('bx-titulo').innerText = (baixaPendente.tipo === 'receita') ? 'Confirmar Recebimento' : 'Baixar Despesa';
        document.getElementById('bx-info').innerText = (log.produto_nome || '') + ' - ' + money(log.valor_total) + ' | ' + (baixaPendente.tipo === 'receita' ? 'entrada' : 'saida') + ' no caixa';
        preencherSelectContas('bx-conta', log.conta_id || '', false, log.obra_id);
        document.getElementById('bx-data').value = hoje();
        document.getElementById('modal-baixa').classList.remove('hidden');
    }
    function abrirModalBaixaOC(id) {
        garantirModais();
        baixaPendente = { ocId: id };
        var pend = (STATE.logs || []).filter(function (l) { return String(l.id) === String(id) && l.tipo === 'compra' && l.status_financeiro === 'PENDENTE'; });
        var total = pend.reduce(function (a, l) { return a + (parseFloat(l.valor_total) || 0); }, 0);
        var obra = '';
        pend.forEach(function (l) { if (l.obra_id != null) obra = l.obra_id; });
        document.getElementById('bx-titulo').innerText = 'Baixar O.C. #' + id;
        document.getElementById('bx-info').innerText = 'O.C. #' + id + ' - ' + money(total) + ' | saida no caixa';
        preencherSelectContas('bx-conta', '', false, obra);
        document.getElementById('bx-data').value = hoje();
        document.getElementById('modal-baixa').classList.remove('hidden');
    }
    async function confirmarBaixa() { // eslint-disable-line no-redeclare
        if (!baixaPendente) return;
        var conta = document.getElementById('bx-conta').value;
        var data = document.getElementById('bx-data').value || hoje();
        if (!conta) return toast('Selecione a conta.', true);
        loading(true);
        var r;
        if (baixaPendente.ocId) r = await sb.rpc('rv_baixar_oc', { p_id: String(baixaPendente.ocId), p_conta: conta, p_data: data });
        else r = await sb.rpc('rv_baixar_lancamento', { p_uid: baixaPendente.uid, p_conta: conta, p_data: data });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        document.getElementById('modal-baixa').classList.add('hidden');
        var eraOC = !!baixaPendente.ocId;
        baixaPendente = null;
        toast(eraOC ? 'O.C. baixada!' : 'Baixa realizada!'); await loadData(); renderAll();
    }

    async function estornarBaixa(uid) {
        if (!confirm('Estornar a baixa? Um lancamento inverso sera criado e o status volta para PENDENTE.')) return;
        loading(true);
        var r = await sb.rpc('rv_estornar_baixa', { p_uid: uid });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        toast('Baixa estornada!'); await loadData(); renderAll();
    }
    async function estornarBaixaOC(id) {
        if (!confirm('Estornar a baixa desta O.C.?')) return;
        loading(true);
        var r = await sb.rpc('rv_estornar_baixa_oc', { p_id: String(id) });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        toast('Baixa da O.C. estornada!'); await loadData(); renderAll();
    }

    // ---------------- CARTAO ----------------
    async function registrarCompraCartao(uid, contaId) {
        var r = await sb.rpc('rv_cartao_compra', { p_uid: uid, p_conta: contaId });
        return r;
    }
    async function estornarCompraCartao(uid) {
        if (!confirm('Cancelar esta compra no cartao? Sera criado o lancamento inverso.')) return;
        loading(true);
        var r = await sb.rpc('rv_estornar_compra_cartao', { p_uid: uid });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        toast('Compra cancelada!'); await loadData(); renderAll();
    }

    function abrirModalPagarFatura(fatId) {
        garantirModais();
        var f = faturas().find(function (x) { return String(x.id) === String(fatId); });
        if (!f) return toast('Fatura nao encontrada.', true);
        document.getElementById('pf-fatura').value = fatId;
        document.getElementById('pf-info').innerText = 'Fatura ' + f.competencia + ' - ' + money(f.valor_total);
        var card = contaById(f.conta_id);
        preencherSelectContas('pf-conta', (card || {}).conta_pagamento_padrao || '', true, card ? card.obra_id : '');
        document.getElementById('pf-data').value = hoje();
        document.getElementById('modal-pagar-fatura').classList.remove('hidden');
    }
    async function confirmarPagarFatura() {
        var fatId = document.getElementById('pf-fatura').value;
        var conta = document.getElementById('pf-conta').value;
        var data = document.getElementById('pf-data').value || hoje();
        if (!conta) return toast('Selecione a conta de pagamento.', true);
        loading(true);
        var r = await sb.rpc('rv_fatura_pagar', { p_fatura: fatId, p_conta_pagamento: conta, p_data: data });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        document.getElementById('modal-pagar-fatura').classList.add('hidden');
        toast('Fatura paga!'); await loadData(); renderAll();
    }
    async function fecharFatura(fatId) {
        if (!confirm('Fechar esta fatura agora?')) return;
        loading(true);
        var r = await sb.rpc('rv_fatura_fechar', { p_fatura: fatId });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        toast('Fatura fechada!'); await loadData(); renderAll();
    }
    async function estornarPagamentoFatura(fatId) {
        if (!confirm('Estornar o pagamento desta fatura?')) return;
        loading(true);
        var r = await sb.rpc('rv_fatura_estornar_pagamento', { p_fatura: fatId });
        loading(false);
        if (r.error) return toast('Erro: ' + r.error.message, true);
        toast('Pagamento estornado!'); await loadData(); renderAll();
    }

    // ---------------- RENDER ----------------
    function renderAll() {
        render('fin-contas-container');
        render('fin-contas-container-mobile');
    }

    function preencherSelectContas(elId, valor, incluirCartao, obraFiltro) {
        var el = document.getElementById(elId);
        if (!el) return;
        var opcoes = contasAtivas().filter(function (c) {
            if (!incluirCartao && c.tipo === 'cartao_credito') return false;
            if (obraFiltro && String(c.obra_id) !== String(obraFiltro)) return false;
            return true;
        });
        el.innerHTML = '<option value="">-- Selecione --</option>' + opcoes.map(function (c) {
            return '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>';
        }).join('');
        if (valor) el.value = String(valor);
    }

    function preencherSelectPorForma(elId, forma, valor, obraFiltro) {
        var el = document.getElementById(elId);
        if (!el) return;
        var cartao = (String(forma).indexOf('Cart') === 0);
        var opcoes = contasAtivas().filter(function (c) {
            if (obraFiltro && String(c.obra_id) !== String(obraFiltro)) return false;
            return cartao ? c.tipo === 'cartao_credito' : c.tipo !== 'cartao_credito';
        });
        el.innerHTML = '<option value="">-- Selecione --</option>' + opcoes.map(function (c) {
            return '<option value="' + esc(c.id) + '">' + esc(c.nome) + '</option>';
        }).join('');
        if (valor) el.value = String(valor);
    }

    function onFormaExpChange() {
        var formaEl = document.getElementById('exp-forma');
        var contaEl = document.getElementById('exp-conta');
        if (!formaEl || !contaEl) return;
        var cur = contaEl.value || '';
        var obraEl = document.getElementById('exp-obra');
        var obra = obraEl ? obraEl.value : '';
        preencherSelectPorForma('exp-conta', formaEl.value, cur, obra);
        var hint = document.getElementById('exp-conta-hint');
        if (hint) hint.innerText = (String(formaEl.value).indexOf('Cart') === 0)
            ? 'Compra no cartao: entra na fatura; o dinheiro sai no pagamento da fatura.'
            : 'Conta usada quando a despesa for paga (baixa).';
    }

    function onObraExpChange() { onFormaExpChange(); }
    function onObraRevChange() {
        var obraEl = document.getElementById('rev-obra');
        var el = document.getElementById('rev-conta');
        var cur = el ? el.value : '';
        preencherSelectContas('rev-conta', cur, false, obraEl ? obraEl.value : '');
    }

    function cardConta(c) {
        var saldo = saldoConta(c.id);
        var cor = c.cor || TIPO_COR[c.tipo] || '#0f172a';
        var saldoCls = saldo < 0 ? 'text-red-600' : 'text-slate-800';
        var sel = selectedConta === c.id;
        var extra = '';
        if (c.tipo === 'cartao_credito') {
            var f = faturaAtual(c.id);
            var disp = disponivelCartao(c.id);
            extra = '<div class="mt-2 text-[10px] text-slate-500 font-bold uppercase">Fatura ' + (f ? faturaDeLabel(f) : '-') +
                ': <span class="text-purple-700">' + money(f ? f.valor_total : 0) + '</span></div>' +
                '<div class="text-[10px] text-slate-500 font-bold uppercase">Disponivel: <span class="' + (disp < 0 ? 'text-red-600' : 'text-green-700') + '">' + money(disp) + '</span>' +
                ' / Limite ' + money(c.limite) + '</div>';
        }
        var badge = c.ativa === false ? '<span class="text-[9px] font-bold text-slate-400"> (INATIVA)</span>' : '';
        return '<div class="bg-white rounded-xl border shadow-sm p-3 cursor-pointer hover:border-blue-500 transition ' + (sel ? 'ring-2 ring-blue-500' : '') + '" onclick="RVContas.selecionarConta(\'' + c.id + '\')">' +
            '<div class="flex items-start justify-between">' +
                '<div class="flex items-center gap-2">' +
                    '<span style="background:' + esc(cor) + '" class="w-3 h-3 rounded-full inline-block"></span>' +
                    '<div><div class="font-bold text-slate-800 text-sm">' + esc(c.nome) + badge + '</div>' +
                    '<div class="text-[9px] font-bold text-slate-400 uppercase">' + (TIPO_CURTO[c.tipo] || c.tipo) + ' | ' + esc(nomeObra(c.obra_id)) + '</div></div>' +
                '</div>' +
                '<i data-lucide="' + (TIPO_ICON[c.tipo] || 'wallet') + '" class="w-4 h-4 text-slate-300"></i>' +
            '</div>' +
            '<div class="mt-2"><span class="text-[9px] text-slate-400 font-bold uppercase">Saldo</span>' +
            '<div class="text-lg font-black ' + saldoCls + '">' + money(saldo) + '</div></div>' + extra +
            '<div class="mt-2 flex flex-wrap gap-1" onclick="event.stopPropagation()">' +
                '<button onclick="RVContas.abrirExtrato(\'' + c.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Extrato</button>' +
                (c.tipo !== 'cartao_credito' ? '<button onclick="RVContas.abrirModalTransferencia(\'' + c.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Transferir</button>' : '') +
                '<button onclick="RVContas.abrirModalAjuste(\'' + c.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Ajuste</button>' +
                (podeGerenciar() ? '<button onclick="RVContas.abrirModalConta(\'' + c.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Editar</button>' +
                '<button onclick="RVContas.toggleConta(\'' + c.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">' + (c.ativa === false ? 'Ativar' : 'Desativar') + '</button>' : '') +
            '</div>' +
        '</div>';
    }

    function faturaDeLabel(f) {
        var st = f.status === 'PAGA' ? 'PAGA' : (f.status === 'FECHADA' ? 'FECHADA' : 'ABERTA');
        return f.competencia + ' (' + st + ')';
    }

    function renderExtrato(conta) {
        var ms = movs().filter(function (m) { return String(m.conta_id) === String(conta.id); });
        var lista = ms.slice().sort(function (a, b) {
            var da = dataMov(a), db = dataMov(b);
            if (da !== db) return da < db ? -1 : 1;
            return String(a.created_at || '').localeCompare(String(b.created_at || ''));
        });
        var run = Number(conta.saldo_inicial) || 0;
        lista.forEach(function (m) { run += movSigned(m); m.__saldo = run; });
        var disp = lista.slice().reverse().filter(function (m) {
            if (filtro.inicio && dataMov(m) < filtro.inicio) return false;
            if (filtro.fim && dataMov(m) > filtro.fim) return false;
            return true;
        });
        var rows = disp.map(function (m) {
            var pode = (m.estornada !== true) && (m.origem === 'manual' || m.origem === 'ajuste');
            var valCls = movSigned(m) < 0 ? 'text-red-600' : 'text-green-700';
            var est = m.estornada === true ? '<span class="text-[9px] font-bold text-slate-400">ESTORNADO</span> ' : '';
            return '<tr class="border-b hover:bg-slate-50">' +
                '<td class="p-2 text-[10px] font-bold text-slate-500 whitespace-nowrap">' + (m.data ? esc(String(m.data).slice(0,10)) : '-') + '</td>' +
                '<td class="p-2 text-xs text-slate-700">' + est + esc(m.descricao || '-') +
                    '<div class="text-[9px] text-slate-400 font-bold uppercase">' + tipoLabel(m.tipo) + (m.categoria ? ' | ' + esc(m.categoria) : '') + '</div></td>' +
                '<td class="p-2 text-right text-xs font-bold ' + valCls + ' whitespace-nowrap">' + money(movSigned(m)) + '</td>' +
                '<td class="p-2 text-right text-xs font-bold text-slate-500 whitespace-nowrap">' + money(m.__saldo) + '</td>' +
                '<td class="p-2 text-right">' + (pode ? '<button onclick="RVContas.estornarMovimento(\'' + m.id + '\')" class="text-slate-400 hover:text-red-600" title="Estornar"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i></button>' : '') + '</td>' +
            '</tr>';
        }).join('');
        return '<div class="bg-white rounded-xl border shadow-sm mt-4">' +
            '<div class="px-3 py-2 bg-slate-100 flex flex-wrap justify-between items-center gap-2 rounded-t-xl">' +
                '<span class="text-xs font-bold text-slate-600 uppercase">Extrato - ' + esc(conta.nome) + '</span>' +
                '<div class="flex items-center gap-2">' +
                    '<input type="date" id="cta-ext-inicio" value="' + esc(filtro.inicio) + '" onchange="RVContas.setFiltro(\'inicio\', this.value)" class="p-1 border rounded text-[10px]">' +
                    '<input type="date" id="cta-ext-fim" value="' + esc(filtro.fim) + '" onchange="RVContas.setFiltro(\'fim\', this.value)" class="p-1 border rounded text-[10px]">' +
                    '<button onclick="RVContas.pdfExtrato(\'' + conta.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 text-white">PDF</button>' +
                    '<button onclick="RVContas.fecharExtrato()" class="text-slate-400 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>' +
                '</div>' +
            '</div>' +
            '<div class="overflow-x-auto"><table class="w-full text-left">' +
                '<thead class="text-slate-400 text-[9px] uppercase border-b"><tr>' +
                    '<th class="p-2">Data</th><th class="p-2">Descricao</th><th class="p-2 text-right">Valor</th><th class="p-2 text-right">Saldo</th><th class="p-2"></th>' +
                '</tr></thead><tbody>' + (rows || '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">Sem movimentos.</td></tr>') + '</tbody>' +
            '</table></div>' +
        '</div>';
    }

    function renderFaturas(conta) {
        var fs = faturas().filter(function (f) { return String(f.conta_id) === String(conta.id); })
            .sort(function (a, b) { return String(b.competencia).localeCompare(String(a.competencia)); });
        var rows = fs.map(function (f) {
            var badge = f.status === 'PAGA' ? 'bg-green-100 text-green-700' : (f.status === 'FECHADA' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700');
            var acoes = '';
            if (f.status === 'ABERTA') acoes += '<button onclick="RVContas.fecharFatura(\'' + f.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-orange-600 text-white">Fechar</button> ';
            if (f.status === 'ABERTA' || f.status === 'FECHADA') acoes += '<button onclick="RVContas.abrirModalPagarFatura(\'' + f.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-green-600 text-white">Pagar</button> ';
            if (f.status === 'PAGA') acoes += '<button onclick="RVContas.estornarPagamentoFatura(\'' + f.id + '\')" class="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">Estornar pagamento</button> ';
            return '<tr class="border-b hover:bg-slate-50">' +
                '<td class="p-2 text-xs font-bold text-slate-700">' + esc(f.competencia) + '</td>' +
                '<td class="p-2 text-[10px] text-slate-500">Fech ' + esc(String(f.data_fechamento).slice(0,10)) + ' / Venc ' + esc(String(f.data_vencimento).slice(0,10)) + '</td>' +
                '<td class="p-2 text-xs font-bold text-purple-700 text-right whitespace-nowrap">' + money(f.valor_total) + '</td>' +
                '<td class="p-2 text-center"><span class="px-2 py-1 rounded text-[9px] font-bold ' + badge + '">' + f.status + '</span></td>' +
                '<td class="p-2 text-right whitespace-nowrap">' + acoes + '</td>' +
            '</tr>';
        }).join('');
        return '<div class="bg-white rounded-xl border shadow-sm mt-4">' +
            '<div class="px-3 py-2 bg-slate-100 rounded-t-xl text-xs font-bold text-slate-600 uppercase">Faturas - ' + esc(conta.nome) + '</div>' +
            '<div class="overflow-x-auto"><table class="w-full text-left">' +
                '<thead class="text-slate-400 text-[9px] uppercase border-b"><tr><th class="p-2">Competencia</th><th class="p-2">Datas</th><th class="p-2 text-right">Total</th><th class="p-2 text-center">Status</th><th class="p-2 text-right">Acoes</th></tr></thead>' +
                '<tbody>' + (rows || '<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">Sem faturas.</td></tr>') + '</tbody>' +
            '</table></div>' +
            '<div class="px-3 py-2 text-[10px] text-slate-400 font-semibold">Compras no cartao entram na fatura do ciclo (dia de fechamento). O dinheiro sai quando a fatura e paga.</div>' +
        '</div>';
    }

    function render(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        var lista = contasPorObra().slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0) || String(a.nome).localeCompare(String(b.nome)); });
        var cards = lista.map(cardConta).join('');
        var sel = selectedConta ? contaById(selectedConta) : null;
        var extra = '';
        if (sel) { extra += renderExtrato(sel); if (sel.tipo === 'cartao_credito') extra += renderFaturas(sel); }

        var totalReal = saldoTotalReal(filtroObra);
        var totalDisp = saldoDisponivelGeral(filtroObra);
        var opcoesObra = '<option value="">Todas as obras</option>' + obras().map(function (o) {
            return '<option value="' + esc(o.id) + '"' + (String(filtroObra) === String(o.id) ? ' selected' : '') + '>' + esc(o.nome || o.nome_obra || '') + '</option>';
        }).join('');
        el.innerHTML =
            '<div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">' +
                '<div class="bg-white p-4 rounded-xl border-l-4 border-l-blue-600 shadow-sm">' +
                    '<p class="text-slate-500 text-[10px] font-bold uppercase">Saldo em Contas (Real)</p>' +
                    '<h3 class="text-2xl font-black ' + (totalReal < 0 ? 'text-red-600' : 'text-blue-700') + '">' + money(totalReal) + '</h3>' +
                    '<p class="text-[9px] text-slate-400 font-semibold">Somente Caixa + Bancos (cartoes aparecem separados)</p>' +
                '</div>' +
                '<div class="bg-white p-4 rounded-xl border-l-4 border-l-green-500 shadow-sm">' +
                    '<p class="text-slate-500 text-[10px] font-bold uppercase">Disponivel Geral</p>' +
                    '<h3 class="text-2xl font-black ' + (totalDisp < 0 ? 'text-red-600' : 'text-green-700') + '">' + money(totalDisp) + '</h3>' +
                    '<p class="text-[9px] text-slate-400 font-semibold">Inclui limite dos cartoes</p>' +
                '</div>' +
                '<div class="bg-white p-4 rounded-xl border-l-4 border-l-slate-400 shadow-sm">' +
                    '<p class="text-slate-500 text-[10px] font-bold uppercase">Contas</p>' +
                    '<h3 class="text-2xl font-black text-slate-800">' + lista.length + '</h3>' +
                    '<p class="text-[9px] text-slate-400 font-semibold">' + lista.filter(function (c) { return c.ativa !== false; }).length + ' ativas</p>' +
                '</div>' +
            '</div>' +
            '<div class="flex flex-wrap justify-between items-center gap-2 mb-3">' +
                '<div class="flex items-center gap-2">' +
                    '<h3 class="font-bold text-slate-700 text-sm uppercase tracking-wide">Carteiras</h3>' +
                    '<select onchange="RVContas.setFiltroObra(this.value)" class="p-1.5 border rounded-lg text-xs font-bold text-slate-700 bg-white">' + opcoesObra + '</select>' +
                '</div>' +
                (podeGerenciar() ? '<button onclick="RVContas.abrirModalConta()" class="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1"><i data-lucide="plus" class="w-4 h-4"></i> Nova Conta</button>' : '') +
            '</div>' +
            (cards ? '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">' + cards + '</div>'
                   : '<div class="bg-white rounded-xl border p-6 text-center text-slate-400 text-sm">' + (filtroObra ? 'Nenhuma conta cadastrada nesta obra.' : 'Nenhuma conta cadastrada. Crie a primeira em "Nova Conta".') + '</div>') +
            extra;
        icons();
    }

    function tipoLabel(t) {
        var m = {
            ENTRADA: 'Entrada', SAIDA: 'Saida', TRANSFERENCIA_ENTRADA: 'Transferencia (entrada)',
            TRANSFERENCIA_SAIDA: 'Transferencia (saida)', COMPRA_CARTAO: 'Compra no cartao',
            PAGAMENTO_FATURA: 'Pagamento de fatura', AJUSTE_ENTRADA: 'Ajuste (+)', AJUSTE_SAIDA: 'Ajuste (-)'
        };
        return m[t] || t;
    }

    // ---------------- extrato actions ----------------
    function selecionarConta(id) { selectedConta = id; verConsolidado = false; renderAll(); }
    function abrirExtrato(id) { selectedConta = id; renderAll(); setTimeout(function () { var e = document.getElementById('cta-ext-inicio'); if (e) e.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100); }
    function fecharExtrato() { selectedConta = null; renderAll(); }
    function setFiltro(k, v) { filtro[k] = v; renderAll(); }
    function setFiltroObra(v) { filtroObra = v || ''; renderAll(); }

    function pdfExtrato(contaId) {
        var c = contaById(contaId); if (!c) return;
        if (typeof pdfMake === 'undefined') return toast('PDF indisponivel.', true);
        var ms = movs().filter(function (m) { return String(m.conta_id) === String(contaId); })
            .sort(function (a, b) { return dataMov(a) < dataMov(b) ? -1 : (dataMov(a) > dataMov(b) ? 1 : 0); });
        var run = Number(c.saldo_inicial) || 0;
        var body = [[{ text: 'Data', style: 'th' }, { text: 'Descricao', style: 'th' }, { text: 'Valor', style: 'th', alignment: 'right' }, { text: 'Saldo', style: 'th', alignment: 'right' }]];
        body.push([{ text: 'Saldo inicial', colSpan: 2 }, {}, { text: '', alignment: 'right' }, { text: money(run), alignment: 'right' }]);
        ms.forEach(function (m) {
            if (filtro.inicio && dataMov(m) < filtro.inicio) return;
            if (filtro.fim && dataMov(m) > filtro.fim) return;
            run += movSigned(m);
            body.push([String(m.data).slice(0, 10), (m.estornada ? '[EST] ' : '') + (m.descricao || ''), { text: money(movSigned(m)), alignment: 'right' }, { text: money(run), alignment: 'right' }]);
        });
        var doc = { content: [
            { text: 'Extrato - ' + c.nome, style: 'h' },
            { text: 'Gerado em ' + new Date().toLocaleString('pt-BR'), fontSize: 9, color: '#64748b', marginBottom: 6 },
            { table: { headerRows: 1, widths: ['auto', '*', 'auto', 'auto'], body: body }, layout: 'lightHorizontalLines' }
        ], styles: { h: { fontSize: 15, bold: true, marginBottom: 4 }, th: { bold: true, fontSize: 9, fillColor: '#0f172a', color: 'white' } } };
        pdfMake.createPdf(doc).download('extrato_' + c.nome.replace(/\s+/g, '_') + '.pdf');
    }

    // ---------------- MODAIS ----------------
    function garantirModais() {
        if (document.getElementById('modal-conta')) return;
        var html =
        '<div id="modal-conta" class="hidden fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">' +
          '<div class="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">' +
            '<div class="p-4 border-b flex justify-between items-center bg-slate-50"><h3 id="modal-conta-title" class="font-bold text-slate-800">Nova Conta</h3><button onclick="document.getElementById(\'modal-conta\').classList.add(\'hidden\')" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button></div>' +
            '<div class="p-4 space-y-3">' +
              '<input type="hidden" id="cta-id">' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label><input id="cta-nome" class="w-full p-2 border rounded-lg text-sm font-bold"></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Obra</label><select id="cta-obra" class="w-full p-2 border rounded-lg text-sm font-bold"></select></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label><select id="cta-tipo" onchange="RVContas.onChangeTipoConta()" class="w-full p-2 border rounded-lg text-sm font-bold"><option value="caixa">Caixa (Dinheiro)</option><option value="banco">Banco / Conta</option><option value="cartao_credito">Cartao de Credito</option></select></div>' +
              '<div id="cta-saldo-wrap"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Saldo Inicial (R$)</label><input type="number" step="0.01" id="cta-saldo" class="w-full p-2 border rounded-lg text-sm font-bold"></div>' +
              '<div id="cta-data-saldo-wrap"><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data do Saldo Inicial</label><input type="date" id="cta-data-saldo" class="w-full p-2 border rounded-lg text-sm"></div>' +
              '<div id="cta-cartao-fields" style="display:none" class="space-y-3 border-t pt-3">' +
                '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Limite (R$)</label><input type="number" step="0.01" id="cta-limite" class="w-full p-2 border rounded-lg text-sm"></div>' +
                '<div class="grid grid-cols-2 gap-2"><div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dia fechamento</label><input type="number" min="1" max="28" id="cta-fech" class="w-full p-2 border rounded-lg text-sm"></div>' +
                '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Dia vencimento</label><input type="number" min="1" max="28" id="cta-venc" class="w-full p-2 border rounded-lg text-sm"></div></div>' +
              '</div>' +
              '<div class="flex items-center gap-3"><div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Cor</label><input type="color" id="cta-cor" class="h-9 w-14 border rounded"></div>' +
              '<label class="flex items-center gap-2 mt-4 text-sm font-bold text-slate-600"><input type="checkbox" id="cta-ativa" checked> Ativa</label></div>' +
              '<p id="cta-hint" class="text-[10px] text-slate-400 font-semibold"></p>' +
            '</div>' +
            '<div class="p-4 border-t bg-slate-50 flex gap-2"><button onclick="document.getElementById(\'modal-conta\').classList.add(\'hidden\')" class="flex-1 py-2 bg-white border rounded-lg font-bold text-slate-600">Cancelar</button><button onclick="RVContas.salvarConta()" class="flex-1 py-2 bg-blue-700 text-white rounded-lg font-bold">Salvar</button></div>' +
          '</div></div>' +

        '<div id="modal-transferencia" class="hidden fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">' +
          '<div class="bg-white rounded-2xl w-full max-w-md shadow-2xl">' +
            '<div class="p-4 border-b flex justify-between items-center bg-slate-50"><h3 class="font-bold text-slate-800">Transferencia entre Contas</h3><button onclick="document.getElementById(\'modal-transferencia\').classList.add(\'hidden\')" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button></div>' +
            '<div class="p-4 space-y-3">' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Origem</label><select id="tr-origem" onchange="RVContas.onChangeTransfOrigem()" class="w-full p-2 border rounded-lg text-sm font-bold"></select></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Destino</label><select id="tr-destino" class="w-full p-2 border rounded-lg text-sm font-bold"></select></div>' +
              '<p class="text-[10px] text-slate-400 font-semibold">Transferencias so entre contas da mesma obra.</p>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label><input type="number" step="0.01" id="tr-valor" class="w-full p-2 border rounded-lg text-sm font-bold"></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label><input type="date" id="tr-data" class="w-full p-2 border rounded-lg text-sm"></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descricao</label><input id="tr-desc" class="w-full p-2 border rounded-lg text-sm"></div>' +
            '</div>' +
            '<div class="p-4 border-t bg-slate-50 flex gap-2"><button onclick="document.getElementById(\'modal-transferencia\').classList.add(\'hidden\')" class="flex-1 py-2 bg-white border rounded-lg font-bold text-slate-600">Cancelar</button><button onclick="RVContas.salvarTransferencia()" class="flex-1 py-2 bg-blue-700 text-white rounded-lg font-bold">Transferir</button></div>' +
          '</div></div>' +

        '<div id="modal-ajuste" class="hidden fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">' +
          '<div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">' +
            '<div class="p-4 border-b flex justify-between items-center bg-slate-50"><h3 class="font-bold text-slate-800">Ajuste - <span id="aj-contanome"></span></h3><button onclick="document.getElementById(\'modal-ajuste\').classList.add(\'hidden\')" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button></div>' +
            '<div class="p-4 space-y-3">' +
              '<input type="hidden" id="aj-conta">' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label><select id="aj-tipo" class="w-full p-2 border rounded-lg text-sm font-bold"><option value="ENTRADA">Entrada (+)</option><option value="SAIDA">Saida (-)</option></select></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label><input type="number" step="0.01" id="aj-valor" class="w-full p-2 border rounded-lg text-sm font-bold"></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label><input type="date" id="aj-data" class="w-full p-2 border rounded-lg text-sm"></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Descricao</label><input id="aj-desc" class="w-full p-2 border rounded-lg text-sm"></div>' +
            '</div>' +
            '<div class="p-4 border-t bg-slate-50 flex gap-2"><button onclick="document.getElementById(\'modal-ajuste\').classList.add(\'hidden\')" class="flex-1 py-2 bg-white border rounded-lg font-bold text-slate-600">Cancelar</button><button onclick="RVContas.salvarAjuste()" class="flex-1 py-2 bg-slate-800 text-white rounded-lg font-bold">Ajustar</button></div>' +
          '</div></div>' +

        '<div id="modal-baixa" class="hidden fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">' +
          '<div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">' +
            '<div class="p-4 border-b flex justify-between items-center bg-slate-50"><h3 id="bx-titulo" class="font-bold text-slate-800">Baixar</h3><button onclick="document.getElementById(\'modal-baixa\').classList.add(\'hidden\')" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button></div>' +
            '<div class="p-4 space-y-3">' +
              '<p id="bx-info" class="text-xs text-slate-500 font-semibold"></p>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Conta</label><select id="bx-conta" class="w-full p-2 border rounded-lg text-sm font-bold"></select></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label><input type="date" id="bx-data" class="w-full p-2 border rounded-lg text-sm"></div>' +
            '</div>' +
            '<div class="p-4 border-t bg-slate-50 flex gap-2"><button onclick="document.getElementById(\'modal-baixa\').classList.add(\'hidden\')" class="flex-1 py-2 bg-white border rounded-lg font-bold text-slate-600">Cancelar</button><button onclick="RVContas.confirmarBaixa()" class="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold">Confirmar</button></div>' +
          '</div></div>' +

        '<div id="modal-pagar-fatura" class="hidden fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4">' +
          '<div class="bg-white rounded-2xl w-full max-w-sm shadow-2xl">' +
            '<div class="p-4 border-b flex justify-between items-center bg-slate-50"><h3 class="font-bold text-slate-800">Pagar Fatura</h3><button onclick="document.getElementById(\'modal-pagar-fatura\').classList.add(\'hidden\')" class="text-slate-400 hover:text-red-500"><i data-lucide="x"></i></button></div>' +
            '<div class="p-4 space-y-3">' +
              '<input type="hidden" id="pf-fatura">' +
              '<p id="pf-info" class="text-xs text-slate-500 font-semibold"></p>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Conta de pagamento</label><select id="pf-conta" class="w-full p-2 border rounded-lg text-sm font-bold"></select></div>' +
              '<div><label class="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label><input type="date" id="pf-data" class="w-full p-2 border rounded-lg text-sm"></div>' +
            '</div>' +
            '<div class="p-4 border-t bg-slate-50 flex gap-2"><button onclick="document.getElementById(\'modal-pagar-fatura\').classList.add(\'hidden\')" class="flex-1 py-2 bg-white border rounded-lg font-bold text-slate-600">Cancelar</button><button onclick="RVContas.confirmarPagarFatura()" class="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold">Pagar</button></div>' +
          '</div></div>';

        var wrap = document.createElement('div');
        wrap.innerHTML = html;
        document.body.appendChild(wrap);
        if (global.RVModals) global.RVModals.registerAll();
        icons();
    }

    var api = {
        contas: contas, movs: movs, faturas: faturas,
        contaById: contaById, nomeConta: nomeConta, isCartao: isCartao,
        saldoConta: saldoConta, disponivelCartao: disponivelCartao, saldoTotalReal: saldoTotalReal, saldoDisponivelGeral: saldoDisponivelGeral,
        movDoLog: movDoLog, faturaDeLog: faturaDeLog, faturaAtual: faturaAtual,
        render: render, renderAll: renderAll,
        abrirModalConta: abrirModalConta, onChangeTipoConta: onChangeTipoConta, salvarConta: salvarConta, toggleConta: toggleConta,
        abrirModalAjuste: abrirModalAjuste, salvarAjuste: salvarAjuste,
        abrirModalTransferencia: abrirModalTransferencia, salvarTransferencia: salvarTransferencia, onChangeTransfOrigem: onChangeTransfOrigem,
        estornarMovimento: estornarMovimento,
        selecionarConta: selecionarConta, abrirExtrato: abrirExtrato, fecharExtrato: fecharExtrato, setFiltro: setFiltro, setFiltroObra: setFiltroObra, pdfExtrato: pdfExtrato,
        abrirModalBaixa: abrirModalBaixa, abrirModalBaixaOC: abrirModalBaixaOC, confirmarBaixa: confirmarBaixa,
        estornarBaixa: estornarBaixa, estornarBaixaOC: estornarBaixaOC,
        registrarCompraCartao: registrarCompraCartao, estornarCompraCartao: estornarCompraCartao,
        abrirModalPagarFatura: abrirModalPagarFatura, confirmarPagarFatura: confirmarPagarFatura,
        fecharFatura: fecharFatura, estornarPagamentoFatura: estornarPagamentoFatura,
        preencherSelectContas: preencherSelectContas, tipoLabel: tipoLabel,
        preencherSelectPorForma: preencherSelectPorForma, onFormaExpChange: onFormaExpChange,
        onObraExpChange: onObraExpChange, onObraRevChange: onObraRevChange,
        nomeObra: nomeObra
    };
    global.RVContas = api;
    // atalhos globais (usados nos onclick)
    global.RVContas_confirmaBaixa = confirmarBaixa;
})(typeof window !== 'undefined' ? window : globalThis);
