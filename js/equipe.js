// ============================================================== JS PARA USO VINCULADO DAS FUNÇÕES NO SISTEMA.HTML ==================================================================

/**
 * Calcula o saldo de diárias pendentes (não pagas) para um funcionário específico
 * com base nos registros da tabela jsp_ponto_diario (status = 'VALIDADO' e ainda não incluídas em fechamento).
 * Retorna um objeto: { totalDiarias: number, registros: array }
 */
  // ====== CRUD EQUIPE E PONTO ======
      function renderEquipe() {
            const term = document.getElementById('eqp-search').value.toLowerCase();
            const obraFiltro = document.getElementById('eqp-obra-filter').value;
            const dataInicio = document.getElementById('eqp-filter-data-inicio').value;
            const dataFim = document.getElementById('eqp-filter-data-fim').value;
            const statusFiltro = document.getElementById('eqp-filter-status').value;
            const tipoFiltro = document.getElementById('eqp-filter-tipo').value;
            
            const list = document.getElementById('equipe-list');
            const colaboradores = getColaboradoresUnificados();
            
            let fil = colaboradores.filter(c => 
                (c.nome || '').toLowerCase().includes(term) || 
                (c.categoria || '').toLowerCase().includes(term)
            );
            
            if (obraFiltro) {
                fil = fil.filter(c => c.obra_atual_id == obraFiltro);
            }
            
            if (statusFiltro !== "todos") {
                const isAtivo = statusFiltro === "true";
                fil = fil.filter(c => (c.ativo === true || c.ativo === 'true') === isAtivo);
            }
            
            if (tipoFiltro !== 'todos') {
                fil = fil.filter(c => c.tipo === tipoFiltro);
            }
            
            fil.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
            
            // Pré-calcula produção e valores para cada colaborador (usando intervalo de datas)
            fil.forEach(c => {
                if (c.tipo === 'diaria') {
                    const saldo = calcularSaldoPendenteFuncionarioPorPeriodo(c.id, dataInicio, dataFim);
                    c.producao_mes = saldo.totalDiarias;
                    c.valor_total = c.producao_mes * c.valor_base;
                    c.status_pagamento = saldo.totalDiarias > 0 ? 'PENDENTE' : 'EM DIA';
                } else {
                    const producao = STATE.producao_terc.filter(p => {
                        if (p.terceirizado_id !== c.id) return false;
                        if (dataInicio && p.data_registro < dataInicio) return false;
                        if (dataFim && p.data_registro > dataFim) return false;
                        return true;
                    });
                    const metrosPendentes = producao.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros), 0);
                    const metrosPagos = producao.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros), 0);
                    c.metros_pendentes = metrosPendentes;
                    c.metros_pagos = metrosPagos;
                    c.producao_mes = metrosPendentes;
                    c.valor_total = metrosPendentes * c.valor_base;
                    c.status_pagamento = metrosPendentes > 0 ? 'PENDENTE' : 'EM DIA';
                }
            });
            
            list.innerHTML = '';
            
            fil.forEach(c => {
                const phoneClean = (c.telefone || '').replace(/\D/g, '');
                const wppBtn = phoneClean ? `<a href="https://wa.me/55${phoneClean}" target="_blank" class="p-1.5 border border-green-200 text-green-600 hover:bg-green-50 rounded bg-green-50/50" title="WhatsApp"><i data-lucide="message-circle" width="14"></i></a>` : '';
                
                const obraAtual = STATE.obras.find(o => o.id == c.obra_atual_id);
                const nomeObra = obraAtual ? obraAtual.nome : '<span class="text-slate-400 italic">Sem obra fixa</span>';
                const diariaOuMetro = c.tipo === 'diaria' ? formatMoney(c.valor_base) : `${formatMoney(c.valor_base)}/m`;
                    
                const isPendente = c.status_pagamento === 'PENDENTE';
                const valorExibicao = c.valor_total || 0;
                
                let botoesAcao = '';
                if (c.tipo === 'diaria') {
                    botoesAcao = `
                        <button onclick="abrirModalSaldo('${c.id}')" class="p-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded shadow font-bold text-[10px] flex items-center gap-1">
                            <i data-lucide="calculator" width="12"></i> CALCULAR
                        </button>
                        <button onclick="abrirModalDocumentos('${c.id}')" class="p-1.5 bg-slate-800 text-white rounded shadow" title="Contratos">
                            <i data-lucide="file-signature" width="14"></i>
                        </button>
                        <button onclick="openEquipeForm('${c.id}')" class="p-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                            <i data-lucide="edit-3" width="14"></i>
                        </button>
                        <button onclick="toggleStatusEquipe('${c.id}', ${c.ativo !== false})" class="p-1.5 border ${c.ativo !== false ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'} rounded" title="${c.ativo !== false ? 'Desativar / Demitir' : 'Reativar'}">
                            <i data-lucide="power" width="14"></i>
                        </button>
                        ${wppBtn}
                    `;
                } else {
                    botoesAcao = `
                        <button onclick="abrirModalSaldoMetros('${c.id}')" class="px-2 py-1.5 bg-slate-800 text-white hover:bg-black rounded shadow font-bold text-[10px] flex items-center gap-1">
                            <i data-lucide="calculator" width="12"></i> CALCULAR
                        </button>
                        <button onclick="abrirModalDocumentosTerc('${c.id}')" class="p-1.5 bg-slate-800 text-white rounded shadow" title="Contratos">
                            <i data-lucide="file-signature" width="14"></i>
                        </button>
                        <button onclick="openEquipeForm('${c.id}', 'terceirizado')" class="p-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                            <i data-lucide="edit-3" width="14"></i>
                        </button>
                        <button onclick="toggleStatusTerceirizado('${c.id}', ${c.ativo !== false})" class="p-1.5 border ${c.ativo !== false ? 'border-red-200 text-red-500 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'} rounded" title="${c.ativo !== false ? 'Desativar' : 'Reativar'}">
                            <i data-lucide="power" width="14"></i>
                        </button>
                        ${wppBtn}
                    `;
                }
                
                const row = document.createElement('tr');
                row.className = `border-b hover:bg-slate-50 transition ${c.ativo === false ? 'opacity-60 bg-red-50' : ''}`;
                row.innerHTML = `
                    <td class="p-2">
                        <div class="font-bold text-slate-800 text-sm flex items-center gap-2">
                            ${c.nome} 
                            ${c.ativo === false ? '<span class="text-[9px] text-red-500 font-bold">(DESATIVADO)</span>' : ''}                    
                        </div>
                        <div class="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase font-bold inline-block mt-0.5">${c.categoria || 'Geral'}</div>
                    </td>
                    <td class="p-2 text-xs font-bold text-blue-700"><i data-lucide="building" class="w-3 h-3 inline"></i> ${nomeObra}</td>
                    <td class="p-2 text-center">
                        <div class="font-bold text-slate-700 text-xs">${diariaOuMetro}</div>
                    </td>
                    <td class="p-2 text-center">
                        <div class="text-xs font-black ${c.producao_mes > 0 ? 'text-indigo-600' : 'text-slate-400'}">
                            ${c.tipo === 'diaria' ? c.producao_mes.toFixed(2) + ' dias' : c.producao_mes.toFixed(2) + ' m'}
                        </div>
                    </td>
                    <td class="p-2 text-right">
                        <div class="font-black text-sm ${isPendente ? 'text-green-700' : 'text-slate-400'}">${formatMoney(valorExibicao)}</div>
                    </td>
                    <td class="p-2 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <span class="px-2 py-1 rounded text-[9px] font-bold ${isPendente ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}">${c.status_pagamento}</span>
                        </div>
                    </td>
                    <td class="p-2 text-center">
                        <div class="flex items-center justify-start gap-1">
                            ${botoesAcao}
                        </div>
                    </td>
                `;
                list.appendChild(row);
            });
        
                // Após o fechamento do forEach e antes do lucide.createIcons()
                let somaGeral = 0;
                fil.forEach(c => { somaGeral += (c.valor_total || 0); });
                const totalEl = document.getElementById('equipe-total-geral');
                if (totalEl) {
                    totalEl.innerHTML = `Total geral (filtro): <span class="font-bold text-slate-700">${formatMoney(somaGeral)}</span>`;
                }
                    
                    lucide.createIcons();
                }



      function calcularSaldoPendenteFuncionarioPorPeriodo(funcId, dataInicio, dataFim) {
            const registros = STATE.ponto_diario.filter(p => 
                p.funcionario_id === funcId && 
                p.status === 'VALIDADO' &&
                p.pago_em_fechamento === false
            );
            
            let registrosFiltrados = registros;
            if (dataInicio) {
                registrosFiltrados = registrosFiltrados.filter(p => p.hora_registro >= dataInicio + 'T00:00:00');
            }
            if (dataFim) {
                registrosFiltrados = registrosFiltrados.filter(p => p.hora_registro <= dataFim + 'T23:59:59');
            }
            
            // Agrupa por dia
            const porDia = new Map();
            registrosFiltrados.forEach(p => {
                const dataDia = new Date(p.hora_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
                if (!porDia.has(dataDia)) porDia.set(dataDia, []);
                porDia.get(dataDia).push(p);
            });
            
            let totalDiarias = 0;
            
            function diffMinutesUTC(startIso, endIso) {
                return (new Date(endIso) - new Date(startIso)) / (1000 * 60);
            }
            
            function calcularFracaoDiaPeriodo(registrosDoDia) {
                const entradas = registrosDoDia.filter(r => r.tipo === 'ENTRADA').map(r => r.hora_registro);
                const saidas   = registrosDoDia.filter(r => r.tipo === 'SAIDA').map(r => r.hora_registro);
                const ajustes  = registrosDoDia.filter(r => r.tipo === 'AJUSTE_MANUAL')
                                        .reduce((sum, a) => sum + parseFloat(a.fracao_diaria || 0), 0);
                
                if (entradas.length === 0 && saidas.length === 0) return Math.min(ajustes, 1);
                
                const todosPontos = [
                    ...entradas.map(e => ({ tipo: 'E', hora: e })),
                    ...saidas.map(s => ({ tipo: 'S', hora: s }))
                ].sort((a, b) => new Date(a.hora) - new Date(b.hora));
                
                let startManha = null, endManha = null;
                let startTarde = null, endTarde = null;
                
                for (const p of todosPontos) {
                    const hour = new Date(p.hora).getUTCHours();
                    if (hour < 12) {
                        if (p.tipo === 'E' && !startManha) startManha = p.hora;
                        if (p.tipo === 'S') endManha = p.hora;
                    } else {
                        if (p.tipo === 'E' && !startTarde) startTarde = p.hora;
                        if (p.tipo === 'S') endTarde = p.hora;
                    }
                }
                
                function calcMin(start, end, jornada) {
                    if (!start || !end) return 0;
                    let mins = diffMinutesUTC(start, end);
                    const falta = jornada - mins;
                    if (falta > 0 && falta <= 10) mins = jornada;
                    return Math.min(jornada, Math.max(0, mins));
                }
                
                let minutosManha = calcMin(startManha, endManha, 240);
                let minutosTarde = calcMin(startTarde, endTarde, 240);
                let baseFracao = (minutosManha + minutosTarde) / 480;
                baseFracao = Math.min(1, Math.max(0, baseFracao));
                
                let fracao = baseFracao + ajustes;
                if (fracao > 1) fracao = 1;
                
                // arredondamento half-down
                function roundHalfDown(v) {
                    if (v <= 0) return 0;
                    if (v >= 1) return 1;
                    let cents = v * 100;
                    let dec = cents - Math.floor(cents);
                    if (Math.abs(dec - 0.5) < 0.0001) return Math.floor(cents) / 100;
                    return Math.round(cents) / 100;
                }
                return roundHalfDown(fracao);
            }
            
            for (const registrosDoDia of porDia.values()) {
                totalDiarias += calcularFracaoDiaPeriodo(registrosDoDia);
            }
            
            return { totalDiarias, registros: registrosFiltrados };
        }


      
      function imprimirReciboDoModal() {
            const funcId = document.getElementById('saldo-equipe-id').value;
            const func = STATE.equipe.find(e => e.id === funcId);
            if (!func) return;
            
            const totalDiarias = document.getElementById('saldo-total-diarias').innerText;
            const valorTotal = document.getElementById('saldo-total-valor').innerText;
            const dataInicio = document.getElementById('saldo-filtro-data-inicio').value;
            const dataFim = document.getElementById('saldo-filtro-data-fim').value;
            const hoje = new Date().toLocaleDateString('pt-BR');
            
            const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '';
            const periodo = dataIniFormatada && dataFimFormatada ? `${dataIniFormatada} a ${dataFimFormatada}` : 'período selecionado';
            
            const html = `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; width: 100%; border: 2px solid #1e293b; padding: 30px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                        <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
                        <div style="text-align: right;">
                            <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 900;">RECIBO SOBRE DIÁRIAS</h1>
                            <p style="margin: 5px 0 0 0; font-size: 18px; color: #1d4ed8; font-weight: bold;">VALOR: ${valorTotal}</p>
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 40px;">
                        Recebi(emos) de <strong>RV NEGÓCIOS E COMPANHIA LTDA</strong> (CNPJ: 61.893.912/0001-24), a importância de <strong>${valorTotal}</strong>, 
                        referente ao pagamento de diárias <!--trabalhadas no período de <strong>${periodo}</strong>--> em aberto, conforme registro diário de presença da obra. Totalizando <strong>${totalDiarias} dias</strong> 
                        com a diária acordada em <strong>${formatMoney(func.valor_diaria)}</strong>.
                    </div>
                    
                    <div style="font-size: 14px; margin-bottom: 40px;">
                        Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos legais.
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 30px; font-size: 14px;">
                        Jataí - GO, ${hoje}.
                    </div>
                    
                    <div style="margin-top: 60px; display: flex; justify-content: center;">
                        <div style="text-align: center; width: 60%; border-top: 1px solid #000; padding-top: 10px;">
                            <strong>${func.nome.toUpperCase()}</strong><br>
                            <span style="font-size: 12px; color: #64748b;">CPF: ${func.cpf || '_______________________'} <!--| RG: ${func.rg || '_______________________'}--></span>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('print-area').innerHTML = html;
            setTimeout(() => window.print(), 300);
        }




function calcularSaldoPendenteFuncionario(funcId, mesFiltro = null, anoFiltro = null) {
    let registros = STATE.ponto_diario.filter(p => 
        p.funcionario_id === funcId && 
        p.status === 'VALIDADO' &&
        !p.pago_em_fechamento
    );
    if (mesFiltro && anoFiltro) {
        registros = registros.filter(p => {
            const d = new Date(p.hora_registro);
            return (d.getUTCMonth() + 1).toString().padStart(2,'0') === mesFiltro && 
                   d.getUTCFullYear().toString() === anoFiltro;
        });
    }
    
    // Agrupa por dia
    const porDia = new Map();
    registros.forEach(p => {
        const dataDia = new Date(p.hora_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        if (!porDia.has(dataDia)) porDia.set(dataDia, []);
        porDia.get(dataDia).push(p);
    });
    
    let totalDiarias = 0;
    
    function diffMinutesUTC(startIso, endIso) {
        return (new Date(endIso) - new Date(startIso)) / (1000 * 60);
    }
    
    function roundHalfDown(v) {
        if (v <= 0) return 0;
        if (v >= 1) return 1;
        let cents = v * 100;
        let dec = cents - Math.floor(cents);
        if (Math.abs(dec - 0.5) < 0.0001) return Math.floor(cents) / 100;
        return Math.round(cents) / 100;
    }
    
    function calcularFracaoDiaPeriodo(registrosDoDia) {
        const entradas = registrosDoDia.filter(r => r.tipo === 'ENTRADA').map(r => r.hora_registro);
        const saidas   = registrosDoDia.filter(r => r.tipo === 'SAIDA').map(r => r.hora_registro);
        const ajustes  = registrosDoDia.filter(r => r.tipo === 'AJUSTE_MANUAL')
                                .reduce((sum, a) => sum + parseFloat(a.fracao_diaria || 0), 0);
        
        if (entradas.length === 0 && saidas.length === 0) return Math.min(ajustes, 1);
        
        const todosPontos = [
            ...entradas.map(e => ({ tipo: 'E', hora: e })),
            ...saidas.map(s => ({ tipo: 'S', hora: s }))
        ].sort((a, b) => new Date(a.hora) - new Date(b.hora));
        
        let startManha = null, endManha = null;
        let startTarde = null, endTarde = null;
        
        for (const p of todosPontos) {
            const hour = new Date(p.hora).getUTCHours();
            if (hour < 12) {
                if (p.tipo === 'E' && !startManha) startManha = p.hora;
                if (p.tipo === 'S') endManha = p.hora;
            } else {
                if (p.tipo === 'E' && !startTarde) startTarde = p.hora;
                if (p.tipo === 'S') endTarde = p.hora;
            }
        }
        
        function calcMin(start, end, jornada) {
            if (!start || !end) return 0;
            let mins = diffMinutesUTC(start, end);
            const falta = jornada - mins;
            if (falta > 0 && falta <= 10) mins = jornada;
            return Math.min(jornada, Math.max(0, mins));
        }
        
        let minutosManha = calcMin(startManha, endManha, 240);
        let minutosTarde = calcMin(startTarde, endTarde, 240);
        let baseFracao = (minutosManha + minutosTarde) / 480;
        baseFracao = Math.min(1, Math.max(0, baseFracao));
        
        let fracao = baseFracao + ajustes;
        if (fracao > 1) fracao = 1;
        return roundHalfDown(fracao);
    }
    
    for (const registrosDoDia of porDia.values()) {
        totalDiarias += calcularFracaoDiaPeriodo(registrosDoDia);
    }
    
    return { totalDiarias, registros };
}


    
      // Cálculo da fração do dia (entradas/saídas + ajustes manuais)
      // Tolerância: 10 minutos por período (manhã e tarde)
      // ==========================================================
      function calcularFracaoDia(registros) {
          // Separa entradas, saídas e ajustes
          const entradas = registros.filter(r => r.tipo === 'ENTRADA').map(r => new Date(r.hora_registro));
          const saidas   = registros.filter(r => r.tipo === 'SAIDA').map(r => new Date(r.hora_registro));
          const ajustes  = registros.filter(r => r.tipo === 'AJUSTE_MANUAL')
                                    .reduce((sum, r) => sum + (parseFloat(r.fracao_diaria) || 0), 0);
          
          // Ordena todos os pontos para separar manhã e tarde
          const todosPontos = [
              ...entradas.map(e => ({ tipo: 'E', hora: e })),
              ...saidas.map(s => ({ tipo: 'S', hora: s }))
          ].sort((a, b) => a.hora - b.hora);
          
          // Função auxiliar para calcular minutos entre dois horários (já ordenados)
          function diffMinutes(a, b) { return (b - a) / (1000 * 60); }
          
          // Identifica os períodos: manhã (até 12:00) e tarde (após 12:00)
          let periodoManha = { start: null, end: null };
          let periodoTarde = { start: null, end: null };
          
          // Encontra o último ponto antes do meio-dia (12:00) e o primeiro após
          for (let i = 0; i < todosPontos.length; i++) {
              const hora = todosPontos[i].hora;
              const hour = hora.getUTCHours();
              if (hour < 12) {
                  // Período da manhã: pega a primeira entrada e última saída antes de 12:00
                  if (todosPontos[i].tipo === 'E' && !periodoManha.start) periodoManha.start = hora;
                  if (todosPontos[i].tipo === 'S') periodoManha.end = hora;
              } else {
                  // Período da tarde: pega a primeira entrada e última saída após ou igual 12:00
                  if (todosPontos[i].tipo === 'E' && !periodoTarde.start) periodoTarde.start = hora;
                  if (todosPontos[i].tipo === 'S') periodoTarde.end = hora;
              }
          }
          
          // Calcular horas trabalhadas em cada período, aplicando tolerância de 10 minutos
          const JORNADA_BASE_MINUTOS = 480; // 8h diárias (não usado diretamente agora)
          const TOLERANCIA_MINUTOS = 10;    // 10 minutos por período
          
          let minutosManha = 0;
          let minutosTarde = 0;
          
          // Período da manhã
          if (periodoManha.start && periodoManha.end) {
              let diff = diffMinutes(periodoManha.start, periodoManha.end);
              // Aplica tolerância: se a diferença for menor que a jornada teórica (4h = 240 min)
              // e a falta for dentro da tolerância, arredonda para 4h
              const JORNADA_MANHA_MIN = 240; // 4h
              const faltaManha = JORNADA_MANHA_MIN - diff;
              if (faltaManha > 0 && faltaManha <= TOLERANCIA_MINUTOS) {
                  minutosManha = JORNADA_MANHA_MIN;
              } else {
                  minutosManha = diff;
              }
              minutosManha = Math.min(JORNADA_MANHA_MIN, Math.max(0, minutosManha));
          }
          
          // Período da tarde
          if (periodoTarde.start && periodoTarde.end) {
              let diff = diffMinutes(periodoTarde.start, periodoTarde.end);
              const JORNADA_TARDE_MIN = 240; // 4h
              const faltaTarde = JORNADA_TARDE_MIN - diff;
              if (faltaTarde > 0 && faltaTarde <= TOLERANCIA_MINUTOS) {
                  minutosTarde = JORNADA_TARDE_MIN;
              } else {
                  minutosTarde = diff;
              }
              minutosTarde = Math.min(JORNADA_TARDE_MIN, Math.max(0, minutosTarde));
          }
          
          // Fração base = (minutosManha + minutosTarde) / 480 (total diário)
          let baseFracao = (minutosManha + minutosTarde) / 480;
          baseFracao = Math.min(1, Math.max(0, baseFracao));
          
          // Adiciona ajustes manuais e limita a 1
          let fracaoFinal = baseFracao + ajustes;
          if (fracaoFinal > 1) fracaoFinal = 1;
          
          return {
              fracao: fracaoFinal,
              base: baseFracao,
              ajustes: ajustes
          };
      }

      

      
// Função auxiliar para calcular horas trabalhadas no dia (baseado no código existente)
function calcularHorasTrabalhadasNoDia(entradas, saidas) {
    if (entradas.length === 0 || saidas.length === 0) return 0;
    
    const pontos = [
        ...entradas.map(e => ({ tipo: 'E', hora: e })),
        ...saidas.map(s => ({ tipo: 'S', hora: s }))
    ].sort((a, b) => a.hora - b.hora);
    
    let totalMinutos = 0;
    for (let i = 0; i < pontos.length - 1; i++) {
        if (pontos[i].tipo === 'E' && pontos[i+1].tipo === 'S') {
            totalMinutos += (pontos[i+1].hora - pontos[i].hora) / (1000 * 60);
        }
    }
    
    // NENHUM desconto de almoço, apenas soma os pares
    
    const JORNADA_BASE = 480; // 8 horas em minutos
    const TOLERANCIA = 20;
    
    let minutosConsiderados = totalMinutos;
    const falta = JORNADA_BASE - totalMinutos;
    
    if (falta > TOLERANCIA) {
        minutosConsiderados = totalMinutos;
    } else {
        minutosConsiderados = JORNADA_BASE;
    }
    
    let horas = minutosConsiderados / 60;
    horas = Math.min(8, horas);
    return horas;
}
    

// Abre o modal de saldo para um funcionário
function abrirModalSaldo(equipeId) {
    const colaborador = getColaboradoresUnificados().find(c => c.id === equipeId);
    if (!colaborador) return;
    
    if (colaborador.tipo === 'metro') {
        abrirModalSaldoMetros(equipeId);
        return;
    }
    
    const func = STATE.equipe.find(e => e.id === equipeId);
    if (!func) return;
    
    document.getElementById('saldo-equipe-id').value = equipeId;
    document.getElementById('saldo-modal-subtitle').innerText = 
        `${func.nome} - Diária: ${formatMoney(func.valor_diaria || 0)}`;
    
    // Define datas padrão: primeiro e último dia do mês atual
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const primeiroDia = `${anoAtual}-01-01`;   // inicia em 1º de janeiro
    const ultimoDia = new Date(anoAtual, hoje.getMonth() + 1, 0).getDate();
    const ultimoDiaStr = `${anoAtual}-${mesAtual}-${String(ultimoDia).padStart(2, '0')}`;
    
    document.getElementById('saldo-filtro-data-inicio').value = primeiroDia;
    document.getElementById('saldo-filtro-data-fim').value = ultimoDiaStr;
    document.getElementById('saldo-filtro-status').value = 'PENDENTE';
    
    carregarTabelaSaldo();
    document.getElementById('modal-saldo-ponto').classList.remove('hidden');
    lucide.createIcons();
}

function fecharModalSaldo() {
    document.getElementById('modal-saldo-ponto').classList.add('hidden');
}

function carregarTabelaSaldo() {
    const funcId = document.getElementById('saldo-equipe-id').value;
    const dataInicio = document.getElementById('saldo-filtro-data-inicio').value;
    const dataFim = document.getElementById('saldo-filtro-data-fim').value;
    const statusFiltro = document.getElementById('saldo-filtro-status').value;
    
    const func = STATE.equipe.find(e => e.id === funcId);
    if (!func) return;
    
    let registros = STATE.ponto_diario.filter(p => 
        p.funcionario_id === funcId && 
        p.status === 'VALIDADO'
    );
    
    if (dataInicio) {
        registros = registros.filter(p => p.hora_registro >= dataInicio + 'T00:00:00');
    }
    if (dataFim) {
        registros = registros.filter(p => p.hora_registro <= dataFim + 'T23:59:59');
    }
    
    if (statusFiltro === 'PENDENTE') {
        registros = registros.filter(p => !p.pago_em_fechamento);
    } else if (statusFiltro === 'PAGO') {
        registros = registros.filter(p => p.pago_em_fechamento === true);
    }
    
    function formatHoraUTC(isoString) {
        if (!isoString) return '--:--';
        const d = new Date(isoString);
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }
    
    function diffMinutes(startIso, endIso) {
        const start = new Date(startIso);
        const end = new Date(endIso);
        return (end.getTime() - start.getTime()) / (1000 * 60);
    }
    
    // Função de arredondamento customizada: metade (0,005) para baixo
    function roundFractionHalfDown(value) {
        if (value <= 0) return 0;
        if (value >= 1) return 1;
        let cents = value * 100;
        let decimalPart = cents - Math.floor(cents);
        if (Math.abs(decimalPart - 0.5) < 0.0001) {
            return Math.floor(cents) / 100;
        } else {
            return Math.round(cents) / 100;
        }
    }
    
    const porDia = {};
    registros.forEach(p => {
        const dataDia = new Date(p.hora_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        if (!porDia[dataDia]) porDia[dataDia] = { entradas: [], saidas: [], ajustes: [], registros: [] };
        porDia[dataDia].registros.push(p);
        if (p.tipo === 'ENTRADA') porDia[dataDia].entradas.push(p.hora_registro);
        else if (p.tipo === 'SAIDA') porDia[dataDia].saidas.push(p.hora_registro);
        else if (p.tipo === 'AJUSTE_MANUAL') porDia[dataDia].ajustes.push(p);
    });
    
    const tbody = document.getElementById('saldo-tabela-body');
    tbody.innerHTML = '';
    let totalDiarias = 0;
    
    const datasOrdenadas = Object.keys(porDia).sort((a,b) => {
        const [da, ma, aa] = a.split('/');
        const [db, mb, ab] = b.split('/');
        return new Date(aa, ma-1, da) - new Date(ab, mb-1, db);
    });
    
    if (datasOrdenadas.length === 0) {
        document.getElementById('saldo-sem-registros').classList.remove('hidden');
        document.getElementById('saldo-total-diarias').innerText = '0.00';
        document.getElementById('saldo-total-valor').innerText = formatMoney(0);
        return;
    }
    document.getElementById('saldo-sem-registros').classList.add('hidden');
    
    datasOrdenadas.forEach(dataDia => {
        const pts = porDia[dataDia];
        
        // === NOVA LÓGICA COM TOLERÂNCIA POR PERÍODO ===
        // Separa os pontos em manhã (até 12:00) e tarde (>=12:00)
        const pontosManha = [];
        const pontosTarde = [];
        
        // Junta todos os horários de entrada e saída em ordem
        const todosPontos = [];
        pts.entradas.forEach(e => todosPontos.push({ tipo: 'E', hora: e }));
        pts.saidas.forEach(s => todosPontos.push({ tipo: 'S', hora: s }));
        todosPontos.sort((a, b) => new Date(a.hora) - new Date(b.hora));
        
        let minutosManha = 0;
        let minutosTarde = 0;
        let startManha = null, endManha = null;
        let startTarde = null, endTarde = null;
        
        for (let i = 0; i < todosPontos.length; i++) {
            const ponto = todosPontos[i];
            const hora = new Date(ponto.hora);
            const hour = hora.getUTCHours();
            const minute = hora.getUTCMinutes();
            const isManha = (hour < 12) || (hour === 12 && minute === 0 && ponto.tipo === 'S'); // saída ao meio-dia conta como manhã?
            // Vamos considerar: antes das 12:00 é manhã, igual ou depois é tarde.
            if (hour < 12) {
                if (ponto.tipo === 'E' && startManha === null) startManha = ponto.hora;
                if (ponto.tipo === 'S') endManha = ponto.hora;
            } else {
                if (ponto.tipo === 'E' && startTarde === null) startTarde = ponto.hora;
                if (ponto.tipo === 'S') endTarde = ponto.hora;
            }
        }
        
        // Função para calcular minutos com tolerância de 10 minutos por período
        function calcularMinutosComTolerancia(start, end, jornadaMinutos) {
            if (!start || !end) return 0;
            let minutos = diffMinutes(start, end);
            const falta = jornadaMinutos - minutos;
            if (falta > 0 && falta <= 10) {
                minutos = jornadaMinutos;
            }
            return Math.min(jornadaMinutos, Math.max(0, minutos));
        }
        
        if (startManha && endManha) {
            minutosManha = calcularMinutosComTolerancia(startManha, endManha, 240); // 4h = 240 min
        }
        if (startTarde && endTarde) {
            minutosTarde = calcularMinutosComTolerancia(startTarde, endTarde, 240);
        }
        
        let baseFracao = (minutosManha + minutosTarde) / 480;
        baseFracao = Math.min(1, Math.max(0, baseFracao));
        
        // Soma dos ajustes manuais
        let somaAjustes = 0;
        if (pts.ajustes.length > 0) {
            somaAjustes = pts.ajustes.reduce((sum, a) => sum + parseFloat(a.fracao_diaria || 0), 0);
        }
        
        // Fração final (base + ajustes) com limite de 1
        let fracao = baseFracao + somaAjustes;
        if (fracao > 1) fracao = 1;
        
        // Aplica o arredondamento half-down
        fracao = roundFractionHalfDown(fracao);
        
        // Montagem da string de horários para exibição
        let horariosStr = '';
        if (pts.entradas.length > 0 || pts.saidas.length > 0) {
            const entradas = pts.entradas.sort();
            const saidas = pts.saidas.sort();
            const linhas = [];
            for (let i = 0; i < Math.max(entradas.length, saidas.length); i++) {
                const e = entradas[i];
                const s = saidas[i];
                if (e || s) {
                    linhas.push(`<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">${e ? formatHoraUTC(e) : '--:--'}</span> → 
                                 <span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs">${s ? formatHoraUTC(s) : '--:--'}</span>`);
                }
            }
            horariosStr = linhas.join('<br>');
        }
        if (pts.ajustes.length > 0) {
            const ajustesText = pts.ajustes.map(a => a.observacao || 'Ajuste manual').join(', ');
            horariosStr += (horariosStr ? '<br>' : '') + `<div class="text-indigo-600 text-xs mt-1">+ Ajuste manual (${somaAjustes.toFixed(2)} diárias) - ${ajustesText}</div>`;
        }
        if (!horariosStr) horariosStr = '<span class="text-slate-400 text-xs">Nenhum registro</span>';
        
        totalDiarias += fracao;
        
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-slate-50';
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-700">${dataDia}</td>
            <td class="p-3">${horariosStr}</td>
            <td class="p-3 text-center font-black ${fracao >= 1 ? 'text-green-600' : 'text-orange-600'}">${fracao.toFixed(2)}</td>
            <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-2">
                    <span class="px-2 py-1 rounded text-[9px] font-bold ${pts.registros[0].pago_em_fechamento ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">
                        ${pts.registros[0].pago_em_fechamento ? 'PAGO' : 'PENDENTE'}
                    </span>
                    <button onclick="abrirModalAdminRegistros('${funcId}')" class="text-slate-400 hover:text-indigo-600 p-1 rounded transition" title="Acesso Restrito (Senha)">
                        <i data-lucide="shield-alert" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('saldo-total-diarias').innerText = totalDiarias.toFixed(2);
    const valorTotal = totalDiarias * parseFloat(func.valor_diaria || 0);
    document.getElementById('saldo-total-valor').innerText = formatMoney(valorTotal);
    
    lucide.createIcons();
}

      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////




      // ========== FUNÇÕES PARA SALDO DE METROS (TERCEIRIZADOS) ==========

