// stockControl_final.js
// Versão simplificada: controla estoque e histórico (Relatório removido)

import { database } from '../register/firebaseConfig.js';
import { ref, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Refs
const ESTOQUE_REF = ref(database, 'estoque');
const HISTORICO_EXCLUIDOS_REF = ref(database, 'historyControl');
const ADMIN_PASSWORD = 'operadoradm';

// Produtos (filtro - Mantido para referências)
const ALL_PRODUCTS_FOR_FILTER = [
    { value: 'caixa-baixa', text: 'Caixa baixa' },
    { value: 'exportacao-barriga', text: 'Exportação barriga' },
    { value: 'exportacao-bisteca', text: 'Exportação bisteca' },
    { value: 'exportacao-costela', text: 'Exportação de costela' },
    { value: 'exportacao-miudos', text: 'Exportação de miúdos' },
    { value: 'exportacao-lombo', text: 'Exportação lombo' },
    { value: 'exportacao-mascara', text: 'Exportação máscara' },
    { value: 'exportacao-sobrepaleta', text: 'Exportação de sobrepaleta' },
    { value: 'pernil-com-pele', text: 'Pernil com pele' },
    { value: 'torresmo', text: 'Torresmo' }
];

// *********************************************************************************
// LISTA DE PRODUTOS PARA LANÇAMENTO: 'Exportações' está incluído.
// *********************************************************************************
const productsByCategory = {
    'interno': [
        'Caixa baixa', 'Pernil com pele', 'Torresmo'
    ],
    'externo': [
        'Exportações', 'Exportação barriga', 'Exportação bisteca', 'Exportação de costela',
        'Exportação de miúdos', 'Exportação lombo', 'Exportação máscara',
        'Exportação de sobrepaleta'
    ]
};
// *********************************************************************************

// Utils
const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};


