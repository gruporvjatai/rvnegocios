// =====================================================================
// ASSISTENTE DE CONCILIACAO DE ITENS (plano D)
// Desktop (sistema.html). Lista os itens de O.C./compra sem produto_id
// ("avulsos"), agrupa por nome normalizado e permite, por grupo:
//   - vincular a um produto existente do catalogo;
//   - criar um produto novo a partir do nome do item;
//   - ignorar (persistido no navegador).
// Tambem aplica em massa as sugestoes automaticas de alta confianca.
// Nao altera nomes nem valores; apenas preenche jsp_logs.produto_id.
// =====================================================================
(function () {
    'use strict';

    const TIPOS_ALVO = ['compra', 'oc_pendente'];
    const CHAVE_IGNORADOS = 'rv_conc_ignorados';
    const LIMITE_SUGESTAO = 0.6;

    // ---------- Normalizacao / similaridade ----------
    function concNorm(v) {
        return String(v == null ? '' : v)
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function concTokens(v) {
        return concNorm(v).split(' ').filter(t => t.length > 1);
    }

    function concJaccard(a, b) {
        const ta = new Set(concTokens(a));
        const tb = new Set(concTokens(b));
        if (!ta.size || !tb.size) return 0;
        let inter = 0;
        ta.forEach(t => { if (tb.has(t)) inter++; });
        return inter / (ta.size + tb.size - inter);
    }

    // Assinatura das medidas/bitolas presentes no nome. Sugestoes automaticas
    // so valem quando os numeros batem exatamente - evita casar 6,0MM com 4.0MM.
    function concNumeros(v) {
        return concNorm(v).split(' ')
            .filter(t => /[0-9]/.test(t))
            .sort()
            .join('|');
    }

    function concIgnorados() {
        try { return JSON.parse(localStorage.getItem(CHAVE_IGNORADOS) || '{}') || {}; }
        catch (e) { return {}; }
    }

    function concSalvarIgnorados(m) {
        try { localStorage.setItem(CHAVE_IGNORADOS, JSON.stringify(m)); } catch (e) { /* noop */ }
    }

    // ---------- Montagem dos grupos ----------
    function concEhAlvo(l) {
        return l && TIPOS_ALVO.indexOf(l.tipo) !== -1 &&
            !l.produto_id && l.status_financeiro !== 'CANCELADO' &&
            l.produto_nome && String(l.produto_nome).trim();
    }

    function concGrupos() {
        const mapa = {};
        (STATE.logs || []).filter(concEhAlvo).forEach(l => {
            const key = concNorm(l.produto_nome);
            if (!key) return;
            if (!mapa[key]) mapa[key] = { key, nomes: {}, qtd: 0, total: 0, ultima: null, exemplos: {} };
            const g = mapa[key];
            const nomeExato = String(l.produto_nome).trim();
            g.nomes[nomeExato] = (g.nomes[nomeExato] || 0) + 1;
            g.qtd += 1;
            g.total += parseFloat(l.valor_total) || 0;
            const dt = new Date(l.data || l.vencimento || l.created_at || 0).getTime() || 0;
            if (dt > (g.ultima || 0)) g.ultima = dt;
        });
        return Object.values(mapa).map(g => {
            const exatos = Object.keys(g.nomes);
            exatos.sort((a, b) => g.nomes[b] - g.nomes[a]);
            return {
                key: g.key,
                display: exatos[0],
                nomes: exatos,
                qtd: g.qtd,
                total: g.total,
                ultima: g.ultima
            };
        }).sort((a, b) => b.total - a.total);
    }

    function concSugestao(texto) {
        const alvo = concNorm(texto);
        const numsAlvo = concNumeros(texto);
        let melhor = null, score = 0;
        (STATE.produtos || []).forEach(p => {
            const n = concNorm(p.nome);
            if (!n) return;
            const exato = n === alvo;
            if (!exato && concNumeros(p.nome) !== numsAlvo) return;
            const s = exato ? 1 : concJaccard(texto, p.nome);
            if (s > score) { score = s; melhor = p; }
        });
        return score >= LIMITE_SUGESTAO ? { produto: melhor, score } : null;
    }

    function concProdutoPorNome(nome) {
        const alvo = concNorm(nome);
        return (STATE.produtos || []).find(p => concNorm(p.nome) === alvo) || null;
    }

    // ---------- Estado de UI ----------
    let estado = { mostrarIgnorados: false, filtro: '' };

    function concFiltrados(grupos) {
        const ig = concIgnorados();
        const termo = concNorm(estado.filtro);
        return grupos.filter(g => {
            if (!estado.mostrarIgnorados && ig[g.key]) return false;
            if (termo && concNorm(g.display).indexOf(termo) === -1) return false;
            return true;
        });
    }

    // ---------- Render ----------
    function concRender() {
        const tbody = document.getElementById('conc-list');
        if (!tbody) return;
        const todos = concGrupos();
        const ig = concIgnorados();
        const lista = concFiltrados(todos);

        const totalLinhas = todos.reduce((s, g) => s + g.qtd, 0);
        const totalValor = todos.reduce((s, g) => s + g.total, 0);
        const resumo = document.getElementById('conc-resumo');
        if (resumo) {
            resumo.innerHTML = '<b>' + todos.length + '</b> itens avulsos &middot; ' +
                '<b>' + totalLinhas + '</b> linhas &middot; ' +
                '<b>' + formatMoney(totalValor) + '</b> em compras sem vínculo a produto.';
        }

        const btnSug = document.getElementById('conc-btn-sugestoes');
        if (btnSug) {
            const qtdSug = lista.filter(g => !ig[g.key] && concSugestao(g.display)).length;
            btnSug.dataset.qtd = String(qtdSug);
            btnSug.innerHTML = '<i data-lucide="wand-2" class="w-4 h-4"></i> Aplicar sugestões (' + qtdSug + ')';
            btnSug.disabled = qtdSug === 0;
            btnSug.classList.toggle('opacity-50', qtdSug === 0);
        }

        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-10 text-center text-slate-400 font-medium">' +
                'Nenhum item avulso' + (estado.filtro ? ' para este filtro.' : '. Tudo conciliado!') + '</td></tr>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        tbody.innerHTML = lista.map(g => {
            const sug = concSugestao(g.display);
            const ignorado = !!ig[g.key];
            const val = sug ? sug.produto.nome : '';
            const badgeSug = sug
                ? '<div class="text-[10px] text-emerald-700 font-bold mt-0.5">sugestão: ' + sug.produto.nome + ' (' + Math.round(sug.score * 100) + '%)</div>'
                : '<div class="text-[10px] text-slate-400 mt-0.5">sem sugestão automática</div>';
            return '<tr class="border-b hover:bg-slate-50 align-top">' +
                '<td class="p-3">' +
                    '<div class="font-bold text-slate-800 text-xs">' + concEsc(g.display) + '</div>' +
                    (g.nomes.length > 1 ? '<div class="text-[10px] text-slate-400">+' + (g.nomes.length - 1) + ' grafia(s)</div>' : '') +
                    badgeSug +
                '</td>' +
                '<td class="p-3 text-center text-xs font-bold text-slate-600">' + g.qtd + '</td>' +
                '<td class="p-3 text-right text-xs font-bold text-slate-600">' + formatMoney(g.total) + '</td>' +
                '<td class="p-3">' +
                    '<input list="conc-prod-datalist" value="' + concEsc(val) + '" class="conc-input w-full p-1.5 border rounded text-xs font-medium focus:border-blue-600 outline-none" placeholder="Digite/busque o produto..." data-key="' + concEsc(g.key) + '">' +
                '</td>' +
                '<td class="p-3">' +
                    '<div class="flex items-center gap-1 justify-end">' +
                        '<button title="Vincular ao produto digitado" onclick="concVincularGrupo(\'' + concEscJs(g.key) + '\')" class="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded"><i data-lucide="check" class="w-4 h-4"></i></button>' +
                        '<button title="Criar produto com este nome" onclick="concCriarProduto(\'' + concEscJs(g.key) + '\')" class="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded"><i data-lucide="plus" class="w-4 h-4"></i></button>' +
                        '<button title="' + (ignorado ? 'Voltar a exibir' : 'Ignorar (deixar avulso)') + '" onclick="concAlternarIgnorado(\'' + concEscJs(g.key) + '\')" class="p-1.5 ' + (ignorado ? 'bg-amber-500' : 'bg-slate-300') + ' hover:opacity-80 text-white rounded"><i data-lucide="eye-off" class="w-4 h-4"></i></button>' +
                    '</div>' +
                '</td>' +
            '</tr>';
        }).join('');

        concPopularDatalist();
        if (window.lucide) lucide.createIcons();
    }

    function concPopularDatalist() {
        const dl = document.getElementById('conc-prod-datalist');
        if (!dl) return;
        const ordenado = (STATE.produtos || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
        dl.innerHTML = ordenado.map(p => '<option value="' + concEsc(p.nome) + '"></option>').join('');
    }

    function concEsc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function concEscJs(s) {
        return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    // ---------- Acoes ----------
    function concGrupoPorKey(key) {
        return concGrupos().find(g => g.key === key) || null;
    }

    function concAplicarLocal(nomes, produto) {
        const alvo = new Set(nomes.map(concNorm));
        (STATE.logs || []).forEach(l => {
            if (concEhAlvo(l) && alvo.has(concNorm(l.produto_nome))) {
                l.produto_id = produto.id;
            }
        });
    }

    async function concVincular(nomes, produto) {
        const { error } = await sb.from('jsp_logs')
            .update({ produto_id: produto.id })
            .is('produto_id', null)
            .in('tipo', TIPOS_ALVO)
            .in('produto_nome', nomes);
        if (error) throw error;
        concAplicarLocal(nomes, produto);
    }

    window.concVincularGrupo = async function (key) {
        const g = concGrupoPorKey(key);
        if (!g) return;
        const input = document.querySelector('.conc-input[data-key="' + key + '"]');
        const digitado = input ? input.value : '';
        const prod = concProdutoPorNome(digitado);
        if (!prod) { showToast('Produto não encontrado no catálogo. Use "Criar produto".', true); return; }
        showLoading(true);
        try {
            await concVincular(g.nomes, prod);
            showToast('Vinculado a "' + prod.nome + '".');
            concRender();
        } catch (e) {
            showToast('Erro ao vincular: ' + e.message, true);
        } finally { showLoading(false); }
    };

    window.concCriarProduto = async function (key) {
        const g = concGrupoPorKey(key);
        if (!g) return;
        showLoading(true);
        try {
            const { data, error } = await sb.from('jsp_produtos')
                .insert([{ nome: g.display, categoria: 'Geral' }])
                .select('id, nome, categoria, preco')
                .single();
            if (error) throw error;
            STATE.produtos.push(data);
            await concVincular(g.nomes, data);
            showToast('Produto "' + data.nome + '" criado e vinculado.');
            concRender();
        } catch (e) {
            showToast('Erro ao criar produto: ' + e.message, true);
        } finally { showLoading(false); }
    };

    window.concAlternarIgnorado = function (key) {
        const m = concIgnorados();
        if (m[key]) delete m[key]; else m[key] = true;
        concSalvarIgnorados(m);
        concRender();
    };

    window.concAplicarSugestoes = async function () {
        const ig = concIgnorados();
        const alvos = concFiltrados(concGrupos())
            .map(g => ({ g, sug: concSugestao(g.display) }))
            .filter(x => !ig[x.g.key] && x.sug);
        if (!alvos.length) { showToast('Nenhuma sugestão para aplicar.', true); return; }
        if (!(await RVUI.confirm('Vincular automaticamente ' + alvos.length + ' item(ns) à sugestão do catálogo?',
            { confirmText: 'Aplicar sugestões' }))) return;
        showLoading(true);
        let ok = 0, falhas = 0;
        for (const x of alvos) {
            try { await concVincular(x.g.nomes, x.sug.produto); ok++; }
            catch (e) { falhas++; }
        }
        showLoading(false);
        showToast(ok + ' vinculado(s)' + (falhas ? ', ' + falhas + ' falha(s)' : '') + '.', falhas > 0);
        concRender();
    };

    window.concSetFiltro = function (v) { estado.filtro = v || ''; concRender(); };
    window.concToggleIgnorados = function (chk) { estado.mostrarIgnorados = !!chk; concRender(); };

    window.abrirConciliacaoItens = function () {
        estado.filtro = '';
        const f = document.getElementById('conc-filtro');
        if (f) f.value = '';
        const chk = document.getElementById('conc-mostrar-ignorados');
        if (chk) chk.checked = false;
        document.getElementById('modal-conciliacao').classList.remove('hidden');
        concRender();
    };

    window.fecharConciliacaoItens = function () {
        document.getElementById('modal-conciliacao').classList.add('hidden');
    };

    // Expoe helpers para testes
    window.concNorm = concNorm;
    window.concJaccard = concJaccard;
    window.concGrupos = concGrupos;
    window.concSugestao = concSugestao;
})();