function abrirModalSaldoMetros(tercId) {
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc) return;
    
    document.getElementById('saldo-terc-id').value = tercId;
    document.getElementById('saldo-metros-subtitle').innerText = 
        `${terc.nome} - Valor do Metro: ${formatMoney(terc.valor_metro || 0)}`;
    
    // Define datas padrão: primeiro e último dia do mês atual
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const primeiroDia = `${anoAtual}-01-01`;
    const ultimoDia = new Date(anoAtual, hoje.getMonth() + 1, 0).getDate();
    const ultimoDiaStr = `${anoAtual}-${mesAtual}-${String(ultimoDia).padStart(2, '0')}`;
    
    document.getElementById('saldo-metros-data-inicio').value = primeiroDia;
    document.getElementById('saldo-metros-data-fim').value = ultimoDiaStr;
    document.getElementById('saldo-metros-filtro-status').value = 'PENDENTE';
    
    carregarTabelaSaldoMetros();
    document.getElementById('modal-saldo-metros').classList.remove('hidden');
    lucide.createIcons();
}
      

function fecharModalSaldoMetros() {
    document.getElementById('modal-saldo-metros').classList.add('hidden');
}

function carregarTabelaSaldoMetros() {
    const tercId = document.getElementById('saldo-terc-id').value;
    const dataInicio = document.getElementById('saldo-metros-data-inicio').value;
    const dataFim = document.getElementById('saldo-metros-data-fim').value;
    const statusFiltro = document.getElementById('saldo-metros-filtro-status').value;
    
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc) return;
    
    let registros = STATE.producao_terc.filter(p => p.terceirizado_id === tercId);
    
    if (dataInicio) {
        registros = registros.filter(p => p.data_registro >= dataInicio);
    }
    if (dataFim) {
        registros = registros.filter(p => p.data_registro <= dataFim);
    }
    
    if (statusFiltro === 'PENDENTE') {
        registros = registros.filter(p => p.status !== 'PAGO');
    } else if (statusFiltro === 'PAGO') {
        registros = registros.filter(p => p.status === 'PAGO');
    }
    
    const tbody = document.getElementById('saldo-metros-tabela-body');
    tbody.innerHTML = '';
    let totalMetros = 0;
    
    const registrosOrdenados = registros.sort((a,b) => new Date(a.data_registro) - new Date(b.data_registro));
    
    if (registrosOrdenados.length === 0) {
        document.getElementById('saldo-metros-sem-registros').classList.remove('hidden');
        document.getElementById('saldo-metros-total-metros').innerText = '0.00';
        document.getElementById('saldo-metros-total-valor').innerText = formatMoney(0);
        return;
    }
    document.getElementById('saldo-metros-sem-registros').classList.add('hidden');
    
    registrosOrdenados.forEach(prod => {
        const metros = parseFloat(prod.metros) || 0;
        totalMetros += metros;
        const dataStr = new Date(prod.data_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        const status = prod.status === 'PAGO' ? 'PAGO' : 'PENDENTE';
        
        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-slate-50';
        tr.innerHTML = `
          <td class="p-3 font-bold text-slate-700">${dataStr}</td>
          <td class="p-3 text-center font-black text-indigo-600">${metros.toFixed(2)} m</td>
          <td class="p-3 text-center">
              <div class="flex items-center justify-center gap-2">
                  <span class="px-2 py-1 rounded text-[9px] font-bold ${status === 'PAGO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${status}</span>
                  <button onclick="abrirModalAdminRegistrosMetros('${tercId}')" class="text-slate-400 hover:text-indigo-600 p-1 rounded transition" title="Acesso Restrito (Senha)">
                      <i data-lucide="shield-alert" class="w-4 h-4"></i>
                  </button>
              </div>
          </td>
      `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('saldo-metros-total-metros').innerText = totalMetros.toFixed(2);
    const valorTotal = totalMetros * parseFloat(terc.valor_metro || 0);
    document.getElementById('saldo-metros-total-valor').innerText = formatMoney(valorTotal);
    
    lucide.createIcons();
}


      // ========== MODAL ADMINISTRATIVO DE METROS ==========
async function abrirModalAdminRegistrosMetros(tercId) {
    const senha = prompt("🔐 Acesso Restrito. Digite a senha mestra:");
    if (senha !== "147258369" && senha !== "150105199") {
        alert("Senha incorreta. Acesso negado.");
        return;
    }
    
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc) return;
    
    document.getElementById('admin-func-id').value = tercId;
    document.getElementById('admin-registros-subtitle').innerText = 
        `${terc.nome} - Todos os registros de metragem`;
    
    await carregarListaAdminRegistrosMetros(tercId);
    document.getElementById('modal-admin-registros').classList.remove('hidden');
    lucide.createIcons();
}

async function carregarListaAdminRegistrosMetros(tercId) {
    const tbody = document.getElementById('admin-registros-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">Carregando...</td></tr>';
    
    const { data, error } = await sb
        .from('jsp_producao_terc')
        .select('*')
        .eq('terceirizado_id', tercId)
        .order('data_registro', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Erro: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        document.getElementById('admin-sem-registros').classList.remove('hidden');
        tbody.innerHTML = '';
        return;
    }
    document.getElementById('admin-sem-registros').classList.add('hidden');
    
    // Ajusta cabeçalhos da tabela para Metros
    const thead = document.querySelector('#modal-admin-registros thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 text-left text-xs font-bold uppercase">Data</th>
            <th class="p-3 text-center text-xs font-bold uppercase">Metros</th>
            <th class="p-3 text-center text-xs font-bold uppercase">Status</th>
            <th class="p-3 text-center text-xs font-bold uppercase w-20">Ações</th>
        `;
    }
    
    tbody.innerHTML = data.map(reg => {
        const dataStr = new Date(reg.data_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        const statusBadge = reg.status === 'PAGO'
            ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">PAGO</span>'
            : '<span class="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">PENDENTE</span>';
        
        return `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3 text-xs font-mono">${dataStr}</td>
                <td class="p-3 text-center font-bold">${parseFloat(reg.metros).toFixed(2)} m</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-center">
                    <button onclick="excluirRegistroAdminMetros('${reg.id}')" class="text-red-500 hover:text-red-700 p-1 rounded transition" title="Excluir permanentemente">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    lucide.createIcons();
}

async function excluirRegistroAdminMetros(registroId) {
    if (!confirm("Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.")) {
        return;
    }
    
    showLoading(true);
    try {
        const { error } = await sb.from('jsp_producao_terc').delete().eq('id', registroId);
        if (error) throw error;
        showToast("Registro excluído com sucesso.");
        
        const tercId = document.getElementById('admin-func-id').value;
        await carregarListaAdminRegistrosMetros(tercId);
        // Se o modal de saldo metros estiver aberto, recarrega a tabela principal também
        if (!document.getElementById('modal-saldo-metros').classList.contains('hidden')) {
            await loadData(); // recarrega STATE.producao_terc
            carregarTabelaSaldoMetros();
        }
    } catch (err) {
        showToast("Erro ao excluir: " + err.message, true);
    } finally {
        showLoading(false);
    }
}

async function lancarAjusteManualMetros() {
    const tercId = document.getElementById('saldo-terc-id').value;
    const data = document.getElementById('ajuste-metros-data').value;
    const metros = parseFloat(document.getElementById('ajuste-metros-valor').value);
    const justificativa = document.getElementById('ajuste-metros-justificativa').value;
    
    if (!data || isNaN(metros) || metros <= 0) {
        return showToast('Preencha data e metragem válida.', true);
    }
    
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc || !terc.obra_atual_id) {
        return showToast('Terceirizado sem obra vinculada.', true);
    }
    
    showLoading(true);
    
    const payload = {
        id: crypto.randomUUID(),
        terceirizado_id: tercId,
        obra_id: terc.obra_atual_id,
        data_registro: data,
        metros: metros,
        status: 'PENDENTE',
        observacao: justificativa || 'Ajuste manual'
    };
    
    const { error } = await sb.from('jsp_producao_terc').insert([payload]);
    if (error) {
        showLoading(false);
        return showToast('Erro ao lançar ajuste: ' + error.message, true);
    }
    
    await loadData();
    carregarTabelaSaldoMetros();
    showToast('Ajuste lançado com sucesso!');
}

async function fecharPagamentoSaldoMetros() {
    const tercId = document.getElementById('saldo-terc-id').value;
    const dataInicio = document.getElementById('saldo-metros-data-inicio').value;
    const dataFim = document.getElementById('saldo-metros-data-fim').value;
    
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc) return;
    
    let registros = STATE.producao_terc.filter(p => 
        p.terceirizado_id === tercId && p.status !== 'PAGO'
    );
    
    if (dataInicio) {
        registros = registros.filter(p => p.data_registro >= dataInicio);
    }
    if (dataFim) {
        registros = registros.filter(p => p.data_registro <= dataFim);
    }
    
    if (registros.length === 0) {
        return showToast('Nenhum registro pendente para fechar.', true);
    }
    
    const totalMetros = registros.reduce((sum, r) => sum + parseFloat(r.metros), 0);
    const valorTotal = totalMetros * parseFloat(terc.valor_metro || 0);
    
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const periodoDesc = dataIniFormatada && dataFimFormatada ? `${dataIniFormatada} a ${dataFimFormatada}` : 'período selecionado';
    
    if (!confirm(`Fechar pagamento de ${totalMetros.toFixed(2)} metros no valor de ${formatMoney(valorTotal)}?`)) return;
    
    showLoading(true);
    
    const descricao = `Pagamento de metragem - ${terc.nome} - Período ${periodoDesc}`;
    const { error: errFin } = await sb.from('jsp_logs').insert([{
        id: getNextIdNum(STATE.logs).toString(),
        obra_id: terc.obra_atual_id ? parseInt(terc.obra_atual_id) : null,
        tipo: 'despesa',
        produto_nome: descricao,
        valor_total: valorTotal,
        data: new Date().toISOString(),
        vencimento: new Date().toISOString(),
        status_financeiro: 'PENDENTE',
        categoria: 'Mão de Obra (Terceirizado)',
        observacao: `Fechamento de metragem - Terceirizado: ${terc.nome} - Total metros: ${totalMetros.toFixed(2)}`
    }]);
    
    if (errFin) {
        showLoading(false);
        return showToast('Erro ao gerar despesa: ' + errFin.message, true);
    }
    
    const ids = registros.map(r => r.id);
    const { error: errProd } = await sb.from('jsp_producao_terc')
        .update({ status: 'PAGO' })
        .in('id', ids);
    
    if (errProd) {
        showLoading(false);
        return showToast('Erro ao atualizar registros: ' + errProd.message, true);
    }
    
    await loadData();
    fecharModalSaldoMetros();
    renderEquipe();
    showToast('Pagamento fechado! Despesa lançada como pendente.');
}

async function estornarUltimoFechamentoMetros() {
    const tercId = document.getElementById('saldo-terc-id').value;
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc) return;

    // Busca a despesa mais recente gerada para este terceirizado (metragem)
    const despesas = STATE.logs.filter(l => 
        l.tipo === 'despesa' &&
        l.produto_nome && l.produto_nome.includes(`Pagamento de metragem - ${terc.nome}`) &&
        (l.status_financeiro === 'PENDENTE' || l.status_financeiro === 'PAGO')
    ).sort((a, b) => new Date(b.data) - new Date(a.data));

    if (despesas.length === 0) {
        return showToast('Nenhum pagamento de metragem encontrado para estornar.', true);
    }

    const ultimaDespesa = despesas[0];
    
    // Extrai período da descrição (formato "Pagamento de metragem - Nome - Período dd/mm/aaaa a dd/mm/aaaa")
    let periodo = null;
    const match = ultimaDespesa.produto_nome.match(/Período (.*)$/);
    if (match) {
        periodo = match[1];
    }

    let confirmMsg = `Estornar o pagamento de ${formatMoney(ultimaDespesa.valor_total)} (${ultimaDespesa.status_financeiro})?`;
    if (periodo) confirmMsg += `\nPeríodo: ${periodo}`;
    confirmMsg += `\n\nOs registros de metragem voltarão a ficar pendentes.`;
    
    if (!confirm(confirmMsg)) return;

    showLoading(true);

    // 1. Cancelar a despesa no financeiro
    const { error: errFin } = await sb.from('jsp_logs')
        .update({ status_financeiro: 'CANCELADO' })
        .eq('id', ultimaDespesa.id)
        .eq('tipo', 'despesa');

    if (errFin) {
        showLoading(false);
        return showToast('Erro ao cancelar despesa: ' + errFin.message, true);
    }

    // 2. Reverter status PAGO para PENDENTE nos registros de produção do período
    let query = sb.from('jsp_producao_terc')
        .update({ status: 'PENDENTE' })
        .eq('terceirizado_id', tercId)
        .eq('status', 'PAGO');

    if (periodo) {
        // Tenta extrair datas do período (formato "dd/mm/aaaa a dd/mm/aaaa")
        const partes = periodo.split(' a ');
        if (partes.length === 2) {
            const dataInicio = partes[0].split('/').reverse().join('-');
            const dataFim = partes[1].split('/').reverse().join('-');
            query = query.gte('data_registro', dataInicio).lte('data_registro', dataFim);
        }
    }

    const { error: errProd } = await query;

    if (errProd) {
        showLoading(false);
        return showToast('Erro ao reverter registros de metragem: ' + errProd.message, true);
    }

    await loadData();
    carregarTabelaSaldoMetros();
    renderEquipe();
    showToast('Estorno realizado com sucesso! Despesa cancelada e metragens liberadas.');
}

