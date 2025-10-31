import { database } from './firebaseConfig.js';
import { ref, push, onValue, remove, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const inputField        = document.querySelectorAll('.register-card__input');
const erroMessages      = document.querySelectorAll('.register-validation');
const clickValidation   = document.querySelectorAll('.register-button__add');
const registerReturn    = document.querySelector('.register-return');
const container         = document.querySelector('.exit-content');
const historyContainer  = document.querySelector('.history-content');

const filterInput       = document.getElementById('filter-input__date');
const applyFilterBtn    = document.querySelector('.filter-button__1');
const showAllBtn        = document.querySelector('.filter-button__2');

// CORREÇÃO: Caminho do áudio dinâmico para funcionar na raiz (index-operador.html) e nas páginas aninhadas
let audioPath;
if (window.location.pathname.includes('/pages/')) {
    audioPath = '../../assets/audio/notification.mp3';
} else {
    audioPath = './assets/audio/notification.mp3';
}
const notificationSound = new Audio(audioPath);

const alarmAdd          = document.querySelector('.alarm--add');
const alarmUpdate       = document.querySelector('.alarm--update');

let allHistoryData = {};
let allSaidasData = {};
let lastKnownKeys = new Set();
// Definido como true para a primeira carga, a notificação só ocorre após a primeira mudança.
let isFirstLoad = true; 
let isUpdating = false;
let notificationInterval = null; 
let audioIsUnlocked = false; // 🚩 NOVO: Flag para controlar o estado de desbloqueio do áudio

const modal             = document.querySelector('.delete');
const btnCancel         = modal ? modal.querySelector('.button--link1') : null;
const btnConfirm        = modal ? modal.querySelector('.button--link2') : null;

let currentEditingKey   = null;
let currentEditingCard = null;

// 🚩 NOVO BLOCO: Função para desbloquear o áudio na primeira interação do usuário
const unlockAudio = () => {
    if (audioIsUnlocked) return;

    // Tenta reproduzir o áudio com volume 0
    notificationSound.volume = 0;
    notificationSound.play()
        .then(() => {
            // Sucesso: o áudio está desbloqueado
            notificationSound.pause();
            notificationSound.currentTime = 0;
            notificationSound.volume = 1; // Restaura o volume
            audioIsUnlocked = true;

            // Remove os listeners para não rodar novamente
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        })
        .catch(e => {
            // Falha: Áudio ainda bloqueado, mantém volume normal para a próxima tentativa manual
            notificationSound.volume = 1;
        });
};

// 🚩 NOVO BLOCO: Adiciona listeners globais para desbloquear o áudio
document.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio);
// FIM NOVO BLOCO


const nameOfPersonResponsible = () => {
    const value = inputField[0].value.trim();
    if (value.length === 0) {
        erroMessages[0].textContent = 'Falta preencher o nome responsável.';
    } else if (value.length <= 3) {
        erroMessages[0].textContent = 'Tem que obter mais de 3 caracteres.';
    } else {
        erroMessages[0].textContent = '';
    }
};

const departureTime = () => {
    erroMessages[1].textContent = inputField[1].value.trim().length === 0 ? 'Falta preencher a hora de saída.' : '';
};

const outputDuration = () => {
    const valueDuration = inputField[2].value.trim();
    if (valueDuration.length === 0) {
        erroMessages[2].textContent = 'Falta preencher a duração da saída.';
    } else if (valueDuration[0] === '0') {
        erroMessages[2].textContent = 'Iníciar com 1 minuto para cima.';
    } else {
        erroMessages[2].textContent = '';
    }
};

const areaDescription = () => {
    const valueDescription = inputField[3].value.trim();
    if (valueDescription.length === 0) {
        erroMessages[3].textContent = 'Falta preencher o campo de descrição.';
    } else if (valueDescription.length < 20) {
        erroMessages[3].textContent = 'A descrição deve ter no mínimo 20 caracteres.';
    } else {
        erroMessages[3].textContent = '';
    }
};

