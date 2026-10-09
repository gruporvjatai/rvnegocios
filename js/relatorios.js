// =====================================================================
// RELATORIOS (desktop - sistema.html)
// Refatoracao da aba Relatorios em sub-abas por pergunta de negocio, com
// filtros globais (obra, fase, periodo, regime) compartilhados.
//
// Cada relatorio retorna { kpis, html, csv } de forma padronizada, o que
// permite render, impressao e exportacao CSV unificadas.
// =====================================================================
(function (global) {
    'use strict';

    // ---------- Helpers ----------
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function num(v) { return parseFloat(v) || 0; }
    function r2(v) { return Math.round((num(v)) * 100) / 100; }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function money(v) { return global.formatMoney ? global.formatMoney(v) : ('R$ ' + num(v).toFixed(2)); }
    function dateBR(d) { return global.formatDate ? global.formatDate(d) : (d || '-'); }
    function pct(part, total) { return total > 0 ? ((part / total) * 100).toFixed(1) + '%' : '0%'; }

    function nomeObra(id) { const o = (STATE.obras || []).find(x => String(x.id) === String(id)); return o ? o.nome : 'Sem obra'; }
    function nomeForn(id) { const f = (STATE.fornecedores || []).find(x => String(x.id) === String(id)); return f ? f.nome : '-'; }
    function nomeEquipe(id) { const e = (STATE.equipe || []).find(x => String(x.id) === String(id)); return e ? e.nome : ''; }
    function nomeTerc(id) { const t = (STATE.terceirizados || []).find(x => String(x.id) === String(id)); return t ? t.nome : ''; }
    function ehVale(l) { return global.valeEhLog && global.valeEhLog(l); }
    function fold(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    function normCat(s) {
        const v = fold(s || 'Outros / Sem Categoria');
        return global.rvUp ? global.rvUp(v) : v.toUpperCase();
    }
    function agruparCategoria(logs) {
        const map = {};
        logs.forEach(l => {
            const raw = l.categoria || 'Outros / Sem Categoria';
            const k = normCat(raw);
            if (!map[k]) map[k] = { c: raw, v: 0 };
            map[k].v += num(l.valor_total);
        });
        return Object.keys(map).map(k => map[k]).sort((a, b) => b.v - a.v);
    }

    function filtros() {
        return {
            obraId: val('rep-obra'),
            fase: val('rep-fase'),
            ini: val('rep-ini'),
            fim: val('rep-fim'),
            regime: val('rep-regime') || 'caixa'
        };
    }

    function dataRef(l, regime) {
        if (regime === 'competencia') return l.data || l.vencimento || l.created_at;
        return l.vencimento || l.data || l.created_at;
    }
    function dentroPeriodo(l, f) {
        const d = new Date(dataRef(l, f.regime));
        if (isNaN(d)) return true;
        if (f.ini && d < new Date(f.ini + 'T00:00:00')) return false;
        if (f.fim && d > new Date(f.fim + 'T23:59:59')) return false;
        return true;
    }
    function passaObraFase(l, f) {
        if (f.obraId && String(l.obra_id) !== String(f.obraId)) return false;
        if (f.fase && (l.fase_obra || '') !== f.fase) return false;
        return true;
    }

    function logsBase() {
        const f = filtros();
        return (STATE.logs || []).filter(l => {
            if (l.tipo === 'oc_pendente') return false;
            if (f.regime === 'caixa') { if (l.status_financeiro !== 'PAGO') return false; }
            else if (l.status_financeiro === 'CANCELADO') return false;
            if (ehVale(l)) return false;
            if (!passaObraFase(l, f)) return false;
            if (!dentroPeriodo(l, f)) return false;
            return true;
        });
    }

    // Ajustes de caixa (jsp_movimentacoes origem 'ajuste'): entram no saldo,
    // mas nunca nas Receitas/Medições. Por obra e por período.
    function ajustesCaixa(f) {
        const porObra = {};
        let total = 0;
        (STATE.movimentacoes || []).forEach(m => {
            if (String(m.origem) !== 'ajuste') return;
            const tipo = String(m.tipo || '');
            if (tipo.indexOf('AJUSTE') !== 0) return;
            if (m.estornada === true) return;
            if (f.obraId && String(m.obra_id) !== String(f.obraId)) return;
            const d = new Date(String(m.data || '').slice(0, 10));
            if (!isNaN(d)) {
                if (f.ini && d < new Date(f.ini + 'T00:00:00')) return;
                if (f.fim && d > new Date(f.fim + 'T23:59:59')) return;
            }
            const v = (tipo === 'AJUSTE_SAIDA' ? -1 : 1) * num(m.valor);
            const k = String(m.obra_id || 0);
            porObra[k] = (porObra[k] || 0) + v;
            total += v;
        });
        return { porObra, total };
    }

    function descLog(l) {
        if (l.tipo === 'receita') return 'Medição: ' + (l.produto_nome || '-');
        if (l.tipo === 'compra') return 'O.C. #' + l.id + ' - ' + (l.produto_nome || '-');
        return l.produto_nome || 'Despesa';
    }

    // ---------- Componentes visuais ----------
    const CORES = {
        verde: 'border-green-200 bg-green-50 text-green-700',
        vermelho: 'border-red-200 bg-red-50 text-red-700',
        azul: 'border-blue-200 bg-blue-50 text-blue-700',
        indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        slate: 'border-slate-200 bg-slate-50 text-slate-700'
    };
    function kpi(label, valor, cor) {
        return '<div class="p-4 rounded-xl border ' + (CORES[cor] || CORES.slate) + '">' +
            '<div class="text-[10px] font-bold uppercase opacity-80">' + esc(label) + '</div>' +
            '<div class="text-xl font-black">' + valor + '</div></div>';
    }
    function kpiGrid(arr) {
        if (!arr || !arr.length) return '';
        return '<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">' + arr.map(k => kpi(k.label, k.valor, k.cor)).join('') + '</div>';
    }
    function align(i, a) { const v = (a && a[i]) || 'left'; return v === 'right' ? 'text-right' : (v === 'center' ? 'text-center' : ''); }
    function tabela(headers, rows, aligns, footers) {
        const th = headers.map((h, i) => '<th class="p-2 font-semibold ' + align(i, aligns) + '">' + esc(h) + '</th>').join('');
        const tr = rows.map(r => '<tr class="border-b hover:bg-slate-50">' + r.map((c, i) => '<td class="p-2 ' + align(i, aligns) + '">' + c + '</td>').join('') + '</tr>').join('');
        const tf = footers ? '<tfoot><tr class="bg-slate-100 font-black">' + footers.map((c, i) => '<td class="p-2 ' + align(i, aligns) + '">' + c + '</td>').join('') + '</tr></tfoot>' : '';
        const vazio = '<tr><td colspan="' + headers.length + '" class="p-6 text-center text-slate-400">Nenhum registro.</td></tr>';
        return '<div class="overflow-x-auto border rounded-lg"><table class="w-full text-xs text-left">' +
            '<thead class="bg-slate-100 text-slate-700">' + '<tr>' + th + '</tr></thead>' +
            '<tbody>' + (tr || vazio) + '</tbody>' + tf + '</table></div>';
    }
    function titulo(t) { return '<h4 class="text-sm font-bold text-slate-600 uppercase mb-2">' + esc(t) + '</h4>'; }

    // ---------- Relatorios ----------
    function repGeral() {
        const f = filtros();
        const logs = logsBase();
        const receitas = logs.filter(l => l.tipo === 'receita');
        const despesas = logs.filter(l => l.tipo === 'compra' || l.tipo === 'despesa');
        const totalRec = receitas.reduce((s, l) => s + num(l.valor_total), 0);
        const totalDesp = despesas.reduce((s, l) => s + num(l.valor_total), 0);
        const aj = ajustesCaixa(f);

        const kpis = [];
        if (f.obraId) {
            const o = (STATE.obras || []).find(x => String(x.id) === String(f.obraId));
            kpis.push({ label: 'Valor do Contrato', valor: money(o ? o.valor_contrato : 0), cor: 'indigo' });
        }
        kpis.push({ label: 'Receitas (Medições)', valor: money(totalRec), cor: 'verde' });
        kpis.push({ label: 'Despesas', valor: money(totalDesp), cor: 'vermelho' });
        if (Math.abs(aj.total) >= 0.005) kpis.push({ label: 'Ajustes de Caixa', valor: money(aj.total), cor: 'amber' });
        kpis.push({ label: 'Saldo', valor: money(r2(totalRec - totalDesp + aj.total)), cor: 'azul' });

        let html = '';
        const csvRows = [];

        if (!f.obraId) {
            const map = {};
            logs.forEach(l => {
                const k = String(l.obra_id || 0);
                if (!map[k]) map[k] = { rec: 0, desp: 0 };
                if (l.tipo === 'receita') map[k].rec += num(l.valor_total); else map[k].desp += num(l.valor_total);
            });
            Object.keys(aj.porObra).forEach(k => { if (!map[k]) map[k] = { rec: 0, desp: 0 }; });
            const rows = Object.keys(map).map(k => {
                const m = map[k];
                const a = aj.porObra[k] || 0;
                csvRows.push([k === '0' ? 'Sem obra' : nomeObra(k), m.rec.toFixed(2), m.desp.toFixed(2), a.toFixed(2), r2(m.rec - m.desp + a).toFixed(2)]);
                return [esc(k === '0' ? 'Sem obra' : nomeObra(k)), money(m.rec), money(m.desp), money(a), money(r2(m.rec - m.desp + a))];
            }).sort((a, b) => a[0].localeCompare(b[0]));
            html += titulo('Resumo por Obra') + tabela(['Obra', 'Receitas', 'Despesas', 'Ajustes', 'Saldo'], rows, ['left', 'right', 'right', 'right', 'right']);
        }

        const catArr = agruparCategoria(despesas);
        const maxV = catArr.length ? catArr[0].v : 0;
        if (catArr.length) {
            html += '<div class="mt-6">' + titulo('Custos por Categoria') + '<div class="space-y-2">' +
                catArr.map(x => {
                    const w = maxV > 0 ? (x.v / maxV * 100) : 0;
                    return '<div><div class="flex justify-between text-xs mb-1">' +
                        '<span class="font-bold text-slate-500 uppercase">' + esc(x.c) + '</span>' +
                        '<span class="font-bold text-slate-700">' + money(x.v) + ' <span class="text-slate-400 font-normal">(' + pct(x.v, totalDesp) + ')</span></span>' +
                        '</div><div class="w-full bg-slate-100 rounded h-2.5 overflow-hidden"><div class="bg-blue-500 h-full rounded" style="width:' + w + '%"></div></div></div>';
                }).join('') + '</div></div>';
        }

        return { kpis, html, csv: { headers: ['Obra', 'Receitas', 'Despesas', 'Saldo'], rows: csvRows } };
    }

    function repMovimentoFiltro(tipoLista, tituloTxt, corKpi) {
        const f = filtros();
        const logs = logsBase()
            .filter(l => tipoLista.indexOf(l.tipo) !== -1)
            .sort((a, b) => new Date(dataRef(a, f.regime)) - new Date(dataRef(b, f.regime)));
        const total = logs.reduce((s, l) => s + num(l.valor_total), 0);

        const catArr = agruparCategoria(logs);

        const kpis = [
            { label: 'Total ' + tituloTxt, valor: money(total), cor: corKpi },
            { label: 'Lançamentos', valor: String(logs.length), cor: 'slate' }
        ];

        let html = '';
        if (catArr.length) {
            const rows = catArr.map(x => [esc(x.c), money(x.v), pct(x.v, total)]);
            html += titulo('Por Categoria') + tabela(['Categoria', 'Valor', '%'], rows, ['left', 'right', 'right']) + '<div class="h-6"></div>';
        }

        const rows = logs.map(l => [
            dateBR(dataRef(l, f.regime)),
            esc(descLog(l)),
            esc(l.categoria || '-'),
            esc(nomeForn(l.fornecedor_id)),
            '<span class="font-bold ' + (l.tipo === 'receita' ? 'text-green-700' : 'text-red-600') + '">' + money(l.valor_total) + '</span>'
        ]);
        html += titulo('Lançamentos') + tabela(['Data', 'Descrição', 'Categoria', 'Fornecedor', 'Valor'], rows,
            ['left', 'left', 'left', 'left', 'right'], ['', '', '', 'TOTAL', money(total)]);

        const csv = {
            headers: ['Data', 'Descricao', 'Categoria', 'Fornecedor', 'Valor'],
            rows: logs.map(l => [dateBR(dataRef(l, f.regime)), descLog(l), l.categoria || '', nomeForn(l.fornecedor_id), num(l.valor_total).toFixed(2)])
        };
        return { kpis, html, csv };
    }
    function repDespesas() { return repMovimentoFiltro(['compra', 'despesa'], 'Despesas', 'vermelho'); }
    function repReceitas() { return repMovimentoFiltro(['receita'], 'Receitas', 'verde'); }

    function repTodos() {
        const f = filtros();
        const logs = logsBase().sort((a, b) => new Date(dataRef(a, f.regime)) - new Date(dataRef(b, f.regime)));
        let rec = 0, desp = 0, saldo = 0;
        const rows = logs.map(l => {
            const v = num(l.valor_total);
            const isR = l.tipo === 'receita';
            if (isR) { rec += v; saldo += v; } else { desp += v; saldo -= v; }
            return [
                dateBR(dataRef(l, f.regime)),
                esc(descLog(l)),
                esc(nomeForn(l.fornecedor_id)),
                '<span class="font-bold ' + (isR ? 'text-green-700' : 'text-red-600') + '">' + (isR ? '+' : '-') + ' ' + money(v) + '</span>',
                '<span class="font-bold text-slate-800">' + money(saldo) + '</span>'
            ];
        });
        const kpis = [
            { label: 'Receitas', valor: money(rec), cor: 'verde' },
            { label: 'Despesas', valor: money(desp), cor: 'vermelho' },
            { label: 'Saldo', valor: money(saldo), cor: 'azul' }
        ];
        const html = titulo('Extrato Completo (ordem cronológica)') +
            tabela(['Data', 'Descrição', 'Fornecedor', 'Valor', 'Saldo'], rows, ['left', 'left', 'left', 'right', 'right']);
        const csv = {
            headers: ['Data', 'Descricao', 'Fornecedor', 'Tipo', 'Valor'],
            rows: logs.map(l => [dateBR(dataRef(l, f.regime)), descLog(l), nomeForn(l.fornecedor_id), l.tipo, num(l.valor_total).toFixed(2)])
        };
        return { kpis, html, csv };
    }

    // ---------- Mao de obra ----------
    function parseNomeObs(l) {
        const s = (l.observacao || '') + ' ' + (l.produto_nome || '');
        const m = s.match(/Funcion[aá]rio:\s*([^|\-]+)/i) || s.match(/Colaborador:\s*([^|\-]+)/i) ||

            s.match(/Terceirizado:\s*([^|\-]+)/i) || s.match(/Equipe:\s*([^|\-]+)/i);
        return m ? m[1].trim() : '';
    }
    function nomeDeLog(l) {
        const obs = parseNomeObs(l);
        if (obs) return obs;
        const pn = String(l.produto_nome || '');
        const rest = pn.replace(/^(?:pagamento|fechamento)\s+de\s+(?:ponto|metragem|empreita)\s*-\s*/i, '');
        if (rest !== pn) return rest.split(/\s+-\s+(?:per[íi]odo|ref)\b/i)[0].replace(/\s+-\s*$/, '').trim();
        const mv = pn.match(/vale\s*\/\s*adiantamento\s*-\s*(.+)$/i);
        if (mv && mv[1]) return mv[1].split(/\s+-\s+/)[0].trim();
        return '';
    }
    function isLabor(l) {
        if (l.tipo === 'receita') return false;
        if (/m[aã]o de obra/i.test(String(l.categoria || ''))) return true;
        if (['ponto', 'metragem', 'empreita'].indexOf(l.ref_tipo) !== -1) return true;
        if (/^(pagamento|fechamento) de (ponto|metragem|empreita)/i.test(String(l.produto_nome || ''))) return true;
        return false;
    }
    function laborPessoa(l) {
        const rt = l.ref_tipo;
        if (rt === 'metragem') {
            const id = l.ref_uuid;
            return { tipo: 'Metragem', id: id || '', nome: nomeTerc(id) || nomeDeLog(l) || 'Terceirizado' };
        }
        if (rt === 'empreita') {
            const id = l.equipe_id || l.ref_uuid;
            return { tipo: 'Empreita', id: id || '', nome: nomeEquipe(id) || nomeDeLog(l) || 'Equipe' };
        }
        if (rt === 'ponto') {
            const id = l.equipe_id || l.ref_uuid;
            return { tipo: 'Diária', id: id || '', nome: nomeEquipe(id) || nomeDeLog(l) || 'Colaborador' };
        }
        const pn = String(l.produto_nome || '');
        if (/metragem/i.test(pn)) return { tipo: 'Metragem', id: l.ref_uuid || '', nome: nomeDeLog(l) || 'Terceirizado' };
        if (/empreita/i.test(pn)) return { tipo: 'Empreita', id: l.equipe_id || l.ref_uuid || '', nome: nomeEquipe(l.equipe_id || l.ref_uuid) || nomeDeLog(l) || 'Equipe' };
        return { tipo: 'Diária', id: l.equipe_id || l.ref_uuid || '', nome: nomeEquipe(l.equipe_id || l.ref_uuid) || nomeDeLog(l) || 'Colaborador' };
    }
    function valesPeriodo() {
        const f = filtros();
        const porId = {}, porNome = {};
        (STATE.vales || []).forEach(v => {
            const st = String(v.status || '').toUpperCase();
            if (st === 'CANCELADO' || st === 'ESTORNADO') return;
            const d = new Date(v.data || v.created_at);
            if (f.ini && !isNaN(d) && d < new Date(f.ini + 'T00:00:00')) return;
            if (f.fim && !isNaN(d) && d > new Date(f.fim + 'T23:59:59')) return;
            if (f.obraId && v.obra_id && String(v.obra_id) !== String(f.obraId)) return;
            const valor = num(v.valor);
            const k = String(v.colaborador_id || '');
            if (k) porId[k] = (porId[k] || 0) + valor;
            const n = normCat(v.colaborador_nome);
            if (n && n !== 'OUTROS / SEM CATEGORIA') porNome[n] = (porNome[n] || 0) + valor;
        });
        return { porId: porId, porNome: porNome };
    }
    function valeDePessoa(vales, p) {
        if (p.id && vales.porId[String(p.id)] != null) return vales.porId[String(p.id)];
        const n = normCat(p.nome);
        if (n && vales.porNome[n] != null) return vales.porNome[n];
        return 0;
    }

    function repMaoDeObra() {
        const logs = logsBase().filter(isLabor);
        const vales = valesPeriodo();

        const porTipo = { 'Diária': 0, 'Metragem': 0, 'Empreita': 0 };
        const pessoas = {};
        let total = 0;
        logs.forEach(l => {
            const p = laborPessoa(l);
            const v = num(l.valor_total);
            total += v;
            porTipo[p.tipo] = (porTipo[p.tipo] || 0) + v;
            const key = p.tipo + '|' + (p.id || p.nome);
            if (!pessoas[key]) pessoas[key] = { nome: p.nome, tipo: p.tipo, id: p.id, qtd: 0, bruto: 0 };
            pessoas[key].qtd += 1;
            pessoas[key].bruto += v;
        });

        const kpis = [
            { label: 'Total Mão de Obra', valor: money(total), cor: 'indigo' },
            { label: 'Diária (ponto)', valor: money(porTipo['Diária']), cor: 'azul' },
            { label: 'Metragem', valor: money(porTipo['Metragem']), cor: 'amber' },
            { label: 'Empreita', valor: money(porTipo['Empreita']), cor: 'verde' }
        ];

        let totalVales = 0, totalLiquido = 0;
        const rows = Object.keys(pessoas).map(k => {
            const p = pessoas[k];
            const v = valeDePessoa(vales, p);
            totalVales += v;
            const liq = p.bruto - v;
            totalLiquido += liq;
            return [esc(p.nome), esc(p.tipo), String(p.qtd), money(p.bruto), money(v), money(liq)];
        }).sort((a, b) => a[0].localeCompare(b[0]));

        const totalValesTodos = Object.keys(vales.porId).reduce((s, k) => s + vales.porId[k], 0) ||
            Object.keys(vales.porNome).reduce((s, k) => s + vales.porNome[k], 0);
        kpis.push({ label: 'Vales no Período', valor: money(totalValesTodos), cor: 'vermelho' });

        let html = tabela(['Pessoa', 'Tipo', 'Lanç.', 'Bruto', 'Vales', 'Líquido'], rows,
            ['left', 'left', 'center', 'right', 'right', 'right'],
            ['TOTAL', '', '', money(total), money(totalVales), money(totalLiquido)]);

        // por obra
        const porObra = {};
        logs.forEach(l => { const k = String(l.obra_id || 0); porObra[k] = (porObra[k] || 0) + num(l.valor_total); });
        const obrasRows = Object.keys(porObra).map(k => [esc(k === '0' ? 'Sem obra' : nomeObra(k)), money(porObra[k])]).sort((a, b) => a[0].localeCompare(b[0]));
        html += '<div class="mt-6">' + titulo('Mão de Obra por Obra') + tabela(['Obra', 'Valor'], obrasRows, ['left', 'right']) + '</div>';

        const csv = {
            headers: ['Pessoa', 'Tipo', 'Lancamentos', 'Bruto', 'Vales', 'Liquido'],
            rows: Object.keys(pessoas).map(k => { const p = pessoas[k]; const v = valeDePessoa(vales, p); return [p.nome, p.tipo, p.qtd, p.bruto.toFixed(2), v.toFixed(2), (p.bruto - v).toFixed(2)]; })
        };
        return { kpis, html, csv };
    }

    // ---------- Fluxo de caixa ----------
    function mesLabel(ym) { const p = ym.split('-'); return p[1] + '/' + p[0]; }
    function repFluxoCaixa() {
        const f = filtros();
        const logs = logsBase();
        const map = {};
        logs.forEach(l => {
            const d = new Date(dataRef(l, f.regime)); if (isNaN(d)) return;
            const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (!map[k]) map[k] = { ent: 0, sai: 0 };
            if (l.tipo === 'receita') map[k].ent += num(l.valor_total); else map[k].sai += num(l.valor_total);
        });
        (STATE.movimentacoes || []).forEach(m => {
            if (String(m.origem) !== 'ajuste') return;
            const tipo = String(m.tipo || '');
            if (tipo.indexOf('AJUSTE') !== 0 || m.estornada === true) return;
            if (f.obraId && String(m.obra_id) !== String(f.obraId)) return;
            const d = new Date(String(m.data || '').slice(0, 10)); if (isNaN(d)) return;
            if (f.ini && d < new Date(f.ini + 'T00:00:00')) return;
            if (f.fim && d > new Date(f.fim + 'T23:59:59')) return;
            const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
            if (!map[k]) map[k] = { ent: 0, sai: 0 };
            if (tipo === 'AJUSTE_SAIDA') map[k].sai += num(m.valor); else map[k].ent += num(m.valor);
        });
        const keys = Object.keys(map).sort();
        let ent = 0, sai = 0, saldo = 0;
        const dados = keys.map(k => {
            const m = map[k]; ent += m.ent; sai += m.sai; saldo += m.ent - m.sai;
            return { mes: mesLabel(k), ent: m.ent, sai: m.sai, res: r2(m.ent - m.sai), ac: r2(saldo) };
        });
        const rows = dados.map(d => [d.mes, money(d.ent), money(d.sai), money(d.res), money(d.ac)]);
        const kpis = [
            { label: 'Entradas', valor: money(ent), cor: 'verde' },
            { label: 'Saídas', valor: money(sai), cor: 'vermelho' },
            { label: 'Saldo do Período', valor: money(ent - sai), cor: 'azul' }
        ];
        const html = titulo('Fluxo Mensal') +
            tabela(['Mês', 'Entradas', 'Saídas', 'Resultado', 'Acumulado'], rows, ['left', 'right', 'right', 'right', 'right'],
                ['TOTAL', money(ent), money(sai), money(ent - sai), money(saldo)]);
        const csv = { headers: ['Mes', 'Entradas', 'Saidas', 'Resultado', 'Acumulado'], rows: dados.map(d => [d.mes, d.ent.toFixed(2), d.sai.toFixed(2), d.res.toFixed(2), d.ac.toFixed(2)]) };
        return { kpis, html, csv };
    }

    // ---------- Compras / O.C. ----------
    function repCompras() {
        const f = filtros();
        const compras = logsBase().filter(l => l.tipo === 'compra');
        const total = compras.reduce((s, l) => s + num(l.valor_total), 0);

        const fornMap = {};
        compras.forEach(l => {
            const k = String(l.fornecedor_id || 0);
            if (!fornMap[k]) fornMap[k] = { valor: 0, itens: 0, ocs: {} };
            fornMap[k].valor += num(l.valor_total);
            fornMap[k].itens += 1;
            fornMap[k].ocs[String(l.id)] = 1;
        });
        const fornArr = Object.keys(fornMap).map(k => ({ k, m: fornMap[k] })).sort((a, b) => b.m.valor - a.m.valor);
        const fornRows = fornArr.map(x => {
            const m = x.m;
            return [esc(x.k === '0' ? 'Fornecedor a definir' : nomeForn(x.k)), String(Object.keys(m.ocs).length), String(m.itens), money(m.valor)];
        });

        const prodMap = {};
        compras.forEach(l => {
            const nome = nomeProdutoLog(l) || 'ITEM AVULSO';
            if (!prodMap[nome]) prodMap[nome] = { qtd: 0, valor: 0 };
            prodMap[nome].qtd += num(l.quantidade);
            prodMap[nome].valor += num(l.valor_total);
        });
        const prodArr = Object.keys(prodMap).map(n => ({ n, m: prodMap[n] })).sort((a, b) => b.m.valor - a.m.valor);
        const prodRows = prodArr.map(x => {
            const m = x.m;
            const precoMedio = m.qtd > 0 ? m.valor / m.qtd : 0;
            return [esc(x.n), m.qtd.toFixed(2), money(m.valor), money(precoMedio)];
        });

        const kpis = [
            { label: 'Total em Compras', valor: money(total), cor: 'vermelho' },
            { label: 'Itens', valor: String(compras.length), cor: 'slate' },
            { label: 'Fornecedores', valor: String(Object.keys(fornMap).length), cor: 'slate' }
        ];
        const html = titulo('Por Fornecedor') + tabela(['Fornecedor', 'O.C.', 'Itens', 'Valor'], fornRows, ['left', 'center', 'center', 'right']) +
            '<div class="h-6"></div>' + titulo('Por Produto') + tabela(['Produto', 'Qtd', 'Valor', 'Preço Médio'], prodRows, ['left', 'right', 'right', 'right']);
        const csv = { headers: ['Fornecedor', 'OCs', 'Itens', 'Valor'], rows: Object.keys(fornMap).map(k => { const m = fornMap[k]; return [k === '0' ? 'Fornecedor a definir' : nomeForn(k), Object.keys(m.ocs).length, m.itens, m.valor.toFixed(2)]; }) };
        return { kpis, html, csv };
    }
    function nomeProdutoLog(l) {
        if (l.produto_id) { const p = (STATE.produtos || []).find(x => Number(x.id) === Number(l.produto_id)); if (p) return p.nome; }
        return l.produto_nome || '';
    }

    // ---------- Produtos / Preços ----------
    function repProdutos() {
        const compras = logsBase().filter(l => l.tipo === 'compra');
        const map = {};
        compras.forEach(l => {
            const nome = nomeProdutoLog(l) || 'ITEM AVULSO';
            const v = num(l.valor_total);
            const q = num(l.quantidade);
            if (!map[nome]) map[nome] = { qtd: 0, valor: 0, min: Infinity, max: 0, n: 0 };
            const m = map[nome];
            m.qtd += q; m.valor += v; m.n += 1;
            if (q > 0) { const pu = v / q; m.min = Math.min(m.min, pu); m.max = Math.max(m.max, pu); }
        });
        const rows = Object.keys(map).map(n => {
            const m = map[n];
            const avg = m.qtd > 0 ? m.valor / m.qtd : 0;
            const variacao = (m.min > 0 && isFinite(m.min)) ? ((m.max - m.min) / m.min * 100).toFixed(1) + '%' : '-';
            return [esc(n), m.qtd.toFixed(2), money(m.valor), money(avg), variacao];
        }).sort((a, b) => a[0].localeCompare(b[0]));
        const total = compras.reduce((s, l) => s + num(l.valor_total), 0);
        const kpis = [
            { label: 'Produtos Comprados', valor: String(Object.keys(map).length), cor: 'indigo' },
            { label: 'Total em Compras', valor: money(total), cor: 'vermelho' }
        ];
        const html = titulo('Custo Médio por Produto') +
            tabela(['Produto', 'Qtd', 'Valor Total', 'Preço Médio', 'Variação'], rows, ['left', 'right', 'right', 'right', 'right']);
        const csv = { headers: ['Produto', 'Qtd', 'Valor', 'PrecoMedio', 'Variacao'], rows: Object.keys(map).map(n => { const m = map[n]; const avg = m.qtd > 0 ? m.valor / m.qtd : 0; return [n, m.qtd.toFixed(2), m.valor.toFixed(2), avg.toFixed(2), isFinite(m.min) && m.min > 0 ? ((m.max - m.min) / m.min * 100).toFixed(1) : '']; }) };
        return { kpis, html, csv };
    }

    // ---------- Registro de abas ----------
    const ABAS = [
        { id: 'geral', titulo: 'Visão Geral', icone: 'layout-dashboard', fn: repGeral },
        { id: 'despesas', titulo: 'Despesas', icone: 'trending-down', fn: repDespesas },
        { id: 'receitas', titulo: 'Receitas / Medições', icone: 'trending-up', fn: repReceitas },
        { id: 'compras', titulo: 'Compras / O.C.', icone: 'shopping-cart', fn: repCompras },
        { id: 'mao-de-obra', titulo: 'Mão de Obra', icone: 'hard-hat', fn: repMaoDeObra },
        { id: 'fluxo-caixa', titulo: 'Fluxo de Caixa', icone: 'bar-chart-3', fn: repFluxoCaixa },
        { id: 'produtos', titulo: 'Produtos / Preços', icone: 'package', fn: repProdutos },
        { id: 'todos', titulo: 'Extrato Completo', icone: 'list', fn: repTodos }
    ];
    const porId = {};
    ABAS.forEach(a => { porId[a.id] = a; });

    let abaAtual = 'geral';
    let ultimo = null;

    function abaAtiva() { return porId[abaAtual] || ABAS[0]; }

    function renderSubtabs() {
        const box = el('rep-subtabs'); if (!box) return;
        box.innerHTML = ABAS.map(a =>
            '<button onclick="repSelecionar(\'' + a.id + '\')" class="px-3 py-2 rounded-lg text-sm font-bold border flex items-center gap-1.5 ' +
            (a.id === abaAtual ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50') +
            '"><i data-lucide="' + a.icone + '" class="w-4 h-4"></i>' + esc(a.titulo) + '</button>'
        ).join('');
    }

    function descricaoFiltros(f) {
        const partes = [];
        partes.push(f.obraId ? nomeObra(f.obraId) : 'Todas as obras');
        if (f.fase) partes.push('Fase: ' + f.fase);
        if (f.ini || f.fim) partes.push('Período: ' + (f.ini ? dateBR(f.ini + 'T00:00:00') : 'início') + ' a ' + (f.fim ? dateBR(f.fim + 'T00:00:00') : 'hoje'));
        partes.push(f.regime === 'caixa' ? 'Caixa (pagos)' : 'Competência (lançados)');
        return partes.join('  |  ');
    }

    function render() {
        const cont = el('report-container'); if (!cont) return;
        renderSubtabs();
        const f = filtros();
        let rep;
        try { rep = abaAtiva().fn(); }
        catch (e) { cont.innerHTML = '<div class="text-red-600 font-bold p-6">Erro ao gerar relatório: ' + esc(e.message) + '</div>'; return; }
        const header = '<div class="mb-4"><h3 class="text-lg font-bold text-slate-800">' + esc(abaAtiva().titulo) + '</h3>' +
            '<div class="text-xs text-slate-500">' + esc(descricaoFiltros(f)) + '</div></div>';
        cont.innerHTML = header + kpiGrid(rep.kpis) + (rep.html || '');
        ultimo = { rel: abaAtiva().titulo, csv: rep.csv || null, html: cont.innerHTML };
        if (global.lucide) lucide.createIcons();
    }

    // ---------- API publica ----------
    global.renderRelatorios = function () {
        if (global.updateSelects) { try { global.updateSelects(); } catch (e) { /* noop */ } }
        render();
    };
    global.repSelecionar = function (id) { if (porId[id]) { abaAtual = id; render(); } };
    global.repRefresh = function () { render(); };

    global.imprimirRelatorio = function () {
        const cont = el('report-container');
        if (!cont || !ultimo) return global.showToast('Selecione um relatório primeiro.', true);
        const area = el('print-area'); if (!area) return;
        const tituloTopo = '<div style="text-align:center; border-bottom:2px solid #1d4ed8; padding-bottom:8px; margin-bottom:16px;">' +
            '<div style="font-size:20px; font-weight:bold; color:#1e293b;">RV Negócios - ' + esc(ultimo.rel) + '</div>' +
            '<div style="font-size:12px; color:#64748b;">' + esc(descricaoFiltros(filtros())) + '</div></div>';
        area.innerHTML = tituloTopo + cont.innerHTML;
        document.body.classList.add('rv-printing');
        setTimeout(function () { window.print(); }, 200);
    };
    if (global.addEventListener) {
        global.addEventListener('afterprint', function () { document.body.classList.remove('rv-printing'); });
    }

    global.exportarRelatorioCSV = function () {
        if (!ultimo || !ultimo.csv || !ultimo.csv.rows.length) return global.showToast('Nenhum dado para exportar.', true);
        const linhas = [ultimo.csv.headers].concat(ultimo.csv.rows);
        const csv = linhas.map(l => l.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relatorio-' + (porId[abaAtual] ? abaAtual : 'geral') + '_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        global.showToast('CSV exportado.');
    };

    // Helpers expostos para testes
    global.repFiltros = filtros;
    global.repLogsBase = logsBase;
    global.repIsLabor = isLabor;
    global.repAgruparCategoria = agruparCategoria;
    global.repNomeDeLog = nomeDeLog;
})(typeof window !== 'undefined' ? window : globalThis);