function imprimirExtratoSaldoMetros() {
    const tercId = document.getElementById('saldo-terc-id').value;
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    const dataInicio = document.getElementById('saldo-metros-data-inicio').value;
    const dataFim = document.getElementById('saldo-metros-data-fim').value;
    const statusFiltro = document.getElementById('saldo-metros-filtro-status').value;
    const totalMetros = document.getElementById('saldo-metros-total-metros').innerText;
    const valorTotal = document.getElementById('saldo-metros-total-valor').innerText;
    
    const tbody = document.getElementById('saldo-metros-tabela-body');
    const linhas = Array.from(tbody.querySelectorAll('tr')).map(tr => {
        const tds = tr.querySelectorAll('td');
        return {
            data: tds[0]?.innerText || '',
            metros: tds[1]?.innerText || '',
            status: tds[2]?.innerText || ''
        };
    });
    
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim';
    const periodoExibicao = `${dataIniFormatada} a ${dataFimFormatada}`;
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    let html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 25px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 70px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900;">EXTRATO DE METRAGEM</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #1d4ed8; font-weight: bold;">${terc.nome}</p>
                    <p style="margin: 2px 0 0 0; font-size: 12px;">Período: ${periodoExibicao} | Valor Metro: ${formatMoney(terc.valor_metro)}</p>
                    <p style="margin: 2px 0 0 0; font-size: 11px;">Status: ${statusFiltro}</p>
                </div>
            </div>
            
            <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 12px; border: 1px solid #cbd5e1;">Data</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Metros</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    linhas.forEach(l => {
        html += `<tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${l.data}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${l.metros}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${l.status}</td>
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
            
            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                <div style="width: 300px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: bold;">Total de Metros:</span>
                        <span style="font-weight: 900; font-size: 16px;">${totalMetros}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                        <span style="font-weight: bold;">Valor a Pagar:</span>
                        <span style="font-weight: 900; color: #1d4ed8; font-size: 18px;">${valorTotal}</span>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 60px;">
                <div style="text-align: center; width: 40%;">
                    <div style="border-top: 1px solid #94a3b8; padding-top: 10px;">
                        <strong>RV NEGÓCIOS E COMPANHIA</strong><br>
                        <span style="font-size: 11px;">Contratante</span>
                    </div>
                </div>
                <div style="text-align: center; width: 40%;">
                    <div style="border-top: 1px solid #94a3b8; padding-top: 10px;">
                        <strong>${terc.nome.toUpperCase()}</strong><br>
                        <span style="font-size: 11px;">Profissional</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                Emitido em ${hoje} - RV Negócios
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = html;
    setTimeout(() => window.print(), 300);
}

function imprimirReciboMetrosDoModal() {
    const tercId = document.getElementById('saldo-terc-id').value;
    const terc = STATE.terceirizados.find(t => t.id === tercId);
    if (!terc) return;
    
    const totalMetros = document.getElementById('saldo-metros-total-metros').innerText;
    const valorTotal = document.getElementById('saldo-metros-total-valor').innerText;
    const dataInicio = document.getElementById('saldo-metros-data-inicio').value;
    const dataFim = document.getElementById('saldo-metros-data-fim').value;
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const periodo = dataIniFormatada && dataFimFormatada ? `${dataIniFormatada} a ${dataFimFormatada}` : 'período selecionado';
    
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; width: 100%; border: 2px solid #1e293b; padding: 30px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 900;">RECIBO DE METRAGEM</h1>
                    <p style="margin: 5px 0 0 0; font-size: 18px; color: #1d4ed8; font-weight: bold;">VALOR: ${valorTotal}</p>
                </div>
            </div>
            
            <div style="font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 40px;">
                Recebi(emos) de <strong>RV NEGÓCIOS E COMPANHIA</strong> (CNPJ: 61.893.912/0001-24), a importância de <strong>${valorTotal}</strong>, 
                referente ao pagamento de produção por metragem no período de <strong>${periodo}</strong>, totalizando <strong>${totalMetros} metros</strong> 
                com o valor acordado de <strong>${formatMoney(terc.valor_metro)} por metro</strong>.
            </div>
            
            <div style="font-size: 14px; margin-bottom: 40px;">
                Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos legais.
            </div>
            
            <div style="text-align: center; margin-bottom: 30px; font-size: 14px;">
                Jataí - GO, ${hoje}.
            </div>
            
            <div style="margin-top: 60px; display: flex; justify-content: center;">
                <div style="text-align: center; width: 60%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>${terc.nome.toUpperCase()}</strong><br>
                    <span style="font-size: 12px; color: #64748b;">CPF/CNPJ: ${terc.cpf_cnpj || '_______________________'} | RG: ${terc.rg || '_______________________'}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = html;
    setTimeout(() => window.print(), 300);
}



      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      async function excluirRegistroPonto(registroId) {
          const senha = prompt("🔐 Ação restrita. Digite a senha mestra para excluir o registro:");
          if (senha !== "147258369") {
              alert("Senha incorreta. Operação cancelada.");
              return;
          }
          if (!confirm("Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.")) {
              return;
          }
          
          showLoading(true);
          try {
              const { error } = await sb.from('jsp_ponto_diario').delete().eq('id', registroId);
              if (error) throw error;
              showToast("Registro excluído com sucesso.");
              // Recarrega os dados e atualiza a tabela do modal
              await loadData();
              carregarTabelaSaldo();
          } catch (err) {
              showToast("Erro ao excluir: " + err.message, true);
          } finally {
              showLoading(false);
          }
      }

// Lança um ajuste manual (meia diária)
async function lancarAjusteManual() {
    const funcId = document.getElementById('saldo-equipe-id').value;
    const data = document.getElementById('ajuste-data').value;
    const fracao = parseFloat(document.getElementById('ajuste-fracao').value);
    const justificativa = document.getElementById('ajuste-justificativa').value;
    
    if (!data || isNaN(fracao) || fracao <= 0) {
        return showToast('Preencha data e fração válida.', true);
    }
    
    const func = STATE.equipe.find(e => e.id === funcId);
    if (!func || !func.obra_atual_id) {
        return showToast('Funcionário sem obra vinculada.', true);
    }
    
    showLoading(true);
    
    // Determinar o próximo ID inteiro
    let nextId = 1;
    if (STATE.ponto_diario && STATE.ponto_diario.length > 0) {
        const maxId = Math.max(...STATE.ponto_diario.map(p => parseInt(p.id) || 0));
        nextId = maxId + 1;
    }
    
    const payload = {
        id: nextId,
        funcionario_id: funcId,
        obra_id: func.obra_atual_id,
        tipo: 'AJUSTE_MANUAL',
        status: 'VALIDADO',
        hora_registro: new Date(data + 'T12:00:00').toISOString(),
        fracao_diaria: fracao,
        observacao: justificativa || 'Ajuste manual',
        pago_em_fechamento: false,
        lat_registro: 'MANUAL',
        lng_registro: 'MANUAL'
    };
    
    const { error } = await sb.from('jsp_ponto_diario').insert([payload]);
    if (error) {
        showLoading(false);
        return showToast('Erro ao lançar ajuste: ' + error.message, true);
    }
    
    await loadData();
    carregarTabelaSaldo();
    showToast('Ajuste lançado com sucesso!');
}

// Fecha o pagamento das diárias pendentes filtradas
// Fecha o pagamento das diárias pendentes filtradas (usando intervalo de datas)
async function fecharPagamentoSaldo() {
    const funcId = document.getElementById('saldo-equipe-id').value;
    const dataInicio = document.getElementById('saldo-filtro-data-inicio').value;
    const dataFim = document.getElementById('saldo-filtro-data-fim').value;
    
    const func = STATE.equipe.find(e => e.id === funcId);
    if (!func) return;
    
    let registros = STATE.ponto_diario.filter(p => 
        p.funcionario_id === funcId && 
        p.status === 'VALIDADO' &&
        !p.pago_em_fechamento
    );
    
    if (dataInicio) {
        registros = registros.filter(p => p.hora_registro >= dataInicio + 'T00:00:00');
    }
    if (dataFim) {
        registros = registros.filter(p => p.hora_registro <= dataFim + 'T23:59:59');
    }
    
    if (registros.length === 0) {
        return showToast('Nenhum registro pendente para fechar.', true);
    }
    
    const totalDiarias = calcularTotalDiariasDosRegistros(registros);
    const valorTotal = totalDiarias * parseFloat(func.valor_diaria || 0);
    
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const periodoDesc = dataIniFormatada && dataFimFormatada ? `${dataIniFormatada} a ${dataFimFormatada}` : 'período selecionado';
    
    if (!confirm(`Fechar pagamento de ${totalDiarias.toFixed(2)} diárias no valor de ${formatMoney(valorTotal)}?`)) return;
    
    showLoading(true);
    
    const descricao = `Pagamento de ponto - ${func.nome} - Período ${periodoDesc}`;
    const { error: errFin } = await sb.from('jsp_logs').insert([{
        id: getNextIdNum(STATE.logs).toString(),
        obra_id: func.obra_atual_id ? parseInt(func.obra_atual_id) : null,
        tipo: 'despesa',
        produto_nome: descricao,
        valor_total: valorTotal,
        data: new Date().toISOString(),
        vencimento: new Date().toISOString(),
        status_financeiro: 'PENDENTE',
        categoria: 'Mão de Obra',
        observacao: `Fechamento de ponto - Funcionário: ${func.nome} - Total diárias: ${totalDiarias.toFixed(2)}`
    }]);
    
    if (errFin) {
        showLoading(false);
        return showToast('Erro ao gerar despesa: ' + errFin.message, true);
    }
    
    const ids = registros.map(r => r.id);
    const { error: errPonto } = await sb.from('jsp_ponto_diario')
        .update({ pago_em_fechamento: true })
        .in('id', ids);
    
    if (errPonto) {
        showLoading(false);
        return showToast('Erro ao atualizar registros: ' + errPonto.message, true);
    }
    
    await loadData();
    fecharModalSaldo();
    renderEquipe();
    showToast('Pagamento fechado! Despesa lançada como pendente.');
}
      
// Função auxiliar para calcular total de diárias a partir de um array de registros
function calcularTotalDiariasDosRegistros(registros) {
    // Agrupa por dia
    const porDia = new Map();
    registros.forEach(p => {
        const dataDia = new Date(p.hora_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        if (!porDia.has(dataDia)) porDia.set(dataDia, []);
        porDia.get(dataDia).push(p);
    });
    
    let total = 0;
    
    function diffMinutesUTC(startIso, endIso) {
        return (new Date(endIso) - new Date(startIso)) / (1000 * 60);
    }
    
    function roundHalfDown(v) {
        if (v <= 0) return 0;
        if (v >= 1) return 1;
        let cents = v * 100;
        let dec = cents - Math.floor(cents);
        if (Math.abs(dec - 0.5) < 0.0001) return Math.floor(cents) / 100;
        return Math.round(cents) / 100;
    }
    
    function calcularFracaoDiaPeriodo(registrosDoDia) {
        const entradas = registrosDoDia.filter(r => r.tipo === 'ENTRADA').map(r => r.hora_registro);
        const saidas   = registrosDoDia.filter(r => r.tipo === 'SAIDA').map(r => r.hora_registro);
        const ajustes  = registrosDoDia.filter(r => r.tipo === 'AJUSTE_MANUAL')
                                .reduce((sum, a) => sum + parseFloat(a.fracao_diaria || 0), 0);
        
        if (entradas.length === 0 && saidas.length === 0) return Math.min(ajustes, 1);
        
        const todosPontos = [
            ...entradas.map(e => ({ tipo: 'E', hora: e })),
            ...saidas.map(s => ({ tipo: 'S', hora: s }))
        ].sort((a, b) => new Date(a.hora) - new Date(b.hora));
        
        let startManha = null, endManha = null;
        let startTarde = null, endTarde = null;
        
        for (const p of todosPontos) {
            const hour = new Date(p.hora).getUTCHours();
            if (hour < 12) {
                if (p.tipo === 'E' && !startManha) startManha = p.hora;
                if (p.tipo === 'S') endManha = p.hora;
            } else {
                if (p.tipo === 'E' && !startTarde) startTarde = p.hora;
                if (p.tipo === 'S') endTarde = p.hora;
            }
        }
        
        function calcMin(start, end, jornada) {
            if (!start || !end) return 0;
            let mins = diffMinutesUTC(start, end);
            const falta = jornada - mins;
            if (falta > 0 && falta <= 10) mins = jornada;
            return Math.min(jornada, Math.max(0, mins));
        }
        
        let minutosManha = calcMin(startManha, endManha, 240);
        let minutosTarde = calcMin(startTarde, endTarde, 240);
        let baseFracao = (minutosManha + minutosTarde) / 480;
        baseFracao = Math.min(1, Math.max(0, baseFracao));
        
        let fracao = baseFracao + ajustes;
        if (fracao > 1) fracao = 1;
        return roundHalfDown(fracao);
    }
    
    for (const registrosDoDia of porDia.values()) {
        total += calcularFracaoDiaPeriodo(registrosDoDia);
    }
    
    return total;
}

      
// Impressão do extrato filtrado
// Impressão do extrato filtrado (usando intervalo de datas)
function imprimirExtratoSaldo() {
    const funcId = document.getElementById('saldo-equipe-id').value;
    const func = STATE.equipe.find(e => e.id === funcId);
    const dataInicio = document.getElementById('saldo-filtro-data-inicio').value;
    const dataFim = document.getElementById('saldo-filtro-data-fim').value;
    const statusFiltro = document.getElementById('saldo-filtro-status').value;
    const totalDiarias = document.getElementById('saldo-total-diarias').innerText;
    const valorTotal = document.getElementById('saldo-total-valor').innerText;
    
    const tbody = document.getElementById('saldo-tabela-body');
    const linhas = Array.from(tbody.querySelectorAll('tr')).map(tr => {
        const tds = tr.querySelectorAll('td');
        return {
            data: tds[0]?.innerText || '',
            horarios: tds[1]?.innerText || '',
            fracao: tds[2]?.innerText || '',
            status: tds[3]?.innerText || ''
        };
    });
    
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim';
    const periodoExibicao = `${dataIniFormatada} a ${dataFimFormatada}`;
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    let html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 25px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 70px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900;">EXTRATO DE PONTO</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #1d4ed8; font-weight: bold;">${func.nome}</p>
                    <p style="margin: 2px 0 0 0; font-size: 12px;">Período: ${periodoExibicao} | Diária: ${formatMoney(func.valor_diaria)}</p>
                    <p style="margin: 2px 0 0 0; font-size: 11px;">Status: ${statusFiltro}</p>
                </div>
            </div>
            
            <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 12px; border: 1px solid #cbd5e1;">Data</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1;">Horários</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Diária</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    linhas.forEach(l => {
        html += `<tr>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${l.data}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1;">${l.horarios}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${l.fracao}</td>
            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${l.status}</td>
        </tr>`;
    });
    
    html += `
                </tbody>
            </table>
            
            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                <div style="width: 300px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-weight: bold;">Total de Diárias:</span>
                        <span style="font-weight: 900; font-size: 16px;">${totalDiarias}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                        <span style="font-weight: bold;">Valor a Pagar:</span>
                        <span style="font-weight: 900; color: #1d4ed8; font-size: 18px;">${valorTotal}</span>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-top: 60px;">
                <div style="text-align: center; width: 40%;">
                    <div style="border-top: 1px solid #94a3b8; padding-top: 10px;">
                        <strong>RV NEGÓCIOS E COMPANHIA</strong><br>
                        <span style="font-size: 11px;">Contratante</span>
                    </div>
                </div>
                <div style="text-align: center; width: 40%;">
                    <div style="border-top: 1px solid #94a3b8; padding-top: 10px;">
                        <strong>${func.nome.toUpperCase()}</strong><br>
                        <span style="font-size: 11px;">Profissional</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                Emitido em ${hoje} - RV Negócios
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = html;
    setTimeout(() => window.print(), 300);
}