const exitContent = (data, key) => {
    const card = document.createElement('section');
    card.classList.add('exit-card');
    card.dataset.key = key;

    if (data.updated) {
        card.classList.add('card-updated');
    }

    // HTML DO CARTÃO PRINCIPAL (SEM O ALERTA)
    card.innerHTML = `
        <div class="exit-left">
            <div class="exit-left__user">
                <img class="exit-letf__image-user exit-left--image" src="../../assets/img/global/svg/icons/ui/user-register.svg" alt="Imagem de um usuário">
                <span class="exit-left__name">${data.name}</span>
            </div>
            <div class="exit-left__clock area--left">
                <img class="exit-letf__image-clock left--image" src="../../assets/img/global/svg/icons/ui/clock-register.svg" alt="Imagem de um relógio">
                <time class="exit-left__exit-register">Saída: ${data.exit}</time>
            </div>
            <div class="exit-left__return area--left">
                <img class="exit-letf__image-return left--image" src="../../assets/img/global/svg/icons/ui/return-register.svg" alt="Imagem de uma seta">
                <time class="exit-left__return-register">Retorno: ${data.return}</time>
            </div>
            <div class="exit-left__calendar area--left">
                <img class="exit-letf__image-calendar left--image" src="../../assets/img/global/svg/icons/ui/calendar-register.svg" alt="Imagem de calendário">
                <time class="exit-left__calendar-time">Data: ${data.date}</time>
            </div>
        </div>

        <div class="exit-center">
            <p class="exit-center__title">Descrição:</p>
            <textarea class="exit-center__text" readonly>${data.description}</textarea>
        </div>

        <div class="exit-right">
            <div class="exit-right__card-delete delete--operator" tabindex="11">
                <img class="exit-right__image-delete" src="../../assets/img/global/svg/icons/ui/delete-register.svg" alt="Imagem de um lixeiro" title="Botão de excluir.">
            </div>
            <div class="exit-right__card-edit edit--operator" tabindex="12">
                <img class="exit-right__image-edit" src="../../assets/img/global/svg/icons/ui/edit-register.svg" 
                alt="Imagem de um lápis" title="Botão de editar as saída.">
            </div>
        </div>
    `;

    const deleteBtn = card.querySelector('.exit-right__card-delete');
    deleteBtn.addEventListener('click', () => showDeleteConfirmation(card));
    
    const editBtn = card.querySelector('.exit-right__card-edit');
    editBtn.addEventListener('click', (event) => {
        event.stopPropagation(); 
        const descriptionElement = card.querySelector('.exit-center__text');
        
        const editModal         = document.querySelector('.edit');
        const editTextarea      = document.querySelector('.edit-textarea');
        
        currentEditingKey       = card.dataset.key;
        currentEditingCard = card;
        
        editTextarea.value = descriptionElement.textContent;
        editModal.classList.add('edit--active');
    });

    if(container) {
        // 1. Adiciona o cartão principal
        container.appendChild(card);
        
        // ⚡ ADIÇÃO: Só mostra aviso se nunca foi fechado para essa saída
        const warningClosed = localStorage.getItem(`exitWarningClosed-${key}`);
        if (!warningClosed) {
            const warning = document.createElement('div');
            warning.classList.add('exit-warning');
            warning.dataset.key = key;

            warning.innerHTML = `
                <p class="exit-warning__area">
                    <img class="exit-warning__image" src="../../assets/img/global/svg/icons/ui/attention-register.svg" alt="Imagem de uma placa de atenção"> 
                    Atenção: finalize 10 min antes do horário de saída.
                </p>
                    <div class="exit-warning__close">
                    <img class="exit-warning__image-close" src="../../assets/img/global/svg/icons/ui/close-circle-register.svg" alt="Imagem de um X para fechamento."> 
                </div>
            `;

            container.appendChild(warning);

            // Quando clicar no X → esconde e salva no localStorage
            const closeBtn = warning.querySelector('.exit-warning__close');
            closeBtn.addEventListener('click', () => {
                warning.remove();
                localStorage.setItem(`exitWarningClosed-${key}`, 'true');
            });
        }
    }
};


