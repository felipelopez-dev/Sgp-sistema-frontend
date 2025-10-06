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
    
    // Referências para o botão de reset (que agora exige senha)
    const resetButton = document.querySelector('.reset-table');
    
    // Modais específicos
    const finishModal = document.querySelector('.delete--termino');
    const cardDeleteModal = document.querySelector('.delete--card');
    
    // Referências para o modal de reset com senha
    const resetPasswordModal = document.querySelector('.modal-reset');
    // Adicionado verificação para garantir que o modal-reset existe
    if (!resetPasswordModal) {
        console.error("ERRO: O elemento .modal-reset não foi encontrado no DOM. O reset não funcionará.");
    }
    const resetPasswordInput = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__input') : null;
    const confirmPasswordButton = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__confirm') : null;
    const cancelPasswordButton = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__cancel') : null;
    
    // Senha do administrador
    const ADMIN_PASSWORD = 'admgeral*'; 

    let totalBoxes = 0;
    let remainingBoxes = 0;

    const productsByCategory = {
        interno: ['Caixa baixa','Pernil com pele','Torresmo'],
        externo: [
            'Exportações','Exportação barriga','Exportação bisteca',
            'Exportação de costela','Exportação de miúdos',
            'Exportação de sobrepaleta','Exportação lombo','Exportação máscara'
        ]
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const updateTotals = () => {
        totalBoxes = 0;
        remainingBoxes = 0;

        document.querySelectorAll('#tabela-lancamentos tbody tr').forEach(row => {
            const quantity = parseInt(row.dataset.quantity || 0);
            const saida = parseInt(row.dataset.saida || 0); 
            
            totalBoxes += quantity;
            remainingBoxes += (quantity - saida);
        });

        totalBlockDiv.textContent = `Total de Caixas: ${totalBoxes}`;
        remainingBlockDiv.textContent = `Caixas Restantes: ${remainingBoxes}`; 
    }
    
    /**
     * CORREÇÃO CRÍTICA APLICADA AQUI
     * Garante que os ouvintes de evento sejam anexados corretamente ao modal de confirmação.
     */
    const openConfirmationModal = (modal, titleText, bodyText, confirmAction) => {
        modal.classList.remove('delete--active'); 
        
        const titleElement = modal.querySelector('.delete-title');
        const textElement = modal.querySelector('.delete-text');
        const confirmButton = modal.querySelector('.button--link2');
        const cancelButton = modal.querySelector('.button--link1');

        titleElement.textContent = titleText;
        textElement.textContent = bodyText;
        
        // Remove ouvintes antigos para evitar duplicação ou conflito
        const cloneConfirm = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(cloneConfirm, confirmButton);
        const cloneCancel = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(cloneCancel, cancelButton);

        // Anexa novos ouvintes ao clone
        cloneConfirm.addEventListener('click', () => {
            confirmAction();
            modal.classList.remove('delete--active'); 
        });

        cloneCancel.addEventListener('click', () => {
            modal.classList.remove('delete--active');
        });

        modal.classList.add('delete--active');
    };

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

    formElement.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const quantity = parseInt(quantityInput.value);
        const category = categorySelect.value;
        const product = productSelect.value;
        const description = descriptionInput.value || '';
        
        // CORREÇÃO: Certifique-se de que a quantidade seja um número válido e maior que zero
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

    function addOrUpdateRowToTable(key, data) {
        let row = document.querySelector(`tr[data-key="${key}"]`);
        const { quantity, category, product, description, status, saida = 0, timestamp } = data;
        
        const isNewRow = !row;

        if (isNewRow) {
            row = document.createElement('tr');
            row.dataset.key = key;
            tableBody.prepend(row);
        } else {
            // Isso aqui não era mais necessário com a refatoração da openConfirmationModal,
            // mas mantive a lógica de edição para funcionar (ver função handleEditMode)
            const oldOkButton = row.querySelector('.btn-ok');
            if (oldOkButton) oldOkButton.replaceWith(oldOkButton.cloneNode(true)); 
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
    
    function removeRowFromTable(key) {
        const row = document.querySelector(`tr[data-key="${key}"]`);
        if (row) row.remove();
    }

    function attachRowEventListeners(row, key, data) {
        const okButton = row.querySelector('.btn-ok');
        const editButton = row.querySelector('.btn-editar');
        const deleteButton = row.querySelector('.btn-excluir');
        
        if (!okButton || !editButton || !deleteButton) return; 

        // Remova ouvintes existentes antes de anexar novos para evitar duplicidade em updates
        okButton.replaceWith(okButton.cloneNode(true));
        row.querySelector('.btn-editar').replaceWith(row.querySelector('.btn-editar').cloneNode(true));
        row.querySelector('.btn-excluir').replaceWith(row.querySelector('.btn-excluir').cloneNode(true));
        
        const newOkButton = row.querySelector('.btn-ok');
        const newEditButton = row.querySelector('.btn-editar');
        const newDeleteButton = row.querySelector('.btn-excluir');
        
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

        newDeleteButton.addEventListener('click', () => {
            const confirmDeletion = () => {
                remove(ref(database, `estoque/${key}`))
                    .catch(error => alert('Erro ao excluir lançamento: ' + error.message));
            };
            
            openConfirmationModal(cardDeleteModal,'Confirmar Exclusão',
                `Tem certeza de que deseja excluir permanentemente o lançamento do produto ${data.product} (${data.quantity} caixas)?`,
                confirmDeletion);
        });

        newEditButton.addEventListener('click', () => handleEditMode(row, key, data));
    }
    
    function handleEditMode(newRow, key, originalData) {
        const cells = newRow.querySelectorAll('td');
        const [tdQuantity, tdSaida, tdRestantes, tdCategory, tdProduct, tdData, tdDescription, tdAction] = cells;

        const { quantity: oldQuantity, category: oldCategoryValue, product: oldProduct, description: oldDescription,
            saida: oldSaida = 0, dataSaida: oldDataSaida = null, status: oldStatus } = originalData;
        
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

        tdCategory.innerHTML = `
            <select id="edit-category" class="edit-category" style="width: 120px;">
                <option value="interno">Mercado Interno</option>
                <option value="externo">Mercado Externo</option>
            </select>
        `;
        const editCategorySelect = tdCategory.querySelector('.edit-category');
        editCategorySelect.value = oldCategoryValue;

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
            let newStatus = oldStatus;

            if (newSaida !== oldSaida && newSaida > 0) {
                newTimestampSaida = Date.now(); 
            } else if (newSaida === 0) {
                newTimestampSaida = null;
            }
            
            const newRestantes = newQuantity - newSaida;
            newStatus = newRestantes === 0 ? 'concluido' : 'pendente';

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

    const loadRealtimeData = () => {
        onValue(ESTOQUE_REF, (snapshot) => {
            const currentKeys = new Set();
            snapshot.forEach(childSnapshot => currentKeys.add(childSnapshot.key));

            const domKeys = Array.from(tableBody.querySelectorAll('tr')).map(row => row.dataset.key);
            domKeys.forEach(key => {
                if (!currentKeys.has(key)) removeRowFromTable(key);
            });

            if (snapshot.exists()) {
                const data = snapshot.val();
                const sortedKeys = Object.keys(data).sort((keyA, keyB) => {
                    return (data[keyB].timestamp || 0) - (data[keyA].timestamp || 0);
                });
                
                tableBody.innerHTML = '';
                sortedKeys.forEach(key => addOrUpdateRowToTable(key, data[key]));
            } else {
                tableBody.innerHTML = '';
                updateTotals(); 
            }
        });
    }

    // --- LÓGICA DO RESET COM SENHA ---
    if (resetButton && resetPasswordModal && confirmPasswordButton && cancelPasswordButton && resetPasswordInput) {
        
        // 1. Mostrar o modal de senha
        resetButton.addEventListener('click', (event) => {
            event.preventDefault(); 
            resetPasswordModal.classList.add('modal-reset--active'); 
            resetPasswordInput.value = ''; 
            resetPasswordInput.focus();
        });

        // 2. Ação de Cancelar no modal de senha
        cancelPasswordButton.addEventListener('click', () => {
            resetPasswordModal.classList.remove('modal-reset--active');
            resetPasswordInput.value = '';
        });
        
        // 3. Ação de Confirmar/Verificar Senha
        const handleResetConfirmation = () => {
            const enteredPassword = resetPasswordInput.value;
            
            if (enteredPassword === ADMIN_PASSWORD) {
                // Senha correta: Executa o reset
                remove(ESTOQUE_REF)
                    .then(() => {
                        resetPasswordModal.classList.remove('modal-reset--active');
                        alert('Todos os lançamentos de estoque foram excluídos com sucesso! ✅');
                    })
                    .catch(error => {
                        resetPasswordModal.classList.remove('modal-reset--active');
                        alert('Erro ao reiniciar a tabela: ' + error.message);
                    });
            } else {
                // Senha incorreta
                alert('❌ Senha de administrador incorreta!');
                resetPasswordInput.value = '';
                resetPasswordInput.focus();
            }
        };

        confirmPasswordButton.addEventListener('click', handleResetConfirmation);
        
        // Permite confirmar com Enter
        resetPasswordInput.addEventListener('keydown', (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                handleResetConfirmation();
            }
        });
    } else {
        console.warn("AVISO: O botão de reset ou os elementos do modal de senha não foram encontrados. O reset está desativado.");
    }
    // FIM DA LÓGICA DO RESET
    // ------------------------------------

    loadRealtimeData();
});