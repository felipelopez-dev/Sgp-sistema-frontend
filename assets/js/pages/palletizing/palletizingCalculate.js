document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores da Coluna Esquerda (Cálculo) ---
    const totalBoxesInput = document.getElementById('palletizing-left__total');
    const boxesPerPalletInput = document.getElementById('palletizing-left__box');
    const palletsNeededElement = document.querySelector('.result--number__one');
    const boxesUsedElement = document.querySelector('.palletizing-result__two .palletizing-result__number');
    const boxesRemainingElement = document.querySelector('.result--number__three'); 
    
    // --- Seletores da Coluna Direita (Dados do Produto/Relatório) ---
    const productNameInput = document.getElementById('palletizing-right__area-product');
    const productCodeInput = document.querySelector('input[name="code-product"]'); 
    const poInput = document.getElementById('palletizing-right__area-load');
    const kgInput = document.querySelector('input[name="kg-product"]'); 
    
    // Tentativa de selecionar Responsável e Data (agora protegida contra falhas)
    const responsibleNameInput = document.getElementById('responsible-name');
    const reportDateInput = document.getElementById('report-date');

    const addButton = document.querySelector('.palletizing-right__btn-add');
    const emailButton = document.querySelector('.palletizing-right__btn-email');
    const emailTextArea = document.querySelector('.palletizing-area__text');
    const copyButton = document.querySelector('.palletizing-area__btn-copy');
    const palletizingRight = document.querySelector('.palletizing-right');

    // ✅ NOVO SELETOR PARA O BOTÃO DE RESET
    const resetButton = document.querySelector('.palletizing-copy__btn-reset'); 

    let loteCounter = 0;

    // --- TEMPLATE HTML CORRIGIDO PARA O LAYOUT ---
    const loteTemplateHTML = `
        <div class="palletizing-right__area-date palletizing--date-lote palletizing--dynamic-lote">
            <div class="palletizing-right__option">
                <div class="palletizing-right__area">
                    <label for="datetime-NEW_LOTE_ID" class="palletizing-right__label">Data da Produção/Envase:</label>
                    <input 
                        type="date"
                        name="datetime"
                        id="datetime-NEW_LOTE_ID"
                        class="palletizing-right__input"
                        required
                    >
                </div>
                <div class="palletizing-right__area">
                    <label for="lote-NEW_LOTE_ID" class="palletizing-right__label">Lote de Produção:</label>
                    <input 
                        type="text"
                        name="code-lote"
                        id="lote-NEW_LOTE_ID"
                        class="palletizing-right__input"
                        placeholder="Ex: fl002025"
                        required
                    >
                </div>
            </div>
            <button class="palletizing-right__btn-excluir">Excluir</button>
        </div>
    `;

    // --- LÓGICA DE CÁLCULO EXATO (Math.floor) ---
    const calculatePalletizing = () => {
        const totalBoxes = parseInt(totalBoxesInput.value, 10);
        const boxesPerPallet = parseInt(boxesPerPalletInput.value, 10);

        if (isNaN(totalBoxes) || totalBoxes <= 0 || isNaN(boxesPerPallet) || boxesPerPallet <= 0) {
            palletsNeededElement.textContent = '0';
            boxesUsedElement.textContent = '0';
            boxesRemainingElement.textContent = '0';
            return;
        }

        // CÁLCULO EXATO: Conta apenas paletes COMPLETAMENTE CHEIOS
        const palletsFilled = Math.floor(totalBoxes / boxesPerPallet); 
        
        // Caixas utilizadas para ENCHER esses paletes
        const boxesUsedForFilledPallets = palletsFilled * boxesPerPallet;
        
        // Caixas que SOBRARAM dessa divisão
        const boxesRemaining = totalBoxes - boxesUsedForFilledPallets; 
        
        // ATUALIZAÇÃO DO DISPLAY:
        palletsNeededElement.textContent = palletsFilled.toString();
        boxesUsedElement.textContent = boxesUsedForFilledPallets.toString();
        boxesRemainingElement.textContent = boxesRemaining.toString();
    };

    const formatLoteData = () => {
        // Busca todos os blocos que contêm data e lote (incluindo o fixo e os dinâmicos)
        const loteBlocks = palletizingRight.querySelectorAll('.palletizing-right__area-date');
        let loteDetails = [];

        loteBlocks.forEach(block => {
            const dateInput = block.querySelector('input[type="date"]');
            const loteInput = block.querySelector('input[name="code-lote"]');
            
            if (dateInput && loteInput && dateInput.value.trim() !== '' && loteInput.value.trim() !== '') {
                // Formata a data de YYYY-MM-DD para DD/MM/YYYY
                const date = dateInput.value.split('-').reverse().join('/');
                const lote = loteInput.value.toUpperCase();
                loteDetails.push(`Lote: ${lote} | Data Prod/Envase: ${date}`);
            }
        });

        if (loteDetails.length === 0) {
            return "NENHUM LOTE INFORMADO";
        }

        return loteDetails.join('\n');
    };

    // --- GERAÇÃO DE CONTEÚDO DO E-MAIL ---
    const generateEmailContent = () => {
        calculatePalletizing(); 
        
        // Captura de valores
        const totalBoxes = totalBoxesInput.value || 'NÃO INFORMADO';
        const boxesPerPallet = boxesPerPalletInput.value || 'NÃO INFORMADO';
        const palletsNeeded = palletsNeededElement.textContent;
        const boxesUsed = boxesUsedElement.textContent;
        
        const productName = productNameInput.value || 'NÃO INFORMADO';
        const productCode = productCodeInput.value || 'NÃO INFORMADO';
        const po = poInput.value || 'NÃO INFORMADO';
        const kg = kgInput.value || 'NÃO INFORMADO'; 

        // CAPTURA PROTEGIDA: Usa encadeamento opcional (?) para evitar falhas se os IDs não existirem
        const responsibleName = responsibleNameInput?.value || 'NÃO INFORMADO';
        const rawReportDate = reportDateInput?.value; 
        const formattedReportDate = rawReportDate ? rawReportDate.split('-').reverse().join('/') : 'NÃO INFORMADO';
        
        const loteData = formatLoteData();

        // TEMPLATE DE E-MAIL FINAL E SIMPLES
        const emailText = `RELATÓRIO DE PALETIZAÇÃO

Total de Caixas: ${totalBoxes}
Caixas por Palete (capacidade): ${boxesPerPallet}
Paletes Necessários: ${palletsNeeded}


IDENTIFICAÇÃO DO PRODUTO

Nome do Produto: ${productName}
Código do Produto: ${productCode}
Pedido da Carga: ${po}
Peso Total (kg): ${kg}


DADOS DE LOTE E PRODUÇÃO

${loteData}


Nome do responsável: ${responsibleName}
Data: ${formattedReportDate}`;

        emailTextArea.textContent = emailText.trim(); 
    };

    // --- LÓGICA DE ADICIONAR/EXCLUIR LOTES ---
    const addLoteBlock = () => {
        loteCounter++;
        const currentLoteId = `lote${loteCounter}`;
        
        const uniqueLoteHTML = loteTemplateHTML.replace(/NEW_LOTE_ID/g, currentLoteId);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = uniqueLoteHTML.trim();
        const newBlock = tempDiv.firstChild;

        // Insere o novo bloco ANTES do botão "Adicionar"
        palletizingRight.insertBefore(newBlock, addButton);

        const deleteBtn = newBlock.querySelector('.palletizing-right__btn-excluir');
        deleteBtn.addEventListener('click', handleDeleteLote);
    };

    // --- FUNÇÃO DE EXCLUSÃO CORRIGIDA: Permite a remoção dos lotes adicionais ---
    const handleDeleteLote = (event) => {
        event.preventDefault(); 
        const button = event.target;
        // Encontra o bloco pai do lote (que tem a classe de identificação)
        const loteBlock = button.closest('.palletizing--date-lote'); 
        
        if (loteBlock) {
            loteBlock.remove();
        }
    };

    // --- ✅ FUNÇÃO DE RESETAR A PÁGINA ---
    const resetPage = (event) => {
        event.preventDefault(); // Previne o comportamento padrão do botão, se for um <button> em um <form>

        // 1. Resetar Campos de Cálculo
        totalBoxesInput.value = '';
        boxesPerPalletInput.value = '';

        // 2. Resetar Campos de Produto/Relatório
        productNameInput.value = '';
        productCodeInput.value = '';
        poInput.value = '';
        kgInput.value = '';
        if (responsibleNameInput) responsibleNameInput.value = '';
        if (reportDateInput) reportDateInput.value = '';

        // 3. Resetar Lotes (o lote inicial no HTML deve ser limpo)
        const initialDateInput = document.querySelector('.palletizing-right__area-date:not(.palletizing--dynamic-lote) input[type="date"]');
        const initialLoteInput = document.querySelector('.palletizing-right__area-date:not(.palletizing--dynamic-lote) input[name="code-lote"]');
        if (initialDateInput) initialDateInput.value = '';
        if (initialLoteInput) initialLoteInput.value = '';

        // 4. Remover Lotes Dinâmicos Adicionados
        const dynamicLoteBlocks = palletizingRight.querySelectorAll('.palletizing--dynamic-lote');
        dynamicLoteBlocks.forEach(block => block.remove());
        loteCounter = 0; // Resetar o contador de lotes

        // 5. Resetar Resultados e Área de E-mail
        calculatePalletizing(); // Atualiza os resultados de cálculo para '0'
        emailTextArea.textContent = ''; // Limpa a área de texto do e-mail

        // Opcional: Focar no primeiro campo para usabilidade
        totalBoxesInput.focus();
    };

    // --- LISTENERS DE EVENTO ---

    // Cálculo automático ao digitar
    [totalBoxesInput, boxesPerPalletInput].forEach(input => {
        input.addEventListener('input', calculatePalletizing);
    });
    
    // Botão Calcular (caso exista, embora o cálculo seja automático)
    const calculateBtn = document.querySelector('.palletizing-left__btn-calculate');
    if (calculateBtn) { 
        calculateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            calculatePalletizing();
        });
    }

    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        addLoteBlock(); 
    });
    
    emailButton.addEventListener('click', (e) => {
        e.preventDefault();
        generateEmailContent(); 
    });

    copyButton.addEventListener('click', (e) => {
        e.preventDefault();
        if (emailTextArea.textContent) {
            navigator.clipboard.writeText(emailTextArea.textContent)
                .then(() => {
                    alert('Conteúdo copiado para a área de transferência! ✅');
                })
                .catch(err => {
                    console.error('Erro ao copiar: ', err);
                    alert('Erro ao copiar. Tente selecionar o texto manualmente.');
                });
        } else {
            alert('Gere o conteúdo do email primeiro.');
        }
    });

    // ✅ NOVO LISTENER PARA O BOTÃO DE RESET
    if (resetButton) {
        resetButton.addEventListener('click', resetPage);
    } else {
        console.warn('Botão de reset não encontrado. Certifique-se de que o elemento com a classe .palletizing-copy__btn-reset está no HTML.');
    }

    // Inicia a funcionalidade
    calculatePalletizing();
});