// CORREÇÃO: Função showDeleteConfirmation revisada para garantir que o botão btnConfirm funcione.
const showDeleteConfirmation = (card) => {
    if (!modal || !btnCancel || !btnConfirm) {
        return;
    }

    modal.classList.add('delete--active');
    // Armazena a referência do card para usar no clique de confirmação
    modal._currentCard = card; 

    btnCancel.onclick = () => {
        modal.classList.remove('delete--active');
        delete modal._currentCard;
    };

    btnConfirm.onclick = () => {
        const current = modal._currentCard;
        if (!current) {
            modal.classList.remove('delete--active');
            return;
        }

        const key = current.dataset.key;

        // 1. Pega os dados atuais antes de deletar
        get(ref(database, `saidas/${key}`)).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // 2. Prepara os dados para o histórico 
                const historyData = {
                    ...data,
                    deletedAt: new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})
                };
                
                // 3. Salva no histórico
                push(ref(database, 'historico'), historyData)
                .then(() => {
                    // 4. Remove do nó 'saidas' (exclusão)
                    remove(ref(database, `saidas/${key}`)); 
                })
                .catch((error) => {
                    console.error("Erro ao adicionar dados ao histórico: ", error);
                });
            }
        }).catch((error) => {
            console.error("Erro ao pegar dados para remover: ", error);
        });

        modal.classList.remove('delete--active');
        delete modal._currentCard;
    };
};

const addToHistory = (data, key) => {
    const excludedArea = document.createElement('div');
    excludedArea.classList.add('excluded-area');

    excludedArea.innerHTML = `
        <div class="excluded-area__content">
            <img class="excluded-area__image" src="../../assets/img/global/svg/icons/ui/calendar-register.svg" alt="">
            <time class="excluded-area__time">${data.date}</time>
        </div>
        <section class="excluded-card">
            <div class="excluded-left">
                <div class="excluded-left__user">
                    <img class="excluded-letf__image-user excluded-left--image" src="../../assets/img/global/svg/icons/ui/user-register.svg" alt="Imagem de um usuário">
                    <span class="excluded-left__name">${data.name}</span>
                </div>
                <div class="excluded-left__clock area--left">
                    <img class="excluded-letf__image-clock left--image" src="../../assets/img/global/svg/icons/ui/clock-register.svg" alt="Imagem de um relógio">
                    <time class="excluded-left__excluded-register">Saída: ${data.exit}</time>
                </div>
                <div class="excluded-left__return area--left">
                    <img class="excluded-letf__image-return left--image" src="../../assets/img/global/svg/icons/ui/return-register.svg" alt="Imagem de uma seta">
                    <time class="excluded-left__return-register">Retorno: ${data.return}</time>
                </div>
            </div>

            <div class="excluded-center">
                <p class="excluded-center__title">Descrição:</p>
                <textarea class="excluded-center__text" readonly>${data.description}</textarea>
            </div>

            <div class="excluded-right">
                <div class="excluded-right__content">
                    <h4 class="excluded-right__title">Excluído:</h4>
                    <div class="excluded-right__area">
                        <span class="excluded-right__subtile">Hora:</span>
                        <time class="excluded-right__time">${data.deletedAt}</time>
                    </div>
                </div>
                <div class="excluded-right__attention">
                    <img class="excluded-right__attention-image" src="../../assets/img/global/svg/icons/ui/attention-register.svg" alt="Imagem de uma placa de atenção">
                    <p class="excluded-right__text">Essa informação fica por 2 mês.</p>
                </div>
            </div>
        </section>
    `;

    if(historyContainer) {
        historyContainer.appendChild(excludedArea);
    }
};

const playNotification = () => {
    try {
        // Se o áudio não foi desbloqueado, o .play() falhará aqui (o que é esperado)
        notificationSound.load(); 
        notificationSound.currentTime = 0; 
        notificationSound.play();
    } catch (error) {
        if (error.name !== "NotAllowedError") {
             console.warn("Erro ao tentar reproduzir o áudio:", error);
        }
    }
}


const showAlarm = (type) => {
    let alarm = type === 'add' ? alarmAdd : alarmUpdate;
    if (!alarm) return;
    alarm.classList.add('alarm--active');
    
    if (notificationInterval === null) {
        playNotification(); 
        
        notificationInterval = setInterval(playNotification, 2000); 
    }
};

