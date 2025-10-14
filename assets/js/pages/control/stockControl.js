import { database } from '../register/firebaseConfig.js';
// Importação de todas as funções necessárias do Firebase Realtime Database.
import { ref, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Referências globais
const ESTOQUE_REF = ref(database, 'estoque');
const HISTORICO_EXCLUIDOS_REF = ref(database, 'historicoExcluidos');
const ADMIN_PASSWORD = 'operadoradm'; // Senha do administrador (USO INSEGURO EM PROD.)

/**
 * Formata um timestamp (milissegundos) para o formato dd/mm/yyyy.
 * @param {number} timestamp - Marca de tempo.
 * @returns {string} Data formatada.
 */
const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};


// =========================================================================
// LÓGICA DE CONTROLE DE ESTOQUE (Executa apenas na página 'control.html')
// =========================================================================

const productsByCategory = {
    interno: ['Caixa baixa','Pernil com pele','Torresmo'],
    externo: [
        'Exportações','Exportação barriga','Exportação bisteca',
        'Exportação de costela','Exportação de miúdos',
        'Exportação de sobrepaleta','Exportação lombo','Exportação máscara'
    ]
};

const initializeStockControl = () => {
    // ----------------------------------------------------
    // 1. VERIFICAÇÃO DE DOM (Se os elementos de controle existem, inicia a lógica)
    // ----------------------------------------------------
    const formElement = document.getElementById('formulario-lancamento');
    const tableBody = document.querySelector('#tabela-lancamentos tbody');
    const resetButton = document.querySelector('.reset-table');

    if (!formElement || !tableBody || !resetButton) {
        return; // Sai se não estiver na página de Controle de Estoque
    }
    
    // Referências dos Elementos DOM Específicos do Controle
    const categorySelect = document.getElementById('categoria');
    const productSelect = document.getElementById('produto');
    const descriptionInput = document.getElementById('descricao');
    const quantityInput = document.getElementById('quantidade'); 
    const totalBlockDiv = document.getElementById('bloco-total');
    const remainingBlockDiv = document.getElementById('bloco-restante');
    
    // Modais e Reset
    const finishModal = document.querySelector('.delete--termino');
    const cardDeleteModal = document.querySelector('.delete--card');
    const resetPasswordModal = document.querySelector('.modal-reset');
    const resetPasswordInput = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__input') : null;
    const confirmPasswordButton = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__confirm') : null;
    const cancelPasswordButton = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__cancel') : null;
    
    let totalBoxes = 0;
    let remainingBoxes = 0;

    /**
     * Atualiza os totais de caixas e caixas restantes exibidos na interface.
     */
    const updateTotals = () => {
        totalBoxes = 0;
        remainingBoxes = 0;

        document.querySelectorAll('#tabela-lancamentos tbody tr').forEach(row => {
            // Lê os atributos data- para obter valores
            const quantity = parseInt(row.dataset.quantity || 0);
            const saida = parseInt(row.dataset.saida || 0); 
            
            totalBoxes += quantity;
            remainingBoxes += (quantity - saida);
        });

        totalBlockDiv.textContent = `Total de Caixas: ${totalBoxes}`;
        remainingBlockDiv.textContent = `Caixas Restantes: ${remainingBoxes}`; 
    }
    
    /**
     * Exibe um modal de confirmação genérico.
     */
    const openConfirmationModal = (modal, titleText, bodyText, confirmAction) => {
        modal.classList.remove('delete--active'); 
        
        const titleElement = modal.querySelector('.delete-title');
        const textElement = modal.querySelector('.delete-text');
        const confirmButton = modal.querySelector('.button--link2');
        const cancelButton = modal.querySelector('.button--link1');

        titleElement.textContent = titleText;
        textElement.textContent = bodyText;
        
        // Clona os botões para remover ouvintes antigos e anexar novos
        const cloneConfirm = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(cloneConfirm, confirmButton);
        const cloneCancel = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(cloneCancel, cancelButton);

        cloneConfirm.addEventListener('click', () => {
            confirmAction();
            modal.classList.remove('delete--active'); 
        });

        cloneCancel.addEventListener('click', () => {
            modal.classList.remove('delete--active');
        });

        modal.classList.add('delete--active');
    };

    // Event Listener para a mudança de categoria (preenche os produtos)
    categorySelect.addEventListener('change', () => {
        const selectedCategory = categorySelect.value;
        productSelect.innerHTML = '<option value="">Selecione um Produto</option>';
        
        if (selectedCategory && productsByCategory[selectedCategory]) {
            productSelect.disabled = false;
            productsByCategory[selectedCategory].forEach(productName => {
                const option = document.createElement('option');
                option.value = productName;
                option.textContent = productName;
                productSelect.appendChild(option);
            });
        } else {
            productSelect.disabled = true;
        }
    });

    // Event Listener para o envio do formulário (novo lançamento)
    formElement.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const quantity = parseInt(quantityInput.value);
        const category = categorySelect.value;
        const product = productSelect.value;
        const description = descriptionInput.value || '';
        
        if (isNaN(quantity) || quantity <= 0) {
            alert('Por favor, insira uma Quantidade válida e maior que zero.');
            return;
        }

        if (category && product) {
            
            const newEntry = {
                quantity,
                category,
                product,
                description,
                status: 'pendente', 
                timestamp: Date.now(), 
                saida: 0,
                dataSaida: null 
            };

            // Salva o novo registro no Firebase
            push(ESTOQUE_REF, newEntry)
                .then(() => {
                    // Limpar formulário após sucesso
                    quantityInput.value = '';
                    categorySelect.value = '';
                    productSelect.innerHTML = '<option value="">Selecione um Produto</option>';
                    productSelect.disabled = true;
                    descriptionInput.value = '';
                })
                .catch(error => alert('Erro ao salvar o lançamento: ' + error.message));

        } else {
            alert('Por favor, preencha todos os campos obrigatórios (Categoria e Produto).');
        }
    });

    /**
     * Adiciona ou atualiza uma linha na tabela com base nos dados do Firebase.
     */
    function addOrUpdateRowToTable(key, data) {
        let row = document.querySelector(`tr[data-key="${key}"]`);
        const { quantity, category, product, description, status, saida = 0, timestamp } = data;
        
        const isNewRow = !row;

        if (isNewRow) {
            row = document.createElement('tr');
            row.dataset.key = key;
            tableBody.prepend(row);
        }
        
        row.dataset.quantity = quantity;
        row.dataset.saida = saida;

        const restantes = quantity - saida;
        const currentStatus = status || 'pendente';
        row.className = '';
        if (currentStatus === 'concluido') row.classList.add('concluido');
        
        const categoryDisplay = category === 'interno' ? 'Mercado Interno' : 'Mercado Externo';
        const categoryClass = category === 'interno' ? 'categoria-interno' : 'categoria-externo';
        
        const dataLancamentoFormatada = formatTimestamp(timestamp); 

        // Montagem do HTML da linha da tabela
        row.innerHTML = `
            <td>${quantity}</td>
            <td>${saida}</td>
            <td>${restantes}</td>
            <td class="${categoryClass}">${categoryDisplay}</td>
            <td>${product}</td>
            <td>${dataLancamentoFormatada}</td>
            <td>${description || '-'}</td>
            <td class="table--header__monitor">
                <div class="botoes-acao">
                    <button class="btn-ok btn-ok__monitor">${currentStatus === 'concluido' ? 'Desmarcar' : 'Término'}</button>
                    <button class="btn-editar btn-editar__monitor" style="display: ${currentStatus === 'concluido' ? 'none' : ''}">Editar</button>
                    <button class="btn-excluir btn-excluir__monitor btn-excluir__operador" style="display: ${currentStatus === 'concluido' ? 'none' : ''}">Excluir</button>
                </div>
            </td>
        `;
        
        attachRowEventListeners(row, key, data);
        updateTotals(); 
    }
    
    /**
     * Remove uma linha da tabela no DOM.
     */
    function removeRowFromTable(key) {
        const row = document.querySelector(`tr[data-key="${key}"]`);
        if (row) row.remove();
    }

    /**
     * Anexa os listeners de eventos (Término/Desmarcar, Editar, Excluir) a uma linha.
     */
    function attachRowEventListeners(row, key, data) {
        const okButton = row.querySelector('.btn-ok');
        const editButton = row.querySelector('.btn-editar');
        const deleteButton = row.querySelector('.btn-excluir');
        
        if (!okButton || !editButton || !deleteButton) return; 

        // Clonagem para limpar listeners antigos antes de anexar novos
        const newOkButton = okButton.cloneNode(true);
        okButton.parentNode.replaceChild(newOkButton, okButton);
        const newEditButton = editButton.cloneNode(true);
        editButton.parentNode.replaceChild(newEditButton, editButton);
        const newDeleteButton = deleteButton.cloneNode(true);
        deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
        
        // --- Ação de Término / Desmarcar ---
        newOkButton.addEventListener('click', () => {
            const currentSaida = parseInt(row.dataset.saida || 0);
            const originalQuantity = parseInt(row.dataset.quantity || 0);
            const restantes = originalQuantity - currentSaida;
            const isConcluido = restantes === 0;

            const confirmFinish = () => {
                update(ref(database, `estoque/${key}`), {
                    saida: originalQuantity,
                    dataSaida: Date.now(),
                    status: 'concluido'
                }).catch(error => alert('Erro ao atualizar término: ' + error.message));
            };
            
            const confirmUnmark = () => {
                update(ref(database, `estoque/${key}`), {
                    saida: 0,
                    dataSaida: null,
                    status: 'pendente'
                }).catch(error => alert('Erro ao desmarcar término: ' + error.message));
            };

            if (isConcluido) {
                openConfirmationModal(finishModal,'Desmarcar Conclusão',
                    `Produto: ${data.product}. Desmarcar e reverter a saída para zero?`,confirmUnmark);
            } else {
                openConfirmationModal(finishModal,'Confirmar Término',
                    `Produto: ${data.product} (${restantes} restantes). Confirmar término e totalizar saída?`,confirmFinish);
            }
        });

        // --- Ação de Excluir Registro ---
        newDeleteButton.addEventListener('click', () => {
            const confirmDeletion = () => {
                remove(ref(database, `estoque/${key}`))
                    .catch(error => alert('Erro ao excluir lançamento: ' + error.message));
            };
            
            openConfirmationModal(cardDeleteModal,'Confirmar Exclusão',
                `Tem certeza de que deseja excluir permanentemente o lançamento do produto ${data.product} (${data.quantity} caixas)?`,
                confirmDeletion);
        });

        // --- Ação de Editar Registro ---
        newEditButton.addEventListener('click', () => handleEditMode(row, key, data));
    }
    
    /**
     * Ativa o modo de edição para uma linha da tabela.
     */
    function handleEditMode(newRow, key, originalData) {
        const cells = newRow.querySelectorAll('td');
        const [tdQuantity, tdSaida, tdRestantes, tdCategory, tdProduct, tdData, tdDescription, tdAction] = cells;

        const { quantity: oldQuantity, category: oldCategoryValue, product: oldProduct, description: oldDescription,
            saida: oldSaida = 0, dataSaida: oldDataSaida = null, status: oldStatus } = originalData;
        
        // Substitui células por inputs de edição
        tdQuantity.innerHTML = `<input type="number" class="edit-quantity" value="${oldQuantity}" min="1" style="width: 70px;">`;
        const editQuantityInput = tdQuantity.querySelector('.edit-quantity');
        
        tdSaida.innerHTML = `<input type="number" class="edit-saida" value="${oldSaida}" min="0" max="${oldQuantity}" style="width: 70px;">`;
        const editSaidaInput = tdSaida.querySelector('.edit-saida');
        
        const initialRestantes = oldQuantity - oldSaida;
        tdRestantes.innerHTML = `<span class="edit-restantes" style="font-weight: bold;">${initialRestantes}</span>`;
        const editRestantesSpan = tdRestantes.querySelector('.edit-restantes');

        const updateRestantes = () => {
            const newQty = parseInt(editQuantityInput.value || 0);
            let newSaida = parseInt(editSaidaInput.value || 0);
            if (newSaida > newQty) {
                newSaida = newQty;
                editSaidaInput.value = newSaida;
            }
            editSaidaInput.max = newQty; 
            editRestantesSpan.textContent = newQty - newSaida;
        };
        editQuantityInput.addEventListener('input', updateRestantes);
        editSaidaInput.addEventListener('input', updateRestantes);

        // Dropdown de Categoria
        tdCategory.innerHTML = `
            <select id="edit-category" class="edit-category" style="width: 120px;">
                <option value="interno">Mercado Interno</option>
                <option value="externo">Mercado Externo</option>
            </select>
        `;
        const editCategorySelect = tdCategory.querySelector('.edit-category');
        editCategorySelect.value = oldCategoryValue;

        // Dropdown de Produto
        const editProductSelect = document.createElement('select');
        editProductSelect.classList.add('edit-product');
        editProductSelect.style.width = '120px';
        
        const populateProducts = (categoryValue, selectedProduct) => {
            editProductSelect.innerHTML = '';
            const prods = productsByCategory[categoryValue] || [];
            prods.forEach(productName => {
                const option = document.createElement('option');
                option.value = productName;
                option.textContent = productName;
                editProductSelect.appendChild(option);
            });
            if (selectedProduct && prods.includes(selectedProduct)) {
                editProductSelect.value = selectedProduct;
            }
        }
        populateProducts(oldCategoryValue, oldProduct);
        tdProduct.innerHTML = '';
        tdProduct.appendChild(editProductSelect);

        editCategorySelect.addEventListener('change', () => {
            populateProducts(editCategorySelect.value);
        });

        tdData.textContent = formatTimestamp(originalData.timestamp);
        
        tdDescription.innerHTML = `<input type="text" class="edit-description" value="${oldDescription === '-' ? '' : oldDescription}" style="width: 120px;">`;
        
        // Botões de Ação na Edição
        tdAction.innerHTML = `
            <button class="btn-salvar">Salvar</button>
            <button class="btn-cancelar">Cancelar</button>
        `;

        // --- SALVAR ---
        tdAction.querySelector('.btn-salvar').addEventListener('click', () => {
            const newQuantity = parseInt(editQuantityInput.value);
            const newSaida = parseInt(editSaidaInput.value);
            const newCategoryValue = editCategorySelect.value;
            const newProduct = editProductSelect.value;
            const newDescription = tdDescription.querySelector('.edit-description').value;
            
            let newTimestampSaida = oldDataSaida;
            
            // Define ou limpa a data de saída com base na nova saída
            if (newSaida !== oldSaida && newSaida > 0) {
                newTimestampSaida = Date.now(); 
            } else if (newSaida === 0) {
                newTimestampSaida = null;
            }
            
            const newRestantes = newQuantity - newSaida;
            const newStatus = newRestantes === 0 ? 'concluido' : 'pendente';

            if (!isNaN(newQuantity) && newQuantity > 0 && newCategoryValue && newProduct && !isNaN(newSaida) && newSaida <= newQuantity) {
                const updatedData = {
                    quantity: newQuantity,
                    category: newCategoryValue,
                    product: newProduct,
                    description: newDescription || '-',
                    saida: newSaida, 
                    dataSaida: newTimestampSaida, 
                    status: newStatus,
                    timestamp: originalData.timestamp 
                };

                update(ref(database, `estoque/${key}`), updatedData)
                    .then(() => addOrUpdateRowToTable(key, updatedData)) 
                    .catch(error => alert('Erro ao salvar edição: ' + error.message));
            } else {
                alert('Os dados de edição são inválidos. Verifique se a Saída não é maior que a Quantidade.');
            }
        });

        // --- CANCELAR ---
        tdAction.querySelector('.btn-cancelar').addEventListener('click', () => {
            addOrUpdateRowToTable(key, originalData); 
        });

        // --- ATALHOS TECLADO ---
        newRow.addEventListener('keydown', (event) => {
            if (event.key === "Enter") {
                event.preventDefault(); 
                tdAction.querySelector('.btn-salvar').click();
            }
            if (event.key === "Escape") {
                event.preventDefault(); 
                tdAction.querySelector('.btn-cancelar').click();
            }
        });
    }

    /**
     * Configura a escuta em tempo real do Firebase e popula a tabela.
     */
    const loadRealtimeData = () => {
        onValue(ESTOQUE_REF, (snapshot) => {
            const currentKeys = new Set();
            snapshot.forEach(childSnapshot => currentKeys.add(childSnapshot.key));

            // Remove do DOM as linhas que não estão mais no Firebase
            const domKeys = Array.from(tableBody.querySelectorAll('tr')).map(row => row.dataset.key);
            domKeys.forEach(key => {
                if (!currentKeys.has(key)) removeRowFromTable(key);
            });

            if (snapshot.exists()) {
                const data = snapshot.val();
                // Ordena as chaves por timestamp (mais recente primeiro)
                const sortedKeys = Object.keys(data).sort((keyA, keyB) => {
                    return (data[keyB].timestamp || 0) - (data[keyA].timestamp || 0);
                });
                
                tableBody.innerHTML = ''; // Limpa para repopular na ordem correta
                sortedKeys.forEach(key => addOrUpdateRowToTable(key, data[key]));
            } else {
                tableBody.innerHTML = '';
                updateTotals(); 
            }
        });
    }
    
    // ------------------------------------
    // LÓGICA DO RESET COM SALVAMENTO DE HISTÓRICO
    // ------------------------------------
    const resetTableAndLogHistory = async () => {
        const snapshot = await get(ESTOQUE_REF);
        
        if (!snapshot.exists()) {
             resetPasswordModal.classList.remove('modal-reset--active');
             alert('A tabela de lançamentos já está vazia. Nada foi excluído.');
             return;
        }

        const currentStockData = snapshot.val();
        
        const historyEntry = {
            timestampExclusao: Date.now(),
            admin: 'ADM_SGP', // Placeholder
            totalItensExcluidos: Object.keys(currentStockData).length,
            registros: currentStockData 
        };

        try {
            await push(HISTORICO_EXCLUIDOS_REF, historyEntry);
            await remove(ESTOQUE_REF); 

            resetPasswordModal.classList.remove('modal-reset--active');
            alert('Todos os lançamentos de estoque foram excluídos com sucesso e salvos no histórico! ✅');
        } catch (error) {
            resetPasswordModal.classList.remove('modal-reset--active');
            alert('Erro Crítico: Falha ao reiniciar a tabela ou ao salvar o histórico: ' + error.message);
        }
    }

    // Configuração dos Eventos do Botão de Reset
    if (resetButton && resetPasswordModal && confirmPasswordButton && cancelPasswordButton && resetPasswordInput) {
        
        resetButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            resetPasswordModal.classList.add('modal-reset--active'); 
            resetPasswordInput.value = ''; 
            resetPasswordInput.focus();
        });

        cancelPasswordButton.addEventListener('click', () => {
            resetPasswordModal.classList.remove('modal-reset--active');
            resetPasswordInput.value = '';
        });
        
        const handleResetConfirmation = () => {
            const enteredPassword = resetPasswordInput.value;
            
            if (enteredPassword === ADMIN_PASSWORD) {
                resetTableAndLogHistory();
            } else {
                alert('❌ Senha de administrador incorreta!');
                resetPasswordInput.value = '';
                resetPasswordInput.focus();
            }
        };

        confirmPasswordButton.addEventListener('click', handleResetConfirmation);
        
        resetPasswordInput.addEventListener('keydown', (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handleResetConfirmation();
            }
        });
    }

    // Inicia a escuta em tempo real dos dados do estoque
    loadRealtimeData();
};


