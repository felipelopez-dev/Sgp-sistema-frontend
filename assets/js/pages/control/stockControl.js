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
    const deleteModal = document.querySelector('.delete');
    const confirmResetButton = deleteModal.querySelector('.button--link2');
    const cancelResetButton = deleteModal.querySelector('.button--link1');
    
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
     * Calcula e atualiza os totais de caixas a partir das linhas da tabela.
     */
    const updateTotals = () => {
        totalBoxes = 0;
        remainingBoxes = 0;

        document.querySelectorAll('#tabela-lancamentos tbody tr').forEach(row => {
            const quantity = parseInt(row.dataset.quantity || 0);
            totalBoxes += quantity;
            if (!row.classList.contains('concluido')) {
                remainingBoxes += quantity;
            }
        });

        totalBlockDiv.textContent = `Total de Caixas: ${totalBoxes}`;
        remainingBlockDiv.textContent = `Caixas Restantes: ${remainingBoxes}`;
    }

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
                timestamp: Date.now() 
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
        const { quantity, category, product, description, status } = data;
        
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
        
        row.dataset.quantity = quantity;
        row.className = '';
        if (status === 'concluido') {
            row.classList.add('concluido');
        }
        
        const categoryDisplay = category === 'interno' ? 'Mercado Interno' : 'Mercado Externo';
        const categoryClass = category === 'interno' ? 'categoria-interno' : 'categoria-externo';

        // Recria o HTML da linha
        row.innerHTML = `
            <td>${quantity}</td>
            <td class="${categoryClass}">${categoryDisplay}</td>
            <td>${product}</td>
            <td>${description || '-'}</td>
            <td>
                <div class="botoes-acao">
                    <button class="btn-ok">${status === 'concluido' ? 'Desmarcar' : 'OK'}</button>
                    <button class="btn-editar btn-editar__monitor" style="display: ${status === 'concluido' ? 'none' : ''}">Editar</button>
                    <button class="btn-excluir btn-excluir__monitor" style="display: ${status === 'concluido' ? 'none' : ''}">Excluir</button>
                </div>
            </td>
        `;
        
        // Anexa os listeners de evento
        attachRowEventListeners(row, key, data);
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
        
        // Se a linha está em modo de edição (o que não deve acontecer aqui), não anexa.
        if (!okButton || !editButton || !deleteButton) return; 

        // OK Button Logic (toggle status in Firebase)
        okButton.addEventListener('click', () => {
            const newStatus = row.classList.contains('concluido') ? 'pendente' : 'concluido';
            update(ref(database, `estoque/${key}`), {
                status: newStatus
            }).catch(error => alert('Erro ao atualizar status: ' + error.message));
            // O listener do onValue cuida da atualização do DOM
        });

        // Delete Button Logic (remove from Firebase)
        deleteButton.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja excluir este lançamento?')) {
                remove(ref(database, `estoque/${key}`))
                    .catch(error => alert('Erro ao excluir lançamento: ' + error.message));
                // O listener do onValue cuida da remoção do DOM
            }
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
        const [tdQuantity, tdCategory, tdProduct, tdDescription, tdAction] = cells;

        const { quantity: oldQuantity, category: oldCategoryValue, product: oldProduct, description: oldDescription } = originalData;

        // Convert cells to inputs/selects
        tdQuantity.innerHTML = `<input type="number" class="edit-quantity" value="${oldQuantity}" style="width: 70px;">`;
        
        // Category Select
        tdCategory.innerHTML = `
            <select id="edit-category" class="edit-category" style="width: 120px;">
                <option value="interno">Mercado Interno</option>
                <option value="externo">Mercado Externo</option>
            </select>
        `;
        const editCategorySelect = tdCategory.querySelector('.edit-category');
        editCategorySelect.value = oldCategoryValue;

        // Product Select
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

        tdDescription.innerHTML = `<input type="text" class="edit-description" value="${oldDescription === '-' ? '' : oldDescription}" style="width: 120px;">`;

        // Change action buttons to Save and Cancel
        tdAction.innerHTML = `
            <button class="btn-salvar">Salvar</button>
            <button class="btn-cancelar">Cancelar</button>
        `;

        // Save Button Logic (Update Firebase)
        tdAction.querySelector('.btn-salvar').addEventListener('click', () => {
            const newQuantity = parseInt(tdQuantity.querySelector('.edit-quantity').value);
            const newCategoryValue = editCategorySelect.value;
            const newProduct = editProductSelect.value;
            const newDescription = tdDescription.querySelector('.edit-description').value;
            
            if (!isNaN(newQuantity) && newQuantity > 0 && newCategoryValue && newProduct) {
                
                const updatedData = {
                    quantity: newQuantity,
                    category: newCategoryValue,
                    product: newProduct,
                    description: newDescription || '-',
                    // Inclui o status original para o re-render local funcionar
                    status: originalData.status 
                };

                update(ref(database, `estoque/${key}`), updatedData)
                    .then(() => {
                        // CORREÇÃO APLICADA: Força a reversão imediata para o modo de visualização.
                        // O onValue do Firebase também fará o seu trabalho, mas esta chamada garante 
                        // o feedback instantâneo de que a edição foi salva.
                        addOrUpdateRowToTable(key, updatedData); 
                    })
                    .catch(error => {
                        alert('Erro ao salvar edição: ' + error.message);
                    });
            } else {
                alert('Os dados de edição são inválidos.');
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
                tableBody.innerHTML = ''; // Limpa a tabela se não houver dados
            }
            
            // Recalcula totais
            updateTotals();
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
                // O listener do Firebase (onValue) cuida da limpeza do DOM e zerar os totais
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