const hideAlarm = (type) => {
    let alarm = type === 'add' ? alarmAdd : alarmUpdate;
    if (!alarm) return;
    alarm.classList.remove('alarm--active');
    
    if (notificationInterval !== null) {
        clearInterval(notificationInterval);
        notificationInterval = null;
        notificationSound.pause(); 
        notificationSound.currentTime = 0; 
    }
};

if (alarmAdd) {
    alarmAdd.querySelector('.alarm-button').addEventListener('click', () => {
        hideAlarm('add');
    });
}

// CORREÇÃO: Removida a lógica de resetar a flag 'updated' no Firebase.
// Isso garante que a classe CSS `card-updated` (borda azul) permaneça.
if (alarmUpdate) {
    alarmUpdate.querySelector('.alarm-button').addEventListener('click', () => {
        hideAlarm('update');
        // A lógica de resetar a flag 'updated' (que apagava a borda azul)
        // foi removida daqui, mantendo o status de atualização no Firebase.
    });
}

if (clickValidation) {
    clickValidation.forEach(item => {
        item.addEventListener('click', () => {
            nameOfPersonResponsible();
            departureTime();
            outputDuration();
            areaDescription();

            const hasError = [...erroMessages].some(span => span.textContent !== '');
            if (hasError) {
                return;
            }

            // ⚠️ REMOÇÃO DE CÓDIGO REDUNDANTE PARA DESBLOQUEIO
            // A lógica de desbloqueio foi movida para a função global unlockAudio.
            // O código abaixo é mantido AQUI, pois estava no seu script original
            // e tem o objetivo de tentar desbloquear o áudio ao adicionar um card.
            // Para maior robustez, o novo código global é mais eficaz.
            try {
                notificationSound.volume = 0;
                notificationSound.play().then(() => {
                    notificationSound.pause();
                    notificationSound.currentTime = 0;
                    notificationSound.volume = 1; 
                }).catch(e => {
                    notificationSound.volume = 1; 
                });
            } catch (e) {
            }

            const data = {
                name: inputField[0].value.trim(),
                exit: inputField[1].value.trim(),
                return: registerReturn.textContent.trim(),
                date: new Date().toLocaleDateString('pt-BR'),
                description: inputField[3].value.trim()
            };

            inputField.forEach(field => field.value = '');
            erroMessages.forEach(span => span.textContent = '');
            registerReturn.textContent = '--:--';

            push(ref(database, 'saidas'), data)
            .then(() => {
            })
            .catch((error) => {
                console.error("Erro ao adicionar dados ao Firebase: ", error);
            });
        });
    });
}

// LÓGICA DE PÁGINA: Mantida para controlar a renderização de conteúdo e modais
const isRegisterPage = window.location.pathname.includes('register');
const isHistoryPage  = window.location.pathname.includes('history'); 
        
// Listener de Saídas (AGORA GLOBAL, mas a RENDERIZAÇÃO é restrita à página de registro)
onValue(ref(database, 'saidas'), (snapshot) => {
    const currentData = snapshot.val() || {};
    const previousKeys = new Set(lastKnownKeys); 
    allSaidasData = currentData;
    const currentKeys = new Set(Object.keys(currentData));
    
    // --- LÓGICA DE NOTIFICAÇÃO ---
    // A notificação só ocorre a partir da segunda execução do 'onValue'
    if (!isFirstLoad) { 
        let updatedKeysCount = 0;
        const addedKeys = [...currentKeys].filter(key => !previousKeys.has(key));
        
        // 1. Detecção de Atualização (O item existe nas chaves anteriores E foi modificado com 'updated: true')
        for (const key of previousKeys) {
             const data = currentData[key];
             // Checa se a chave existia, ainda existe e se foi atualizada
             if (currentKeys.has(key) && data && data.updated && key !== currentEditingKey) { 
                 updatedKeysCount++;
             }
        }
        
        // 2. Detecção de Adição (O número de chaves aumentou)
        if (updatedKeysCount > 0) {
            showAlarm('update');
        } else if (addedKeys.length > 0) {
            // Dispara o alarme de adição APENAS se houver novas chaves.
            showAlarm('add');
        }
        
        // NOTA: A remoção (quando currentKeys.size < previousKeys.size) não ativa NENHUM dos alarmes acima.
    }
    
    // ATUALIZAÇÃO das chaves conhecidas DEPOIS de toda a lógica de alarme
    lastKnownKeys = currentKeys;
    isFirstLoad = false;
    
    // RENDERIZAÇÃO DOS CARDS (SÓ NA PÁGINA DE REGISTRO)
    if (isRegisterPage && container) {
        container.innerHTML = '';
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            const key  = childSnapshot.key;
            exitContent(data, key);
        });
    }
});


