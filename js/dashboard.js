// =====================================================================
// VISAO GERAL (Cockpit) - sistema.html
// Remodela a aba inicial: KPIs globais, alertas, cards por obra com
// semaforo/drill-down e bloco analitico (Chart.js).
//
// Fonte de caixa: contas (jsp_contas/jsp_movimentacoes via RVContas)
// quando existirem; caso contrario estima por logs com status PAGO.
// =====================================================================
(function (global) {
    'use strict';

    // ---------- Helpers ----------
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function num(v) { return parseFloat(v) || 0; }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function money(v) { return global.formatMoney ? global.formatMoney(v) : ('R$ ' + num(v).toFixed(2)); }
    function dateBR(d) { return global.formatDate ? global.formatDate(d) : (d || '-'); }
    function pct(part, total) { return total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '0%'; }
    function d2s(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function hoje() { return global.getTodayDate ? global.getTodayDate() : d2s(new Date()); }
    function nomeObra(id) { const o = (STATE.obras || []).find(x => String(x.id) === String(id)); return o ? o.nome : 'Sem obra'; }
    function ehVale(l) { return global.valeEhLog && global.valeEhLog(l); }
    function isReceita(l) { return l.tipo === 'receita'; }
    function isDespesa(l) { return l.tipo === 'compra' || l.tipo === 'despesa'; }

    // ---------- Filtro / periodo ----------
    const LS_KEY = 'rv_dash_filtro';
    function lerFiltro() {
        let f = { periodo: 'mes', ini: '', fim: '', obra: '' };
        try { Object.assign(f, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch (e) { /* noop */ }
        return f;
    }
    function salvarFiltro(f) { try { localStorage.setItem(LS_KEY, JSON.stringify(f)); } catch (e) { /* noop */ } }

    function periodoRange(f) {
        const t = new Date(); const y = t.getFullYear(), m = t.getMonth();
        if (f.periodo === 'mes') return { ini: d2s(new Date(y, m, 1)), fim: d2s(new Date(y, m + 1, 0)) };
        if (f.periodo === '30d') { const i = new Date(t); i.setDate(i.getDate() - 29); return { ini: d2s(i), fim: d2s(t) }; }
        if (f.periodo === '90d') { const i = new Date(t); i.setDate(i.getDate() - 89); return { ini: d2s(i), fim: d2s(t) }; }
        if (f.periodo === 'ano') return { ini: y + '-01-01', fim: y + '-12-31' };
        if (f.periodo === 'tudo') return { ini: '', fim: '' };
        return { ini: f.ini || '', fim: f.fim || '' };
    }
    function prevRange(range) {
        if (!range.ini || !range.fim) return null;
        const days = Math.round((new Date(range.fim) - new Date(range.ini)) / 86400000) + 1;
        const pFim = new Date(new Date(range.ini + 'T00:00:00').getTime() - 86400000);
        const pIni = new Date(pFim.getTime() - (days - 1) * 86400000);
        return { ini: d2s(pIni), fim: d2s(pFim) };
    }
    function dentroRange(dateStr, range) {
        if (!range.ini && !range.fim) return true;
        const d = new Date(String(dateStr || '').slice(0, 10));
        if (isNaN(d)) return false;
        if (range.ini && d < new Date(range.ini + 'T00:00:00')) return false;
        if (range.fim && d > new Date(range.fim + 'T23:59:59')) return false;
        return true;
    }
    function dataRef(l) { return l.data || l.vencimento || l.created_at; }
    function vencRef(l) { return l.vencimento || l.data || l.created_at; }

    // ---------- Caixa (contas com fallback para logs PAGO) ----------
    function contas() { return (global.RVContas && global.RVContas.contas) ? global.RVContas.contas() : []; }
    function temContas() { return contas().length > 0; }
    function caixaReal(obraId) {
        if (global.RVContas && global.RVContas.saldoTotalReal) {
            try { return num(global.RVContas.saldoTotalReal(obraId || null)); } catch (e) { /* noop */ }
        }
        return 0;
    }
    function cartoesDisp(obraId) {
        if (global.RVContas && global.RVContas.saldoDisponivelGeral) {
            try { return num(global.RVContas.saldoDisponivelGeral(obraId || null)) - caixaReal(obraId); } catch (e) { /* noop */ }
        }
        return 0;
    }

    // ---------- Metricas ----------
    function logs() { return STATE.logs || []; }

    function calcPeriodo(range, obraId) {
        let rec = 0, desp = 0;
        logs().forEach(l => {
            if (l.tipo === 'oc_pendente' || l.status_financeiro !== 'PAGO') return;
            if (ehVale(l)) return;
            if (obraId && String(l.obra_id) !== String(obraId)) return;
            if (!dentroRange(dataRef(l), range)) return;
            if (isReceita(l)) rec += num(l.valor_total);
            else if (isDespesa(l)) desp += num(l.valor_total);
        });
        return { rec, desp, resultado: rec - desp };
    }

    function posicao(obraId) {
        let recebido = 0, custo = 0, aReceber = 0, aPagar = 0, ocAberto = 0;
        const hojeS = hoje();
        const agingRec = { vencidas: 0, d7: 0, d30: 0, futuras: 0 };
        const agingPag = { vencidas: 0, d7: 0, d30: 0, futuras: 0 };
        logs().forEach(l => {
            if (l.status_financeiro === 'CANCELADO') return;
            if (obraId && String(l.obra_id) !== String(obraId)) return;
            const v = num(l.valor_total);
            if (l.tipo === 'oc_pendente') { ocAberto += v; return; }
            if (ehVale(l)) { return; }
            if (isReceita(l)) {
                if (l.status_financeiro === 'PAGO') recebido += v;
                else { aReceber += v; classificar(agingRec, vencRef(l), hojeS, v); }
            } else if (isDespesa(l)) {
                if (l.status_financeiro === 'PAGO') custo += v;
                else { aPagar += v; classificar(agingPag, vencRef(l), hojeS, v); }
            }
        });
        return { recebido, custo, aReceber, aPagar, ocAberto, agingRec, agingPag };
    }
    function classificar(aging, venc, hojeS, v) {
        const d = new Date(String(venc || '').slice(0, 10));
        if (isNaN(d)) { aging.futuras += v; return; }
        const dias = Math.floor((d - new Date(hojeS + 'T00:00:00')) / 86400000);
        if (dias < 0) aging.vencidas += v;
        else if (dias <= 7) aging.d7 += v;
        else if (dias <= 30) aging.d30 += v;
        else aging.futuras += v;
    }

    // Ajustes de caixa (jsp_movimentacoes com origem 'ajuste'): neutralizam
    // lancamentos historicos incompletos. Entram no RESULTADO, mas nunca no
    // Faturamento (medições), para nao distorcer o percentual de contrato.
    function ajustes(range, obraId) {
        const list = (global.RVContas && global.RVContas.movs) ? global.RVContas.movs() : (STATE.movimentacoes || []);
        let t = 0;
        list.forEach(m => {
            if (String(m.origem) !== 'ajuste') return;
            const tipo = String(m.tipo || '');
            if (tipo.indexOf('AJUSTE') !== 0) return;
            if (m.estornada === true) return;
            if (obraId && String(m.obra_id) !== String(obraId)) return;
            if (range && !dentroRange(m.data, range)) return;
            t += (tipo === 'AJUSTE_SAIDA') ? -num(m.valor) : num(m.valor);
        });
        return t;
    }
    const ALL_RANGE = { ini: '', fim: '' };

    function semData() {
        let n = 0, total = 0;
        logs().forEach(l => {
            if (l.status_financeiro !== 'PAGO' || ehVale(l)) return;
            if (!isReceita(l) && !isDespesa(l)) return;
            if (l.data || l.vencimento) return;
            n++; total += num(l.valor_total);
        });
        return { n, total };
    }

    function metricas() {
        const f = lerFiltro();
        const obraId = f.obra;
        const range = periodoRange(f);
        const prev = prevRange(range);
        const atual = calcPeriodo(range, obraId);
        const anterior = prev ? calcPeriodo(prev, obraId) : null;
        const ajustesPeriodo = ajustes(range, obraId);
        const ajustesAnterior = prev ? ajustes(prev, obraId) : 0;
        const resultadoGer = atual.rec - atual.desp + ajustesPeriodo;
        const resultadoAnt = anterior ? (anterior.rec - anterior.desp + ajustesAnterior) : null;
        const pos = posicao(obraId);
        const estimado = pos.recebido - pos.custo + ajustes(ALL_RANGE, obraId);
        const temC = temContas();
        const caixa = temC ? caixaReal(obraId) : estimado;
        const caixaFonte = temC ? 'contas' : 'estimado (lançamentos pagos)';
        const cartoes = temC ? cartoesDisp(obraId) : 0;
        const sd = semData();

        const porObra = (STATE.obras || []).map(o => {
            const p = posicao(o.id);
            const contrato = num(o.valor_contrato);
            const margemOper = p.recebido - p.custo;
            const aj = ajustes(ALL_RANGE, o.id);
            const margem = Math.round((margemOper + aj) * 100) / 100;
            const pctRec = contrato > 0 ? (p.recebido / contrato) * 100 : 0;
            const pctCus = contrato > 0 ? (p.custo / contrato) * 100 : 0;
            let nivel = 'ok';
            if (margem < -0.005) nivel = 'critico';
            else if (contrato > 0 && p.custo > contrato * 0.8) nivel = 'atencao';
            return { obra: o, contrato, recebido: p.recebido, custo: p.custo, aReceber: p.aReceber, aPagar: p.aPagar, ocAberto: p.ocAberto, margem, margemOper, ajuste: aj, pctRec, pctCus, nivel };
        });

        return { f, obraId, range, prev, atual, anterior, ajustesPeriodo, resultadoGer, resultadoAnt, pos, caixa, caixaFonte, cartoes, estimado, semData: sd, porObra };
    }

    // ---------- Render: filtros ----------
    function renderFiltros(m) {
        const psel = el('dash-periodo'); if (psel) psel.value = m.f.periodo;
        const ini = el('dash-ini'); if (ini) ini.value = m.f.ini || '';
        const fim = el('dash-fim'); if (fim) fim.value = m.f.fim || '';
        const custom = m.f.periodo === 'custom';
        if (ini) ini.style.display = custom ? 'block' : 'none';
        if (fim) fim.style.display = custom ? 'block' : 'none';
        const os = el('dash-obra');
        if (os) {
            os.innerHTML = '<option value="">Todas as obras</option>' + (STATE.obras || []).map(o =>
                '<option value="' + esc(o.id) + '"' + (String(m.obraId) === String(o.id) ? ' selected' : '') + '>' + esc(o.nome) + '</option>').join('');
        }
        const info = el('dash-fonte-info');
        if (info) {
            let txt = 'Caixa: <b>' + esc(m.caixaFonte) + '</b> | Período: ' + (m.range.ini ? dateBR(m.range.ini) + ' a ' + dateBR(m.range.fim) : 'tudo');
            if (m.semData && m.semData.n > 0) txt += ' | <span class="text-amber-600 font-bold">' + m.semData.n + ' lançamento(s) pagos sem data (' + money(m.semData.total) + ')</span>';
            info.innerHTML = txt;
        }
    }

    // ---------- Render: KPIs ----------
    function delta(atual, anterior) {
        if (anterior == null) return '';
        const d = atual - anterior;
        if (Math.abs(d) < 0.005) return '<span class="text-[10px] font-bold text-slate-400">= período anterior</span>';
        const up = d > 0;
        return '<span class="text-[10px] font-bold ' + (up ? 'text-green-600' : 'text-red-600') + '">' + (up ? '▲' : '▼') + ' ' + money(Math.abs(d)) + ' vs ant.</span>';
    }
    function kpiCard(label, valor, sub, cor) {
        const cores = {
            verde: 'border-green-200 bg-green-50', vermelho: 'border-red-200 bg-red-50',
            azul: 'border-blue-200 bg-blue-50', indigo: 'border-indigo-200 bg-indigo-50',
            amber: 'border-amber-200 bg-amber-50', slate: 'border-slate-200 bg-slate-50',
            rose: 'border-rose-200 bg-rose-50'
        };
        return '<div class="p-4 rounded-xl border ' + (cores[cor] || cores.slate) + '">' +
            '<div class="text-[10px] font-black uppercase tracking-wide text-slate-500">' + esc(label) + '</div>' +
            '<div class="text-xl font-black text-slate-800 mt-1">' + valor + '</div>' +
            '<div class="mt-1">' + (sub || '') + '</div></div>';
    }
    function renderKpis(m) {
        const box = el('dash-kpis'); if (!box) return;
        const margem = m.atual.rec > 0 ? (m.resultadoGer / m.atual.rec) * 100 : 0;
        const subCaixa = m.caixaFonte === 'contas'
            ? '<span class="text-[10px] font-bold text-slate-400">cartões ' + money(m.cartoes) + ' · estimado ' + money(m.estimado) + '</span>'
            : '<span class="text-[10px] font-bold text-slate-400">fonte: estimado por lançamentos pagos</span>';
        const aj = m.ajustesPeriodo || 0;
        const subRes = '<span class="text-[10px] font-bold ' + (margem >= 0 ? 'text-green-600' : 'text-red-600') + '">margem ' + margem.toFixed(1) + '%</span>'
            + (Math.abs(aj) >= 0.005 ? ' · <span class="text-[10px] font-bold text-amber-600">ajustes ' + (aj > 0 ? '+' : '') + money(aj) + '</span>' : '');
        const cards = [
            kpiCard('Caixa disponível', money(m.caixa), subCaixa, m.caixa >= 0 ? 'azul' : 'rose'),
            kpiCard('Faturamento (medições)', money(m.atual.rec), delta(m.atual.rec, m.anterior && m.anterior.rec), 'verde'),
            kpiCard('Custos pagos', money(m.atual.desp), delta(m.atual.desp, m.anterior && m.anterior.desp), 'vermelho'),
            kpiCard('Resultado do período', money(m.resultadoGer), subRes, 'indigo'),
            kpiCard('A receber', money(m.pos.aReceber), '<span class="text-[10px] font-bold text-orange-600">vencidas ' + money(m.pos.agingRec.vencidas) + '</span>', 'amber'),
            kpiCard('A pagar', money(m.pos.aPagar), '<span class="text-[10px] font-bold text-red-600">vencidas ' + money(m.pos.agingPag.vencidas) + '</span>', 'rose')
        ];
        box.innerHTML = cards.join('');
    }

    // ---------- Render: alertas ----------
    function renderAlertas(m) {
        const box = el('dash-alertas'); if (!box) return;
        const alertas = [];
        m.porObra.forEach(o => {
            if (o.margem < -0.005) alertas.push({ icone: 'trending-down', cor: 'red', txt: 'Obra no negativo <b>' + esc(o.obra.nome) + '</b>: ' + money(o.margem), acao: "dashVerFinanceiro('" + esc(o.obra.id) + "')" });
            if (o.contrato > 0 && o.custo > o.contrato * 0.8) alertas.push({ icone: 'alert-triangle', cor: 'amber', txt: 'Custo em ' + pct(o.custo, o.contrato) + ' do contrato em <b>' + esc(o.obra.nome) + '</b>', acao: "dashVerFinanceiro('" + esc(o.obra.id) + "')" });
        });
        if (m.pos.agingPag.vencidas > 0) alertas.push({ icone: 'calendar-x', cor: 'red', txt: 'Despesas vencidas: <b>' + money(m.pos.agingPag.vencidas) + '</b>', acao: "navigate('fin')" });
        if (m.pos.ocAberto > 0) alertas.push({ icone: 'clipboard-list', cor: 'slate', txt: 'O.C. em aberto (não lançadas): <b>' + money(m.pos.ocAberto) + '</b>', acao: "navigate('oc')" });
        const vales = (STATE.vales || []).filter(v => String(v.status || '').toUpperCase() === 'ABERTO');
        if (vales.length) {
            const tv = vales.reduce((s, v) => s + num(v.valor_aberto != null ? v.valor_aberto : v.valor), 0);
            alertas.push({ icone: 'hand-coins', cor: 'amber', txt: 'Vales em aberto: <b>' + money(tv) + '</b> (' + vales.length + ')', acao: "navigate('equipe')" });
        }
        if (!alertas.length) { box.innerHTML = '<div class="mb-6 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center gap-2"><i data-lucide="check-circle" class="w-4 h-4"></i> Nenhum alerta no momento.</div>'; return; }
        const cores = { red: 'border-red-200 bg-red-50 text-red-700', amber: 'border-amber-200 bg-amber-50 text-amber-700', slate: 'border-slate-200 bg-slate-50 text-slate-700' };
        box.innerHTML = '<div class="mb-2 text-xs font-black text-slate-500 uppercase">Precisa de atenção</div>' +
            '<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">' +
            alertas.map(a => '<button onclick="' + a.acao + '" class="text-left p-3 rounded-xl border ' + cores[a.cor] + ' flex items-start gap-2 hover:brightness-95">' +
                '<i data-lucide="' + a.icone + '" class="w-4 h-4 mt-0.5 shrink-0"></i><span class="text-xs font-bold">' + a.txt + '</span></button>').join('') +
            '</div>';
    }

    // ---------- Render: cards por obra ----------
    function renderObras(m) {
        const box = el('dash-obras'); if (!box) return;
        if (!m.porObra.length) { box.innerHTML = '<div class="text-slate-400 text-sm p-6">Nenhuma obra cadastrada.</div>'; return; }
        const sem = {
            ok: { cls: 'bg-green-100 text-green-700 border-green-200', txt: 'Saudável' },
            atencao: { cls: 'bg-amber-100 text-amber-700 border-amber-200', txt: 'Atenção' },
            critico: { cls: 'bg-red-100 text-red-700 border-red-200', txt: 'Crítico' }
        };
        box.innerHTML = m.porObra.map(o => {
            const s = sem[o.nivel];
            return '<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-400 transition flex flex-col">' +
                '<div class="flex justify-between items-start gap-2">' +
                '<div class="min-w-0"><h4 class="font-black text-lg text-slate-800 truncate">' + esc(o.obra.nome) + '</h4>' +
                '<p class="text-[10px] text-slate-500 uppercase font-bold truncate">' + esc(o.obra.endereco || 'Endereço n. inf.') + '</p></div>' +
                '<span class="text-[10px] font-black px-2 py-1 rounded border ' + s.cls + '">' + s.txt + '</span></div>' +
                '<div class="mt-3 space-y-2">' +
                barra('Recebido', o.pctRec) + barra('Custo', o.pctCus) + '</div>' +
                '<div class="grid grid-cols-2 gap-2 mt-3 text-xs">' +
                mini('Contrato', money(o.contrato), 'slate') + mini('Recebido', money(o.recebido), 'green') +
                mini('Custo', money(o.custo), 'red') + mini('A receber', money(o.aReceber), 'amber') +
                mini('A pagar', money(o.aPagar), 'rose') + mini('O.C. aberto', money(o.ocAberto), 'slate') +
                '</div>' +
                '<div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">' +
                '<span class="text-[10px] font-bold text-slate-500 uppercase">Resultado (recebido - pago + ajustes)</span>' +
                '<span class="font-black text-lg ' + (o.margem >= -0.005 ? 'text-blue-700' : 'text-red-600') + '">' + money(o.margem) + '</span></div>' +
                (Math.abs(o.ajuste) >= 0.005 ? '<div class="text-[10px] text-slate-400 text-right">inclui ajustes de caixa: ' + (o.ajuste > 0 ? '+' : '') + money(o.ajuste) + '</div>' : '') +
                '<div class="mt-3 flex gap-2">' +
                '<button onclick="openObraForm(\'' + esc(o.obra.id) + '\')" class="flex-1 text-[10px] font-bold px-2 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Editar</button>' +
                '<button onclick="dashVerFinanceiro(\'' + esc(o.obra.id) + '\')" class="flex-1 text-[10px] font-bold px-2 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white">Financeiro</button>' +
                '<button onclick="dashVerRelatorio(\'' + esc(o.obra.id) + '\')" class="flex-1 text-[10px] font-bold px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-900 text-white">Relatório</button>' +
                '</div></div>';
        }).join('');
    }
    function barra(label, p) {
        const w = Math.max(0, Math.min(p, 100));
        const cor = p > 100 ? 'bg-red-500' : (p > 80 ? 'bg-amber-500' : 'bg-blue-600');
        return '<div><div class="flex justify-between text-[10px] font-bold text-slate-500"><span>' + label + '</span><span>' + p.toFixed(1) + '%</span></div>' +
            '<div class="w-full bg-slate-100 rounded-full h-2 mt-0.5 overflow-hidden"><div class="' + cor + ' h-2 rounded-full" style="width:' + w + '%"></div></div></div>';
    }
    function mini(label, valor, cor) {
        const map = { slate: 'text-slate-700', green: 'text-green-700', amber: 'text-amber-700', rose: 'text-rose-700', red: 'text-red-700' };
        return '<div class="bg-slate-50 rounded-lg p-2 border border-slate-100"><div class="text-[9px] font-black uppercase text-slate-400">' + esc(label) + '</div>' +
            '<div class="font-black ' + (map[cor] || map.slate) + '">' + valor + '</div></div>';
    }

    // ---------- Render: analitico ----------
    const charts = {};
    function renderAnalitico(m) {
        const box = el('dash-analitico'); if (!box) return;
        box.innerHTML =
            '<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">' +
            '<div class="text-xs font-black text-slate-500 uppercase mb-2">Fluxo mensal (últimos 6 meses)</div>' +
            '<div style="height:220px"><canvas id="dash-chart-fluxo"></canvas></div></div>' +
            '<div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">' +
            '<div class="text-xs font-black text-slate-500 uppercase mb-2">Top categorias de custo</div>' +
            '<div style="height:220px"><canvas id="dash-chart-cat"></canvas></div></div>';
        if (typeof Chart === 'undefined') return;

        const meses = {};
        logs().forEach(l => {
            if (l.tipo === 'oc_pendente' || l.status_financeiro !== 'PAGO' || ehVale(l)) return;
            if (m.obraId && String(l.obra_id) !== String(m.obraId)) return;
            const d = new Date(dataRef(l)); if (isNaN(d)) return;
            const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (!meses[k]) meses[k] = { ent: 0, sai: 0 };
            if (isReceita(l)) meses[k].ent += num(l.valor_total); else if (isDespesa(l)) meses[k].sai += num(l.valor_total);
        });
        const keys = Object.keys(meses).sort().slice(-6);
        const labMes = keys.map(k => k.slice(5) + '/' + k.slice(2, 4));

        const desp = logs().filter(l => isDespesa(l) && l.status_financeiro === 'PAGO' && !ehVale(l) &&
            (!m.obraId || String(l.obra_id) === String(m.obraId)) && dentroRange(dataRef(l), m.range));
        const catArr = (global.repAgruparCategoria ? global.repAgruparCategoria(desp) : []).slice(0, 6);

        try {
            if (charts.fluxo) charts.fluxo.destroy();
            charts.fluxo = new Chart(el('dash-chart-fluxo'), {
                type: 'bar',
                data: {
                    labels: labMes,
                    datasets: [
                        { label: 'Entradas', data: keys.map(k => meses[k].ent), backgroundColor: '#16a34a' },
                        { label: 'Saídas', data: keys.map(k => meses[k].sai), backgroundColor: '#dc2626' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } }, scales: { y: { ticks: { font: { size: 10 } } }, x: { ticks: { font: { size: 10 } } } } }
            });
        } catch (e) { /* noop */ }
        try {
            if (charts.cat) charts.cat.destroy();
            charts.cat = new Chart(el('dash-chart-cat'), {
                type: 'doughnut',
                data: { labels: catArr.map(x => x.c), datasets: [{ data: catArr.map(x => x.v), backgroundColor: ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea', '#0ea5e9'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 9 } } } } }
            });
        } catch (e) { /* noop */ }
    }

    // ---------- Render principal ----------
    let ultima = null;
    function render() {
        if (!el('dash-kpis')) return;
        const m = metricas();
        ultima = m;
        renderFiltros(m);
        renderKpis(m);
        renderAlertas(m);
        renderObras(m);
        renderAnalitico(m);
        if (global.lucide) lucide.createIcons();
    }

    // ---------- API publica ----------
    global.renderDashboard = function () { render(); };
    global.dashRefresh = function () { render(); };
    global.dashSetObra = function () { const f = lerFiltro(); f.obra = val('dash-obra'); salvarFiltro(f); render(); };
    global.dashSetPeriodo = function () {
        const f = lerFiltro(); f.periodo = val('dash-periodo');
        if (f.periodo === 'custom') { f.ini = val('dash-ini'); f.fim = val('dash-fim'); }
        salvarFiltro(f); render();
    };
    global.dashSetDatas = function () { const f = lerFiltro(); f.ini = val('dash-ini'); f.fim = val('dash-fim'); f.periodo = 'custom'; salvarFiltro(f); render(); };
    global.dashVerFinanceiro = function (obraId) {
        const sel = el('fin-obra-filter'); if (sel) sel.value = String(obraId);
        global.navigate && global.navigate('fin');
    };
    global.dashVerRelatorio = function (obraId) {
        global.navigate && global.navigate('reports');
        const sel = el('rep-obra'); if (sel) { sel.value = String(obraId); if (global.repRefresh) global.repRefresh(); }
    };
    global.dashMetricas = metricas;
})(typeof window !== 'undefined' ? window : globalThis);
