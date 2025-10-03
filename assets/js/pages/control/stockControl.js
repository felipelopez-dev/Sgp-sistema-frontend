import { database } from '../register/firebaseConfig.js';
import { ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const ESTOQUE_REF = ref(database, 'estoque');

document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const formElement = document.getElementById('formulario-lancamento');
    const tableBody = document.querySelector('#tabela-lancamentos tbody');
    const categorySelect = document.getElementById('categoria');
    const productSelect = document.getElementById('produto');
    const descriptionInput = document.getElementById('descricao');
    const quantityInput = document.getElementById('quantidade'); 
    const totalBlockDiv = document.getElementById('bloco-total');
    const remainingBlockDiv = document.getElementById('bloco-restante');
    
    // Referências para o modal de exclusão (reset da tabela)
    const resetButton = document.querySelector('.reset-table');
    const deleteModal = document.querySelector('.delete'); // Modal de Reinício da Tabela (Reset)
    const confirmResetButton = deleteModal.querySelector('.button--link2');
    const cancelResetButton = deleteModal.querySelector('.button--link1');
    
    // NOVAS Referências para os modais específicos para a linha da tabela (Termino/Excluir)
    const finishModal = document.querySelector('.delete--termino'); // Assumindo a classe do modal de Término
    const cardDeleteModal = document.querySelector('.delete--card'); // Assumindo a classe do modal de Exclusão da Linha
    
    // State Variables (Agora calculados a partir dos dados da tabela)
    let totalBoxes = 0;
    let remainingBoxes = 0;

    // Data Structure
    const productsByCategory = {
        interno: [
            'Caixa baixa', 
            'Pernil com pele', 
            'Torresmo'
        ],
        externo: [
            'Exportações',
            'Exportação barriga', 
            'Exportação bisteca', 
            'Exportação de costela', 
            'Exportação de miúdos', 
            'Exportação de sobrepaleta', 
            'Exportação lombo', 
            'Exportação máscara'
        ]
    };

    /**
     * Formata um timestamp para o formato DD/MM/AAAA.
     */
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    /**
     * Calcula e atualiza os totais de caixas a partir das linhas da tabela.
     * Atualiza o bloco "Caixas Restantes" com a soma de (Quantidade - Saída).
     */
    const updateTotals = () => {
        totalBoxes = 0;
        remainingBoxes = 0;

        document.querySelectorAll('#tabela-lancamentos tbody tr').forEach(row => {
            const quantity = parseInt(row.dataset.quantity || 0);
            // Pega o valor real de Saída do dataset
            const saida = parseInt(row.dataset.saida || 0); 
            
            totalBoxes += quantity;
            // O restante é a entrada menos a saída (o que falta)
            remainingBoxes += (quantity - saida);
        });

        totalBlockDiv.textContent = `Total de Caixas: ${totalBoxes}`;
        remainingBlockDiv.textContent = `Caixas Restantes: ${remainingBoxes}`; 
    }
    
    /**
     * NOVO: Função genérica para gerenciar a abertura e ação dos modais de CONFIRMAÇÃO de linha.
     * @param {HTMLElement} modal - O elemento do modal (.delete--termino ou .delete--card).
     * @param {string} titleText - O novo texto para o título.
     * @param {string} bodyText - O novo texto para a descrição.
     * @param {function} confirmAction - Função a ser executada ao clicar em 'Confirmar'.
     */
    const openConfirmationModal = (modal, titleText, bodyText, confirmAction) => {
        // Garante que apenas um modal específico (não o de reset) esteja "ativo"
        modal.classList.remove('delete--active'); 
        
        const titleElement = modal.querySelector('.delete-title');
        const textElement = modal.querySelector('.delete-text');
        const confirmButton = modal.querySelector('.button--link2');
        const cancelButton = modal.querySelector('.button--link1');

        // 1. Atualiza o conteúdo do modal
        titleElement.textContent = titleText;
        textElement.textContent = bodyText;

        // 2. Limpa listeners prévios e recria os botões para evitar múltiplas execuções
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
        const newCancelButton = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

        // 3. Evento de Confirmação
        newConfirmButton.addEventListener('click', () => {
            confirmAction();
            modal.classList.remove('delete--active'); // Fecha após a ação
        });

        // 4. Evento de Cancelamento
        newCancelButton.addEventListener('click', () => {
            modal.classList.remove('delete--active'); // Apenas fecha
        });

        // 5. Abre o modal
        modal.classList.add('delete--active');
    };

    // Troca produtos ao mudar categoria (Lógica existente)
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

    /**
     * Manipula o envio do formulário e salva os dados no Firebase.
     */
    formElement.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const quantity = parseInt(quantityInput.value);
        const category = categorySelect.value;
        const product = productSelect.value;
        const description = descriptionInput.value || '';
        
        if (!isNaN(quantity) && quantity > 0 && category && product) {
            
            const newEntry = {
                quantity: quantity,
                category: category,
                product: product,
                description: description,
                status: 'pendente', 
                timestamp: Date.now(), // DATA DE LANÇAMENTO INICIAL (DATA DO DIA)
                saida: 0, // Inicializa a saída em 0
                dataSaida: null // Data da última saída (opcional)
            };

            // Salva no Firebase
            push(ESTOQUE_REF, newEntry)
                .then(() => {
                    // Limpa formulário
                    quantityInput.value = '';
                    categorySelect.value = '';
                    productSelect.innerHTML = '<option value="">Selecione um Produto</option>';
                    productSelect.disabled = true;
                    descriptionInput.value = '';
                })
                .catch(error => {
                    alert('Erro ao salvar o lançamento: ' + error.message);
                });

        } else {
            alert('Por favor, preencha todos os campos obrigatórios (Quantidade, Categoria e Produto).');
        }
    });

    /**
     * Adiciona ou atualiza uma linha na tabela DOM.
     * @param {string} key - A chave (ID) do Firebase.
     * @param {object} data - Os dados do lançamento.
     */
    function addOrUpdateRowToTable(key, data) {
        let row = document.querySelector(`tr[data-key="${key}"]`);
        // Incluindo os novos campos com valores padrão (saida, dataSaida, timestamp)
        const { quantity, category, product, description, status, saida = 0, dataSaida = null, timestamp } = data;
        
        const isNewRow = !row;

        if (isNewRow) {
            row = document.createElement('tr');
            row.dataset.key = key;
            tableBody.prepend(row); // Adiciona no início (mais recente)
        } else {
            // Remove listeners existentes antes de recriar o conteúdo (importante no modo edição -> visualização)
            const oldOkButton = row.querySelector('.btn-ok');
            if (oldOkButton) oldOkButton.replaceWith(oldOkButton.cloneNode(true)); 
        }
        
        // Novos datasets para cálculo e controle de estado
        row.dataset.quantity = quantity;
        row.dataset.saida = saida;

        // CÁLCULO: Pegar quantidade - saida = Restante
        const restantes = quantity - saida;
        
        // Mantém o status original, mas adiciona a classe visual se restantes for zero
        const currentStatus = status || 'pendente';
        row.className = '';
        if (currentStatus === 'concluido') {
            row.classList.add('concluido');
        }
        
        const categoryDisplay = category === 'interno' ? 'Mercado Interno' : 'Mercado Externo';
        const categoryClass = category === 'interno' ? 'categoria-interno' : 'categoria-externo';
        
        // Coluna "Data" mostra a data de LANÇAMENTO INICIAL (DATA DO DIA)
        const dataLancamentoFormatada = formatTimestamp(timestamp); 

        // Recria o HTML da linha com as colunas Quantidade, Saída, Restantes e Data
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
                    <button class="btn-excluir btn-excluir__monitor" style="display: ${currentStatus === 'concluido' ? 'none' : ''}">Excluir</button>
                </div>
            </td>
        `;
        
        // Anexa os listeners de evento
        attachRowEventListeners(row, key, data);
        
        // Força a atualização dos totais após o DOM ser manipulado
        updateTotals(); 
    }
    
    /**
     * Remove uma linha da tabela DOM.
     * @param {string} key - A chave (ID) do Firebase.
     */
    function removeRowFromTable(key) {
        const row = document.querySelector(`tr[data-key="${key}"]`);
        if (row) {
            row.remove();
        }
    }


    /**
     * Anexa os listeners de ação a uma linha da tabela.
     */
    function attachRowEventListeners(row, key, data) {
        const okButton = row.querySelector('.btn-ok');
        const editButton = row.querySelector('.btn-editar');
        const deleteButton = row.querySelector('.btn-excluir');
        
        if (!okButton || !editButton || !deleteButton) return; 

        // OK Button Logic (toggle Saida: 0 ou Saida: quantity) - AGORA USANDO MODAL
        okButton.addEventListener('click', () => {
            const currentSaida = parseInt(row.dataset.saida || 0);
            const originalQuantity = parseInt(row.dataset.quantity || 0);
            const restantes = originalQuantity - currentSaida;
            const isConcluido = restantes === 0;

            // Função a ser executada no CONFIRMAR para marcar como concluído
            const confirmFinish = () => {
                const updateData = {
                    saida: originalQuantity,
                    dataSaida: Date.now(),
                    status: 'concluido'
                };
                update(ref(database, `estoque/${key}`), updateData)
                    .catch(error => alert('Erro ao atualizar término: ' + error.message));
            };
            
            // Função a ser executada no CONFIRMAR para desmarcar (reverter)
            const confirmUnmark = () => {
                 const updateData = {
                    saida: 0,
                    dataSaida: null,
                    status: 'pendente'
                };
                update(ref(database, `estoque/${key}`), updateData)
                    .catch(error => alert('Erro ao desmarcar término: ' + error.message));
            };

            if (isConcluido) {
                 openConfirmationModal(
                    finishModal,
                    'Desmarcar Conclusão',
                    // MENSAGEM CURTA PARA DESMARCAR
                    `Produto: ${data.product}. Desmarcar e reverter a saída para zero?`, 
                    confirmUnmark
                );
            } else {
                 openConfirmationModal(
                    finishModal,
                    'Confirmar Término',
                    // MENSAGEM CURTA PARA TÉRMINO
                    `Produto: ${data.product} (${restantes} restantes). Confirmar término e totalizar saída?`, 
                    confirmFinish
                );
            }
        });

        // Delete Button Logic (remove from Firebase) - AGORA USANDO MODAL
        deleteButton.addEventListener('click', () => {
            const confirmDeletion = () => {
                remove(ref(database, `estoque/${key}`))
                    .catch(error => alert('Erro ao excluir lançamento: ' + error.message));
            };
            
            openConfirmationModal(
                cardDeleteModal,
                'Confirmar Exclusão',
                `Tem certeza de que deseja excluir permanentemente o lançamento do produto ${data.product} (${data.quantity} caixas)?`,
                confirmDeletion
            );
        });

        // Edit Button Logic (Initiate edit mode)
        editButton.addEventListener('click', () => {
            handleEditMode(row, key, data);
        });
    }
    
    /**
     * Ativa o modo de edição na linha selecionada.
     */
    function handleEditMode(newRow, key, originalData) {
        const cells = newRow.querySelectorAll('td');
        const [tdQuantity, tdSaida, tdRestantes, tdCategory, tdProduct, tdData, tdDescription, tdAction] = cells;

        const { 
            quantity: oldQuantity, 
            category: oldCategoryValue, 
            product: oldProduct, 
            description: oldDescription,
            saida: oldSaida = 0, 
            dataSaida: oldDataSaida = null,
            status: oldStatus 
        } = originalData;
        
        // 1. Quantidade (Entrada) - Editável
        tdQuantity.innerHTML = `<input type="number" class="edit-quantity" value="${oldQuantity}" min="1" style="width: 70px;">`;
        const editQuantityInput = tdQuantity.querySelector('.edit-quantity');
        
        // 2. Saída - Editável
        tdSaida.innerHTML = `<input type="number" class="edit-saida" value="${oldSaida}" min="0" max="${oldQuantity}" style="width: 70px;">`;
        const editSaidaInput = tdSaida.querySelector('.edit-saida');
        
        // 3. Restante (Visualização calculada no modo edição)
        const initialRestantes = oldQuantity - oldSaida;
        tdRestantes.innerHTML = `<span class="edit-restantes" style="font-weight: bold;">${initialRestantes}</span>`;
        const editRestantesSpan = tdRestantes.querySelector('.edit-restantes');

        // Função de recalcular para Saída e Quantidade (Quantidade - Saída)
        const updateRestantes = () => {
            const newQty = parseInt(editQuantityInput.value || 0);
            let newSaida = parseInt(editSaidaInput.value || 0);
            
            // Garante que Saída não excede a Quantidade
            if (newSaida > newQty) {
                newSaida = newQty;
                editSaidaInput.value = newSaida;
            }
            editSaidaInput.max = newQty; // Atualiza o max da Saída
            
            const calculatedRestantes = newQty - newSaida;
            editRestantesSpan.textContent = calculatedRestantes;
        };

        editQuantityInput.addEventListener('input', updateRestantes);
        editSaidaInput.addEventListener('input', updateRestantes);

        // 4. Categoria Select
        tdCategory.innerHTML = `
            <select id="edit-category" class="edit-category" style="width: 120px;">
                <option value="interno">Mercado Interno</option>
                <option value="externo">Mercado Externo</option>
            </select>
        `;
        const editCategorySelect = tdCategory.querySelector('.edit-category');
        editCategorySelect.value = oldCategoryValue;

        // 5. Product Select
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

        // Update product options when category changes
        editCategorySelect.addEventListener('change', () => {
            populateProducts(editCategorySelect.value);
        });

        // 6. Data (Coluna Data: mantemos o timestamp original aqui)
        tdData.textContent = formatTimestamp(originalData.timestamp);
        
        // 7. Descrição
        tdDescription.innerHTML = `<input type="text" class="edit-description" value="${oldDescription === '-' ? '' : oldDescription}" style="width: 120px;">`;
        
        // 8. Change action buttons to Save and Cancel
        tdAction.innerHTML = `
            <button class="btn-salvar">Salvar</button>
            <button class="btn-cancelar">Cancelar</button>
        `;

        // Save Button Logic (Update Firebase)
        tdAction.querySelector('.btn-salvar').addEventListener('click', () => {
            const newQuantity = parseInt(editQuantityInput.value);
            const newSaida = parseInt(editSaidaInput.value);
            const newCategoryValue = editCategorySelect.value;
            const newProduct = editProductSelect.value;
            const newDescription = tdDescription.querySelector('.edit-description').value;
            
            let newTimestampSaida = oldDataSaida;
            let newStatus = oldStatus; // Começa com o status original

            // Lógica de Saída/Data
            if (newSaida !== oldSaida && newSaida > 0) {
                // Se a saída mudou e é maior que zero, atualiza a data de saída
                newTimestampSaida = Date.now(); 
            } else if (newSaida === 0) {
                // Se a saída foi zerada, remove a data
                newTimestampSaida = null;
            }
            
            // Lógica de Status (CORREÇÃO APLICADA AQUI)
            const newRestantes = newQuantity - newSaida;
            if (newRestantes === 0) {
                 // Se o restante for zero, o produto está concluído (pode ter sido concluído na edição)
                newStatus = 'concluido'; 
            } else {
                // Se houver restante, o status deve ser pendente, mesmo que estivesse 'concluido' antes
                newStatus = 'pendente';
            }

            if (!isNaN(newQuantity) && newQuantity > 0 && newCategoryValue && newProduct && !isNaN(newSaida) && newSaida <= newQuantity) {
                
                const updatedData = {
                    quantity: newQuantity,
                    category: newCategoryValue,
                    product: newProduct,
                    description: newDescription || '-',
                    saida: newSaida, 
                    dataSaida: newTimestampSaida, 
                    status: newStatus, // Usa o novo status calculado
                    timestamp: originalData.timestamp 
                };

                update(ref(database, `estoque/${key}`), updatedData)
                    .then(() => {
                        // Força a reversão imediata para o modo de visualização.
                        addOrUpdateRowToTable(key, updatedData); 
                    })
                    .catch(error => {
                        alert('Erro ao salvar edição: ' + error.message);
                    });
            } else {
                alert('Os dados de edição são inválidos. Verifique se a Saída não é maior que a Quantidade.');
            }
        });

        // Cancel Button Logic (Restore original row display)
        tdAction.querySelector('.btn-cancelar').addEventListener('click', () => {
            // Volta para o modo de visualização usando os dados originais
            addOrUpdateRowToTable(key, originalData);
        });
    }

    /**
     * Configura o listener real-time com o Firebase.
     */
    const loadRealtimeData = () => {
        onValue(ESTOQUE_REF, (snapshot) => {
            // Remove linhas que foram excluídas no Firebase
            const currentKeys = new Set();
            snapshot.forEach(childSnapshot => {
                currentKeys.add(childSnapshot.key);
            });

            // Coleta todas as chaves atuais na tabela DOM
            const domKeys = Array.from(tableBody.querySelectorAll('tr')).map(row => row.dataset.key);

            // Remove as linhas do DOM que não estão mais no Firebase
            domKeys.forEach(key => {
                if (!currentKeys.has(key)) {
                    removeRowFromTable(key);
                }
            });

            // Carrega ou atualiza os dados
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Ordena por timestamp para manter a ordem consistente
                const sortedKeys = Object.keys(data).sort((keyA, keyB) => {
                    return (data[keyB].timestamp || 0) - (data[keyA].timestamp || 0);
                });
                
                tableBody.innerHTML = ''; // Limpa antes de reordenar e re-renderizar
                
                sortedKeys.forEach(key => {
                    const entry = data[key];
                    addOrUpdateRowToTable(key, entry);
                });
            } else {
                // Se não houver dados no Firebase:
                tableBody.innerHTML = ''; // Limpa a tabela
                
                // Chama updateTotals para zerar os blocos Total de Caixas / Restantes
                updateTotals(); 
            }
            
            // O updateTotals é chamado dentro de addOrUpdateRowToTable (se houver dados)
        });
    }

    // ----------------------------------------------------------------------
    // Funcionalidade do botão "Reiniciar a tabela" (Reset Firebase) 
    // ----------------------------------------------------------------------
    
    // 1. Mostrar modal ao clicar em "Reiniciar a tabela"
    resetButton.addEventListener('click', (event) => {
        event.preventDefault(); 
        deleteModal.classList.add('delete--active');
        deleteModal.querySelector('.delete-text').textContent = 'Tem certeza de que deseja excluir TODOS os lançamentos de estoque? Essa ação é irreversível.';
    });

    // 2. Fechar modal ao clicar em "Cancelar"
    cancelResetButton.addEventListener('click', () => {
        deleteModal.classList.remove('delete--active');
    });

    // 3. Confirmar reset: Limpar Firebase
    confirmResetButton.addEventListener('click', () => {
        remove(ESTOQUE_REF)
            .then(() => {
                // O listener do Firebase (onValue) cuida da limpeza do DOM e de zerar os totais
                deleteModal.classList.remove('delete--active');
                alert('Todos os lançamentos de estoque foram excluídos com sucesso!');
            })
            .catch(error => {
                deleteModal.classList.remove('delete--active');
                alert('Erro ao reiniciar a tabela: ' + error.message);
            });
    });

    // Inicializa carregando dados do Firebase
    loadRealtimeData();
});