// =========================================================================
// LÓGICA DE HISTÓRICO DE EXCLUSÕES (Executa apenas na página 'history2.html')
// =========================================================================

const initializeHistoryControl = () => {
    // ----------------------------------------------------
    // 1. VERIFICAÇÃO DE DOM (Se os elementos de histórico existem, inicia a lógica)
    // ----------------------------------------------------
    const tableBody = document.getElementById('historyBody');
    const dateInput = document.getElementById('filter-input__date');
    const applyFilterButton = document.querySelector('.filter-button__1');
    const showAllButton = document.querySelector('.filter-button__2');

    if (!tableBody || !dateInput || !applyFilterButton || !showAllButton) {
        return; // Sai se não estiver na página de Histórico
    }
    
    /**
     * Gera e insere as linhas da tabela para um evento de exclusão total.
     */
    const addHistoryBlockToTable = (historyKey, historyData) => {
        const { timestampExclusao, totalItensExcluidos, registros } = historyData;

        // Linha de Cabeçalho do Bloco
        const headerRow = tableBody.insertRow();
        headerRow.classList.add('history-block-header');
        headerRow.setAttribute('data-history-key', historyKey);
        headerRow.setAttribute('aria-expanded', 'false'); 
        headerRow.innerHTML = `
            <td colspan="7">
                <span class="history-date">Excluído em: ${formatTimestamp(timestampExclusao)}</span> | 
                <span class="history-total">Itens Excluídos: ${totalItensExcluidos}</span>
                <button class="toggle-details" aria-controls="details-${historyKey}">
                    Detalhes &blacktriangledown;
                </button>
            </td>
        `;

        // Linha de Detalhes (Tabela Interna)
        const detailsRow = tableBody.insertRow();
        detailsRow.classList.add('history-block-details');
        detailsRow.id = `details-${historyKey}`;
        detailsRow.style.display = 'none'; 
        
        const detailsCell = detailsRow.insertCell();
        detailsCell.colSpan = 7; 
        detailsCell.innerHTML = '<table class="details-table"></table>';
        const detailsTable = detailsCell.querySelector('.details-table');

        // Adiciona cabeçalho da tabela interna
        detailsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Quantidade</th>
                    <th>Saída</th>
                    <th>Restantes</th>
                    <th>Categoria</th>
                    <th>Produto</th>
                    <th>Data Lançamento</th>
                    <th>Descrição</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const detailsTableBody = detailsTable.querySelector('tbody');


        // Preenche a tabela interna com os registros individuais excluídos
        if (registros) {
            const sortedRecords = Object.values(registros).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            sortedRecords.forEach(registro => {
                const restantes = (registro.quantity || 0) - (registro.saida || 0);
                const statusClass = registro.status === 'concluido' ? 'status-concluido' : 'status-pendente';
                const categoryDisplay = registro.category === 'interno' ? 'Mercado Interno' : 'Mercado Externo';
                const categoryClass = registro.category === 'interno' ? 'categoria-interno' : 'categoria-externo';
                
                const recordRow = detailsTableBody.insertRow();
                // Inclui data-label para melhor responsividade móvel (usado no CSS)
                recordRow.innerHTML = `
                    <td data-label="Quantidade">${registro.quantity || 0}</td>
                    <td data-label="Saída">${registro.saida || 0}</td>
                    <td data-label="Restantes">${restantes}</td>
                    <td data-label="Categoria" class="${categoryClass}">${categoryDisplay}</td>
                    <td data-label="Produto">${registro.product || '-'}</td>
                    <td data-label="Data Lançamento">${formatTimestamp(registro.timestamp)}</td>
                    <td data-label="Descrição">${registro.description || '-'}</td>
                    <td data-label="Status" class="${statusClass}">${registro.status === 'concluido' ? 'Concluído' : 'Pendente'}</td>
                `;
            });
        }
        
        // Listener para o botão de expandir/colapsar
        headerRow.querySelector('.toggle-details').addEventListener('click', (e) => {
            const isExpanded = headerRow.getAttribute('aria-expanded') === 'true';
            detailsRow.style.display = isExpanded ? 'none' : 'table-row';
            headerRow.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
            e.target.innerHTML = isExpanded ? 'Detalhes &blacktriangledown;' : 'Detalhes &blacktriangleup;';
        });
    };
    
    /**
     * Carrega e exibe os dados do histórico de exclusão, aplicando um filtro de data se fornecido.
     */
    const loadHistoryData = (filterDate = null) => {
        onValue(HISTORICO_EXCLUIDOS_REF, (snapshot) => {
            tableBody.innerHTML = ''; 

            if (snapshot.exists()) {
                const historyData = snapshot.val();
                
                // Ordena pela data de exclusão (mais recente primeiro)
                const sortedKeys = Object.keys(historyData).sort((keyA, keyB) => {
                    return (historyData[keyB].timestampExclusao || 0) - (historyData[keyA].timestampExclusao || 0);
                });

                let foundRecords = false;

                sortedKeys.forEach(key => {
                    const data = historyData[key];
                    const exclusionDate = new Date(data.timestampExclusao);
                    const formattedExclusionDate = `${exclusionDate.getFullYear()}-${String(exclusionDate.getMonth() + 1).padStart(2, '0')}-${String(exclusionDate.getDate()).padStart(2, '0')}`;

                    if (!filterDate || formattedExclusionDate === filterDate) {
                        addHistoryBlockToTable(key, data);
                        foundRecords = true;
                    }
                });

                if (!foundRecords) {
                    tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nenhum registro de exclusão total encontrado na data selecionada.</td></tr>`;
                }
                
            } else {
                tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center;">Nenhum histórico de exclusão total registrado.</td></tr>`;
            }
        }, (error) => {
            console.error("Erro ao ler o histórico de exclusão:", error);
            tableBody.innerHTML = `<tr><td colspan="8" style="color: red; text-align: center;">Erro ao conectar com o banco de dados.</td></tr>`;
        });
    };
    
    // --- Event Listeners para Filtros ---
    applyFilterButton.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        if (selectedDate) {
            loadHistoryData(selectedDate);
        } else {
            alert("Por favor, selecione uma data para aplicar o filtro.");
        }
    });

    showAllButton.addEventListener('click', () => {
        dateInput.value = ''; 
        loadHistoryData(null); 
    });
    // --- Fim dos Event Listeners para Filtros ---
    
    loadHistoryData();
};


// =========================================================================
// INICIALIZAÇÃO PRINCIPAL (Executada em DOMContentLoaded)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tenta inicializar a lógica da página de Controle de Estoque
    initializeStockControl(); 
    
    // 2. Tenta inicializar a lógica da página de Histórico de Exclusões
    // Apenas um dos dois irá realmente executar suas operações de DOM e Firebase.
    initializeHistoryControl();
});
