document.addEventListener('DOMContentLoaded', () => {
    // --- Seletores da Coluna Esquerda (Cálculo) ---
    const totalBoxesInput = document.getElementById('palletizing-left__total');
    const boxesPerPalletInput = document.getElementById('palletizing-left__box');
    const palletsNeededElement = document.querySelector('.result--number__one');
    const boxesUsedElement = document.querySelector('.palletizing-result__two .palletizing-result__number');
    const boxesRemainingElement = document.querySelector('.result--number__three'); 
    
    // --- Seletores da Coluna Direita (Dados do Produto/Relatório) ---
    const productNameSelect = document.getElementById('palletizing-right__area-product'); // SELECT Nome do Produto
    const productNameOtherInput = document.getElementById('product-name-other');        // INPUT "Outro" Nome do Produto
    
    const productCodeSelect = document.getElementById('palletizing-right__area-code');  // SELECT Código do Produto
    const productCodeOtherInput = document.getElementById('product-code-other');      // INPUT "Outro" Código do Produto
    
    const poInput = document.getElementById('palletizing-right__area-load');
    const kgInput = document.getElementById('palletizing-right__area-kg');
    
    // ✅ NOVO SELETOR ADICIONADO PARA O CAMPO NÚMERO DO PALETE
    const palletNumberInput = document.getElementById('palletizing-right__area-pallet-number');
    
    // Seletores ignorados no template de email final, mas usados no reset
    const responsibleNameInput = document.getElementById('responsible-name');
    const reportDateInput = document.getElementById('report-date');

    const addButton = document.querySelector('.palletizing-right__btn-add');
    const emailButton = document.querySelector('.palletizing-right__btn-email');
    const emailTextArea = document.querySelector('.palletizing-area__text');
    const copyButton = document.querySelector('.palletizing-area__btn-copy');
    const palletizingRight = document.querySelector('.palletizing-right');
    const resetButton = document.querySelector('.palletizing-copy__btn-reset'); 

    let loteCounter = 0;

    // --- TEMPLATE HTML: LOTE DE PRODUÇÃO é TEXT ---
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
                        type="date" 
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

    // --- FUNÇÃO DE MÁSCARA DE KG (ENQUANTO DIGITA) ---
    const applyKgMask = (e) => {
    let value = e.target.value;

    // Remove tudo que não for número
    value = value.replace(/\D/g, '');

    if (value === '') {
        e.target.value = '';
        return;
    }

    // Sempre pega os dois últimos dígitos como decimal
    let integerPart = value.slice(0, -2);
    let decimalPart = value.slice(-2);

    if (integerPart === '') integerPart = '0';

    // Remove zeros à esquerda
    integerPart = integerPart.replace(/^0+/, '');
    if (integerPart === '') integerPart = '0';

    // Aplica separador de milhar
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Monta o valor final
    e.target.value = `${integerPart},${decimalPart}`;
};

    
    // --- FUNÇÃO PARA FORMATAR NO FOCUS OUT (BLUR) ---
    const formatKgOnBlur = (e) => {
        let value = e.target.value;
        
        value = value.replace(/\./g, ''); 
        value = value.replace(',', '.'); 
        
        const numericValue = parseFloat(value) || 0;

        // Formata para o padrão brasileiro com 2 casas decimais fixas
        const formattedValue = numericValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        e.target.value = formattedValue;
    };


    // --- LÓGICA DE CÁLCULO EXATO (Math.floor) ---
    const calculatePalletizing = () => {
        const totalBoxes = Number(totalBoxesInput.value);
        const boxesPerPallet = Number(boxesPerPalletInput.value);

        if (totalBoxes <= 0 || boxesPerPallet <= 0 || isNaN(totalBoxes) || isNaN(boxesPerPallet)) {
            palletsNeededElement.textContent = '0';
            boxesUsedElement.textContent = '0';
            boxesRemainingElement.textContent = '0';
            return;
        }

        const palletsFilled = Math.floor(totalBoxes / boxesPerPallet); 
        const boxesUsedForFilledPallets = palletsFilled * boxesPerPallet;
        const boxesRemaining = totalBoxes - boxesUsedForFilledPallets; 
        
        palletsNeededElement.textContent = palletsFilled;
        boxesUsedElement.textContent = boxesUsedForFilledPallets;
        boxesRemainingElement.textContent = boxesRemaining;
    };

    const formatLoteData = () => {
        const loteBlocks = palletizingRight.querySelectorAll('.palletizing-right__area-date');
        let loteDetails = [];

        loteBlocks.forEach(block => {
            const dateInput = block.querySelector('input[type="date"]');
            const loteInput = block.querySelector('input[name="code-lote"]');
            
            if (dateInput && loteInput && dateInput.value.trim() !== '' && loteInput.value.trim() !== '') {
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
    
    // --- FUNÇÃO PARA GERENCIAR OS CAMPOS "OUTRO" ---
    const toggleOtherInputs = (selectElement, otherInputElement) => {
        if (!selectElement || !otherInputElement) return;

        if (selectElement.value === 'OUTRO') {
            otherInputElement.style.display = 'block';
            otherInputElement.setAttribute('required', 'required');
            otherInputElement.focus();
        } else {
            otherInputElement.style.display = 'none';
            otherInputElement.removeAttribute('required');
            otherInputElement.value = ''; 
        }
    };


    // --- GERAÇÃO DE CONTEÚDO DO E-MAIL ---
    const generateEmailContent = () => {
        calculatePalletizing(); 
        
        // LÓGICA DO NOME DO PRODUTO 
        let finalProductName = 'NÃO INFORMADO';
        if (productNameSelect) {
            if (productNameSelect.value === 'OUTRO' && productNameOtherInput && productNameOtherInput.value.trim() !== '') {
                finalProductName = productNameOtherInput.value.trim();
            } else if (productNameSelect.value.trim() !== '' && productNameSelect.value !== 'OUTRO') {
                finalProductName = productNameSelect.value;
            }
        }
        
        // LÓGICA DO CÓDIGO DO PRODUTO 
        let finalProductCode = 'NÃO INFORMADO';
        if (productCodeSelect) {
            if (productCodeSelect.value === 'OUTRO' && productCodeOtherInput && productCodeOtherInput.value.trim() !== '') {
                finalProductCode = productCodeOtherInput.value.trim().toUpperCase();
            } else if (productCodeSelect.value.trim() !== '' && productCodeSelect.value !== 'OUTRO') {
                finalProductCode = productCodeSelect.value;
            }
        }
        
        // Captura de valores de Cálculo
        const totalBoxes = totalBoxesInput.value || 'NÃO INFORMADO';
        const boxesPerPallet = boxesPerPalletInput.value || 'NÃO INFORMADO';
        const palletsNeeded = palletsNeededElement.textContent;
        
        // Captura de valores de Produto
        const po = poInput.value || 'NÃO INFORMADO';
        const kgFormatted = kgInput.value || 'NÃO INFORMADO'; 
        const palletNumber = palletNumberInput ? palletNumberInput.value : 'NÃO INFORMADO'; // Captura o valor

        const loteData = formatLoteData();

        // TEMPLATE DE E-MAIL FINAL E SIMPLES
        const emailText = `RELATÓRIO DE PALETIZAÇÃO

Total de Caixas: ${totalBoxes}
Caixas por Palete (capacidade): ${boxesPerPallet}
Paletes Necessários: ${palletsNeeded}

IDENTIFICAÇÃO DO PRODUTO

Nome do Produto: ${finalProductName}
Código do Produto: ${finalProductCode}
Pedido da Carga: ${po}
Peso Total (kg): ${kgFormatted}
Número do Palete: ${palletNumber}


DADOS DE LOTE E PRODUÇÃO

${loteData}`;

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

        palletizingRight.insertBefore(newBlock, addButton);

        const deleteBtn = newBlock.querySelector('.palletizing-right__btn-excluir');
        deleteBtn.addEventListener('click', handleDeleteLote);
    };

    const handleDeleteLote = (event) => {
        event.preventDefault(); 
        const button = event.target;
        const loteBlock = button.closest('.palletizing--date-lote'); 
        
        if (loteBlock) {
            loteBlock.remove();
        }
    };

    // --- FUNÇÃO DE RESETAR A PÁGINA (CORRIGIDA) ---
    const resetPage = (event) => {
        event.preventDefault();

        // 1. Resetar Campos de Cálculo
        totalBoxesInput.value = '';
        boxesPerPalletInput.value = '';

        // 2. Resetar Campos de Produto/Relatório
        if (productNameSelect) productNameSelect.value = '';
        if (productNameOtherInput) {
            productNameOtherInput.value = '';
            productNameOtherInput.style.display = 'none';
        }
        
        if (productCodeSelect) productCodeSelect.value = '';
        if (productCodeOtherInput) {
            productCodeOtherInput.value = '';
            productCodeOtherInput.style.display = 'none';
        }

        poInput.value = 'P:';
        if (kgInput) kgInput.value = '';
        
        // ✅ CORREÇÃO APLICADA: Limpa o campo Número do Palete
        if (palletNumberInput) palletNumberInput.value = ''; 

        // Limpar campos de Responsável e Data (se existirem)
        if (responsibleNameInput) responsibleNameInput.value = ''; 
        if (reportDateInput) reportDateInput.value = '';

        // 3. Resetar Lotes Iniciais
        const initialDateInput = document.querySelector('.palletizing--date input[type="date"]');
        const initialLoteInput = document.querySelector('.palletizing--date input[name="code-lote"]');
        
        if (initialDateInput) initialDateInput.value = '';
        if (initialLoteInput) initialLoteInput.value = '';

        // 4. Remover Lotes Dinâmicos Adicionados
        const dynamicLoteBlocks = palletizingRight.querySelectorAll('.palletizing--dynamic-lote');
        dynamicLoteBlocks.forEach(block => block.remove());
        loteCounter = 0;

        // 5. Resetar Resultados e Área de E-mail
        palletsNeededElement.textContent = '0';
        boxesUsedElement.textContent = '0';
        boxesRemainingElement.textContent = '0';

        emailTextArea.textContent = '';
        totalBoxesInput.focus();
    };

    // --- LISTENERS DE EVENTO ---

    // LISTENER: Máscara de KG (Enquanto digita)
    if (kgInput) {
        kgInput.addEventListener('input', applyKgMask);
        // Formatação final (,00) (Ao sair do campo)
        kgInput.addEventListener('blur', formatKgOnBlur);
    }

    // LISTENER: Ativa o input de "Outro" para Nome do Produto
    if (productNameSelect) {
        productNameSelect.addEventListener('change', () => {
            toggleOtherInputs(productNameSelect, productNameOtherInput);
        });
    }
    
    // LISTENER: Ativa o input de "Outro" para Código do Produto
    if (productCodeSelect) {
        productCodeSelect.addEventListener('change', () => {
            toggleOtherInputs(productCodeSelect, productCodeOtherInput);
        });
    }

    // Cálculo automático ao digitar
    [totalBoxesInput, boxesPerPalletInput].forEach(input => {
        input.addEventListener('input', calculatePalletizing);
    });
    
    // Botão Adicionar Lote
    addButton.addEventListener('click', (e) => {
        e.preventDefault();
        addLoteBlock(); 
    });
    
    // Botão Fazer Email
    emailButton.addEventListener('click', (e) => {
        e.preventDefault();
        generateEmailContent(); 
    });

    // Botão Copiar
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

    // LISTENER PARA O BOTÃO DE RESET
    if (resetButton) {
        resetButton.addEventListener('click', resetPage);
    } 
    
    // Inicialização
    calculatePalletizing();
    if (productNameSelect) toggleOtherInputs(productNameSelect, productNameOtherInput);
    if (productCodeSelect) toggleOtherInputs(productCodeSelect, productCodeOtherInput);
});