// --- Controle de Estoque (initializeStockControl) ---
const initializeStockControl = () => {
    const formElement = document.getElementById('formulario-lancamento');
    const tableBody = document.querySelector('#tabela-lancamentos tbody');
    const resetButton = document.querySelector('.reset-table');
    if (!formElement || !tableBody || !resetButton) return;

    const categorySelect = document.getElementById('categoria');
    const productSelect = document.getElementById('produto');
    const descriptionInput = document.getElementById('descricao');
    const quantityInput = document.getElementById('quantidade');
    const totalBlockDiv = document.getElementById('bloco-total');
    const remainingBlockDiv = document.getElementById('bloco-restante');
    const finishModal = document.querySelector('.delete--termino');
    const cardDeleteModal = document.querySelector('.delete--card');
    const resetPasswordModal = document.querySelector('.modal-reset');
    const resetPasswordInput = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__input') : null;
    const confirmPasswordButton = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__confirm') : null;
    const cancelPasswordButton = resetPasswordModal ? resetPasswordModal.querySelector('.modal-reset__cancel') : null;

    const updateTotals = () => {
        let totalBoxes = 0, remainingBoxes = 0;
        document.querySelectorAll('#tabela-lancamentos tbody tr').forEach(row => {
            const q = parseInt(row.dataset.quantity || 0, 10); const s = parseInt(row.dataset.saida || 0, 10);
            totalBoxes += q; remainingBoxes += (q - s);
        });
        if (totalBlockDiv) totalBlockDiv.textContent = `Total de Caixas: ${totalBoxes}`;
        if (remainingBlockDiv) remainingBlockDiv.textContent = `Caixas Restantes: ${remainingBoxes}`;
    };

    // Lógica para popular os produtos baseada na categoria
    categorySelect?.addEventListener('change', () => {
        const selected = categorySelect.value; productSelect.innerHTML = '<option value="">Selecione um Produto</option>';
        if (selected && productsByCategory[selected]) {
            productSelect.disabled = false;
            productsByCategory[selected].forEach(p => {
                const o = document.createElement('option'); o.value = p; o.textContent = p; productSelect.appendChild(o);
            });
        } else productSelect.disabled = true;
    });

    // Lógica de Lançamento (Submit)
    formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const quantity = parseInt(quantityInput.value || 0, 10);
        const category = categorySelect.value;
        const product = productSelect.value;
        const description = descriptionInput.value || '';

        if (isNaN(quantity) || quantity <= 0) { alert('Insira quantidade válida'); return; }
        if (!category || !product) { alert('Preencha categoria e produto'); return; }

        const newEntry = { quantity, category, product, description, status: 'pendente', timestamp: Date.now(), saida: 0, dataSaida: null };

        push(ESTOQUE_REF, newEntry)
            .then(() => {
                quantityInput.value = '';
                categorySelect.value = '';
                productSelect.innerHTML = '<option value="">Selecione um Produto</option>';
                productSelect.disabled = true;
                descriptionInput.value = '';
            })
            .catch(err => alert('Erro ao salvar: ' + err.message));
    });

    // ... (restante da initializeStockControl, que lida com a tabela e CRUD) ...
    // Mantendo o restante do código da tabela inalterado para evitar quebras.

    function addOrUpdateRowToTable(key, data) {
        let row = document.querySelector(`tr[data-key="${key}"]`); const { quantity, category, product, description, status, saida = 0, timestamp } = data;
        if (!row) { row = document.createElement('tr'); row.dataset.key = key; tableBody.prepend(row); }
        row.dataset.quantity = quantity; row.dataset.saida = saida; const restantes = quantity - saida; const categoryDisplay = category === 'interno' ? 'Mercado Interno' : 'Mercado Externo'; const categoryClass = category === 'interno' ? 'categoria-interno' : 'categoria-externo';
        row.className = ''; if ((status || 'pendente') === 'concluido') row.classList.add('concluido');
        row.innerHTML = `\n            <td>${quantity}</td>\n            <td>${saida}</td>\n            <td>${restantes}</td>\n            <td class="${categoryClass}">${categoryDisplay}</td>\n            <td>${product}</td>\n            <td>${formatTimestamp(timestamp)}</td>\n            <td>${description || '-'}</td>\n            <td class="table--header__monitor">\n                <div class="botoes-acao">\n                    <button class="btn-ok btn-ok__monitor">${(status === 'concluido') ? 'Desmarcar' : 'Término'}</button>\n                    <button class="btn-editar btn-editar__monitor" style="display:${(status === 'concluido') ? 'none' : ''}">Editar</button>\n                    <button class="btn-excluir btn-excluir__monitor btn-excluir__operador" style="display:${(status === 'concluido') ? 'none' : ''}">Excluir</button>\n                </div>\n            </td>\n        `;
        attachRowEventListeners(row, key, data); updateTotals();
    }

    function removeRowFromTable(key) { const r = document.querySelector(`tr[data-key="${key}"]`); if (r) r.remove(); }

    function attachRowEventListeners(row, key, data) {
        const ok = row.querySelector('.btn-ok'), edit = row.querySelector('.btn-editar'), del = row.querySelector('.btn-excluir'); if (!ok || !edit || !del) return; const newOk = ok.cloneNode(true); ok.parentNode.replaceChild(newOk, ok); const newEdit = edit.cloneNode(true); edit.parentNode.replaceChild(newEdit, edit); const newDel = del.cloneNode(true); del.parentNode.replaceChild(newDel, del);
        newOk.addEventListener('click', () => { const currentSaida = parseInt(row.dataset.saida || 0, 10); const originalQuantity = parseInt(row.dataset.quantity || 0, 10); const restantes = originalQuantity - currentSaida; const isConcluido = restantes === 0; const confirmFinish = () => { update(ref(database, `estoque/${key}`), { saida: originalQuantity, dataSaida: Date.now(), status: 'concluido' }).catch(err => alert('Erro: ' + err.message)); }; const confirmUnmark = () => { update(ref(database, `estoque/${key}`), { saida: 0, dataSaida: null, status: 'pendente' }).catch(err => alert('Erro: ' + err.message)); }; if (isConcluido) openConfirmationModal(finishModal, 'Desmarcar Conclusão', `Produto: ${data.product}. Desmarcar?`, confirmUnmark); else openConfirmationModal(finishModal, 'Confirmar Término', `Produto: ${data.product} (${restantes} restantes). Confirmar término?`, confirmFinish); });
        newDel.addEventListener('click', () => { const confirmDeletion = () => remove(ref(database, `estoque/${key}`)).catch(err => alert('Erro ao excluir: ' + err.message)); openConfirmationModal(cardDeleteModal, 'Confirmar Exclusão', `Excluir lançamento do produto ${data.product} (${data.quantity} caixas)?`, confirmDeletion); });
        newEdit.addEventListener('click', () => handleEditMode(row, key, data));
    }

    function openConfirmationModal(modal, titleText, bodyText, confirmAction) { if (!modal) { confirmAction(); return; } modal.classList.remove('delete--active'); const titleElement = modal.querySelector('.delete-title'); const textElement = modal.querySelector('.delete-text'); const confirmButton = modal.querySelector('.button--link2'); const cancelButton = modal.querySelector('.button--link1'); if (titleElement) titleElement.textContent = titleText; if (textElement) textElement.textContent = bodyText; if (confirmButton && cancelButton) { const cloneConfirm = confirmButton.cloneNode(true); confirmButton.parentNode.replaceChild(cloneConfirm, confirmButton); const cloneCancel = cancelButton.cloneNode(true); cancelButton.parentNode.replaceChild(cloneCancel, cancelButton); cloneConfirm.addEventListener('click', () => { confirmAction(); modal.classList.remove('delete--active'); }); cloneCancel.addEventListener('click', () => { modal.classList.remove('delete--active'); }); modal.classList.add('delete--active'); } else { confirmAction(); } }

    // ... (código anterior)

    function handleEditMode(newRow, key, originalData) {
        const cells = newRow.querySelectorAll('td');
        const [tdQuantity, tdSaida, tdRestantes, tdCategory, tdProduct, tdData, tdDescription, tdAction] = cells;
        const { quantity: oldQuantity, category: oldCategoryValue, product: oldProduct, description: oldDescription, saida: oldSaida = 0, dataSaida: oldDataSaida = null } = originalData;

        tdQuantity.innerHTML = `<input type="number" class="edit-quantity" value="${oldQuantity}" min="1" style="width:70px">`;
        const editQuantityInput = tdQuantity.querySelector('.edit-quantity');

        tdSaida.innerHTML = `<input type="number" class="edit-saida" value="${oldSaida}" min="0" max="${oldQuantity}" style="width:70px">`;
        const editSaidaInput = tdSaida.querySelector('.edit-saida');

        tdRestantes.innerHTML = `<span class="edit-restantes" style="font-weight:bold">${oldQuantity - oldSaida}</span>`;
        const editRestantesSpan = tdRestantes.querySelector('.edit-restantes');

        const updateRestantes = () => {
            const newQty = parseInt(editQuantityInput.value || 0, 10);
            let newSaida = parseInt(editSaidaInput.value || 0, 10);
            if (newSaida > newQty) { newSaida = newQty; editSaidaInput.value = newSaida; }
            editSaidaInput.max = newQty;
            editRestantesSpan.textContent = newQty - newSaida;
        };

        editQuantityInput.addEventListener('input', updateRestantes);
        editSaidaInput.addEventListener('input', updateRestantes);

        tdCategory.innerHTML = `<select id="edit-category" class="edit-category" style="width:120px"><option value="interno">Mercado Interno</option><option value="externo">Mercado Externo</option></select>`;
        const editCategorySelect = tdCategory.querySelector('.edit-category');
        editCategorySelect.value = oldCategoryValue;

        const editProductSelect = document.createElement('select');
        editProductSelect.classList.add('edit-product');
        editProductSelect.style.width = '120px';

        const populateProducts = (categoryValue, selectedProduct) => {
            editProductSelect.innerHTML = '';
            const prods = productsByCategory[categoryValue] || [];
            prods.forEach(p => {
                const o = document.createElement('option');
                o.value = p; o.textContent = p;
                editProductSelect.appendChild(o);
            });
            if (selectedProduct && prods.includes(selectedProduct)) editProductSelect.value = selectedProduct;
        };

        populateProducts(oldCategoryValue, oldProduct);

        tdProduct.innerHTML = '';
        tdProduct.appendChild(editProductSelect);
        editCategorySelect.addEventListener('change', () => populateProducts(editCategorySelect.value));

        tdData.textContent = formatTimestamp(originalData.timestamp);

        tdDescription.innerHTML = `<input type="text" class="edit-description" value="${oldDescription === '-' ? '' : oldDescription}" style="width:120px">`;
        const editDescriptionInput = tdDescription.querySelector('.edit-description');

        tdAction.innerHTML = `<button class="btn-salvar">Salvar</button><button class="btn-cancelar">Cancelar</button>`;
        const saveButton = tdAction.querySelector('.btn-salvar');

        const saveAction = () => {
            const newQuantity = parseInt(editQuantityInput.value || 0, 10);
            const newSaida = parseInt(editSaidaInput.value || 0, 10);
            const newCategoryValue = editCategorySelect.value;
            const newProduct = editProductSelect.value;
            const newDescription = editDescriptionInput.value;
            let newTimestampSaida = oldDataSaida;

            if (newSaida !== oldSaida && newSaida > 0) newTimestampSaida = Date.now();
            else if (newSaida === 0) newTimestampSaida = null;

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
                update(ref(database, `estoque/${key}`), updatedData).then(() => addOrUpdateRowToTable(key, updatedData)).catch(err => alert('Erro ao salvar edição: ' + err.message));
            } else alert('Dados inválidos');
        };

        // Adiciona o evento de clique ao botão Salvar
        saveButton.addEventListener('click', saveAction);

        // Funções para capturar o Enter nos campos de edição
        const handleEnterKey = (ev) => {
            if (ev.key === 'Enter') {
                ev.preventDefault(); // Evita o comportamento padrão (ex: submeter formulário)
                saveAction(); // Chama a função de salvar
            }
        };

        // Adiciona o event listener de Enter aos campos de input
        editQuantityInput.addEventListener('keydown', handleEnterKey);
        editSaidaInput.addEventListener('keydown', handleEnterKey);
        editDescriptionInput.addEventListener('keydown', handleEnterKey);

        tdAction.querySelector('.btn-cancelar').addEventListener('click', () => addOrUpdateRowToTable(key, originalData));
    }

    // Realtime (Leitura e Atualização da Tabela)
    onValue(ESTOQUE_REF, snapshot => {
        tableBody.innerHTML = '';
        if (snapshot.exists()) {
            const data = snapshot.val();
            const sortedKeys = Object.keys(data).sort((a, b) => (data[b].timestamp || 0) - (data[a].timestamp || 0));
            sortedKeys.forEach(key => addOrUpdateRowToTable(key, data[key]));
        } else { updateTotals(); }
    });

    // Reset da Tabela
    const resetTableAndLogHistory = async () => {
        try {
            const snapshot = await get(ESTOQUE_REF);
            if (!snapshot.exists()) { if (resetPasswordModal) resetPasswordModal.classList.remove('modal-reset--active'); alert('Tabela já vazia'); return; }
            const currentStockData = snapshot.val();
            const historyEntry = { timestampExclusao: Date.now(), usuario: 'Operador Admin', registros: currentStockData };
            await push(HISTORICO_EXCLUIDOS_REF, historyEntry);
            await remove(ESTOQUE_REF);
            if (resetPasswordModal) resetPasswordModal.classList.remove('modal-reset--active'); alert('Estoque zerado e salvo no histórico');
        } catch (err) { if (resetPasswordModal) resetPasswordModal.classList.remove('modal-reset--active'); alert('Erro no reset: ' + err.message); }
    };

    if (resetButton && resetPasswordModal && confirmPasswordButton && cancelPasswordButton && resetPasswordInput) {
        resetButton.addEventListener('click', (e) => { e.preventDefault(); resetPasswordModal.classList.add('modal-reset--active'); resetPasswordInput.value = ''; resetPasswordInput.focus(); });
        cancelPasswordButton.addEventListener('click', () => { resetPasswordModal.classList.remove('modal-reset--active'); resetPasswordInput.value = ''; });
        const handleResetConfirmation = () => { const entered = resetPasswordInput.value; if (entered === ADMIN_PASSWORD) resetTableAndLogHistory(); else { alert('Senha incorreta'); resetPasswordInput.value = ''; resetPasswordInput.focus(); } };
        confirmPasswordButton.addEventListener('click', handleResetConfirmation);
        resetPasswordInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); handleResetConfirmation(); } });
    }
};