// Recibo simples do saldo pendente (chamado pelo botão na linha)
function imprimirReciboSaldo(equipeId) {
    const func = STATE.equipe.find(e => e.id === equipeId);
    if (!func) return;
    
    const saldo = calcularSaldoPendenteFuncionario(equipeId);
    const totalDiarias = saldo.totalDiarias;
    const valorTotal = totalDiarias * parseFloat(func.valor_diaria || 0);
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; width: 100%; border: 2px solid #1e293b; padding: 30px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 900;">RECIBO DE SALDO</h1>
                    <p style="margin: 5px 0 0 0; font-size: 18px; color: #1d4ed8; font-weight: bold;">VALOR: ${formatMoney(valorTotal)}</p>
                </div>
            </div>
            
            <div style="font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 40px;">
                Recebi(emos) de <strong>RV NEGÓCIOS E COMPANHIA</strong> (CNPJ: 61.893.912/0001-24), a importância de <strong>${formatMoney(valorTotal)}</strong>, 
                referente ao saldo de diárias trabalhadas e ainda não pagas, totalizando <strong>${totalDiarias.toFixed(2)} dias</strong> 
                com a diária acordada em <strong>${formatMoney(func.valor_diaria)}</strong>.
            </div>
            
            <div style="font-size: 14px; margin-bottom: 40px;">
                Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos legais.
            </div>
            
            <div style="text-align: center; margin-bottom: 30px; font-size: 14px;">
                Jataí - GO, ${hoje}.
            </div>
            
            <div style="margin-top: 60px; display: flex; justify-content: center;">
                <div style="text-align: center; width: 60%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>${func.nome.toUpperCase()}</strong><br>
                    <span style="font-size: 12px; color: #64748b;">CPF: ${func.cpf || '_______________________'} | RG: ${func.rg || '_______________________'}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = html;
    setTimeout(() => window.print(), 300);
}

      

       function openEquipeForm(id, tipoOrigem = 'equipe') {
          document.getElementById('equipe-form-container').classList.remove('hidden');
          const catSelect = document.getElementById('eqp-cat');
          const tipoHidden = document.getElementById('eqp-tipo-origem');
          
          if (id) {
              if (tipoOrigem === 'terceirizado') {
                  const t = STATE.terceirizados.find(x => x.id == id);
                  if (t) {
                      document.getElementById('eqp-id').value = t.id;
                      document.getElementById('eqp-name').value = t.nome || '';
                      catSelect.value = 'Terceirizado';
                      document.getElementById('eqp-phone').value = t.telefone || '';
                      document.getElementById('eqp-cpf').value = t.cpf_cnpj || '';
                      document.getElementById('eqp-rg').value = t.rg || '';
                      document.getElementById('eqp-endereco').value = t.endereco || '';
                      document.getElementById('eqp-pix').value = t.chave_pix || '';
                      document.getElementById('eqp-obra').value = t.obra_atual_id || '';
                      document.getElementById('eqp-contrato').value = t.data_contrato || ''; // ✅ agora carrega a data do contrato
                      document.getElementById('eqp-diaria').value = t.valor_metro || '';
                      tipoHidden.value = 'terceirizado';
                      onCategoriaChange();
                  }
              } else {
                  const e = STATE.equipe.find(x => x.id == id);
                  if (e) {
                      document.getElementById('eqp-id').value = e.id;
                      document.getElementById('eqp-name').value = e.nome;
                      catSelect.value = e.categoria || 'Servente';
                      document.getElementById('eqp-phone').value = e.telefone || '';
                      document.getElementById('eqp-cpf').value = e.cpf || '';
                      document.getElementById('eqp-rg').value = e.rg || '';
                      document.getElementById('eqp-endereco').value = e.endereco || '';
                      document.getElementById('eqp-pix').value = e.chave_pix || '';
                      document.getElementById('eqp-obra').value = e.obra_atual_id || '';
                      document.getElementById('eqp-contrato').value = e.data_contrato || '';
                      document.getElementById('eqp-diaria').value = e.valor_diaria || '';
                      tipoHidden.value = 'equipe';
                      onCategoriaChange();
                  }
              }
          } else {
              document.getElementById('equipe-form-container').querySelector('form').reset();
              document.getElementById('eqp-id').value = '';
              catSelect.value = 'Servente';
              tipoHidden.value = 'equipe';
              onCategoriaChange();
          }
      }
      
      async function saveEquipe(e) {
          e.preventDefault(); 
          showLoading(true);
          
          const id = document.getElementById('eqp-id').value;
          const isNew = !id;
          const tipoOrigem = document.getElementById('eqp-tipo-origem').value;
          
          const nome = document.getElementById('eqp-name').value;
          const categoria = document.getElementById('eqp-cat').value;
          const telefone = document.getElementById('eqp-phone').value;
          const cpf = document.getElementById('eqp-cpf').value;
          const rg = document.getElementById('eqp-rg').value;
          const endereco = document.getElementById('eqp-endereco').value;
          const chave_pix = document.getElementById('eqp-pix').value;
          const obra_id = document.getElementById('eqp-obra').value || null;
          const valor_base = parseFloat(document.getElementById('eqp-diaria').value) || 0;
          const data_contrato = document.getElementById('eqp-contrato').value || null;
          
          if (tipoOrigem === 'terceirizado') {
              const payload = {
                  nome,
                  cpf_cnpj: cpf,
                  rg,
                  telefone,
                  chave_pix,
                  endereco,
                  obra_atual_id: obra_id,
                  valor_metro: valor_base,
                  data_contrato: data_contrato      // ✅ campo adicionado
              };
              
              if (!isNew) {
                  payload.id = id;
              } else {
                  payload.id = crypto.randomUUID();
                  payload.ativo = true;
              }
              
              const { error } = await sb.from('jsp_terceirizados').upsert(payload);
              if (error) {
                  showLoading(false);
                  return showToast("Erro ao salvar terceirizado: " + error.message, true);
              }
          } else {
              const payload = {
                  nome,
                  categoria,
                  telefone,
                  cpf,
                  rg,
                  endereco,
                  chave_pix,
                  obra_atual_id: obra_id,
                  valor_diaria: valor_base,
                  data_contrato
              };
              
              if (!isNew) {
                  payload.id = id;
              } else {
                  payload.id = crypto.randomUUID();
                  payload.ativo = true;
                  payload.contrato_assinado = false;
              }
              
              const { error } = await sb.from('jsp_equipe').upsert(payload);
              if (error) {
                  showLoading(false);
                  return showToast("Erro ao salvar membro da equipe: " + error.message, true);
              }
          }
          
          document.getElementById('equipe-form-container').classList.add('hidden');
          showToast("Cadastro salvo com sucesso!");
          loadData();
      }

      
        // --- Lógica do Ponto ---
        let currentPontoDias = [];
        let currentPontoDiaria = 0;

        function getDiasNoMes(mes, ano) { return new Date(ano, mes, 0).getDate(); }

        // ==========================================================
        // CONTROLE DO MODAL DE PONTO (NOVO FLUXO)
        // ==========================================================
        
        function openPontoModal(equipe_id) {
            const e = STATE.equipe.find(x => x.id == equipe_id);
            if(!e) return;
        
            const mes = document.getElementById('eqp-filter-mes').value;
            const ano = document.getElementById('eqp-filter-ano').value;
            currentPontoDiaria = parseFloat(e.valor_diaria || 0);
        
            document.getElementById('ponto-modal-subtitle').innerText = `${e.nome} - Mês: ${mes}/${ano} - Diária Base: ${formatMoney(currentPontoDiaria)}`;
            document.getElementById('ponto-equipe-id').value = e.id;
        
            // Reseta variável de qual modo está ativo
            window.modoPontoAtivo = null;
            window.diariasEletronicasAtivas = undefined; 
        
            // Configura datas padrão do automático (1º até o último dia do mês filtrado)
            const primeiroDia = `${ano}-${mes.padStart(2, '0')}-01`;
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const ultimoDiaStr = `${ano}-${mes.padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
            document.getElementById('ponto-auto-data-ini').value = primeiroDia;
            document.getElementById('ponto-auto-data-fim').value = ultimoDiaStr;
        
            // Prepara tela do modo manual (caso ele escolha)
            let pt = STATE.ponto.find(x => x.equipe_id == e.id && x.mes === mes && x.ano === ano);
            if(pt && pt.dias_marcados) {
                currentPontoDias = Array.isArray(pt.dias_marcados) ? pt.dias_marcados : JSON.parse(pt.dias_marcados);
            } else {
                currentPontoDias = [];
            }
            renderPontoGrid(mes, ano); // Atualiza os quadradinhos e totais do manual
        
            // Volta o modal para a tela de SELEÇÃO
            selecionarModoPonto('selecao');
        
            document.getElementById('ponto-modal').classList.remove('hidden');
            lucide.createIcons();
        }


         function selecionarModoPonto(modo) {
            document.getElementById('ponto-view-selecao').classList.add('hidden');
            document.getElementById('ponto-view-manual').classList.add('hidden');
            document.getElementById('ponto-view-auto').classList.add('hidden');
            
            const btnVoltar = document.getElementById('ponto-btn-voltar');
        
            if (modo === 'selecao') {
                document.getElementById('ponto-view-selecao').classList.remove('hidden');
                btnVoltar.classList.add('hidden');
                window.modoPontoAtivo = null;
            } else if (modo === 'manual') {
                document.getElementById('ponto-view-manual').classList.remove('hidden');
                btnVoltar.classList.remove('hidden');
                window.modoPontoAtivo = 'manual';
            } else if (modo === 'auto') {
                document.getElementById('ponto-view-auto').classList.remove('hidden');
                btnVoltar.classList.remove('hidden');
                window.modoPontoAtivo = 'auto';
                
                // Limpa a tabela para não mostrar lixo de outro funcionário antes de clicar em buscar
                document.getElementById('ponto-auto-tbody').innerHTML = '<tr><td colspan="4" class="text-center p-6 text-slate-400 font-bold text-xs">Clique em Buscar para carregar a folha.</td></tr>';
                document.getElementById('ponto-auto-total-dias').innerText = '0.00';
                document.getElementById('ponto-auto-total-valor').innerText = 'R$ 0,00';
                window.diariasEletronicasAtivas = undefined; 
            }
        }

// -------------------------------------------------------------------
// LÓGICA DO PONTO ELETRÔNICO (BUSCA E CÁLCULO DIRETO NA TELA NOVA)
// -------------------------------------------------------------------
async function buscarRegistrosEletronicos() {
    showLoading(true);
    const funcId = document.getElementById('ponto-equipe-id').value;
    const e = STATE.equipe.find(x => x.id == funcId);
    
    if (!e || !e.obra_atual_id) {
        showLoading(false);
        return showToast("Erro: O colaborador precisa estar vinculado a uma obra.", true);
    }

    const dataIni = document.getElementById('ponto-auto-data-ini').value;
    const dataFim = document.getElementById('ponto-auto-data-fim').value;

    if(!dataIni || !dataFim) {
        showLoading(false);
        return showToast("Preencha as datas de início e fim.", true);
    }

    try {
        const { data, error } = await sb.from('jsp_ponto_diario')
            .select('*')
            .eq('funcionario_id', funcId)
            .eq('obra_id', e.obra_atual_id)
            .eq('status', 'VALIDADO')
            .gte('hora_registro', dataIni + 'T00:00:00Z')
            .lte('hora_registro', dataFim + 'T23:59:59Z')
            .order('hora_registro', { ascending: true });

        if (error) throw error;

        let diasTrabalhados = {};
        
        // Agrupa os horários por Dia registrando o tipo e a hora exata
        (data || []).forEach(ponto => {
            const dataDia = new Date(ponto.hora_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            if(!diasTrabalhados[dataDia]) diasTrabalhados[dataDia] = { pontos: [], rawDate: new Date(ponto.hora_registro) };
            
            diasTrabalhados[dataDia].pontos.push({
                tipo: ponto.tipo,
                hora: new Date(ponto.hora_registro)
            });
        });

        const diasArray = Object.values(diasTrabalhados).sort((a,b) => a.rawDate - b.rawDate);
        let totalDiarias = 0;
        const JORNADA_BASE_HORAS = 8;
        const TOLERANCIA_HORAS = 20 / 60; // Tolerância
        let htmlTabela = '';
        
        // Guardar para impressão
        window.dadosFolhaImpressao = []; 

        if(diasArray.length === 0) {
            document.getElementById('ponto-auto-tbody').innerHTML = '<tr><td colspan="4" class="text-center p-6 text-slate-400 font-bold text-xs">Nenhum registro validado neste período.</td></tr>';
            document.getElementById('ponto-auto-total-dias').innerText = '0.00';
            document.getElementById('ponto-auto-total-valor').innerText = 'R$ 0,00';
            window.diariasEletronicasAtivas = 0;
            showLoading(false);
            return;
        }

        diasArray.forEach(registro => {
            // Ordena cronologicamente os pontos do dia
            let pt = registro.pontos.sort((a, b) => a.hora - b.hora);
            
            let fracao = 0;
            let totalHoras = 0;

            // Pega as entradas e saídas separadas para o fallback caso falte batida
            let entradas = pt.filter(p => p.tipo === 'ENTRADA');
            let saidas = pt.filter(p => p.tipo === 'SAIDA');

            if (entradas.length > 0 && saidas.length > 0) {
                if (pt.length >= 4) {
                    // Cálculo com os 4 pontos (E1, S1, E2, S2)
                    let msManha = pt[1].hora - pt[0].hora;
                    let msTarde = pt[3].hora - pt[2].hora;

                    if (msManha > 0) totalHoras += msManha / (1000 * 60 * 60);
                    if (msTarde > 0) totalHoras += msTarde / (1000 * 60 * 60);
                } else {
                    // Fallback: Se bateu menos de 4x, usa primeira entrada e última saída descontando almoço
                    let diffMilisegundos = saidas[saidas.length - 1].hora - entradas[0].hora;
                    let horasBrutas = diffMilisegundos / (1000 * 60 * 60);
                    if (horasBrutas >= 6) horasBrutas -= 1; // Desconto de almoço
                    totalHoras = horasBrutas;
                }

                // Aplica Tolerância de 10 minutos
                if (totalHoras >= (JORNADA_BASE_HORAS - TOLERANCIA_HORAS) && totalHoras < JORNADA_BASE_HORAS) {
                    totalHoras = JORNADA_BASE_HORAS;
                }

                fracao = totalHoras / JORNADA_BASE_HORAS;

                if (fracao > 1) fracao = 1;
                else if (fracao < 0) fracao = 0;
                else fracao = parseFloat(fracao.toFixed(2));

                totalDiarias += fracao;
            }

            const dataStr = registro.rawDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'});
            
            // Função auxiliar para criar as tags de hora com a cor correta
            const formatHoraHtml = (dateObj, isEntrada) => {
                if (!dateObj) return '<span class="text-slate-300 mx-0.5">--:--</span>';
                const horaStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'});
                return isEntrada 
                    ? `<span class="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold inline-block mx-0.5">${horaStr}</span>`
                    : `<span class="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold inline-block mx-0.5">${horaStr}</span>`;
            };

            // Blocos formatados para exibição no HTML
            let manhaHtml = `${formatHoraHtml(pt[0]?.hora, true)} <span class="text-slate-300 text-[10px] mx-1">➜</span> ${formatHoraHtml(pt[1]?.hora, false)}`;
            let tardeHtml = `${formatHoraHtml(pt[2]?.hora, true)} <span class="text-slate-300 text-[10px] mx-1">➜</span> ${formatHoraHtml(pt[3]?.hora, false)}`;

            // Dados limpos pros 4 slots da impressão
            let e1 = pt.length > 0 ? pt[0].hora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'}) : '--:--';
            let s1 = pt.length > 1 ? pt[1].hora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'}) : '--:--';
            let e2 = pt.length > 2 ? pt[2].hora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'}) : '--:--';
            let s2 = pt.length > 3 ? pt[3].hora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', timeZone: 'UTC'}) : '--:--';

            window.dadosFolhaImpressao.push({ data: dataStr, e1: e1, s1: s1, e2: e2, s2: s2, fracao: fracao });

            htmlTabela += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2 text-xs font-bold text-slate-700 text-center">${dataStr}</td>
                <td class="p-2 text-xs text-center whitespace-nowrap">${manhaHtml}</td>
                <td class="p-2 text-xs text-center whitespace-nowrap">${tardeHtml}</td>
                <td class="p-2 text-xs text-center font-black text-indigo-600">${fracao}</td>
            </tr>`;
        });

        document.getElementById('ponto-auto-tbody').innerHTML = htmlTabela;
        document.getElementById('ponto-auto-total-dias').innerText = totalDiarias.toFixed(2);
        
        let valorDiaria = parseFloat(e.valor_diaria || 0);
        let valorTotalPagar = totalDiarias * valorDiaria;
        document.getElementById('ponto-auto-total-valor').innerText = formatMoney(valorTotalPagar);

        window.diariasEletronicasAtivas = totalDiarias; 

        showLoading(false);
        showToast("Registros carregados!");

    } catch (err) {
        showLoading(false);
        console.error(err);
        showToast("Erro ao buscar registros.", true);
    }
}