// LÓGICA E MODAIS ESPECÍFICOS DA PÁGINA DE REGISTRO
if (isRegisterPage) {
    const editModal         = document.querySelector('.edit');
    const editTextarea      = document.querySelector('.edit-textarea');
    const editConfirmBtn = document.querySelector('.button--confirm-edit');
    const editCancelBtn  = document.querySelector('.button--cancel-edit');

    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', () => {
            editModal.classList.remove('edit--active');
            currentEditingKey  = null;
            currentEditingCard = null;
        });
    }

    if (editConfirmBtn) {
        editConfirmBtn.addEventListener('click', () => {
            if (currentEditingKey && currentEditingCard) {
                const newDescription = editTextarea.value;
                const cardRef        = ref(database, `saidas/${currentEditingKey}`);

                update(cardRef, { 
                    description: newDescription,
                    updated: true 
                })
                    .then(() => {
                        alert('Descrição atualizada com sucesso!');
                        editModal.classList.remove('edit--active');
                        currentEditingKey  = null;
                        currentEditingCard = null;
                    })
                    .catch((error) => {
                        alert('Ocorreu um erro ao atualizar a descrição.');
                        console.error('Erro ao atualizar a descrição:', error);
                        editModal.classList.remove('edit--active');
                        currentEditingKey  = null;
                        currentEditingCard = null;
                    });
            }
        });
    }
} 

// LÓGICA E FILTROS ESPECÍFICOS DA PÁGINA DE HISTÓRICO
if (isHistoryPage) {
    onValue(ref(database, 'historico'), (snapshot) => {
        if(historyContainer) {
            historyContainer.innerHTML = '';
            allHistoryData = snapshot.val() || {};

            const sorted = Object.entries(allHistoryData).sort(([, a], [, b]) => {
                const [da, ma, ya] = a.date.split('/');
                const [db, mb, yb] = b.date.split('/');
                const dateA = new Date(`${ya}-${ma}-${da}`);
                const dateB = new Date(`${yb}-${mb}-${db}`);
                
                if (dateB.getTime() === dateA.getTime()) {
                    if (a.deletedAt && b.deletedAt) {
                        return b.deletedAt.localeCompare(a.deletedAt);
                    }
                }
                return dateB - dateA;
            });

            sorted.forEach(([key, data]) => {
                addToHistory(data, key);
            });
        }
    });

    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const selectedDate = filterInput.value;
            if (!selectedDate) {
                alert('Por favor, selecione uma data.');
                return;
            }
            const [year, month, day] = selectedDate.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            historyContainer.innerHTML = '';

            const filtered = Object.entries(allHistoryData)
                .filter(([, data]) => data.date === formattedDate)
                .sort(([, a], [, b]) => {
                    if (a.deletedAt && b.deletedAt) {
                        return b.deletedAt.localeCompare(a.deletedAt);
                    }
                    return 0;
                });

            filtered.forEach(([key, data]) => addToHistory(data, key));
        });
    }

    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => {
            historyContainer.innerHTML = '';
            const sorted = Object.entries(allHistoryData).sort(([, a], [, b]) => {
                const [da, ma, ya] = a.date.split('/');
                const [db, mb, yb] = b.date.split('/');
                const dateA = new Date(`${ya}-${ma}-${da}`);
                const dateB = new Date(`${yb}-${mb}-${db}`);
                if (dateB.getTime() === dateA.getTime()) {
                    if (a.deletedAt && b.deletedAt) {
                        return b.deletedAt.localeCompare(a.deletedAt);
                    }
                }
                return dateB - dateA;
            });
            sorted.forEach(([key, data]) => addToHistory(data, key));
        });
    }
}
