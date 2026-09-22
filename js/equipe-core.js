// =====================================================================
// NUCLEO UNICO DA EQUIPE (diaria / metragem)
// Compartilhado por sistema.html (js/equipe.js) e mobile.html.
// Contem apenas logica pura/independente de DOM:
//   - motor unico de diaria (presenca por periodo)
//   - parser de periodo do fechamento
//   - filtro de log por uid (com fallback id)
//   - selecao dos registros vinculados a um fechamento (para estorno)
// =====================================================================
(function (global) {
    'use strict';

    // ---------- Motor unico de diaria (presenca por periodo) ----------
    // A jornada da obra e fixa (manha 07:00-11:00 e tarde 13:00-17:00) e o
    // sistema externo registra a ENTRADA, gerando a SAIDA automaticamente.
    // O que define a diaria e a PRESENCA no periodo, nao o horario exato:
    //   - presenca de manha = alguma ENTRADA antes de 12:00
    //   - presenca de tarde = alguma ENTRADA a partir de 12:00
    //   - diaria = 0.5 por periodo presente (dia completo = 1.0)
    // As SAIDAS sao ignoradas no calculo. AJUSTE_MANUAL entra como override/soma.
    function rvRoundHalfDown(v) {
        if (v <= 0) return 0;
        if (v >= 1) return 1;
        const cents = v * 100;
        const dec = cents - Math.floor(cents);
        if (Math.abs(dec - 0.5) < 0.0001) return Math.floor(cents) / 100;
        return Math.round(cents) / 100;
    }

    // Aceita registros com "hora_registro" (linha do banco) ou "hora" (Date ja pronto).
    function rvHoraDate(r) {
        return new Date(r.hora_registro !== undefined ? r.hora_registro : r.hora);
    }

    // Fracao de UM dia (registros de um unico funcionario em uma unica data).
    function rvFracaoDiaria(registrosDoDia) {
        const ajustes = registrosDoDia
            .filter(r => r.tipo === 'AJUSTE_MANUAL')
            .reduce((s, r) => s + (parseFloat(r.fracao_diaria) || 0), 0);

        const entradas = registrosDoDia.filter(r => r.tipo === 'ENTRADA');
        if (entradas.length === 0) return rvRoundHalfDown(Math.min(ajustes, 1));

        const manha = entradas.some(r => rvHoraDate(r).getUTCHours() < 12);
        const tarde = entradas.some(r => rvHoraDate(r).getUTCHours() >= 12);
        const base = (manha ? 0.5 : 0) + (tarde ? 0.5 : 0);

        return rvRoundHalfDown(Math.min(base + ajustes, 1));
    }

    // Total de diarias de uma lista de registros (agrupa por funcionario + dia).
    function rvCalcularTotalDiarias(registros) {
        if (!registros || registros.length === 0) return 0;
        const porChave = new Map();
        registros.forEach(p => {
            const dia = new Date(p.hora_registro).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const chave = `${p.funcionario_id || ''}|${dia}`;
            if (!porChave.has(chave)) porChave.set(chave, []);
            porChave.get(chave).push(p);
        });
        let total = 0;
        for (const regs of porChave.values()) total += rvFracaoDiaria(regs);
        return total;
    }

    // ---------- Periodo do fechamento ----------
    // Interpreta o periodo gravado na descricao de um fechamento.
    // Suporta "Periodo DD/MM/YYYY a DD/MM/YYYY" e o legado "Periodo MM/YYYY".
    // Retorna { inicio: 'YYYY-MM-DD', fim: 'YYYY-MM-DD' } ou null.
    function rvParsePeriodo(texto) {
        if (!texto) return null;
        let m = String(texto).match(/Per[ií]odo\s+(\d{2})\/(\d{2})\/(\d{4})\s+a\s+(\d{2})\/(\d{2})\/(\d{4})/i);
        if (m) {
            return { inicio: `${m[3]}-${m[2]}-${m[1]}`, fim: `${m[6]}-${m[5]}-${m[4]}` };
        }
        m = String(texto).match(/Per[ií]odo\s+(\d{2})\/(\d{4})/i);
        if (m) {
            const mes = m[1];
            const ano = m[2];
            const ultimoDia = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
            return { inicio: `${ano}-${mes}-01`, fim: `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}` };
        }
        return null;
    }

    // ---------- Filtro de log por referencia ----------
    // jsp_logs.id numerico nao e unico; o uid e a chave confiavel. Sempre que o
    // lancamento tiver uid, filtra por ele; mantem "id" como fallback local.
    function rvRefLog(query, log) {
        if (log && log.uid) return query.eq('uid', log.uid);
        return query.eq('id', log.id);
    }

    // ---------- Selecao de registros vinculados (estorno) ----------
    // Diaria: prioriza fechamento_uid, depois despesa_id; restringe ao periodo.
    function rvSelecionarVinculadosDiaria(pontos, funcionarioId, despesa, periodo) {
        const d = despesa || {};
        return (pontos || []).filter(p =>
            p.funcionario_id === funcionarioId &&
            p.pago_em_fechamento &&
            ((d.uid && p.fechamento_uid === d.uid) ||
                (d.id != null && String(p.despesa_id) === String(d.id))) &&
            (!periodo || (
                p.hora_registro >= periodo.inicio + 'T00:00:00' &&
                p.hora_registro <= periodo.fim + 'T23:59:59'
            ))
        );
    }

    // Metragem (terceirizado): vinculo pelo fechamento_uid da despesa.
    function rvSelecionarVinculadosMetro(producao, tercId, despesa) {
        const d = despesa || {};
        return (producao || []).filter(p =>
            p.terceirizado_id === tercId &&
            p.status === 'PAGO' &&
            !!d.uid &&
            p.fechamento_uid === d.uid
        );
    }

    const core = {
        rvRoundHalfDown,
        rvHoraDate,
        rvFracaoDiaria,
        rvCalcularTotalDiarias,
        rvParsePeriodo,
        rvRefLog,
        rvSelecionarVinculadosDiaria,
        rvSelecionarVinculadosMetro
    };

    global.RVEquipeCore = core;

    // Compatibilidade: os scripts chamam esses nomes diretamente.
    global.rvRoundHalfDown = rvRoundHalfDown;
    global.rvHoraDate = rvHoraDate;
    global.rvFracaoDiaria = rvFracaoDiaria;
    global.rvCalcularTotalDiarias = rvCalcularTotalDiarias;
    global.rvParsePeriodo = rvParsePeriodo;
    global.rvRefLog = rvRefLog;
    global.filtrarLogPorRef = rvRefLog;
    global.refLog = rvRefLog;
})(typeof window !== 'undefined' ? window : globalThis);