async function estornarUltimoFechamento() {
    const funcId = document.getElementById('saldo-equipe-id').value;
    const func = STATE.equipe.find(e => e.id === funcId);
    if (!func) return;

    // Busca a despesa mais recente gerada para este funcionário com a descrição padrão
    const despesas = STATE.logs.filter(l => 
        l.tipo === 'despesa' &&
        l.produto_nome && l.produto_nome.includes(`Pagamento de ponto - ${func.nome}`) &&
        (l.status_financeiro === 'PENDENTE' || l.status_financeiro === 'PAGO')
    ).sort((a, b) => new Date(b.data) - new Date(a.data));

    if (despesas.length === 0) {
        return showToast('Nenhum pagamento de ponto encontrado para estornar.', true);
    }

    const ultimaDespesa = despesas[0];
    
    // Extrai mês/ano da descrição (formato "Pagamento de ponto - Nome - Período MM/AAAA")
    let mesAno = null;
    const match = ultimaDespesa.produto_nome.match(/Período (\d{2})\/(\d{4})/);
    if (match) {
        mesAno = { mes: match[1], ano: match[2] };
    }

    let confirmMsg = `Estornar o pagamento de ${formatMoney(ultimaDespesa.valor_total)} (${ultimaDespesa.status_financeiro})?`;
    if (mesAno) confirmMsg += `\nPeríodo: ${mesAno.mes}/${mesAno.ano}`;
    confirmMsg += `\n\nOs registros de ponto voltarão a ficar pendentes.`;
    
    if (!confirm(confirmMsg)) return;

    showLoading(true);

    // 1. Cancelar a despesa no financeiro
    const { error: errFin } = await sb.from('jsp_logs')
        .update({ status_financeiro: 'CANCELADO' })
        .eq('id', ultimaDespesa.id)
        .eq('tipo', 'despesa');

    if (errFin) {
        showLoading(false);
        return showToast('Erro ao cancelar despesa: ' + errFin.message, true);
    }

    // 2. Reverter marcação pago_em_fechamento nos registros de ponto do período
    let query = sb.from('jsp_ponto_diario')
        .update({ pago_em_fechamento: false })
        .eq('funcionario_id', funcId)
        .eq('pago_em_fechamento', true);

    if (mesAno) {
        const { mes, ano } = mesAno;
        // Calcula o último dia do mês corretamente (lida com fevereiro e anos bissextos)
        const ultimoDia = new Date(ano, mes, 0).getDate();
        const dataInicio = `${ano}-${mes}-01`;
        const dataFim = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
        
        query = query
            .gte('hora_registro', dataInicio)
            .lte('hora_registro', dataFim);
    }

    const { error: errPonto } = await query;

    if (errPonto) {
        showLoading(false);
        return showToast('Erro ao reverter registros de ponto: ' + errPonto.message, true);
    }

    await loadData();
    carregarTabelaSaldo(); // Atualiza o modal
    renderEquipe();        // Atualiza a listagem principal
    showToast('Estorno realizado com sucesso! Despesa cancelada e registros liberados.');
}      

      function imprimirFolhaPontoEletronico() {
    if (!window.dadosFolhaImpressao || window.dadosFolhaImpressao.length === 0) {
        return showToast("Busque os registros primeiro antes de imprimir!", true);
    }

    const funcId = document.getElementById('ponto-equipe-id').value;
    const e = STATE.equipe.find(x => x.id == funcId);
    const dataIni = document.getElementById('ponto-auto-data-ini').value.split('-').reverse().join('/');
    const dataFim = document.getElementById('ponto-auto-data-fim').value.split('-').reverse().join('/');
    
    // Separação para cálculo e exibição
    const totalDiariasFloat = window.diariasEletronicasAtivas;
    const totalDiariasFormatado = totalDiariasFloat.toFixed(2);
    
    // Cálculo do valor total em R$
    const valorDiaria = parseFloat(e.valor_diaria || 0);
    const valorTotalPagar = totalDiariasFloat * valorDiaria;
    
    // Função auxiliar para calcular minutos direto na impressão
    function timeToMinutes(timeStr) {
        if (!timeStr || timeStr === '--:--') return 0;
        const parts = timeStr.split(':');
        return (parseInt(parts[0]) * 60) + parseInt(parts[1]);
    }

    // Mapeando a tabela com a lógica de Atraso/Extra
    let htmlTabelaImp = window.dadosFolhaImpressao.map(i => {
        let diffText = "--";
        let bgColor = "transparent";
        let diffColor = "#333";
        let workedMinutes = 0;

        if (i.e1 !== '--:--') {
            if (i.e2 !== '--:--' && i.s2 !== '--:--') {
                // Cálculo de quem bateu os 4 pontos (E1, S1, E2, S2)
                workedMinutes = (timeToMinutes(i.s1) - timeToMinutes(i.e1)) + (timeToMinutes(i.s2) - timeToMinutes(i.e2));
            } else if (i.s1 !== '--:--') {
                // Fallback de quem esqueceu ponto e só tem entrada e saída final
                workedMinutes = timeToMinutes(i.s1) - timeToMinutes(i.e1);
                if (workedMinutes >= 360) workedMinutes -= 60; // Desconta 1h de almoço automático
            }
            
            const JORNADA_MINUTOS = 480; // 8 horas por dia
            const diff = workedMinutes - JORNADA_MINUTOS;

            // Tolerância de 20 min igual ao motor
            if (diff < -20) { 
                const absDiff = Math.abs(diff);
                const h = Math.floor(absDiff / 60).toString().padStart(2, '0');
                const m = (absDiff % 60).toString().padStart(2, '0');
                diffText = `-${h}h ${m}m`;
                bgColor = "#fef2f2"; // Fundo Vermelho bem clarinho 
                diffColor = "#b91c1c"; // Texto vermelho escuro
            } else if (diff > 20) {
                const h = Math.floor(diff / 60).toString().padStart(2, '0');
                const m = (diff % 60).toString().padStart(2, '0');
                diffText = `+${h}h ${m}m`;
                diffColor = "#15803d"; // Verde escuro
            } else {
                diffText = "Exato";
                diffColor = "#475569"; // Cinza
            }
        }

        return `
        <tr style="background-color: ${bgColor};">
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${i.data}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${i.e1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${i.s1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${i.e2}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${i.s2}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: ${diffColor};">${diffText}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold;">${i.fracao}</td>
        </tr>
        `;
    }).join('');

    const htmlImpressao = `
        <div style="font-family: Arial, sans-serif; color: #000; width: 100%;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px; margin-bottom: 10px;" />
                <h2 style="margin: 0; font-size: 18pt; font-weight: bold;">FOLHA DE PONTO INDIVIDUAL</h2>
                <p style="margin: 5px 0 0 0; font-size: 11pt;">Período Apurado: ${dataIni} a ${dataFim}</p>
            </div>
            
            <div style="margin-bottom: 20px; font-size: 11pt;">
                <strong>Colaborador:</strong> ${(e.nome).toUpperCase()}<br>
                <strong style="color: #1d4ed8;">Chave PIX:</strong> <span style="color: #1d4ed8; font-weight: bold;">${e.chave_pix || 'Não informada'}</span><br>
                <strong>Função:</strong> ${(e.categoria || 'Geral').toUpperCase()}<br>
                <strong>Obra:</strong> ${STATE.obras.find(o => o.id == e.obra_atual_id)?.nome || 'Não definida'}<br>
                <strong>CPF:</strong> ${e.cpf || 'Não informado'}
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 30px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Data</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Entrada 1</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Saída 1</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Entrada 2</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Saída 2</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Saldo (Horas)</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px;">Diária</th>
                    </tr>
                </thead>
                <tbody>
                    ${htmlTabelaImp}
                </tbody>
            </table>

            <div style="text-align: right; font-size: 13pt; margin-bottom: 50px;">
                <strong>TOTAL DE DIÁRIAS APURADAS: ${totalDiariasFormatado}</strong><br>
                <strong style="color: #1d4ed8; font-size: 16pt; display: block; margin-top: 8px;">VALOR A PAGAR: ${formatMoney(valorTotalPagar)}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 60px; font-size: 10pt;">
                <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>RV NEGÓCIOS E COMPANHIA</strong>
                </div>
                <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>${(e.nome).toUpperCase()}</strong><br>
                    Declaro corretas as anotações acima.
                </div>
            </div>
        </div>
    `;

    document.getElementById('print-area').innerHTML = htmlImpressao;
    setTimeout(() => window.print(), 300);
}
      
      
        function renderPontoGrid(mes, ano) {
    const grid = document.getElementById('ponto-grid');
    grid.innerHTML = ''; // Limpa o grid

    // Obtém o dia da semana em que o mês começa (0-Dom, 1-Seg, etc)
    const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
    // Obtém o total de dias no mês
    const totalDiasMes = new Date(ano, mes, 0).getDate();

    let html = '';

    // 1. Cria espaços vazios para alinhar o primeiro dia do mês
    for (let x = 0; x < primeiroDiaSemana; x++) {
        html += `<div class="h-10"></div>`;
    }

    // 2. Cria os botões dos dias
    for (let i = 1; i <= totalDiasMes; i++) {
        const ativo = currentPontoDias.includes(i);
        
        // Estilo dinâmico: azul se marcado, branco se desmarcado
        const classeStatus = ativo 
            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:bg-blue-50';

        html += `
            <div onclick="toggleDiaPonto(${i})" 
                 class="h-10 flex items-center justify-center border rounded-lg font-bold text-sm cursor-pointer transition-all ${classeStatus}">
                ${i}
            </div>`;
    }

    grid.innerHTML = html;
    updatePontoTotais();
}
        function toggleDiaPonto(dia) {
    // Adiciona ou remove o dia do array de seleção
    if(currentPontoDias.includes(dia)) {
        currentPontoDias = currentPontoDias.filter(d => d !== dia);
    } else {
        currentPontoDias.push(dia);
    }
    
    // Pega o mês/ano atuais para re-renderizar o grid com as cores novas
    const mes = document.getElementById('eqp-filter-mes').value;
    const ano = document.getElementById('eqp-filter-ano').value;
    renderPontoGrid(mes, ano);
}
        function updatePontoTotais() {
            const totalDias = currentPontoDias.length;
            const valor = totalDias * currentPontoDiaria;
            document.getElementById('ponto-total-dias').innerText = totalDias;
            document.getElementById('ponto-total-valor').innerText = formatMoney(valor);
        }

        async function savePonto() {
              showLoading(true);
              const equipe_id = document.getElementById('ponto-equipe-id').value;
              const e = STATE.equipe.find(x => x.id == equipe_id);
              const mes = document.getElementById('eqp-filter-mes').value;
              const ano = document.getElementById('eqp-filter-ano').value;
              
              // REGRA DE OURO: Verifica se estamos no modo automático ou manual
              let totalDias = 0;
              
              if (window.modoPontoAtivo === 'auto' && window.diariasEletronicasAtivas !== undefined) {
                  // Se estamos na aba nova, pega o valor exato (com decimais) apurado pela busca
                  totalDias = window.diariasEletronicasAtivas; 
              } else {
                  // Se estamos na aba antiga, conta os botõezinhos clicados
                  totalDias = currentPontoDias.length; 
              }
          
              const valorTotal = totalDias * currentPontoDiaria;
          
              let pt = STATE.ponto.find(x => x.equipe_id == equipe_id && x.mes === mes && x.ano === ano);
              const isNew = !pt;
          
              const payload = {
                  equipe_id: equipe_id,
                  obra_id: e.obra_atual_id,
                  mes: mes,
                  ano: ano,
                  // No modo auto, guardamos o Array vazio no BD, pois a prova do ponto está na tabela jsp_ponto_diario
                  dias_marcados: (window.modoPontoAtivo === 'auto') ? [] : currentPontoDias, 
                  total_dias: totalDias,
                  valor_diaria: currentPontoDiaria,
                  valor_total: valorTotal,
                  status: pt ? pt.status : 'PENDENTE'
              };
          
              if(!isNew) payload.id = pt.id;
          
              const { error } = await sb.from('jsp_ponto').upsert(payload);
              
              if(error) { showLoading(false); return showToast("Erro ao salvar ponto: " + error.message, true); }
              
              document.getElementById('ponto-modal').classList.add('hidden');
              showToast("Fechamento de Ponto salvo com sucesso!"); 
              loadData();
          }

      
        async function pagarMesPonto(ponto_id, equipe_id) {
            if(!confirm("Deseja confirmar o pagamento deste mês? Isso criará uma Despesa automática na Obra atual do funcionário.")) return;
            showLoading(true);

            const mes = document.getElementById('eqp-filter-mes').value;
            const ano = document.getElementById('eqp-filter-ano').value;
            const e = STATE.equipe.find(x => x.id == equipe_id);
            const pt = STATE.ponto.find(x => x.id == ponto_id);

            if(!e || !pt) { showLoading(false); return showToast("Dados inconsistentes", true); }
            if(!e.obra_atual_id) { showLoading(false); return showToast("Funcionário precisa estar vinculado a uma obra para lançar a despesa.", true); }

            const dtPagamento = new Date().toISOString();
            
            // 1. Atualizar status do Ponto para PAGO
            const { error: errPt } = await sb.from('jsp_ponto').update({ status: 'PAGO', data_pagamento: dtPagamento }).eq('id', ponto_id);
            if(errPt) { showLoading(false); return showToast("Erro: " + errPt.message, true); }

            // 2. Lançar no Financeiro
            const desc = `Pagamento Mensal (${mes}/${ano}) - ${e.nome}`;
            const { error: errFin } = await sb.from('jsp_logs').insert([{
                id: getNextIdNum(STATE.logs).toString(),
                obra_id: parseInt(e.obra_atual_id),
                tipo: 'despesa',
                produto_nome: desc,
                valor_total: parseFloat(pt.valor_total),
                data: dtPagamento, vencimento: dtPagamento,
                status_financeiro: 'PAGO',
                categoria: 'Mão de Obra',
                observacao: `Tipo: Mão de Obra | Equipe: ${e.nome} | Dias Trab: ${pt.total_dias}`
            }]);

            if(errFin) { showLoading(false); return showToast("Erro financeiro: " + errFin.message, true); }
            
            showToast("Pagamento e Despesa lançados com sucesso!"); loadData();
        }
