 function imprimirDocumento() {
    const id = document.getElementById('doc-equipe-id').value;
    const tipo = document.getElementById('doc-tipo-select').value;
    
    if (!tipo) {
        alert("Por favor, selecione um documento na lista antes de imprimir.");
        return;
    }

    // 🔍 Busca unificada (equipe ou terceirizado)
    let pessoa = STATE.equipe.find(x => x.id == id);
    let isTerc = false;
    if (!pessoa) {
        pessoa = STATE.terceirizados.find(x => x.id == id);
        isTerc = true;
    }

    if (!pessoa) {
        alert("Erro ao encontrar os dados do colaborador.");
        return;
    }

    // 📦 Mapeia os campos para um objeto 'e' compatível com o restante da função
    const e = {
        nome: pessoa.nome || '',
        cpf: isTerc ? (pessoa.cpf_cnpj || '') : (pessoa.cpf || ''),
        rg: pessoa.rg || '',
        endereco: pessoa.endereco || '',
        categoria: isTerc ? 'TERCEIRIZADO (METRO)' : (pessoa.categoria || 'Geral'),
        valor_diaria: isTerc ? parseFloat(pessoa.valor_metro || 0) : parseFloat(pessoa.valor_diaria || 0),
        matricula: isTerc ? 'TERC' : (pessoa.matricula || '000'),
        obra_atual_id: pessoa.obra_atual_id,
        data_contrato: !isTerc ? pessoa.data_contrato : null,
        contrato_assinado: pessoa.contrato_assinado || false  // se houver
    };

    // ========== DAQUI PARA BAIXO, O CÓDIGO PERMANECE EXATAMENTE IGUAL ==========
    const dataAtual = new Date();
    const dia = dataAtual.getDate();
    const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    const mes = meses[dataAtual.getMonth()];
    const ano = dataAtual.getFullYear();
    const dataExtenso = `${dia} de ${mes} de ${ano}`;
    const hojeCurto = dataAtual.toLocaleDateString('pt-BR');
    
    // Busca a obra
    const obraVinculada = STATE.obras.find(o => o.id == e.obra_atual_id);
    const enderecoObra = obraVinculada ? (obraVinculada.endereco || obraVinculada.nome) : 'Endereço não informado / Obra não definida';
    const diariaTexto = formatMoney(e.valor_diaria || 0);
    const matricula = parseFloat(e.matricula || 0);

    // Data de término (da obra)
    let dataTerminoContrato = "____/____/______";
    if (obraVinculada && obraVinculada.data_termino) {
        const partes = obraVinculada.data_termino.split('-');
        dataTerminoContrato = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // Data de início (apenas equipe tem data_contrato)
    let dataInicioContrato = "____/____/______";
    if (e.data_contrato) {
        const p = e.data_contrato.split('-');
        dataInicioContrato = `${p[2]}/${p[1]}/${p[0]}`;
    }    // ---------------------------------------------------------
    
    let titulo = "";
    let corpoTexto = "";
    let nomeContratanteAssinatura = "";

    if (tipo === 'epi') {
        titulo = "FICHA DE EPI / TERMO DE RECEBIMENTO";
        nomeContratanteAssinatura = "RV NEGÓCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="font-size: 12pt; line-height: 1.5; text-align: justify;">
            <p style="margin-bottom: 5px;"><strong>Nome do Prestador de Serviços:</strong> ${(e.nome || '').toUpperCase()}</p>
            <p style="margin-bottom: 15px;"><strong>Atividade a ser desenvolvida:</strong> ${(e.categoria || 'Geral').toUpperCase()}</p>
            
            <p style="margin-bottom: 20px;">"Declaro ter recebido orientação sobre o uso correto dos Equipamentos de Segurança, bem como, estou ciente de que sou obrigado a usá-los sob pena de SUSPENSÃO ou CANCELAMENTO do contrato de prestação dos serviços de autônomo."</p>
            
            <h3 style="text-align: center; font-size: 12pt; margin-bottom: 10px; font-weight: bold;">RECEBIMENTO</h3>
            
            <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #000; font-size: 10pt; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="border: 1px solid #000; padding: 6px;">DATA</th>
                        <th style="border: 1px solid #000; padding: 6px;">EPI (Descrição)</th>
                        <th style="border: 1px solid #000; padding: 6px;">C.A.</th>
                        <th style="border: 1px solid #000; padding: 6px;">QUANT.</th>
                        <th style="border: 1px solid #000; padding: 6px;">Motivo da retirada</th>
                        <th style="border: 1px solid #000; padding: 6px;">Assinatura</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Capacete</td><td style="border: 1px solid #000; padding: 6px;">21420</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;"></td></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Sapato de segurança</td><td style="border: 1px solid #000; padding: 6px;">24312</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;"></td></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Óculos</td><td style="border: 1px solid #000; padding: 6px;">07732</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;"></td></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Protetor Auricular</td><td style="border: 1px solid #000; padding: 6px;">07790</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;"></td></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Luva</td><td style="border: 1px solid #000; padding: 6px;">00501</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;"></td></tr>
                </tbody>
            </table>

            <p style="margin-bottom: 10px;">Eu, <strong>${(e.nome || '').toUpperCase()}</strong>, declaro ter recebido os equipamentos de proteção necessários para execução da função ao qual irei exercer COMO <strong>${(e.categoria || 'SERVENTE').toUpperCase()}</strong> POR OBRA CERTA OU PRAZO DETERMINADO, bem como, o treinamento de utilização da forma correta.</p>
            
            <p>Por fim, estando ciente e de acordo assino este termo de compromisso em duas vias.</p>
        </div>
        `;
    } else if (tipo === 'contrato1') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FORNECIMENTO DE MÃO DE OBRA QUALIFICADA PARA SERVIÇOS DE CONSTRUÇÃO CIVIL <br> SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/2026 | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 40px; margin-bottom: 20px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPRANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 61.893.912/0001-24, com sede na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do RG ${e.rg || '______________'}, inscrito no CPF nº ${e.cpf || '______________'} residente e domiciliado na ${e.endereco || '____________________________________________________'}, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O presente contrato tem como objeto a prestação de serviços com o fornecimento de mão de obra qualificada para execução de obra de construção civil, a serem executados pelo CONTRATADO, compreendendo as atividades descritas no item 1.3.1, conforme:</p>
            
            <div style="margin-left: 40px; margin-bottom: 15px;">
                <div style="margin-bottom: 8px;"><strong>1.1.</strong> O CONTRATADO realizará os serviços com sua própria mão de obra, ou mediante disponibilização de profissional integrante de sua equipe, com qualificações iguais ou superiores às exigidas.</div>
                <div style="margin-bottom: 8px;"><strong>1.2.</strong> No caso de envio de subcontratado, os dados do(s) colaborador(es) deverão ser encaminhados com antecedência mínima de 48 (quarenta e oito) horas, acompanhados de documentos pessoais, comprovação de qualificação e programação dos períodos de atuação na obra.</div>
                <div style="margin-bottom: 8px;"><strong>1.3.</strong> Na execução das atividades, o(s) profissional(is) deverá(ão) realizar os serviços conforme o objeto contratual abaixo:</div>
                <div style="margin-left: 20px; margin-bottom: 8px;"><strong>1.3.1.</strong> Transporte de materiais entre ambientes de descarga até o local de utilização; abastecimento de materiais nos postos indicados pela CONTRATANTE; adequação de espaço para início da obra; auxílio na execução de galpão de almoxarifado, galpão de engenharia e administrativo; limpeza da área de trabalho com destinação adequada dos materiais; demolição de salas desde a cobertura até as fundações; implantação de gabarito; locação de obra; escavação e compactação de fundação; concretagem de blocos de fundação; concretagem de vigas baldrames; concretagem de pilares e vigas superiores; concretagem de laje; desforma de caixarias; impermeabilização de estruturas; produção e transporte de argamassa para alvenaria, chapisco, reboco e emboço; separação e transporte de materiais hidráulicos e elétricos; lixamento de paredes; preparação de áreas para pintura; execução de concreto dosado para pisos e contrapisos; marcação e cortes em alvenaria para passagem de eletrodutos; limpeza do canteiro de obras; quantificação de materiais; produção de argamassa para assentamento de pisos cerâmicos e revestimentos de parede, conforme indicação da CONTRATANTE.</div>
            </div>

            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando normas técnicas e orientações da CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar e exigir o uso de Equipamentos de Proteção Individual (EPIs), responsabilizando-se por sua correta utilização.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por danos causados a terceiros ou à CONTRATANTE por dolo ou culpa.</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Manter disciplina e ordem no local de trabalho.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Emitir recibos de pagamento pelos serviços prestados.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> Arcar com despesas de deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Responsabilizar-se pelo recolhimento de todos os tributos incidentes (ISS, IR, INSS, entre outros).</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Cumprir rigorosamente os prazos estabelecidos.</div>
                <div style="margin-bottom: 5px;"><strong>2.9.</strong> Manter todas as condições de habilitação durante a vigência do contrato.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O CONTRANTE se obriga a:</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer informações e materiais necessários à execução dos serviços.</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar a execução dos serviços.</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar os pagamentos conforme estabelecido.</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar ambiente de trabalho seguro.</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Disponibilizar treinamentos obrigatórios, quando necessário, conforme normas regulamentadoras.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Os serviços serão remunerados conforme entregas executadas e aprovadas, mediante Recibo de Prestação de Serviços.</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor será de <strong>${diariaTexto}</strong> por entrega diária completa.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado a cada 18 (dezoito) dias corridos, com medição quinzenal.</div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> O pagamento será realizado via transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O contrato terá início em <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado até o limite de 24 (vinte e quatro) meses.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="margin-bottom: 30px;">O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 5 (cinco) dias, ou de forma imediata nos casos previstos neste instrumento.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O presente contrato possui natureza civil, não gerando vínculo empregatício, sendo o CONTRATADO integralmente responsável por obrigações fiscais, previdenciárias e trabalhistas.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O CONTRATADO compromete-se a manter sigilo sobre informações da CONTRATANTE.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Em caso de abandono injustificado, valores pendentes somente serão pagos após conclusão da etapa por terceiros e recebimento integral pela CONTRATANTE.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 40px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Alterações somente por escrito.</div>
            </div>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí-GO, para dirimir quaisquer controvérsias.</p>
        </div>`;
    } else if (tipo === 'contrato2') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FORNECIMENTO DE MÃO DE OBRA QUALIFICADA PARA SERVIÇOS DE CONSTRUÇÃO CIVIL <br> SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/2026 | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 40px; margin-bottom: 20px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 61.893.912-0001-24, com sede na Rua Mineiros, sn - Vila Santa Maria, CEP: 75.800-094 - no Município de Jataí, Estado de Goiás, neste ato representada por seu titular NUBIA LAFAIETE APARECIDA DA SILVA, brasileiro(a), portador(a) do CPF nº 320.993.981-00, residente e domiciliado(a) na Rua Mineiros, sn - Vila Santa Maria, CEP: 75.800-094 - no Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do RG ${e.rg || '______________'}, inscrito no CPF nº ${e.cpf || '______________'} residente e domiciliado na ${e.endereco || '____________________________________________________'}, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O presente contrato tem como objeto a prestação de serviços com o fornecimento de mão de obra qualificada para execução de obra de construção civil, a serem executados pelo CONTRATADO, compreendendo as atividades descritas no item 1.3.1, conforme:</p>
            
            <div style="margin-left: 40px; margin-bottom: 15px;">
                <div style="margin-bottom: 8px;"><strong>1.1.</strong> O CONTRATADO realizará os serviços com sua própria mão de obra, ou mediante disponibilização de profissional integrante de sua equipe, com qualificações iguais ou superiores às exigidas.</div>
                <div style="margin-bottom: 8px;"><strong>1.2.</strong> No caso de envio de subcontratado, os dados do(s) colaborador(es) deverão ser encaminhados com antecedência mínima de 48 (quarenta e oito) horas, acompanhados de documentos pessoais, comprovação de qualificação e programação dos períodos de atuação na obra.</div>
                <div style="margin-bottom: 8px;"><strong>1.3.</strong> Na execução das atividades, o(s) profissional(is) deverá(ão) realizar os serviços conforme o objeto contratual abaixo:</div>
                <div style="margin-left: 20px; margin-bottom: 8px; text-align: justify;"><strong>1.3.1.</strong> Coordenação, supervisão e organização das atividades de obra no local de execução dos serviços; orientação e distribuição das tarefas à equipe operacional conforme cronograma definido pela CONTRATANTE; acompanhamento do abastecimento, conferência e correta utilização dos materiais nos pontos indicados; apoio à adequação do espaço para início da obra, incluindo impluração e organização de áreas de almoxarifado, engenharia e administrativo; fiscalização da limpeza e organização da área de trabalho, garantindo a correta destinação dos resíduos e materiais excedentes; acompanhamento das atividades de demolição, desde a cobertura até as fundações, assegurando a execução conforme orientações técnicas; supervisão da implantação de gabarito, locação da obra, escavação, compactação e execução das fundações; acompanhamento das etapas de concretagem de blocos, vigas baldrames, pilares, vigas superiores, lajes e demais elementos estruturais; verificação da correta desforma de caixarias e aplicação de impermeabilizações; controle da produção, transporte e aplicação de argamassas para alvenaria, chapisco, reboco e emboço; orientação quanto à separação, transporte e instalação de materiais hidráulicos e elétricos; supervisão da preparação de superfícies para acabamento, incluindo lixamento, preparo para pintura, execução de pisos e contrapisos; acompanhamento das marcações e cortes em alvenaria para passagem de eletrodutos; controle da limpeza geral do canteiro de obras; apoio à quantificação de materiais e acompanhamento da produção de argamassa para assentamento de pisos cerâmicos e revestimentos, sempre conforme as diretrizes técnicas e orientações da CONTRATANTE.</div>
            </div>

            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando normas técnicas e orientações da CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar e exigir o uso de Equipamentos de Proteção Individual (EPIs), responsabilizando-se por sua correta utilização.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por danos causados a terceiros ou à CONTRATANTE por dolo ou culpa.</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Manter disciplina e ordem no local de trabalho.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Emitir recibos de pagamento pelos serviços prestados.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> Arcar com despesas de deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Responsabilizar-se pelo recolhimento de todos os tributos incidentes (ISS, IR, INSS, entre outros).</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Cumprir rigorosamente os prazos estabelecidos.</div>
                <div style="margin-bottom: 5px;"><strong>2.9.</strong> Manter todas as condições de habilitação durante a vigência do contrato.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O CONTRANTE se obriga a:</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer informações e materiais necessários à execução dos serviços.</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar a execução dos serviços.</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar os pagamentos conforme estabelecido.</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar ambiente de trabalho seguro.</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Disponibilizar treinamentos obrigatórios, quando necessário, conforme normas regulamentadoras.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Os serviços serão remunerados conforme entregas executadas e aprovadas, mediante Recibo de Prestação de Serviços.</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor será de <strong>${diariaTexto}</strong> por entrega diária completa.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado a cada 18 (dezoito) dias corridos, com medição quinzenal.</div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> O pagamento será realizado via transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O contrato terá início em <strong>${dataInicioContrato}</strong> e término em <strong> ${dataTerminoContrato} </strong>, podendo ser prorrogado até o limite de 24 (vinte e quatro) meses.</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 5 (cinco) dias, ou de forma imediata nos casos previstos neste instrumento.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O presente contrato possui natureza civil, não gerando vínculo empregatício, sendo o CONTRATADO integralmente responsável por obrigações fiscais, previdenciárias e trabalhistas.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O CONTRATADO compromete-se a manter sigilo sobre informações da CONTRATANTE.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Em caso de abandono injustificado, valores pendentes somente serão pagos após conclusão da etapa por terceiros e recebimento integral pela CONTRATANTE.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 40px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Alterações somente por escrito.</div>
            </div>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí-GO, para dirimir quaisquer controvérsias.</p>
        </div>`;

       } else if (tipo === 'metragem') {        
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FORNECIMENTO DE MÃO DE OBRA QUALIFICADA PARA SERVIÇOS DE CONSTRUÇÃO CIVIL <br> SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/2026 | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 40px; margin-bottom: 20px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 61.893.912-0001-24, com sede na Rua Mineiros, sn - Vila Santa Maria, CEP: 75.800-094 - no Município de Jataí, Estado de Goiás, neste ato representada por seu titular NUBIA LAFAIETE APARECIDA DA SILVA, brasileiro(a), portador(a) do CPF nº 320.993.981-00, residente e domiciliado(a) na Rua Mineiros, sn - Vila Santa Maria, CEP: 75.800-094 - no Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do RG ${e.rg || '______________'}, inscrito no CPF nº ${e.cpf || '______________'} residente e domiciliado na ${e.endereco || '____________________________________________________'}, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O presente contrato tem como objeto a prestação de serviços com o fornecimento de mão de obra qualificada para execução de obra de construção civil, a serem executados pelo CONTRATADO, compreendendo as atividades descritas no item 1.3.1, conforme:</p>
            
            <div style="margin-left: 40px; margin-bottom: 15px;">
                <div style="margin-bottom: 8px;"><strong>1.1.</strong> O CONTRATADO realizará os serviços com sua própria mão de obra, ou mediante disponibilização de profissional integrante de sua equipe, com qualificações iguais ou superiores às exigidas.</div>
                <div style="margin-bottom: 8px;"><strong>1.2.</strong> No caso de envio de subcontratado, os dados do(s) colaborador(es) deverão ser encaminhados com antecedência mínima de 48 (quarenta e oito) horas, acompanhados de documentos pessoais, comprovação de qualificação e programação dos períodos de atuação na obra.</div>
                <div style="margin-bottom: 8px;"><strong>1.3.</strong> Na execução das atividades, o(s) profissional(is) deverá(ão) realizar os serviços conforme o objeto contratual abaixo:</div>
                <div style="margin-left: 20px; margin-bottom: 8px; text-align: justify;"><strong>1.3.1.</strong> Coordenação, supervisão e organização das atividades de obra no local de execução dos serviços; orientação e distribuição das tarefas à equipe operacional conforme cronograma definido pela CONTRATANTE; acompanhamento do abastecimento, conferência e correta utilização dos materiais nos pontos indicados; apoio à adequação do espaço para início da obra, incluindo impluração e organização de áreas de almoxarifado, engenharia e administrativo; fiscalização da limpeza e organização da área de trabalho, garantindo a correta destinação dos resíduos e materiais excedentes; acompanhamento das atividades de demolição, desde a cobertura até as fundações, assegurando a execução conforme orientações técnicas; supervisão da implantação de gabarito, locação da obra, escavação, compactação e execução das fundações; acompanhamento das etapas de concretagem de blocos, vigas baldrames, pilares, vigas superiores, lajes e demais elementos estruturais; verificação da correta desforma de caixarias e aplicação de impermeabilizações; controle da produção, transporte e aplicação de argamassas para alvenaria, chapisco, reboco e emboço; orientação quanto à separação, transporte e instalação de materiais hidráulicos e elétricos; supervisão da preparação de superfícies para acabamento, incluindo lixamento, preparo para pintura, execução de pisos e contrapisos; acompanhamento das marcações e cortes em alvenaria para passagem de eletrodutos; controle da limpeza geral do canteiro de obras; apoio à quantificação de materiais e acompanhamento da produção de argamassa para assentamento de pisos cerâmicos e revestimentos, sempre conforme as diretrizes técnicas e orientações da CONTRATANTE.</div>
            </div>

            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando normas técnicas e orientações da CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar e exigir o uso de Equipamentos de Proteção Individual (EPIs), responsabilizando-se por sua correta utilização.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por danos causados a terceiros ou à CONTRATANTE por dolo ou culpa.</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Manter disciplina e ordem no local de trabalho.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Emitir recibos de pagamento pelos serviços prestados.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> Arcar com despesas de deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Responsabilizar-se pelo recolhimento de todos os tributos incidentes (ISS, IR, INSS, entre outros).</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Cumprir rigorosamente os prazos estabelecidos.</div>
                <div style="margin-bottom: 5px;"><strong>2.9.</strong> Manter todas as condições de habilitação durante a vigência do contrato.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O CONTRANTE se obriga a:</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer informações e materiais necessários à execução dos serviços.</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar a execução dos serviços.</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar os pagamentos conforme estabelecido.</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar ambiente de trabalho seguro.</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Disponibilizar treinamentos obrigatórios, quando necessário, conforme normas regulamentadoras.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Os serviços serão remunerados conforme entregas executadas e aprovadas, mediante Recibo de Prestação de Serviços.</p>
            <div style="margin-left: 40px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor será de <strong>${diariaTexto}</strong> por metragem diária entregue.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado a cada 18 (dezoito) dias corridos, com medição quinzenal.</div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> O pagamento será realizado via transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O contrato terá início em <strong>${dataInicioContrato}</strong> e término em <strong> ${dataTerminoContrato} </strong>, podendo ser prorrogado até o limite de 24 (vinte e quatro) meses.</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de 5 (cinco) dias, ou de forma imediata nos casos previstos neste instrumento.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O presente contrato possui natureza civil, não gerando vínculo empregatício, sendo o CONTRATADO integralmente responsável por obrigações fiscais, previdenciárias e trabalhistas.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">O CONTRATADO compromete-se a manter sigilo sobre informações da CONTRATANTE.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Em caso de abandono injustificado, valores pendentes somente serão pagos após conclusão da etapa por terceiros e recebimento integral pela CONTRATANTE.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">O contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 40px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Alterações somente por escrito.</div>
            </div>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí-GO, para dirimir quaisquer controvérsias.</p>
        </div>`;
    } else {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS (${tipo.toUpperCase()})`;
        nomeContratanteAssinatura = "CONTRATANTE";
        corpoTexto = `[ESTRUTURA PRONTA - Modelo pendente de configuração.]<br><br>
        <strong>CONTRATADO(A):</strong> ${e.nome}, portador do CPF nº ${e.cpf || '____'}, RG nº ${e.rg || '____'}, residente em ${e.endereco || '____'}.`;
    }

    const htmlDoc = `
        <div style="font-family: 'Times New Roman', Times, serif; width: 100%; padding: 20px 40px; box-sizing: border-box; color: #000;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px;">                
                <img src="https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png" style="display: block; margin: 0 auto; height: 70px;"><br><br>
                <h2 style="margin: 0; font-size: 13pt; font-weight: bold; line-height: 1.3;">${titulo}</h2>
            </div>
            
            <div style="margin-bottom: 40px;">
                ${corpoTexto}<br>
            </div>
            
            <div style="text-align: right; margin-bottom: 80px; font-size: 13pt;">
                Jataí – GO, ____/____/______.<br>
            </div>
            
            <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 10pt;">
                <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>${nomeContratanteAssinatura}</strong><br>
                    CONTRATANTE
                </div>
                <div style="text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 10px;">
                    <strong>${(e.nome || '').toUpperCase()}</strong><br>
                    CONTRATADO(A)
                </div>
            </div>        
        </div>
    `;
    
    document.getElementById('print-area').innerHTML = htmlDoc;
    
    // TEMPO AUMENTADO PARA A RENDERIZAÇÃO FUNCIONAR BEM DE PRIMEIRA
    setTimeout(() => {
        requestAnimationFrame(() => {
            window.print();
        });
    }, 800);
}