// --- Histórico (initializeHistoryControl) ---
const initializeHistoryControl = () => {
    const historyContainer = document.getElementById('historico-container') || document.getElementById('history-main-container');
    const dateInput = document.getElementById('filter-input__date');
    const applyFilterButton = document.querySelector('.filter-button__1');
    const showAllButton = document.querySelector('.filter-button__2');
    if (!historyContainer) return;

    // Função para formatar timestamp
    const getLocalDateString = (ts) => {
        const d = new Date(ts);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Cria uma linha da tabela do histórico
    const createRow = (reg) => {
        const { quantity = 0, saida = 0, category, product, description, timestamp } = reg;
        const restantes = quantity - saida;
        const catDisp = category === 'interno' ? 'Mercado Interno' : 'Mercado Externo';
        const catClass = category === 'interno' ? 'categoria-interno' : 'categoria-externo';
        return `<tr>
            <td>${quantity}</td>
            <td>${saida}</td>
            <td>${restantes === 0 ? '<span style="color:green;font-weight:bold">Concluído ✅</span>' : restantes}</td>
            <td class="${catClass}">${catDisp}</td>
            <td>${product || '-'}</td>
            <td>${formatTimestamp(timestamp)}</td>
            <td>${description || '-'}</td>
        </tr>`;
    };

    // Carrega histórico com filtro opcional
    const loadHistoryData = (filterDate = null) => {
        onValue(HISTORICO_EXCLUIDOS_REF, snapshot => {
            historyContainer.innerHTML = `<div class="excluded-header"><div class="excluded-header__area"><h3 class="excluded-header__title">Estoque excluídos</h3></div><div class="excluded-header__line"></div></div>`;
            if (!snapshot.exists()) {
                historyContainer.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:20px">Nenhum histórico de exclusão registrado no sistema.</div>`);
                return;
            }

            const historyData = snapshot.val();
            const sortedKeys = Object.keys(historyData).sort((a, b) => (historyData[b].timestampExclusao || 0) - (historyData[a].timestampExclusao || 0));
            let blocks = 0; // Contador de blocos exibidos

            sortedKeys.forEach(key => {
                const data = historyData[key];
                const ts = data.timestampExclusao; // Data de Exclusão (Reset)
                const localDateExclusao = ts ? getLocalDateString(ts) : '';

                const registros = data.registros;
                if (!registros) return;

                // Ordenação original
                const sortedRecords = Object.values(registros).sort((a, b) => {
                    if (a.category === 'interno' && b.category === 'externo') return -1;
                    if (a.category === 'externo' && b.category === 'interno') return 1;
                    return (a.timestamp || 0) - (b.timestamp || 0); // Data de Lançamento (Mais Antigo)
                });

                let totalTun = 0, totalRem = 0, rows = '';
                let hasFilteredRecords = false; // Flag para saber se este bloco tem registros para exibir

                sortedRecords.forEach(r => {
                    const recordTimestamp = r.timestamp;

                    // --- INÍCIO DA LÓGICA DO FILTRO CORRIGIDA (VERSÃO 2.0) ---
                    let shouldDisplay = true;

                    if (filterDate) {
                        if (!recordTimestamp) {
                            shouldDisplay = false;
                        } else {
                            // Cria o objeto Date baseado no timestamp
                            const recordDate = new Date(recordTimestamp);

                            // *** USO DE toLocaleDateString para garantir o YYYY-MM-DD no fuso horário local ***
                            const recordDateISO = recordDate.toLocaleDateString('en-CA', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            });

                            // Compara a data de lançamento formatada com a data do filtro (YYYY-MM-DD)
                            if (recordDateISO !== filterDate) {
                                shouldDisplay = false;
                            }
                        }
                    }
                    // --- FIM DA LÓGICA DO FILTRO CORRIGIDA (VERSÃO 2.0) ---

                    if (shouldDisplay) {
                        hasFilteredRecords = true;
                        rows += createRow(r);
                        totalTun += (r.quantity || 0);
                        totalRem += ((r.quantity || 0) - (r.saida || 0));
                    }
                });

                // Se o filtro estiver ativo e não houver registros, não exibe o bloco (return)
                if (filterDate && !hasFilteredRecords) return;

                // Se houver registros ou se não houver filtro
                if (rows === '' && !filterDate) {
                    rows = `<tr><td colspan="7" style="text-align:center">Nenhum registro encontrado neste evento.</td></tr>`;
                } else if (rows === '' && filterDate) {
                    return; // Se tem filtro e o bloco está vazio, não exibe o bloco
                }


                const blockHTML = `<div class="excluded-area" data-history-key="${key}">
                    <section class="control-card">
                        <table class="table" id="tabela-lancamentos">
                            <thead class="table-header">
                                <tr class="table-header__list">
                                    <th class="table-header__list">Quantidade</th>
                                    <th class="table-header__list">Saída</th>
                                    <th class="table-header__list">Restantes</th>
                                    <th class="table-header__list">Categoria</th>
                                    <th class="table-header__list">Produto</th>
                                    <th class="table-header__list">Data</th>
                                    <th class="table-header__list">Descrição</th>
                                </tr>
                            </thead>
                            <tbody class="table-body">${rows}</tbody>
                        </table>
                    </section>
                    <div class="result">
                        <div class="result-box__tunel">
                            <p class="result-box__title">Total de Caixas</p>
                            <div class="result-box">${totalTun}</div>
                        </div>
                        <div class="result-box__tunel result-box__remaining">
                            <p class="result-box__title title--remaining">Caixas Restantes</p>
                            <div class="result-box">${totalRem}</div>
                        </div>
                    </div>
                </div>`;

                historyContainer.insertAdjacentHTML('beforeend', blockHTML);
                blocks++;
            });

            if (blocks === 0) historyContainer.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:20px">Nenhum histórico encontrado para o período.</div>`);
        }, error => {
            console.error('Erro ao ler histórico:', error);
            historyContainer.insertAdjacentHTML('beforeend', `<div style="text-align:center;padding:20px;color:red">Erro ao conectar com o banco de dados.</div>`);
        });
    };

    // Eventos de filtro
    applyFilterButton?.addEventListener('click', () => {
        const sel = dateInput?.value;
        if (sel) loadHistoryData(sel);
        else alert('Selecione uma data.');
    });

    showAllButton?.addEventListener('click', () => {
        if (dateInput) dateInput.value = '';
        loadHistoryData(null);
    });

    // Inicial
    loadHistoryData();
};
// Init
document.addEventListener('DOMContentLoaded', () => {
    try { initializeStockControl(); } catch (e) { console.error('Erro ao inicializar o controle de estoque:', e); }
    try { initializeHistoryControl(); } catch (e) { console.error('Erro ao inicializar o controle de histórico:', e); }
    // A função initializeReportControl foi removida
});