function abrirModalFolhaPagamento() {
    const selectObra = document.getElementById('folha-obra');
    selectObra.innerHTML = '<option value="">Todas as Obras</option>' + 
        STATE.obras.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
    
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
    const primeiroDia = `${anoAtual}-${mesAtual}-01`;
    const ultimoDia = new Date(anoAtual, hoje.getMonth() + 1, 0).getDate();
    const ultimoDiaStr = `${anoAtual}-${mesAtual}-${String(ultimoDia).padStart(2, '0')}`;
    
    document.getElementById('folha-data-inicio').value = primeiroDia;
    document.getElementById('folha-data-fim').value = ultimoDiaStr;
    
    document.getElementById('modal-folha-pagamento').classList.remove('hidden');
    lucide.createIcons();
}
      

function executarImpressaoFolha() {
    const statusFinanceiro = document.getElementById('folha-status').value;
    const obraFiltro = document.getElementById('folha-obra').value;
    const statusFunc = document.getElementById('folha-status-func').value;
    const dataInicio = document.getElementById('folha-data-inicio').value;
    const dataFim = document.getElementById('folha-data-fim').value;
    
    const colaboradores = getColaboradoresUnificados();
    
    let filtrados = colaboradores.filter(c => {
        if (statusFunc === 'true' && c.ativo === false) return false;
        if (statusFunc === 'false' && c.ativo !== false) return false;
        if (obraFiltro && c.obra_atual_id != obraFiltro) return false;
        return true;
    });
    
    const dadosFolha = [];
    
    filtrados.forEach(c => {
        let valorTotal = 0;
        let quantidade = 0;
        
        if (c.tipo === 'diaria') {
            // Lógica original para diaristas (baseada em despesas financeiras)
            const despesasPonto = STATE.logs.filter(l => 
                l.tipo === 'despesa' &&
                l.produto_nome && l.produto_nome.includes(`Pagamento de ponto - ${c.nome}`) &&
                (statusFinanceiro === 'TODOS' || l.status_financeiro === statusFinanceiro)
            );
            
            let despesasFiltradas = despesasPonto;
            if (dataInicio || dataFim) {
                despesasFiltradas = despesasPonto.filter(d => {
                    const dataDesp = d.data ? d.data.split('T')[0] : '';
                    if (dataInicio && dataDesp < dataInicio) return false;
                    if (dataFim && dataDesp > dataFim) return false;
                    return true;
                });
            }
            
            if (despesasFiltradas.length === 0) return;
            
            let totalValor = 0;
            let totalDiarias = 0;
            despesasFiltradas.forEach(d => {
                totalValor += parseFloat(d.valor_total);
                const diariasMatch = d.observacao?.match(/Total diárias: ([\d.]+)/);
                if (diariasMatch) totalDiarias += parseFloat(diariasMatch[1]);
            });
            
            if (totalValor > 0) {
                dadosFolha.push({
                    nome: c.nome,
                    pix: c.chave_pix || 'Não informado',
                    tipo: 'Diária',
                    unidade: 'dias',
                    quantidade: totalDiarias,
                    valor_unitario: c.valor_base,
                    valor_total: totalValor
                });
            }
        } else {
            // ========== NOVA LÓGICA PARA METRAGEM (TERCEIRIZADOS) ==========
            // Agora também busca nas despesas financeiras, igual aos diaristas
            
            // Busca todas as despesas relacionadas a este terceirizado
            const despesasTerc = STATE.logs.filter(l => 
                l.tipo === 'despesa' &&
                l.categoria === 'Mão de Obra (Terceirizado)' &&
                l.observacao && l.observacao.includes(`Terceirizado: ${c.nome}`) &&
                (statusFinanceiro === 'TODOS' || l.status_financeiro === statusFinanceiro)
            );
            
            let despesasFiltradas = despesasTerc;
            if (dataInicio || dataFim) {
                despesasFiltradas = despesasTerc.filter(d => {
                    const dataDesp = d.data ? d.data.split('T')[0] : '';
                    if (dataInicio && dataDesp < dataInicio) return false;
                    if (dataFim && dataDesp > dataFim) return false;
                    return true;
                });
            }
            
            if (despesasFiltradas.length === 0) return;
            
            let totalValor = 0;
            let totalMetros = 0;
            despesasFiltradas.forEach(d => {
                totalValor += parseFloat(d.valor_total);
                // Extrai a metragem salva na observação (padrão: "Metragem: 150.00 m")
                const metrosMatch = d.observacao?.match(/Metragem:\s*([\d\.]+)/);
                if (metrosMatch) totalMetros += parseFloat(metrosMatch[1]);
            });
            
            if (totalValor > 0) {
                dadosFolha.push({
                    nome: c.nome,
                    pix: c.chave_pix || 'Não informado',
                    tipo: 'Metro',
                    unidade: 'm',
                    quantidade: totalMetros,
                    valor_unitario: c.valor_base, // valor por metro do cadastro
                    valor_total: totalValor
                });
            }
        }
    });
    
    if (dadosFolha.length === 0) {
        return showToast('Nenhum registro encontrado com os filtros selecionados.', true);
    }
    
    dadosFolha.sort((a, b) => a.nome.localeCompare(b.nome));
    
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim';
    const periodoExibicao = (dataInicio || dataFim) ? `${dataIniFormatada} a ${dataFimFormatada}` : 'Todos os períodos';
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    let html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 25px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 70px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 900;">FOLHA DE PAGAMENTOS</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #1d4ed8; font-weight: bold;">Status: ${statusFinanceiro === 'PENDENTE' ? 'PENDENTES (NÃO BAIXADOS)' : statusFinanceiro}</p>
                    <p style="margin: 2px 0 0 0; font-size: 12px;">Período: ${periodoExibicao}</p>
                </div>
            </div>
            
            <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: left;">Funcionário / PIX</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Tipo</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Quantidade</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Valor Unit.</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let somaGeral = 0;
    dadosFolha.forEach(d => {
        somaGeral += d.valor_total;
        html += `
            <tr>
                <td style="padding: 10px; border: 1px solid #cbd5e1;">
                    <div style="font-weight: 800;">${d.nome.toUpperCase()}</div>
                    <div style="font-size: 11px; color: #1d4ed8; margin-top: 4px;">
                        <span style="color: #64748b;">PIX:</span> ${d.pix}
                    </div>
                </td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${d.tipo}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${d.quantidade.toFixed(2)} ${d.unidade}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">${formatMoney(d.valor_unitario)}</td>
                <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 900; color: #1d4ed8;">${formatMoney(d.valor_total)}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
                <div style="width: 300px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="font-weight: bold;">TOTAL GERAL:</span>
                        <span style="font-weight: 900; color: #b91c1c; font-size: 18px;">${formatMoney(somaGeral)}</span>
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                Emitido em ${hoje} - RV Negócios
            </div>
        </div>
    `;
    
    document.getElementById('modal-folha-pagamento').classList.add('hidden');
    document.getElementById('print-area').innerHTML = html;
    setTimeout(() => window.print(), 300);
}

        function imprimirRecibo(equipe_id, ponto_id) {
            const mes = document.getElementById('eqp-filter-mes').value;
            const ano = document.getElementById('eqp-filter-ano').value;
            const e = STATE.equipe.find(x => x.id == equipe_id);
            let pt = STATE.ponto.find(x => x.id == ponto_id);
            
            let dias = pt ? parseFloat(pt.total_dias || 0) : 0;
            let diaria = parseFloat(e.valor_diaria || 0);
            let total = pt ? parseFloat(pt.valor_total || 0) : (dias * diaria);
            
            const hoje = new Date().toLocaleDateString('pt-BR');

            const htmlRecibo = `
                <div style="font-family: Arial, sans-serif; width: 100%; border: 2px solid #1e293b; padding: 30px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                        <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
                        <div style="text-align: right;">
                            <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 900;">RECIBO DE PAGAMENTO</h1>
                            <p style="margin: 5px 0 0 0; font-size: 18px; color: #1d4ed8; font-weight: bold;">VALOR: ${formatMoney(total)}</p>
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 40px;">
                        Recebi(emos) de <strong>RV NEGÓCIOS E COMPANHIA</strong> (CNPJ: 61.893.912/0001-24), a importância supra de <strong>${formatMoney(total)}</strong>, 
                        referente ao pagamento de prestação de serviços (${e.categoria || 'Serviços Gerais'}), contabilizando <strong>${dias} dias trabalhados</strong> 
                        com a diária acordada em <strong>${formatMoney(diaria)}</strong>, durante a competência de <strong>${mes}/${ano}</strong>.
                    </div>
                    
                    <div style="font-size: 14px; margin-bottom: 40px;">
                        Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos legais.
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 30px; font-size: 14px;">
                        Jataí - GO, ${hoje}.
                    </div>
                    
                    <div style="margin-top: 60px; display: flex; justify-content: center;">
                        <div style="text-align: center; width: 60%; border-top: 1px solid #000; padding-top: 10px;">
                            <strong>${e.nome}</strong><br>
                            <span style="font-size: 12px; color: #64748b;">CPF: ${e.cpf || '_______________________'} <!--| RG: ${e.rg || '_______________________'}--></span>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('print-area').innerHTML = htmlRecibo;
            setTimeout(() => window.print(), 300);
        }

        function abrirModalDocumentos(equipe_id) {
            const e = STATE.equipe.find(x => x.id == equipe_id);
            document.getElementById('doc-equipe-id').value = e.id;
            document.getElementById('doc-equipe-nome').innerText = `Colaborador: ${e.nome}`;
            
            const btnAssinar = document.getElementById('btn-assinar-doc');
            if(e.contrato_assinado) {
                btnAssinar.innerHTML = `<i data-lucide="check-double" class="w-4 h-4"></i> Contrato Já Assinado`;
                btnAssinar.classList.replace('bg-green-600', 'bg-emerald-700');
                btnAssinar.classList.replace('hover:bg-green-700', 'hover:bg-emerald-800');
            } else {
                btnAssinar.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Marcar como Assinado`;
                btnAssinar.classList.replace('bg-emerald-700', 'bg-green-600');
                btnAssinar.classList.replace('hover:bg-emerald-800', 'hover:bg-green-700');
            }
            
            document.getElementById('modal-docs-equipe').classList.remove('hidden');
            lucide.createIcons();
        }

        async function marcarContratoAssinado() {
    const id = document.getElementById('doc-equipe-id').value;
    const isTerc = STATE.terceirizados.some(t => t.id == id);
    if (isTerc) {
        showToast("Contrato de terceirizado em desenvolvimento.", false);
        document.getElementById('modal-docs-equipe').classList.add('hidden');
        return;
    }
    
    showLoading(true);
    const { error } = await sb.from('jsp_equipe').update({ contrato_assinado: true }).eq('id', id);
    if(error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    showToast("Contrato marcado como assinado com sucesso!");
    document.getElementById('modal-docs-equipe').classList.add('hidden');
    loadData();
}
      

        function toggleEquipeSelect() {
            const tipo = document.getElementById('exp-tipo').value;
            const wrap = document.getElementById('exp-equipe-wrapper');
            if(tipo === 'Mão de Obra') {
                wrap.classList.remove('hidden');
                document.getElementById('exp-equipe').innerHTML = '<option value="">-- Selecione o membro (Opcional) --</option>' + STATE.equipe.map(e => `<option value="${e.nome}">${e.nome} (${e.categoria || 'Geral'})</option>`).join('');
            } else {
                wrap.classList.add('hidden');
                document.getElementById('exp-equipe').value = '';
            }
        }


 // =====================================================================
// MOTOR DE CÁLCULO DE HORAS (QR CODE) PARA DIÁRIAS
// =====================================================================
async function calcularDiariasPorHora(funcionarioId, obraId, dataInicioIso, dataFimIso) {
    try {
        const { data, error } = await sb.from('jsp_ponto_diario')
            .select('*')
            .eq('funcionario_id', funcionarioId)
            .eq('obra_id', obraId)
            .eq('status', 'VALIDADO')
            .gte('hora_registro', dataInicioIso + 'T00:00:00Z')
            .lte('hora_registro', dataFimIso + 'T23:59:59Z')
            .order('hora_registro', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) return 0;

        let diasTrabalhados = {};
        
        data.forEach(ponto => {
            const dataDia = new Date(ponto.hora_registro).toLocaleDateString('pt-BR');
            if(!diasTrabalhados[dataDia]) diasTrabalhados[dataDia] = { pontos: [] };
            
            diasTrabalhados[dataDia].pontos.push({
                tipo: ponto.tipo,
                hora: new Date(ponto.hora_registro)
            });
        });

        let totalDiarias = 0;
        const JORNADA_BASE_HORAS = 8; 
        const TOLERANCIA_HORAS = 20 / 60; // tolerância

        for (let dia in diasTrabalhados) {
            let pt = diasTrabalhados[dia].pontos.sort((a, b) => a.hora - b.hora);
            let entradas = pt.filter(p => p.tipo === 'ENTRADA');
            let saidas = pt.filter(p => p.tipo === 'SAIDA');
            
            let totalHoras = 0;

            if (entradas.length > 0 && saidas.length > 0) {
                if (pt.length >= 4) {
                    let msManha = pt[1].hora - pt[0].hora;
                    let msTarde = pt[3].hora - pt[2].hora;

                    if (msManha > 0) totalHoras += msManha / (1000 * 60 * 60);
                    if (msTarde > 0) totalHoras += msTarde / (1000 * 60 * 60);
                } else {
                    let diffMilisegundos = saidas[saidas.length - 1].hora - entradas[0].hora;
                    let horasBrutas = diffMilisegundos / (1000 * 60 * 60);
                    if (horasBrutas >= 6) horasBrutas -= 1; 
                    totalHoras = horasBrutas;
                }

                // Applica a tolerância para bater no cálculo da diária cheia
                if (totalHoras >= (JORNADA_BASE_HORAS - TOLERANCIA_HORAS) && totalHoras < JORNADA_BASE_HORAS) {
                    totalHoras = JORNADA_BASE_HORAS;
                }

                let fracao = totalHoras / JORNADA_BASE_HORAS;

                if (fracao > 1) fracao = 1;
                else if (fracao < 0) fracao = 0;
                else fracao = parseFloat(fracao.toFixed(2));

                totalDiarias += fracao;
            }
        }
        return totalDiarias;
    } catch (err) {
        console.error("Erro ao calcular: ", err);
        return 0;
    }
}

      
      // =====================================================================
// INTEGRAÇÃO COM O FINANCEIRO (FECHAMENTO DA QUINZENA/MÊS)
// =====================================================================
async function preencherFechamentoAutomatico(funcionarioId, obraId, mes, ano) {
    showLoading(true);
    
    let dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    let ultimoDia = new Date(ano, mes, 0).getDate();
    let dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

    let diariasCalculadas = await calcularDiariasPorHora(funcionarioId, obraId, dataInicio, dataFim);

    const func = STATE.equipe.find(x => x.id == funcionarioId);
    let valorDiaria = parseFloat(func.valor_diaria || 0);
    let valorTotalPagar = diariasCalculadas * valorDiaria;

    // Atualiza a interface visual do Modal do ERP
    document.getElementById('ponto-total-dias').innerText = diariasCalculadas.toFixed(2);
    document.getElementById('ponto-total-valor').innerText = formatMoney(valorTotalPagar);

    // Salva na memória global para a função savePonto capturar depois
    window.diariasEletronicasAtivas = diariasCalculadas;

    showLoading(false);
    showToast(`Ponto Eletrônico: ${diariasCalculadas.toFixed(2)} diárias confirmadas!`);
}

      // Gatilho do botão que puxa os dados da tela e chama o motor
async function puxarHorasDoPontoEletronico() {
    // Pegamos os dados reais que o ERP já colocou no modal
    const funcId = document.getElementById('ponto-equipe-id').value;
    const e = STATE.equipe.find(x => x.id == funcId);
    const mes = document.getElementById('eqp-filter-mes').value;
    const ano = document.getElementById('eqp-filter-ano').value;

    if (!funcId || !e.obra_atual_id) {
        return showToast("Funcionário precisa estar vinculado a uma obra para puxar o ponto eletrônico.", true);
    }

    await preencherFechamentoAutomatico(funcId, e.obra_atual_id, mes, ano);
}

// ==========================================================
// MÓDULO TERCEIRIZADOS (EMPREITEIROS POR METRAGEM)
// ==========================================================

function updateSelectTercObra() {
    // Garante que o select de obra no modal de terceirizados está atualizado
    const el = document.getElementById('terc-obra');
    if(el) el.innerHTML = '<option value="">-- Sem obra fixa --</option>' + STATE.obras.map(o => `<option value="${o.id}">${o.nome}</option>`).join('');
}

function renderTerceirizados() {
    updateSelectTercObra();
    
    const term = document.getElementById('terc-search').value.toLowerCase();
    const dataInicio = document.getElementById('terc-filter-data-inicio')?.value || '';
    const dataFim = document.getElementById('terc-filter-data-fim')?.value || '';
    const statusFiltro = document.getElementById('terc-filter-status').value;
    const pagFiltro = document.getElementById('terc-filter-pagamento').value; 
    const list = document.getElementById('terc-list');
    
    let fil = STATE.terceirizados.filter(t => {
        const bateNome = t.nome.toLowerCase().includes(term) || (t.cpf_cnpj||'').includes(term);
        let bateStatus = true;
        if (statusFiltro !== "todos") {
            const isAtivo = statusFiltro === "true";
            bateStatus = (t.ativo === isAtivo || (isAtivo && t.ativo === undefined));
        }
        return bateNome && bateStatus;
    });

    fil.sort((a, b) => a.nome.localeCompare(b.nome));
    
    const htmlLinhas = fil.map(t => {
        const obraAtual = STATE.obras.find(o => o.id == t.obra_atual_id);
        const nomeObra = obraAtual ? obraAtual.nome : '<span class="text-slate-400 italic font-normal">Geral</span>';
        const valorMetro = parseFloat(t.valor_metro || 0);
        
        const producaoDoPeriodo = STATE.producao_terc.filter(p => {
            if (p.terceirizado_id !== t.id) return false;
            if (dataInicio && p.data_registro < dataInicio) return false;
            if (dataFim && p.data_registro > dataFim) return false;
            return true;
        });

        const metrosPendentes = producaoDoPeriodo.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros || 0), 0);
        const metrosPagos = producaoDoPeriodo.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros || 0), 0);
        
        if (pagFiltro === 'pendente' && metrosPendentes === 0) return '';
        if (pagFiltro === 'pago' && metrosPagos === 0) return '';
      
        const valorPendente = metrosPendentes * valorMetro;
        const valorPago = metrosPagos * valorMetro;

        return `<tr class="border-b hover:bg-slate-50 transition ${t.ativo === false ? 'opacity-60 bg-red-50' : ''}">
            <td class="p-3">
                <div class="font-black text-slate-800 text-sm uppercase truncate max-w-[200px]">${t.nome}</div>
                <div class="flex items-center gap-3 mt-0.5">
                    <span class="text-[10px] text-blue-700 font-bold"><i data-lucide="building" class="w-3 h-3 inline"></i> ${nomeObra}</span>
                    <span class="text-[10px] text-slate-400 font-bold">PIX: ${t.chave_pix || '-'}</span>
                </div>
            </td>
            
            <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1">
                    <span class="font-bold text-slate-600 text-xs">${formatMoney(valorMetro)}</span>
                    <span class="text-[9px] text-slate-400 font-bold uppercase">/m</span>
                </div>
            </td>
            
            <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-3">
                    <span class="text-[11px] font-black text-orange-600 whitespace-nowrap">${metrosPendentes.toFixed(2)}m <span class="text-[9px] text-slate-400 font-bold">PEND.</span></span>
                    <span class="text-slate-200">|</span>
                    <span class="text-[11px] font-black text-green-600 whitespace-nowrap">${metrosPagos.toFixed(2)}m <span class="text-[9px] text-slate-400 font-bold">PAGO</span></span>
                </div>
            </td>
            
            <td class="p-3 text-right">
                <div class="flex items-center justify-end gap-3">
                    <span class="font-black text-sm text-red-600 whitespace-nowrap">${formatMoney(valorPendente)}</span>
                    <span class="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded whitespace-nowrap">Pago: ${formatMoney(valorPago)}</span>
                </div>
            </td>
            
            <td class="p-3">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="openTercProdModal('${t.id}')" class="px-2 py-1.5 bg-slate-800 text-white hover:bg-black rounded shadow font-bold text-[10px] flex items-center gap-1 whitespace-nowrap"><i data-lucide="ruler" width="12"></i> MEDIÇÃO</button>
                    ${valorPendente > 0 ? `<button onclick="baixarPagamentoTerc('${t.id}')" class="px-2 py-1.5 bg-green-600 text-white hover:bg-green-700 rounded shadow font-bold text-[10px] flex items-center gap-1 whitespace-nowrap"><i data-lucide="check-circle" width="12"></i> BAIXAR</button>` : ''}
                    <button onclick="openTercForm('${t.id}')" class="p-1.5 border border-slate-300 text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center"><i data-lucide="edit-3" width="14"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
    
    list.innerHTML = htmlLinhas || `<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium">Nenhuma produção atende a este filtro no período selecionado.</td></tr>`;
    lucide.createIcons();
}
      

