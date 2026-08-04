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
       // matricula: isTerc ? 'TERC' : (pessoa.matricula || '000'),     
        matricula: isTerc ? (pessoa.matricula || '000') : (pessoa.matricula || '000'),
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
  
    

     let dataInicioContrato = "____/____/______";
    if (e.data_contrato) {
        const p = e.data_contrato.split('-');
        dataInicioContrato = `${p[2]}/${p[1]}/${p[0]}`;

    }

      let dataTerminoContrato = "____/____/______";
      // Calcula 120 dias após a data de início do contrato do funcionário
      if (e.data_contrato) {
          const partes = e.data_contrato.split('-');
          const dataInicio = new Date(partes[0], partes[1] - 1, partes[2]);
          dataInicio.setDate(dataInicio.getDate() + 120);
          const dia = String(dataInicio.getDate()).padStart(2, '0');
          const mes = String(dataInicio.getMonth() + 1).padStart(2, '0');
          const ano = dataInicio.getFullYear();
          dataTerminoContrato = `${dia}/${mes}/${ano}`;
      }
  
  // ---------------------------------------------------------
    
    let titulo = "";
    let corpoTexto = "";
    let nomeContratanteAssinatura = "";
    let localVL = "";
    let localCP = "";

 if (tipo === 'epi') {
        titulo = "FICHA DE EPI <br> TERMO DE RECEBIMENTO";
        nomeContratanteAssinatura = "RV NEGÓCIOS E COMPANHIA LTDA";
  
        
         corpoTexto = `
        <div style="font-size: 12pt; line-height: 1.5; text-align: justify;">
            <p style="margin-bottom: 5px;">Nome do Prestador de Serviços: <strong>${(e.nome || '').toUpperCase()}</strong></p>
            <p style="margin-bottom: 15px;">Atividade a ser desenvolvida: <strong>${(e.categoria || 'Geral').toUpperCase()}</strong></p>
            
            <p style="margin-bottom: 20px;">"Declaro ter recebido orientação sobre o uso correto dos Equipamentos de Segurança, bem como, estou ciente de que sou obrigado a usá-los sob pena de SUSPENSÃO ou CANCELAMENTO do contrato de prestação dos serviços de autônomo."</p>
            
            <h3 style="text-align: center; font-size: 12pt; margin-bottom: 10px; font-weight: bold;">RECEBIMENTO</h3>
            
            <table style="width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #000; font-size: 10pt; margin-bottom: 20px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="border: 1px solid #000; padding: 6px;">DATA</th>
                        <th style="border: 1px solid #000; padding: 6px;">EPI (Descrição)</th>
                        <th style="border: 1px solid #000; padding: 6px;">C.A.</th>
                        <th style="border: 1px solid #000; padding: 6px;">QUANT.</th>
                        <!--<th style="border: 1px solid #000; padding: 6px;">Motivo da retirada</th>-->
                        <th style="border: 1px solid #000; padding: 6px;">Assinatura</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Capacete</td><td style="border: 1px solid #000; padding: 6px;">21420</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><!--<td style="border: 1px solid #000; padding: 6px;"></td>--></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Sapato de segurança</td><td style="border: 1px solid #000; padding: 6px;">24312</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><!--<td style="border: 1px solid #000; padding: 6px;"></td>--></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Óculos</td><td style="border: 1px solid #000; padding: 6px;">07732</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><!--<td style="border: 1px solid #000; padding: 6px;"></td>--></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Protetor Auricular</td><td style="border: 1px solid #000; padding: 6px;">07790</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><!--<td style="border: 1px solid #000; padding: 6px;"></td>--></tr>
                    <tr><td style="border: 1px solid #000; padding: 6px;"></td><td style="border: 1px solid #000; padding: 6px;">Luva</td><td style="border: 1px solid #000; padding: 6px;">00501</td><td style="border: 1px solid #000; padding: 6px;">1</td><td style="border: 1px solid #000; padding: 6px;"></td><!--<td style="border: 1px solid #000; padding: 6px;"></td>--></tr>
                </tbody>
            </table>

            <p style="margin-bottom: 10px;">Eu, <strong>${(e.nome || '').toUpperCase()}</strong>, declaro ter recebido os equipamentos de proteção necessários para execução da função ao qual irei exercer como <strong>${(e.categoria || 'descrito em contrato').toUpperCase()}</strong> na obra do endereço <strong>${enderecoObra}</strong> e com prazo determinado pelo contrato, bem como, o treinamento de utilização da forma correta.</p>
            
            <p>Por fim, estando ciente e de acordo assino este termo de compromisso em duas vias.</p>
        </div>
        `;
    } else if (tipo === 'contrato1') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPRANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 61.893.912/0001-24, com sede na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <!--RG ${e.rg || '______________'}, inscrito no--> CPF nº <strong>${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços de forma integral  <strong> POR FORNECIMENTO DE MÃO DE OBRA PRÓPRIA OU INDICADA, A EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO</strong>, em obra de construção da <strong>${enderecoObra}</strong> situada na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> FORNECIMENTO DE MÃO DE OBRA PRÓPRIA OU INDICADA PARA EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO, conforme projetos, memoriais descritivos, caderno de encargos e orientações técnicas. Os serviços deverão ser executados em sua totalidade conforme os levantamentos disponibilizados em campo..</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, se comprometendo a realizar o registro diário de presença, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas e <strong>aprovadas pelo gestor de obra</strong> designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor dos serviços será de <strong>R$ 7.200,00 (sete mil e duzentos reais)</strong>, devendo ser pago através de medição conforme entrega dos serviços, estimando a duração de vigência contratual para <strong>120 (cento e vinte) dias</strong> úteis a partir da assinatura deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado em até 15 (quinze) dias corridos após execução de cada etapa de serviço; </div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> Os pagamentos ocorrerão após conferência e medição dos serviços e a devida aprovação pelo responsável designado pela CONTRATANTE, que ocorrerá a cada 15 (quinze) dias.</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> Os pagamentos deverão ser realizados por meio de transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
            

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>


            <br>
            <br>
            <br>
            <br>
            <br>            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>


            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;
    
    } else if (tipo === 'contrato2') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPRANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 61.893.912/0001-24, com sede na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <!--RG ${e.rg || '______________'}, inscrito no--> <strong>CPF nº ${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços de forma integral a <strong>EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO</strong>, em obra de construção da <strong>${enderecoObra}</strong> situada na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO, conforme projetos, memoriais descritivos, caderno de encargos e orientações técnicas. Os serviços deverão ser executados em sua totalidade conforme os levantamentos disponibilizados em campo.</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, se comprometendo a realizar o registro diário de presença, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas e aprovadas pelo gestor de obra designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor dos serviços será de <strong>R$ 12.000,00 (doze mil reais)</strong>, devendo ser pago através de medição conforme entrega dos serviços, estimando a duração de vigência contratual para <strong>120 (cento e vinte)</strong> dias úteis a partir da assinatura deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado em até 15 (quinze) dias corridos após execução de cada etapa de serviço; </div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> Os pagamentos ocorrerão após conferência e medição dos serviços e a devida aprovação pelo responsável designado pela CONTRATANTE, que ocorrerá a cada 15 (quinze) dias.</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> Os pagamentos deverão ser realizados por meio de transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
            

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>


            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;


  } else if (tipo === 'az1servente') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "AZ CONSTRUÇÃO E REFORMA LTDA";
        enderecoaz = "Av. Rio verde, S/N, QD 97 LT 04/04A - Edif. E-Bussines Rio Verde - Sala 1906, Vila São Tomaz - Aparecida de Goiânia - GO";
  
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${nomeContratanteAssinatura}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº <strong>49.015.601/0001-67</strong>, situado em ${enderecoaz}, neste ato representada por seu titular AMARO GOMES DA SILVA e JOSE AMARO DA SILVA, doravante denominado(a) simplesmente CONTRATANTE.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <!--RG ${e.rg || '______________'}, inscrito no--> CPF nº <strong>${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços de forma integral  <strong> POR FORNECIMENTO DE MÃO DE OBRA PRÓPRIA OU INDICADA, A EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO</strong>, em obra de construção da <strong>${enderecoObra}</strong> situada na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> FORNECIMENTO DE MÃO DE OBRA PRÓPRIA OU INDICADA PARA EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO, conforme projetos, memoriais descritivos, caderno de encargos e orientações técnicas. Os serviços deverão ser executados em sua totalidade conforme os levantamentos disponibilizados em campo..</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, se comprometendo a realizar o registro diário de presença, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas e <strong>aprovadas pelo gestor de obra</strong> designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor dos serviços totalizam <strong>R$ 7.200,00 (sete mil e duzentos reais)</strong>, devendo ser pago através de medições recorrentes conforme entrega dos serviços, estimando a duração de vigência contratual para <strong>120 (cento e vinte) dias</strong> úteis a partir da assinatura deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado em até 15 (quinze) dias corridos após execução de cada etapa de serviço; </div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> Os pagamentos ocorrerão após conferência e medição dos serviços e a devida aprovação pelo responsável designado pela CONTRATANTE, que ocorrerá a cada 15 (quinze) dias.</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> Os pagamentos deverão ser realizados por meio de transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
            

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>


            <br>
            <br>
            <br>
            <br>
            <br>            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>


            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;
    
    } else if (tipo === 'az2pedreiro') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;        
        nomeContratanteAssinatura = "AZ CONSTRUÇÃO E REFORMA LTDA";
         enderecoaz = "Av. Rio verde, S/N, QD 97 LT 04/04A - Edif. E-Bussines Rio Verde - Sala 1906, Vila São Tomaz - Aparecida de Goiânia - GO";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${nomeContratanteAssinatura}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº <strong>49.015.601/0001-67</strong>, situdao em ${enderecoaz}, neste ato representada por seu titular AMARO GOMES DA SILVA e JOSE AMARO DA SILVA, doravante denominado(a) simplesmente CONTRATANTE.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <!--RG ${e.rg || '______________'}, inscrito no--> <strong>CPF nº ${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços de forma integral a <strong>EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO</strong>, em obra de construção da <strong>${enderecoObra}</strong> situada na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO, conforme projetos, memoriais descritivos, caderno de encargos e orientações técnicas. Os serviços deverão ser executados em sua totalidade conforme os levantamentos disponibilizados em campo.</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, se comprometendo a realizar o registro diário de presença, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas e aprovadas pelo gestor de obra designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor dos serviços totalizam <strong>R$ 12.000,00 (doze mil reais)</strong>, devendo ser pago através de medições recorrentes conforme entrega dos serviços, estimando a duração de vigência contratual para <strong>120 (cento e vinte)</strong> dias úteis a partir da assinatura deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado em até 15 (quinze) dias corridos após execução de cada etapa de serviço; </div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> Os pagamentos ocorrerão após conferência e medição dos serviços e a devida aprovação pelo responsável designado pela CONTRATANTE, que ocorrerá a cada 15 (quinze) dias.</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> Os pagamentos deverão ser realizados por meio de transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
            

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>


            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;

 } else if (tipo === 'empreita1') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        localVL = "Rua C-5, QD07 LT01 - Vila Luiza";
        localCP = "Av. Ribas Marques, 447 - Colméia Park";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPRANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no <strong>CNPJ nº 61.893.912/0001-24</strong>, com sede na <strong>Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás</strong>, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <strong>CPF nº ${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços de forma integral por empreitada em obra de construção situada na <strong>${localVL}</strong>, na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> Coordenação, supervisão e organização das atividades de obra no local de execução dos serviços; orientação e distribuição das tarefas à equipe operacional conforme cronograma definido pela CONTRATANTE; acompanhamento do abastecimento, conferência e correta utilização dos materiais nos pontos indicados; apoio à adequação do espaço para início da obra, incluindo impluração e organização de áreas de almoxarifado, engenharia e administrativo; fiscalização da limpeza e organização da área de trabalho, garantindo a correta destinação dos resíduos e materiais excedentes; acompanhamento das atividades de demolição, desde a cobertura até as fundações, assegurando a execução conforme orientações técnicas; supervisão da implantação de gabarito, locação da obra, escavação, compactação e execução das fundações; acompanhamento das etapas de concretagem de blocos, vigas baldrames, pilares, vigas superiores, lajes e demais elementos estruturais; verificação da correta desforma de caixarias e aplicação de impermeabilizações; controle da produção, transporte e aplicação de argamassas para alvenaria, chapisco, reboco e emboço; orientação quanto à separação, transporte e instalação de materiais hidráulicos e elétricos; supervisão da preparação de superfícies para acabamento, incluindo lixamento, preparo para pintura, execução de pisos e contrapisos; acompanhamento das marcações e cortes em alvenaria para passagem de eletrodutos; controle da limpeza geral do canteiro de obras; apoio à quantificação de materiais e acompanhamento da produção de argamassa para assentamento de pisos cerâmicos e revestimentos, sempre conforme as diretrizes técnicas e orientações da CONTRATANTE.</div>
          </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${localVL}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>2.9.</strong> O CONTRATADO é responsável pela comunicação antecipada sobre necessicade de materiais ou insumos a serem usados na obra. </div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas, medidas e aprovadas pelo gestor de obra designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor total dos serviços será de <strong>R$ 382.485,72  (Trezentos e oitenta e dois mil quatrocentos e oitenta e cinco reais e setenta e dois centavos)</strong>, devendo ser pago recorrentemente através de medição mensal, conforme entrega dos serviços, estimando a duração de vigência contratual presentes neste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> A Medição dos serviços concluidos será realizada pelo profissional indicado da Prefeitira de Jataí todo dia 1º do mês;
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> A Aprovação do pagamento ocorrerá após a conferência da medição, e a devida aprovação pelo responsável designado pela CONTRATANTE</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> O pagamento será efetuado pontualmente entre os dias 10 (dez) e 15 (quinze) de cada mês, via transferência bancária para a conta indicada pelo CONTRATADO.          
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
           
            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>
           
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>
           
                       
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>
           
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;

 } else if (tipo === 'empreita2') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        localVL = "Rua C-5, QD07 LT01 - Vila Luiza";
        localCP = "Av. Ribas Marques, 447 - Colméia Park";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPRANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no <strong>CNPJ nº 61.893.912/0001-24</strong>, com sede na <strong>Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás</strong>, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <strong>CPF nº ${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços de forma integral por empreitada em obra de construção situada na <strong>${localCP}</strong>, na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> Coordenação, supervisão e organização das atividades de obra no local de execução dos serviços; orientação e distribuição das tarefas à equipe operacional conforme cronograma definido pela CONTRATANTE; acompanhamento do abastecimento, conferência e correta utilização dos materiais nos pontos indicados; apoio à adequação do espaço para início da obra, incluindo impluração e organização de áreas de almoxarifado, engenharia e administrativo; fiscalização da limpeza e organização da área de trabalho, garantindo a correta destinação dos resíduos e materiais excedentes; acompanhamento das atividades de demolição, desde a cobertura até as fundações, assegurando a execução conforme orientações técnicas; supervisão da implantação de gabarito, locação da obra, escavação, compactação e execução das fundações; acompanhamento das etapas de concretagem de blocos, vigas baldrames, pilares, vigas superiores, lajes e demais elementos estruturais; verificação da correta desforma de caixarias e aplicação de impermeabilizações; controle da produção, transporte e aplicação de argamassas para alvenaria, chapisco, reboco e emboço; orientação quanto à separação, transporte e instalação de materiais hidráulicos e elétricos; supervisão da preparação de superfícies para acabamento, incluindo lixamento, preparo para pintura, execução de pisos e contrapisos; acompanhamento das marcações e cortes em alvenaria para passagem de eletrodutos; controle da limpeza geral do canteiro de obras; apoio à quantificação de materiais e acompanhamento da produção de argamassa para assentamento de pisos cerâmicos e revestimentos, sempre conforme as diretrizes técnicas e orientações da CONTRATANTE.</div>
          </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${localCP}, </strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>2.9.</strong> O CONTRATADO é responsável pela comunicação antecipada sobre necessicade de materiais ou insumos a serem usados na obra. </div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas, medidas e aprovadas pelo gestor de obra designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor total dos serviços será de <strong>R$ 382.485,72  (Trezentos e oitenta e dois mil quatrocentos e oitenta e cinco reais e setenta e dois centavos)</strong>, devendo ser pago recorrentemente através de medição mensal, conforme entrega dos serviços, estimando a duração de vigência contratual mencionadas neste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> A Medição dos serviços concluidos será realizada pelo profissional indicado da Prefeitira de Jataí todo dia 7 do mês;
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> A Aprovação do pagamento ocorrerá após a conferência da medição, e a devida aprovação pelo responsável designado pela CONTRATANTE</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> O pagamento será efetuado pontualmente entre os dias 15 (quinze) e 20 (vinte) de cada mês, via transferência bancária para a conta indicada pelo CONTRATADO.          
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
            

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>
           
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>
                                  
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>
            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>
            
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;



        } else if (tipo === 'empreita3') {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        localVL = "UBS COLMEIA PARK – JATAÍ - GO";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no <strong>CNPJ nº 61.893.912/0001-24</strong>, com sede na <strong>Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás</strong>, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <strong>CPF nº ${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA - DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto o FORNECIMENTO MÃO DE OBRA ESPECIALIZADA EM CONSTRUÇÃO CIVIL PARA EXECUÇÃO DA OBRA DE CONCLUSÃO DA UBS DENOMINADA COMO COLMEIA PARK DE FORMA SUBEMPREITADA CONFORME ESPECIFICAÇÕES TÉCNICAS, PLANILHA ORÇAMENTÁRIA, QUANTITATIVOS E CRONOGRAMA FÍSICO E FINANCEIRO DE CONHECIMENTO PARA ASSINATURA DESTE TERMO, na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> Não é permitido a subcontratação dos serviços, sendo necessário disposição de equipe de profissionais, com as devidas qualificações técnicas, bem como, garantir o cumprimento da programação de etapas/períodos objeto deste instrumento contratual;</div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação mobilização de equipe para o canteiro, deverá ser encaminhado além dos documentos pessoais da equipe disponibilizada, garantir mensalmente o envio das certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS), critério para pagamento das medições de serviços;</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual - detalhamento do objeto:</div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> Execução das etapas de concretagem de pilares, vigas superiores, lajes e demais elementos estruturais; desforma de caixarias e aplicação de impermeabilizações; controle de produção, transporte e aplicação de argamassas para alvenaria, chapisco, reboco e emboço; separação, transporte e instalação de materiais hidráulicos e elétricos; preparação de superfícies para acabamento, incluindo lixamento, preparo para pintura, execução de pisos e contrapisos; acompanhamento das marcações e cortes em alvenaria para passagem de eletrodutos; limpeza geral do canteiro de obras; lista de pedidos e controle de materiais, assentamento de pisos cerâmicos e revestimentos conforme as diretrizes técnicas e orientações da CONTRATANTE.</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${localVL}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta com fornecimento de profissionais qualificados e aptos a execução dos serviços, responsabilizando-se pela qualidade e segurança durante às execuções.</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Garantir fornecimento e uso adequado de equipamentos de proteção individual (EPIs) conforme necessidade para cada um dos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, será sempre utilizado os EPI's.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa.</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário;</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> Arcar e reparar às suas exclusivas expensas, os danos e infortunísticas que possam ocorrer durante a prestação dos serviços e por quaisquer danos que vier a causar a CONTRATANTE ou a terceiros, por si, seus empregados ou prepostos, por ação ou omissão, em razão de dolo, imprudência, imperícia ou negligência</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.9.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>2.10.</strong> O CONTRATADO é responsável pela comunicação antecipada sobre necessidade de materiais ou insumos a serem usados na obra.</div>
                <div style="margin-bottom: 5px;"><strong>2.11.</strong> Refazer os trabalhos sem custo à CONTRATANTE caso os trabalhos tenham ocorrido fora do escopo/proposta, com vícios/defeitos na execução ou haja questionamentos e adequações advindas dos órgãos legais. Nestas hipóteses ficará a CONTRATADA obrigada a refazer, desfazer ou ressarcir os serviços fora de escopo ou não requisitados, no prazo de 24 (vinte e quatro) horas após solicitação expressa da CONTRATANTE.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança, bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato conforme medições e aferições atestadas;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR's), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA - DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas, medidas e aprovadas pelo gestor de obra designado pelos CONTRATANTES EM EPÍGRAFE, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor total dos serviços será de <strong>R$ 382.485,72 (Trezentos e oitenta e dois mil quatrocentos e oitenta e cinco reais e setenta e dois centavos)</strong>, devendo ser pago recorrentemente através de medição mensal, conforme entrega dos serviços, estimando a duração de vigência contratual presentes nesse instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> A Medição dos serviços concluídos será realizada pelo profissional indicado da CONTRATANTE todo dia 7 (sétimo dia) útil do mês;</div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> A Aprovação do pagamento ocorrerá após a conferência da medição, atestado da fiscalização da obra juntamente com a devida aprovação pelo responsável designado pela CONTRATANTE;</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> O pagamento será efetuado pontualmente entre os dias 15 (quinze) e 20 (vinte) de cada mês, via transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DAS ALTERAÇÕES CONTRATUAIS, SERVIÇOS EXTRAORDINÁRIOS E REEQUILÍBRIO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>5.1 Alterações do objeto</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Os quantitativos previstos na planilha orçamentária poderão sofrer acréscimos ou supressões em razão de alterações técnicas, necessidade da obra ou determinação do contratante principal, desde que previamente formalizados entre as partes.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo único.</strong> Nenhuma alteração de quantitativo produzirá efeitos financeiros sem a correspondente formalização entre CONTRATANTE e CONTRATADO.</p>

            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>5.2 Serviços extraordinários</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Os serviços não contemplados na planilha orçamentária, memorial descritivo ou cronograma físico-financeiro serão considerados serviços extraordinários.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Sua execução dependerá de autorização prévia e expressa da CONTRATANTE, contendo descrição, quantitativos, prazo e valor correspondente.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Na ausência de autorização formal, a CONTRATANTE ficará desobrigada ao pagamento dos serviços executados além do objeto originalmente contratado.</p>

            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>5.3 Termo Aditivo</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Qualquer alteração referente a: valor; prazo; escopo; quantitativos; cronograma; metodologia executiva; Deverá ser formalizada mediante Termo Aditivo ou Ordem de Serviço assinada pelas partes, passando a integrar este contrato.</p>

            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>5.4 Caso fortuito e força maior</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Os atrasos decorrentes de caso fortuito ou força maior, nos termos do artigo 393 do Código Civil, devidamente comprovados, não caracterizarão inadimplemento contratual. Consideram-se exemplificativamente: chuvas excepcionais; enchentes; vendavais; embargos administrativos; paralisações determinadas por órgãos públicos; indisponibilidade comprovada do local de execução; fatos imprevisíveis e inevitáveis que impeçam a continuidade normal dos serviços.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Ocorrendo tais hipóteses, os prazos contratuais serão revistos proporcionalmente mediante comunicação formal entre as partes.</p>

            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>5.5 Reequilíbrio econômico-financeiro</strong></p>
            <p style="text-indent: 40px; margin-bottom: 10px;">Ocorrendo fato superveniente, imprevisível ou de consequências incalculáveis que altere substancialmente os custos da execução dos serviços, as partes poderão negociar o reequilíbrio econômico-financeiro deste contrato, mediante demonstração documental da efetiva variação dos custos e formalização por instrumento próprio.</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA - DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito civil ou criminal;</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de prestação com a Execução de serviços especializados por equipe própria da contratada, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE;</div>
                <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, e declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE;</div>
                <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade;</div>
                <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o Contratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações da equipe disponibilizada para canteiro e, caso entenda necessário, posteriormente rejeitar a indicação de algum membro indicado para os serviços;</div>
                <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa;</div>
                <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial.</div>
                <div style="margin-bottom: 5px;"><strong>7.8.</strong> Toda orientação técnica, solicitação de serviços, comunicação operacional, programação de atividades ou ajuste de cronograma será realizada exclusivamente entre os representantes indicados pelas partes, sendo vedada a emissão de ordens diretas aos empregados, colaboradores ou prepostos da CONTRATADA, ressalvadas situações relacionadas exclusivamente à segurança do trabalho, emergência ou preservação da integridade física das pessoas.</div>
            </div>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sanção no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA - DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRADA no prazo de até 30 (trinta) dias.</p>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;



      
  
  

       } else if (tipo === 'metragem') {        
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS POR EMPREITADA PARA EXECUÇÃO DE ETAPAS DE OBRA SEM VÍNCULO EMPREGATÍCIO <br><br> Nº ${matricula}/${ano} | JATAÍ – GOIÁS`;
        nomeContratanteAssinatura = "RV NEGOCIOS E COMPANHIA LTDA";
        
        corpoTexto = `
        <div style="text-align: justify; font-size: 12pt; line-height: 1.6;">
            <p style="text-indent: 5px; margin-bottom: 8px;">Contrato de Prestação de Serviços celebrado entre as seguintes partes:</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATANTE</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>RV NEGOCIOS E COMPRANHIA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ nº 61.893.912/0001-24, com sede na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, no Município de Jataí, Estado de Goiás, neste ato representada por seu titular NÚBIA LAFAIETE APARECIDA DA SILVA, brasileiro, portador do CPF nº 320.993.981-00, residente e domiciliado na Rua Mineiros, S/N - QD 09 LT 12  - CEP 75.800-094, Santa Maria, Município de Jataí, Estado de Goiás, doravante denominado(a) simplesmente <strong>CONTRATANTE</strong>.</p>

            <p style="margin-bottom: 5px;"><strong>CONTRATADO</strong></p>
            <p style="text-indent: 40px; margin-bottom: 15px;"><strong>${(e.nome || '').toUpperCase()}</strong>, portador do <!--RG ${e.rg || '______________'}, inscrito no--> <strong>CPF nº ${e.cpf || '______________'}</strong> residente e domiciliado na <strong>${e.endereco || '____________________________________________________'}</strong>, no Município de Jataí, Estado de Goiás, doravante denominado simplesmente <strong>CONTRATADO</strong>.</p>

            <p style="text-indent: 40px; margin-bottom: 30px;">As partes acima identificadas, tendo em vista o interesse mútuo, resolvem celebrar o presente contrato de prestação de serviços, que se regerá pelas cláusulas e condições seguintes:</p>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>1.</strong> O presente contrato tem como objeto a prestação de serviços para execução integral da <strong>EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO</strong>, em obra de construção da <strong>${enderecoObra}</strong> situada na cidade de Jataí no estado de Goiás, a serem executados pelo CONTRATADO, conforme os termos que se determinam a seguir:</p>
            
            <div style="margin-left: 50px; margin-bottom: 15px;">
                <div style="margin-bottom: 5px;"><strong>1.1.</strong> O contratado executará os serviços com autonomia técnica, observando as diretrizes do projeto, sem subordinação hierárquica conforme levantamentos realizados, projetos disponibilizados e com a devida atenção aos requisitos estabelecidos em normas técnicas e certificações de qualidade para garantir a integralidade e eficiência na execução do objeto;</div>
                <div style="margin-bottom: 5px;"><strong>1.2.</strong> É permitido a subcontratação de até 70% dos serviços, desde que, seja encaminhado intenção de subcontratação para verificação da qualificação e análise de perfil do executor subcontratado com antecedência mínima de 72h, deverão ser encaminhados os documentos pessoais e qualificações técnicas, bem como, a programação de quais etapas/períodos o subcontratado estará disposto (s) no local da obra; </div>
                <div style="margin-bottom: 5px;"><strong>1.3.</strong> Após aceitação da subcontratação, deverá ser encaminhado além dos documentos pessoais de contratação, as certidões de regularidade com os órgãos governamentais (municipal, estadual, federal, trabalhista e do FGTS);</div>
                <div style="margin-bottom: 5px;"><strong>1.4.</strong> Na execução das atividades, o contratado deverá realizar a execução dos serviços conforme objeto contratual – <strong>detalhamento do objeto:</strong></div>
                <div style="margin-left: 20px; margin-bottom: 11px;"><strong>1.4.1.</strong> EXECUÇÃO DE FECHAMENTO DE REBOCO INTERNO, EXECUÇÃO DE CAIXAS PLUVIAIS DE ALVENARIA, ALVENARIA DE PLATIMBANDA, REVESTIMENTO DE BANHEIRO, REVESTIMENTO DE PAREDE INTERNA E EXTERNA, EXECUÇÃO DE PASSEIO E EXECUÇÃO PISO DE CONCRETO, conforme projetos, memoriais descritivos, caderno de encargos e orientações técnicas. Os serviços deverão ser executados em sua totalidade conforme os levantamentos disponibilizados em campo.</div>
            </div>

            <br>
            <p style="text-indent: 40px; margin-bottom: 8px;"><strong>Parágrafo Primeiro:</strong> As atividades serão executadas na obra localizada na <strong>${enderecoObra}</strong>.</p>
            <p style="text-indent: 40px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO declara possuir capacidade técnica, experiência e disponibilidade para execução direta ou por meio de profissionais de sua equipe, responsabilizando-se pela qualidade e segurança dos serviços.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>2.</strong> Além das obrigações implícitas, o CONTRATADO se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 40px;">
                <div style="margin-bottom: 5px;"><strong>2.1.</strong> Executar os serviços com qualidade, presteza e diligência, observando as normas técnicas aplicáveis, observando diretrizes técnicas do projeto, sem ingerência direta na forma de execução.</div>
                <div style="margin-bottom: 5px;"><strong>2.2.</strong> Utilizar equipamentos de proteção individual (EPIs) adequados aos riscos das atividades, se responsabilizando pela sua correta utilização e conservação, e garantindo que durante o período no interior do canteiro, estará utilizando os EPI’s, e, havendo envio de subcontratado, deverá garantir o uso de EPI bem como tais orientações.</div>
                <div style="margin-bottom: 5px;"><strong>2.3.</strong> Responsabilizar-se por quaisquer danos causados a terceiros ou ao CONTRATANTE, decorrentes de sua atuação, por dolo ou culpa..</div>
                <div style="margin-bottom: 5px;"><strong>2.4.</strong> Realizar o cumprimento de normas técnicas e de segurança de trabalho, respeitando as diretrizes técnicas e normas aplicáveis ao projeto repassadas pela CONTRATANTE.</div>
                <div style="margin-bottom: 5px;"><strong>2.5.</strong> Arcar com todas as despesas relativas ao seu deslocamento, alimentação e vestuário.</div>
                <div style="margin-bottom: 5px;"><strong>2.6.</strong> O CONTRATADO é responsável pelo recolhimento de todos os tributos incidentes sobre os serviços prestados (ISS, IR, INSS etc.), não sendo responsabilidade da CONTRATANTE realizar pagamento de taxas para o CONTRATADO ou mesmo de sua equipe.</div>
                <div style="margin-bottom: 5px;"><strong>2.7.</strong> Cumprir rigorosamente os prazos estabelecidos para a execução dos serviços, sob pena de multa contratual.</div>
                <div style="margin-bottom: 5px;"><strong>2.8.</strong> Manter, durante toda a execução do contrato, todas as condições de habilitação e qualificação exigidas, se comprometendo a realizar o registro diário de presença, e quando necessário um comunicado formal sempre que houver quaisquer impedimentos para o bom andamento deste instrumento.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO CONTRATANTE</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>3.</strong> O CONTRANTE se obriga a:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>3.1.</strong> Fornecer as informações e os materiais de responsabilidade da Contratante para a execução dos serviços, dentro dos prazos estabelecidos e acordados;</div>
                <div style="margin-bottom: 5px;"><strong>3.2.</strong> Fiscalizar, aferir e atestar os serviços executados, sem interferência na autonomia técnica do contratado, garantindo o cumprimento das especificações técnicas e das normas de segurança., bem como, fidelidade ao projeto e memoriais de execução fornecidos;</div>
                <div style="margin-bottom: 5px;"><strong>3.3.</strong> Efetuar o pagamento pelos serviços prestados, conforme o valor e a forma de pagamento estabelecidos neste contrato;</div>
                <div style="margin-bottom: 5px;"><strong>3.4.</strong> Disponibilizar um ambiente de trabalho seguro e adequado para a execução dos serviços;</div>
                <div style="margin-bottom: 5px;"><strong>3.5.</strong> Havendo necessidade, a pedido da Contratada, a Contratante poderá disponibilizar treinamentos para os serviços em altura conforme padrões normativos (NR’s), sabendo-se que, treinamentos de caráter institucional e segurança normativa, não configurando subordinação ou vínculo, sendo de livre escolha da Contratada aderir o treinamento pela Contratante, ou, apresentar as devidas comprovações realizadas a tempo e modo que lhe couber.</div>
            </div>

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUARTA – DO VALOR E DA FORMA DE PAGAMENTO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>4.</strong> Os serviços serão remunerados conforme entregas executadas e aprovadas pelo gestor de obra designado pela <strong>${nomeContratanteAssinatura}</strong>, mediante apresentação de Recibo de Prestação de Serviços:</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
                <div style="margin-bottom: 5px;"><strong>4.1.</strong> O valor dos serviços será calculado a partir da <strong>metragem quadrada (m²) medida por dia</strong> na obra. O Pagamento será mediante a medição do serviço concluido e entregue no período. Estimando a duração de vigência contratual para <strong>120 (cento e vinte)</strong> dias úteis a partir da assinatura deste instrumento.</div>
                <div style="margin-bottom: 5px;"><strong>4.2.</strong> O pagamento será efetuado em até 15 (quinze) dias corridos após execução de cada etapa de serviço; </div>
                <div style="margin-bottom: 5px;"><strong>4.3.</strong> Os pagamentos ocorrerão após conferência e medição dos serviços e a devida aprovação pelo responsável designado pela CONTRATANTE, que ocorrerá a cada 15 (quinze) dias.</div>
                <div style="margin-bottom: 5px;"><strong>4.4.</strong> Os pagamentos deverão ser realizados por meio de transferência bancária para a conta indicada pelo CONTRATADO.</div>
            </div>    

            <p style="margin-bottom: 15px;"><strong>CLÁUSULA QUINTA – DO PRAZO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>5.</strong> O presente contrato terá início <strong> ${dataInicioContrato}</strong> e término em <strong>${dataTerminoContrato}</strong>, podendo ser prorrogado por igual período até o limite de 3 (três) aditivos conforme parâmetros internos da Contratante através da prerrogativa de <strong>continuidade dos serviços</strong> autorizados.</p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> Caso o CONTRATADO não cumpra os prazos estabelecidos, após análise e exame dos fatos, poderá ser aplicado multa de 2 % (dois por cento) sobre o valor total dos serviços acumulados por dia de atraso, até o limite de 20 % (vinte por cento) sobre o valor total acumulado desde o último pagamento efetuado.</p> 
              

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SEXTA – DA RESCISÃO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>6.</strong> O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação prévia com antecedência mínima de 5 (cinco) dias, sem prejuízo das perdas e danos comprovadamente sofridos pela parte inocente. </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Primeiro:</strong> O CONTRATANTE poderá rescindir o contrato de imediato, sem aviso prévio, caso o CONTRATADO descumpra qualquer das cláusulas contratuais, ou, caso haja infração a qualquer legislação vigente, seja no âmbito profissional, seja no âmbito cívil ou criminal; </p>
            <p style="text-indent: 50px; margin-bottom: 10px;"><strong>Parágrafo Segundo:</strong> O CONTRATADO poderá rescindir o contrato de imediato, caso o CONTRATANTE atrase o pagamento dos serviços prestados por mais de 10 (dez) dias úteis ou cometa qualquer infração diante da legislação vigente, seja no âmbito profissional, civil ou criminal;</p>
            

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA SÉTIMA – DA NATUREZA DO CONTRATO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>7.</strong> As partes declaram expressamente que o presente contrato é de <strong>NATUREZA CIVIL, não gerando qualquer vínculo empregatício entre o CONTRATANTE e o CONTRATADO</strong>, diante disso, o CONTRATADO declara estar CIENTE que é responsável por todas as obrigações fiscais, previdenciárias e trabalhistas decorrentes de sua atividade exercida.</p>
            <div style="margin-left: 50px; margin-bottom: 30px;">
            <div style="margin-bottom: 5px;"><strong>7.1.</strong> As partes reconhecem expressamente que este contrato tem natureza de <strong>prestação de serviços por empreitada</strong>, divididas por etapas, e que, o CONTRATADO possui o livre direito prestar serviços à terceiros sem ônus para esta CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.2.</strong> O CONTRATADO declara que realiza seus serviços de forma autônoma e independente, sem subordinação, e NÃO POSSUI VÍNCULO TRABALHISTA com esta CONTRATANTE, declara estar ciente de que o acesso ao canteiro deverá estar compatibilizado com o funcionamento da obra, sem controle de jornada ou subordinação, sendo este, o responsável pela escala de trabalho sem prejuízos aos prazos estabelecidos em cronograma para entrega do objeto; </div>
            <div style="margin-bottom: 5px;"><strong>7.3.</strong> O CONTRATADO poderá prestar serviços a terceiros, não havendo exclusividade com a CONTRATANTE; </div>
            <div style="margin-bottom: 5px;"><strong>7.4.</strong> O CONTRATADO poderá executar os serviços por meio de equipe própria, não havendo exigência de pessoalidade; </div>
            <div style="margin-bottom: 5px;"><strong>7.5.</strong> Fica expressamente firmado que o subcontratado só poderá adentrar os locais dos serviços após autorização, pois, para fins de segurança, compliance e qualificação técnica, sem ingerência na gestão da equipe, a Contratante possui o livre direito de analisar previamente as documentações e posteriormente rejeitar a indicação; </div>
            <div style="margin-bottom: 5px;"><strong>7.6.</strong> O CONTRATADO é responsável por quaisquer danos causados a terceiros ou ao patrimônio da CONTRATANTE, por si ou por seus colaboradores, decorrentes de dolo ou culpa; </div>
            <div style="margin-bottom: 5px;"><strong>7.7.</strong> A reparação ou indenização por danos deverá ser providenciada imediatamente pelo CONTRATADO, sob pena de rescisão contratual e responsabilização financeira e judicial. </div>
            </div>

            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA OITAVA – DO SIGILO</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>8.</strong> CONTRATADO compromete-se a manter <strong>sigilo sobre informações relacionadas aos serviços e à CONTRATANTE</strong>, salvo autorização expressa ou exigência legal, NÃO sendo, neste momento, autorizado nenhum repasse de projetos, memoriais, cadernos técnicos, imagens fotográficas e quaisquer informações relacionadas ao objeto deste instrumento, passível de aplicação de sansão no percentual de 5% (cinco por cento) sobre o saldo em aberto através da retenção fixada no pagamento posterior ao ato de infração comprovado e notificado.</p>


            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>
            <br>            
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA NONA – DO ABANDONO DA OBRA</strong></p>
            <p style="text-indent: 30px; margin-bottom: 30px;"><strong>9.</strong> Caso o CONTRATADO abandone o os serviços ou, deixe de realizar a conclusão do objeto em sua integralidade, sem aviso prévio ou comunicação formal, o valor que ainda lhe for devido, será pago somente após a CONTRATANTE finalizar completamente a execução dos serviços deixados pela CONTRATADA e realizar levantamento de custo e equalização de valores conforme este instrumento, com repasse do saldo que for devido à CONTRATADA no prazo de até 30 (trinta) dias.</p>


            <br>
            <p style="margin-bottom: 15px;"><strong>CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES GERAIS</strong></p>
            <p style="text-indent: 30px; margin-bottom: 10px;"><strong>10.</strong> O presente contrato obriga as partes e seus sucessores.</p>
            <div style="margin-left: 50px; margin-bottom: 10px;">
                <div style="margin-bottom: 5px;"><strong>10.1.</strong> Qualquer alteração neste contrato deverá ser feita por escrito e assinada pelas partes.</div>
            </div>

            <br>
            <br>
            <p style="text-indent: 40px; margin-bottom: 30px;">Fica eleito o foro da comarca de Jataí, estado de Goiás, para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato, renunciando as partes a qualquer outro, por mais privilegiado que seja.</p>
            <p style="text-indent: 40px; margin-bottom: 30px;">Por estarem assim justos e contratados, as partes assinam o presente termo contratual em 2 (duas) vias de igual teor e forma.</p>
        </div>`;
    } else {
        titulo = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS (${tipo.toUpperCase()})`;
        nomeContratanteAssinatura = "CONTRATANTE";
        corpoTexto = `[ESTRUTURA PRONTA - Modelo pendente de configuração.]<br><br>
        <strong>CONTRATADO(A):</strong> ${e.nome}, portador do CPF nº ${e.cpf || '____'}, RG nº ${e.rg || '____'}, residente em ${e.endereco || '____'}.`;
    }

    // 🔥 Definição da logo com base no tipo do contrato (apenas az1servente ou az2pedreiro)
    let logoSrc = "https://i.postimg.cc/PqdgXGF0/logo-rv-negociospng.png";
    if (tipo === 'az1servente' || tipo === 'az2pedreiro') {
        logoSrc = "https://i.postimg.cc/dLB7Dxxb/AZCONSTRUCOES.png";
    }

    const htmlDoc = `
        <div style="font-family: 'Times New Roman', Times, serif; width: 100%; padding: 20px 40px; box-sizing: border-box; color: #000;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 30px;">                
                <img src="${logoSrc}" style="display: block; margin: 0 auto; height: 70px;"><br><br>
                <h2 style="margin: 0; font-size: 13pt; font-weight: bold; line-height: 1.3;">${titulo}</h2>
            </div>
            
            <div style="margin-bottom: 40px;">
                ${corpoTexto}
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