function openTercForm(id) {
    updateSelectTercObra();
    document.getElementById('terc-form-container').classList.remove('hidden');
    if(id) {
        const t = STATE.terceirizados.find(x => x.id == id);
        document.getElementById('terc-id').value = t.id;
        document.getElementById('terc-name').value = t.nome;
        document.getElementById('terc-cpf').value = t.cpf_cnpj || '';
        document.getElementById('terc-rg').value = t.rg || '';
        document.getElementById('terc-phone').value = t.telefone || '';
        document.getElementById('terc-pix').value = t.chave_pix || '';
        document.getElementById('terc-endereco').value = t.endereco || '';
        document.getElementById('terc-obra').value = t.obra_atual_id || '';
        document.getElementById('terc-val-metro').value = t.valor_metro || '';
    } else {
        document.getElementById('terc-form-container').querySelector('form').reset();
        document.getElementById('terc-id').value = '';
    }
}

async function saveTerc(e) {
    e.preventDefault(); showLoading(true);
    const isNew = !document.getElementById('terc-id').value;
    const payload = {
        nome: document.getElementById('terc-name').value,
        cpf_cnpj: document.getElementById('terc-cpf').value,
        rg: document.getElementById('terc-rg').value,
        telefone: document.getElementById('terc-phone').value,
        chave_pix: document.getElementById('terc-pix').value,
        endereco: document.getElementById('terc-endereco').value,
        obra_atual_id: document.getElementById('terc-obra').value || null,
        valor_metro: parseFloat(document.getElementById('terc-val-metro').value) || 0
    };
    
    if(isNew) {
        payload.id = crypto.randomUUID();
        payload.ativo = true;
    } else {
        payload.id = document.getElementById('terc-id').value;
    }

    const { error } = await sb.from('jsp_terceirizados').upsert(payload);
    if(error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    
    document.getElementById('terc-form-container').classList.add('hidden');
    showToast("Terceirizado salvo com sucesso!"); loadData();
}

async function toggleStatusTerc(id, isAtivo) {
    if(!confirm(`Tem certeza que deseja ${isAtivo ? 'DESATIVAR' : 'REATIVAR'} este terceirizado?`)) return;
    showLoading(true);
    const { error } = await sb.from('jsp_terceirizados').update({ ativo: !isAtivo }).eq('id', id);
    if(error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    showToast("Status atualizado!"); loadData();
}

// --- Produção Terceirizados ---

function openTercProdModal(id) {
    const t = STATE.terceirizados.find(x => x.id == id);
    if(!t) return;
    
    document.getElementById('prod-terc-id').value = t.id;
    document.getElementById('prod-terc-subtitle').innerText = `${t.nome} - Valor/Metro: ${formatMoney(t.valor_metro)}`;
    document.getElementById('prod-terc-data').value = getTodayDate();
    document.getElementById('prod-terc-metros').value = '';
    
    renderTercProdList(t.id);
    document.getElementById('modal-producao-terc').classList.remove('hidden');
}

function renderTercProdList(id) {
    const dataInicio = document.getElementById('terc-filter-data-inicio')?.value || '';
    const dataFim = document.getElementById('terc-filter-data-fim')?.value || '';
    const t = STATE.terceirizados.find(x => x.id == id);
    
    let prod = STATE.producao_terc.filter(p => {
        if(p.terceirizado_id !== id) return false;
        if (dataInicio && p.data_registro < dataInicio) return false;
        if (dataFim && p.data_registro > dataFim) return false;
        return true;
    });

    prod.sort((a,b) => new Date(b.data_registro) - new Date(a.data_registro));

    let totalMetros = 0;
    
    document.getElementById('prod-terc-list-body').innerHTML = prod.map(p => {
        totalMetros += parseFloat(p.metros);
        const isPago = p.status === 'PAGO';
        const dateStr = new Date(p.data_registro).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
        
        return `<tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 text-xs font-bold text-slate-700">${dateStr}</td>
            <td class="p-3 text-center text-sm font-black text-indigo-700">${p.metros} m</td>
            <td class="p-3 text-center">
                <span class="px-2 py-1 rounded text-[9px] font-bold ${isPago ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${isPago ? 'PAGO' : 'PENDENTE'}</span>
            </td>
            <td class="p-3 text-center">
                ${!isPago ? `<button onclick="deleteProducaoTerc('${p.id}', '${id}')" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2" width="14"></i></button>` : ''}
            </td>
        </tr>`;
    }).join('');

    if(prod.length === 0) {
        document.getElementById('prod-terc-list-body').innerHTML = `<tr><td colspan="4" class="p-6 text-center text-slate-400 font-medium text-xs">Nenhuma medição neste período.</td></tr>`;
    }

    document.getElementById('prod-terc-total-metros').innerText = totalMetros.toFixed(2);
    document.getElementById('prod-terc-total-valor').innerText = formatMoney(totalMetros * parseFloat(t.valor_metro || 0));
    lucide.createIcons();
}

async function lancarProducaoTerc() {
    const tId = document.getElementById('prod-terc-id').value;
    const t = STATE.terceirizados.find(x => x.id == tId);
    const dataReg = document.getElementById('prod-terc-data').value;
    const metros = parseFloat(document.getElementById('prod-terc-metros').value);

    if(!dataReg || isNaN(metros) || metros <= 0) return showToast("Preencha data e metragem válida", true);
    if(!t.obra_atual_id) return showToast("Este terceirizado precisa estar vinculado a uma obra para lançar produção.", true);

    showLoading(true);
    const payload = {
        id: crypto.randomUUID(),
        terceirizado_id: tId,
        obra_id: t.obra_atual_id,
        data_registro: dataReg,
        metros: metros,
        status: 'PENDENTE'
    };

    const { error } = await sb.from('jsp_producao_terc').insert([payload]);
    if(error) { showLoading(false); return showToast("Erro: " + error.message, true); }

    document.getElementById('prod-terc-metros').value = '';
    showToast("Medição lançada com sucesso!");
    await loadData();
    renderTercProdList(tId); // Re-renderiza o grid interno
}

async function deleteProducaoTerc(prodId, tercId) {
    if(!confirm("Remover esta medição?")) return;
    showLoading(true);
    const { error } = await sb.from('jsp_producao_terc').delete().eq('id', prodId);
    if(error) { showLoading(false); return showToast("Erro: " + error.message, true); }
    
    showToast("Medição removida!");
    await loadData();
    renderTercProdList(tercId);
}

// Opcional: Se quiser marcar tudo como pago e jogar no financeiro
async function imprimirReciboTerc(tercId) {
    const t = STATE.terceirizados.find(x => x.id == tercId);
    const mes = document.getElementById('terc-filter-mes').value;
    const ano = document.getElementById('terc-filter-ano').value;
    
    const prod = STATE.producao_terc.filter(p => {
        if(p.terceirizado_id !== tercId) return false;
        const dt = new Date(p.data_registro);
        return String(dt.getUTCMonth() + 1).padStart(2, '0') === mes && String(dt.getUTCFullYear()) === ano;
    });

    const totalMetros = prod.reduce((acc, p) => acc + parseFloat(p.metros), 0);
    const valorMetro = parseFloat(t.valor_metro || 0);
    const totalPagar = totalMetros * valorMetro;

    const hoje = new Date().toLocaleDateString('pt-BR');

    const htmlRecibo = `
        <div style="font-family: Arial, sans-serif; width: 100%; border: 2px solid #1e293b; padding: 30px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 24px; color: #1e293b; font-weight: 900;">RECIBO DE PRODUÇÃO</h1>
                    <p style="margin: 5px 0 0 0; font-size: 18px; color: #1d4ed8; font-weight: bold;">VALOR: ${formatMoney(totalPagar)}</p>
                </div>
            </div>
            
            <div style="font-size: 14px; line-height: 1.8; text-align: justify; margin-bottom: 40px;">
                Recebi(emos) de <strong>RV NEGÓCIOS E COMPANHIA</strong> (CNPJ: 61.893.912/0001-24), a importância supra de <strong>${formatMoney(totalPagar)}</strong>, 
                referente ao pagamento de prestação de serviços por empreitada/produção, contabilizando <strong>${totalMetros.toFixed(2)} metros trabalhados</strong> 
                com o valor fixado em <strong>${formatMoney(valorMetro)} por metro</strong>, durante a competência de <strong>${mes}/${ano}</strong>.
            </div>
            
            <div style="font-size: 14px; margin-bottom: 40px;">
                Para maior clareza, firmo(amos) o presente recibo para que produza os seus efeitos legais.
            </div>
            
            <div style="text-align: center; margin-bottom: 30px; font-size: 14px;">
                Jataí - GO, ${hoje}.
            </div>
            
            <div style="margin-top: 60px; display: flex; justify-content: center;">
                <div style="text-align: center; width: 60%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>${t.nome}</strong><br>
                    <span style="font-size: 12px; color: #64748b;">CPF/CNPJ: ${t.cpf_cnpj || '_______________________'} | RG/IE: ${t.rg || '_______________________'}</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = htmlRecibo;
    setTimeout(() => window.print(), 300);
}

      
function imprimirRelatorioTerc() {
    const dataInicio = document.getElementById('terc-filter-data-inicio')?.value || '';
    const dataFim = document.getElementById('terc-filter-data-fim')?.value || '';
    const buscaNome = document.getElementById('terc-search').value.toLowerCase();
    const statusFiltro = document.getElementById('terc-filter-status').value;
    const pagFiltro = document.getElementById('terc-filter-pagamento').value;
    
    let labelFiltro = pagFiltro === 'pendente' ? 'VALORES PENDENTES A PAGAR' : (pagFiltro === 'pago' ? 'VALORES JÁ PAGOS' : 'PRODUÇÃO TOTAL DO PERÍODO');

    let fil = STATE.terceirizados.filter(t => {
        const bateNome = t.nome.toLowerCase().includes(buscaNome) || (t.cpf_cnpj||'').includes(buscaNome);
        let bateStatus = true;
        if (statusFiltro !== "todos") {
            const isAtivo = statusFiltro === "true";
            bateStatus = (t.ativo === isAtivo || (isAtivo && t.ativo === undefined));
        }
        return bateNome && bateStatus;
    });

    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim';
    const periodoExibicao = (dataInicio || dataFim) ? `${dataIniFormatada} a ${dataFimFormatada}` : 'Todos os períodos';
    const hoje = new Date().toLocaleDateString('pt-BR');

    let htmlRelatorio = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 25px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 55px;" />
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Folha de Terceirizados</h2>
                    <p style="margin: 3px 0 0 0; font-size: 13px; color: #1d4ed8; font-weight: bold;">Período: ${periodoExibicao}</p>
                    <p style="margin: 3px 0 0 0; font-size: 11px; color: #b91c1c; font-weight: bold;">${labelFiltro}</p>
                </div>
            </div>

            <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f8fafc; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">
                        <th style="padding: 10px; border: 1px solid #e2e8f0;">Profissional / Dados PIX</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Vlr. Metro</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Metragem</th>
                        <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let valorGeralPeriodo = 0;
    let encontrouProducao = false;

    fil.forEach(terc => {
        const producaoDoPeriodo = STATE.producao_terc.filter(p => {
            if (p.terceirizado_id !== terc.id) return false;
            if (dataInicio && p.data_registro < dataInicio) return false;
            if (dataFim && p.data_registro > dataFim) return false;
            return true;
        });

        const metrosPendentes = producaoDoPeriodo.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros || 0), 0);
        const metrosPagos = producaoDoPeriodo.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros || 0), 0);
        
        let metrosConsiderados = 0;
        if (pagFiltro === 'pendente') metrosConsiderados = metrosPendentes;
        else if (pagFiltro === 'pago') metrosConsiderados = metrosPagos;
        else metrosConsiderados = metrosPendentes + metrosPagos;

        const valorDoMetro = parseFloat(terc.valor_metro || 0);
        const subtotalPagar = metrosConsiderados * valorDoMetro;

        if (metrosConsiderados > 0) {
            encontrouProducao = true;
            valorGeralPeriodo += subtotalPagar;
            htmlRelatorio += `
                <tr style="font-size: 12px; border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px 10px;">
                        <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${terc.nome.toUpperCase()}</div>
                        <div style="margin-top: 4px; color: #1d4ed8; font-weight: bold; font-size: 11px;">
                            <span style="color: #64748b; font-weight: normal;">CHAVE PIX:</span> ${terc.chave_pix || 'NÃO CADASTRADA'}
                        </div>
                    </td>
                    <td style="padding: 10px; text-align: center; color: #475569;">${formatMoney(valorDoMetro)}</td>
                    <td style="padding: 10px; text-align: center; font-weight: 800; color: #0f172a;">${metrosConsiderados.toFixed(2)} m</td>
                    <td style="padding: 10px; text-align: right; font-weight: 900; color: #1e293b; font-size: 13px;">${formatMoney(subtotalPagar)}</td>
                </tr>
            `;
        }
    });

    if (!encontrouProducao) {
        htmlRelatorio += `<tr><td colspan="4" style="padding: 40px; text-align: center; color: #94a3b8; font-style: italic;">Nenhuma produção encontrada para este filtro.</td></tr>`;
    }

    htmlRelatorio += `
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding: 15px; background-color: #f1f5f9; border-radius: 8px;">
                <div style="text-align: right;">
                    <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">Total da Folha (${pagFiltro})</span>
                    <div style="font-size: 24px; font-weight: 900; color: #b91c1c; margin-top: 5px;">${formatMoney(valorGeralPeriodo)}</div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('print-area').innerHTML = htmlRelatorio;
    setTimeout(() => window.print(), 400);
}
      
       async function baixarPagamentoTerc(tercId) {
    const dataInicio = document.getElementById('terc-filter-data-inicio')?.value || '';
    const dataFim = document.getElementById('terc-filter-data-fim')?.value || '';
    const t = STATE.terceirizados.find(x => x.id == tercId);

    if(!confirm(`Deseja dar baixa (Marcar como PAGO) em TODAS AS MEDIÇÕES PENDENTES no período selecionado para ${t.nome}?`)) return;

    showLoading(true);

    const idsParaPagar = STATE.producao_terc.filter(p => {
        if (p.terceirizado_id !== tercId || p.status === 'PAGO') return false;
        if (dataInicio && p.data_registro < dataInicio) return false;
        if (dataFim && p.data_registro > dataFim) return false;
        return true;
    }).map(p => p.id);

    if (idsParaPagar.length === 0) {
        showLoading(false);
        return showToast("Nada pendente para pagar neste período.", true);
    }

    const { error } = await sb.from('jsp_producao_terc')
        .update({ status: 'PAGO' })
        .in('id', idsParaPagar);

    if(error) { showLoading(false); return showToast("Erro ao baixar: " + error.message, true); }

    showToast(`Baixa realizada com sucesso para ${t.nome}!`);
    await loadData();
    renderTerceirizados();
}
      function imprimirReciboIndividualTerc() {
    // Pega o ID do terceirizado que está aberto no modal
    const tercId = document.getElementById('prod-terc-id').value;
    if (!tercId) return showToast("Nenhum terceirizado selecionado.", true);

    const t = STATE.terceirizados.find(x => x.id == tercId);
    const mes = document.getElementById('terc-filter-mes').value;
    const ano = document.getElementById('terc-filter-ano').value;
    const hoje = new Date().toLocaleDateString('pt-BR');

    // Filtra a produção do mês para este terceirizado
    const prodDoMes = STATE.producao_terc.filter(p => {
        if (p.terceirizado_id !== tercId) return false;
        const dt = new Date(p.data_registro);
        return String(dt.getUTCMonth() + 1).padStart(2, '0') === mes && String(dt.getUTCFullYear()) === ano;
    });

    // Separa os totais (Pagos e Pendentes)
    const metrosPendentes = prodDoMes.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros || 0), 0);
    const metrosPagos = prodDoMes.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros || 0), 0);
    const totalMetros = metrosPendentes + metrosPagos;

    const valorMetro = parseFloat(t.valor_metro || 0);
    const valorPendente = metrosPendentes * valorMetro;
    const valorPago = metrosPagos * valorMetro;
    const valorTotal = totalMetros * valorMetro;

    // Se não tiver produção, avisa e não imprime
    if (totalMetros === 0) {
        return showToast("Não há produção registrada para este mês.", true);
    }

    const htmlRecibo = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; width: 100%; color: #1e293b; padding: 20px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 25px;">
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 60px;" />
                <div style="text-align: right;">
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase;">Extrato de Produção</h1>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #1d4ed8; font-weight: bold;">Competência: ${mes}/${ano}</p>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Emitido em: ${hoje}</p>
                </div>
            </div>

            <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background-color: #f8fafc;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Dados da Contratante</h3>
                    <div style="font-size: 13px; line-height: 1.5; font-weight: bold; color: #334155;">
                        RV NEGÓCIOS E COMPANHIA<br>
                        <span style="font-weight: normal; color: #64748b;">CNPJ: 61.893.912/0001-24</span>
                    </div>
                </div>
                
                <div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Dados do Profissional</h3>
                    <div style="font-size: 13px; line-height: 1.5;">
                        <strong style="color: #0f172a; font-size: 14px;">${t.nome.toUpperCase()}</strong><br>
                        <span style="color: #475569;">CPF/CNPJ:</span> ${t.cpf_cnpj || 'Não informado'} <br>
                        <span style="color: #475569;">CHAVE PIX:</span> <strong style="color: #1d4ed8;">${t.chave_pix || 'Não cadastrada'}</strong>
                    </div>
                </div>
            </div>

            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Demonstrativo Financeiro</h3>
            <table width="100%" style="border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
                <thead>
                    <tr style="background-color: #f1f5f9; text-align: left; color: #475569;">
                        <th style="padding: 12px; border: 1px solid #cbd5e1;">Situação da Medição</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Metragem</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">Vlr. Unitário</th>
                        <th style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #16a34a;">SERVIÇOS JÁ PAGOS (ADIANTAMENTOS)</td>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; color: #16a34a;">${metrosPagos.toFixed(2)} m</td>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">${formatMoney(valorMetro)}</td>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; color: #16a34a;">${formatMoney(valorPago)}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #ea580c;">SERVIÇOS PENDENTES (SALDO A RECEBER)</td>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center; color: #ea580c;">${metrosPendentes.toFixed(2)} m</td>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: center;">${formatMoney(valorMetro)}</td>
                        <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; color: #ea580c; font-weight: bold;">${formatMoney(valorPendente)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr style="background-color: #f8fafc; font-weight: 900; font-size: 15px;">
                        <td style="padding: 15px 12px; border: 1px solid #cbd5e1; text-align: right; color: #0f172a;">PRODUÇÃO TOTAL DO MÊS:</td>
                        <td style="padding: 15px 12px; border: 1px solid #cbd5e1; text-align: center; color: #1d4ed8;">${totalMetros.toFixed(2)} m</td>
                        <td style="padding: 15px 12px; border: 1px solid #cbd5e1; text-align: center;">-</td>
                        <td style="padding: 15px 12px; border: 1px solid #cbd5e1; text-align: right; color: #1d4ed8;">${formatMoney(valorTotal)}</td>
                    </tr>
                </tfoot>
            </table>

            <div style="background-color: ${valorPendente > 0 ? '#fff7ed' : '#f0fdf4'}; border: 2px solid ${valorPendente > 0 ? '#fdba74' : '#86efac'}; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 50px;">
                <span style="font-size: 13px; font-weight: bold; color: ${valorPendente > 0 ? '#c2410c' : '#16a34a'}; text-transform: uppercase;">
                    ${valorPendente > 0 ? 'SALDO LÍQUIDO A RECEBER NESTE EXTRATO' : 'NÃO HÁ VALORES PENDENTES. TUDO PAGO!'}
                </span>
                <div style="font-size: 32px; font-weight: 900; color: ${valorPendente > 0 ? '#b91c1c' : '#15803d'}; margin-top: 5px;">
                    ${formatMoney(valorPendente)}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 80px;">
                <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 10px;">
                    <strong style="font-size: 13px; color: #0f172a;">RV NEGÓCIOS E COMPANHIA</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Contratante</span>
                </div>
                <div style="text-align: center; width: 45%; border-top: 1px solid #94a3b8; padding-top: 10px;">
                    <strong style="font-size: 13px; color: #0f172a;">${t.nome.toUpperCase()}</strong><br>
                    <span style="font-size: 11px; color: #64748b;">Profissional Contratado</span>
                </div>
            </div>
            
            <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                Declaro para os devidos fins que o demonstrativo acima confere com a medição de serviços prestados.<br>
                Jataí - GO, ${hoje}.
            </div>
            
        </div>
    `;

    // Envia para a área de impressão e chama a janela do navegador
    document.getElementById('print-area').innerHTML = htmlRecibo;
    setTimeout(() => {
        window.print();
    }, 400);
}
      
      // ========== MODAL ADMINISTRATIVO DE REGISTROS ==========

async function abrirModalAdminRegistros(funcId) {
    const senha = prompt("🔐 Acesso Restrito. Digite a senha mestra:");
    if (senha !== "147258369") {
        alert("Senha incorreta. Acesso negado.");
        return;
    }
    
    const func = STATE.equipe.find(e => e.id === funcId);
    if (!func) return;
    
    document.getElementById('admin-func-id').value = funcId;
    document.getElementById('admin-registros-subtitle').innerText = 
        `${func.nome} - Todos os registros de ponto`;
    
    await carregarListaAdminRegistros(funcId);
    document.getElementById('modal-admin-registros').classList.remove('hidden');
    lucide.createIcons();
}

function fecharModalAdminRegistros() {
    document.getElementById('modal-admin-registros').classList.add('hidden');
    // Restaura cabeçalhos para diárias
    const thead = document.querySelector('#modal-admin-registros thead tr');
    if (thead) {
        thead.innerHTML = `
            <th class="p-3 text-left text-xs font-bold uppercase">Data/Hora</th>
            <th class="p-3 text-left text-xs font-bold uppercase">Tipo</th>
            <th class="p-3 text-center text-xs font-bold uppercase">Status</th>
            <th class="p-3 text-center text-xs font-bold uppercase">Pago?</th>
            <th class="p-3 text-center text-xs font-bold uppercase w-20">Ações</th>
        `;
    }
}

async function carregarListaAdminRegistros(funcId) {
    const tbody = document.getElementById('admin-registros-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center">Carregando...</td></tr>';
    
    const { data, error } = await sb
        .from('jsp_ponto_diario')
        .select('*')
        .eq('funcionario_id', funcId)
        .order('hora_registro', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">Erro: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        document.getElementById('admin-sem-registros').classList.remove('hidden');
        tbody.innerHTML = '';
        return;
    }
    document.getElementById('admin-sem-registros').classList.add('hidden');
    
    tbody.innerHTML = data.map(reg => {
        const dataHora = new Date(reg.hora_registro).toLocaleString('pt-BR', { timeZone: 'UTC' });
        const tipoBadge = reg.tipo === 'ENTRADA' 
            ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ENTRADA</span>'
            : (reg.tipo === 'SAIDA' 
                ? '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">SAÍDA</span>'
                : '<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold">AJUSTE</span>');
        const statusBadge = reg.status === 'VALIDADO'
            ? '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">VALIDADO</span>'
            : '<span class="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">PENDENTE</span>';
        const pagoBadge = reg.pago_em_fechamento
            ? '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Sim</span>'
            : '<span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-xs">Não</span>';
        
        return `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3 text-xs font-mono">${dataHora}</td>
                <td class="p-3">${tipoBadge}</td>
                <td class="p-3 text-center">${statusBadge}</td>
                <td class="p-3 text-center">${pagoBadge}</td>
                <td class="p-3 text-center">
                    <button onclick="excluirRegistroAdmin('${reg.id}')" class="text-red-500 hover:text-red-700 p-1 rounded transition" title="Excluir permanentemente">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    lucide.createIcons();
}

async function excluirRegistroAdmin(registroId) {
    if (!confirm("Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita.")) {
        return;
    }
    
    showLoading(true);
    try {
        const { error } = await sb.from('jsp_ponto_diario').delete().eq('id', registroId);
        if (error) throw error;
        showToast("Registro excluído com sucesso.");
        
        const funcId = document.getElementById('admin-func-id').value;
        await carregarListaAdminRegistros(funcId);
        // Se o modal de saldo estiver aberto, recarrega a tabela principal também
        if (!document.getElementById('modal-saldo-ponto').classList.contains('hidden')) {
            await loadData(); // recarrega STATE.ponto_diario
            carregarTabelaSaldo();
        }
    } catch (err) {
        showToast("Erro ao excluir: " + err.message, true);
    } finally {
        showLoading(false);
    }
}

      // NOVA FUNÇÃO - Unifica equipe própria e terceirizados para exibição
function getColaboradoresUnificados() {
    const equipe = STATE.equipe.map(e => ({
        ...e,
        tipo: 'diaria',
        valor_base: parseFloat(e.valor_diaria || 0),
        unidade: 'dias',
        table_origin: 'equipe'
    }));

    const terceirizados = STATE.terceirizados.map(t => ({
        ...t,
        nome: t.nome, // já existe, mas garantindo
        categoria: 'Terceirizado (Metro)',
        telefone: t.telefone,
        cpf: t.cpf_cnpj, // padronizando para compatibilidade
        rg: t.rg,
        endereco: t.endereco,
        chave_pix: t.chave_pix,
        obra_atual_id: t.obra_atual_id,
        ativo: t.ativo,
        tipo: 'metro',
        valor_base: parseFloat(t.valor_metro || 0),
        unidade: 'metros',
        table_origin: 'terceirizados'
    }));

    return [...equipe, ...terceirizados];
}

      // NOVA FUNÇÃO - Altera label do campo valor conforme categoria selecionada
    function onCategoriaChange() {
        const cat = document.getElementById('eqp-cat').value;
        const label = document.getElementById('label-valor-base');
        const input = document.getElementById('eqp-diaria');
        const tipoOrigem = document.getElementById('eqp-tipo-origem');
        
        if (cat === 'Terceirizado') {
            label.innerText = 'Valor do Metro (R$)';
            input.placeholder = 'Ex: 50.00';
            tipoOrigem.value = 'terceirizado';
        } else {
            label.innerText = 'Valor da Diária (R$)';
            input.placeholder = '0.00';
            tipoOrigem.value = 'equipe';
        }
    }

      async function toggleStatusTerceirizado(id, isAtivo) {
    const acao = isAtivo ? "DESATIVAR" : "REATIVAR";
    if(!confirm(`Tem certeza que deseja ${acao} este terceirizado?`)) return;
    
    showLoading(true);
    const { error } = await sb.from('jsp_terceirizados').update({ ativo: !isAtivo }).eq('id', id);
    if(error) { 
        showLoading(false); 
        return showToast("Erro: " + error.message, true); 
    }
    showToast(`Status atualizado com sucesso!`); 
    loadData();
}


     function abrirModalDocumentosTerc(id) {
    const t = STATE.terceirizados.find(x => x.id == id);
    if (!t) return;
    
    document.getElementById('doc-equipe-id').value = t.id;
    document.getElementById('doc-equipe-nome').innerText = `Terceirizado: ${t.nome}`;
    
    const btnAssinar = document.getElementById('btn-assinar-doc');
    const assinado = t.contrato_assinado === true;

    btnAssinar.innerHTML = assinado 
        ? `<i data-lucide="check-double" class="w-4 h-4"></i> Contrato Já Assinado`
        : `<i data-lucide="check-circle" class="w-4 h-4"></i> Marcar como Assinado`;
    
    btnAssinar.classList.toggle('bg-emerald-700', assinado);
    btnAssinar.classList.toggle('hover:bg-emerald-800', assinado);
    btnAssinar.classList.toggle('bg-green-600', !assinado);
    btnAssinar.classList.toggle('hover:bg-green-700', !assinado);

    btnAssinar.setAttribute('onclick', assinado ? '' : 'marcarContratoAssinadoTerc()');
    
    document.getElementById('modal-docs-equipe').classList.remove('hidden');
    lucide.createIcons();
}
      

      async function marcarContratoAssinadoTerc() {
          const id = document.getElementById('doc-equipe-id').value;
          const terc = STATE.terceirizados.find(t => t.id == id);
          if (!terc) {
              showToast("Terceirizado não encontrado.", true);
              return;
          }
      
          showLoading(true);
          // ⚠️ Certifique-se de que a tabela 'jsp_terceirizados' tenha a coluna 'contrato_assinado' (boolean).
          // Se não tiver, crie-a no Supabase ou use um campo alternativo (ex: 'ativo').
          const { error } = await sb.from('jsp_terceirizados')
              .update({ contrato_assinado: true })
              .eq('id', id);
      
          if (error) {
              showLoading(false);
              return showToast("Erro: " + error.message, true);
          }
      
          showToast("Contrato marcado como assinado!");
          document.getElementById('modal-docs-equipe').classList.add('hidden');
          loadData(); // recarrega STATE
      }

     function imprimirChecagem() {
    // Obtém os mesmos filtros da tela
    const dataInicio = document.getElementById('eqp-filter-data-inicio').value;
    const dataFim = document.getElementById('eqp-filter-data-fim').value;
    const obraFiltro = document.getElementById('eqp-obra-filter').value;
    const statusFiltro = document.getElementById('eqp-filter-status').value;
    const tipoFiltro = document.getElementById('eqp-filter-tipo').value;

    const colaboradores = getColaboradoresUnificados();

    // Aplica os mesmos filtros da função renderEquipe
    let fil = colaboradores.filter(c => {
        if (obraFiltro && c.obra_atual_id != obraFiltro) return false;
        if (statusFiltro !== "todos") {
            const isAtivo = statusFiltro === "true";
            if ((c.ativo === true || c.ativo === 'true') !== isAtivo) return false;
        }
        if (tipoFiltro !== 'todos' && c.tipo !== tipoFiltro) return false;
        return true;
    });

    // Calcula os valores (diárias ou metros) conforme o período
    const dados = [];
    fil.forEach(c => {
        let quantidade = 0;
        if (c.tipo === 'diaria') {
            const saldo = calcularSaldoPendenteFuncionarioPorPeriodo(c.id, dataInicio, dataFim);
            quantidade = saldo.totalDiarias;
        } else {
            // Para terceirizados: considera APENAS a produção ainda PENDENTE (não paga)
            const producao = STATE.producao_terc.filter(p => {
                if (p.terceirizado_id !== c.id) return false;
                if (dataInicio && p.data_registro < dataInicio) return false;
                if (dataFim && p.data_registro > dataFim) return false;
                return true;
            });
            // Soma apenas os metros com status diferente de 'PAGO' (ou seja, pendentes)
            const metrosPendentes = producao.filter(p => p.status !== 'PAGO').reduce((acc, p) => acc + parseFloat(p.metros), 0);
            quantidade = metrosPendentes;
        }
        if (quantidade > 0 || statusFiltro !== 'true') {
            const obra = STATE.obras.find(o => o.id == c.obra_atual_id);
            dados.push({
                nome: c.nome,
                quantidade: quantidade,
                unidade: c.tipo === 'diaria' ? 'diárias' : 'm',
                obra: obra ? obra.nome : 'Sem obra'
            });
        }
    });

    // Ordena por nome
    dados.sort((a, b) => a.nome.localeCompare(b.nome));

    if (dados.length === 0) {
        showToast('Nenhum dado para exibir.', true);
        return;
    }

    // Monta o HTML de impressão
    const hoje = new Date().toLocaleDateString('pt-BR');
    const dataIniFormatada = dataInicio ? new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início';
    const dataFimFormatada = dataFim ? new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim';
    const periodoExibicao = (dataInicio || dataFim) ? `${dataIniFormatada} a ${dataFimFormatada}` : 'Todo o período';

    let html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1d4ed8; padding-bottom: 15px; margin-bottom: 25px;">
                <div>
                    <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="height: 70px;" />
                    <div style="font-size: 12px; color: #475569; margin-top: 5px;">CNPJ: 61.893.912/0001-24</div>
                    <div style="font-size: 12px; color: #475569;">Rua Mineiros, 530 | Jataí - GO | (64) 99981-5852</div>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 24px; font-weight: 900; color: #0f172a;">PLANILHA DE CHECAGEM</h2>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #1d4ed8; font-weight: bold;">Período: ${periodoExibicao}</p>
                </div>
            </div>

            <table width="100%" style="border-collapse: collapse; font-size: 13px; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Nome</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">Qtd. Diárias / Metros</th>
                        <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: left;">Obra</th>
                    </tr>
                </thead>
                <tbody>
    `;

    dados.forEach(d => {
        html += `<tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${d.nome.toUpperCase()}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${d.quantidade.toFixed(2)} ${d.unidade}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${d.obra}</td>
        </tr>`;
    });

    html += `
                </tbody>
            </table>

            <div style="text-align: center; margin-top: 50px; font-size: 11px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
                Documento gerado em ${hoje} pela RV Negócios.<br>
                Esta planilha é uma checagem rápida e não substitui a folha de pagamento oficial.
            </div>
        </div>
    `;

    document.getElementById('print-area').innerHTML = html;
    setTimeout(() => window.print(), 300);
}      


        async function toggleStatusEquipe(id, isAtivo) {
          const acao = isAtivo ? "DESATIVAR" : "REATIVAR";
          if (!confirm(`Tem certeza que deseja ${acao} este colaborador?`)) return;
          
          showLoading(true);
          try {
              const { error } = await sb.from('jsp_equipe')
                  .update({ ativo: !isAtivo })
                  .eq('id', id);
              if (error) throw error;
              showToast(`Status atualizado com sucesso!`);
              await loadData(); // recarrega a lista e atualiza a tela
          } catch (err) {
              showToast("Erro: " + err.message, true);
          } finally {
              showLoading(false);
          }
}
