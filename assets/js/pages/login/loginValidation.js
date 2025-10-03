const validUsers = [
    { 
        user: 'tunel.continuo', 
        password: 'tcm1234', 
        destination: 'index-operador.html', 
        fullName: 'Operador' 
    },
    { 
        user: 'juan.ebrhardt', 
        password: 'monitor2025*', 
        destination: 'index-monitor.html', 
        fullName: 'Juan Ebrhardt' 
    },
    { 
        user: 'leandro.marostega', 
        password: 'adm2025*', 
        destination: 'index.html', 
        fullName: 'Leandro Marostega' 
    },
    { 
        user: 'felipe.lopez', 
        password: 'admgeral*', 
        destination: 'index.html', 
        fullName: 'Felipe Lopez' 
    }
];

// 1. FUNÇÃO DE LOGOUT (Corrigida e Universal)
const handleLogout = () => {
    // Limpa a sessão
    sessionStorage.removeItem('usuarioLogado');
    sessionStorage.removeItem('nomeUsuario');
    sessionStorage.removeItem('nomeUsuarioCompleto');
    
    // Calcula o caminho de redirecionamento de volta para o login:
    const currentPath = window.location.pathname;
    
    // CORREÇÃO: Incluir 'index-monitor.html' na checagem de página raiz
    const isRootPage = currentPath.endsWith('index.html') || 
                       currentPath.endsWith('index-operador.html') || 
                       currentPath.endsWith('index-monitor.html') || // <-- CORRIGIDO AQUI
                       currentPath.endsWith('/');

    if (isRootPage) {
        // Se estiver na raiz, o caminho é direto (CORRETO)
        window.location.replace('pages/login/login.html'); 
    } else {
        // Se estiver em uma subpasta, precisa subir um nível (../)
        window.location.replace('../login/login.html'); 
    }
};

// 2. FUNÇÃO DE CONTROLE DE SESSÃO E GATEKEEPING
document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splash-screen');
    const loginContainer = document.querySelector('.login-container');
    
    // Elementos do Header
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userMenu = document.getElementById('userMenu');
    const userNameGreeting = document.getElementById('userNameGreeting');
    const logoutButtonDesktop = document.getElementById('logoutBtn');
    const mobileUserGreeting = document.getElementById('mobileUserGreeting'); 

    const usuarioLogado = sessionStorage.getItem('usuarioLogado') === 'true';
    const nomeUsuario = sessionStorage.getItem('nomeUsuario');
    const currentPath = window.location.pathname;

    const isLoginPage = currentPath.includes('/pages/login/');
    
    // CORREÇÃO: Incluir 'index-monitor.html' na checagem de página raiz
    const isRootPage = currentPath.endsWith('index.html') || 
                       currentPath.endsWith('index-operador.html') || 
                       currentPath.endsWith('index-monitor.html') || // <-- CORRIGIDO AQUI
                       currentPath.endsWith('/');

    // --- LÓGICA DE SEGURANÇA E GATEKEEPING ---
    
    // 1. Redirecionamento de usuário NÃO LOGADO (Checagem em todas as páginas)
    if (!usuarioLogado && !isLoginPage) {
        if (isRootPage) {
            window.location.replace('pages/login/login.html');
        } else {
            window.location.replace('../login/login.html');
        }
        return; 
    }
    
    // 2. Logado na página de Login -> Redireciona para a página CORRETA.
    if (isLoginPage && usuarioLogado) {
        const userConfig = validUsers.find(u => u.user === nomeUsuario);
        if (userConfig) {
            // Caminho de volta ao root é sempre ../../
            window.location.replace(`../../${userConfig.destination}`);
            return;
        }
    }

    // 3. GATEKEEPING DE PÁGINAS RAIZ (Corrigido: Adicionado lógica de monitor)
    if (isRootPage) {
        // GATEKEEPING: Se o operador (tunel.continuo) estiver na index.html OU index-monitor.html, redireciona para sua página.
        if ((currentPath.endsWith('index.html') || currentPath.endsWith('index-monitor.html')) && nomeUsuario === 'tunel.continuo') {
            window.location.replace('index-operador.html');
            return;
        }
        
        // NOVO GATEKEEPING: Se o monitor (juan.ebrhardt) estiver na index.html OU index-operador.html, redireciona para sua página.
        if ((currentPath.endsWith('index.html') || currentPath.endsWith('index-operador.html')) && nomeUsuario === 'juan.ebrhardt') {
            window.location.replace('index-monitor.html');
            return;
        }

        // GATEKEEPING: Se um admin (leandro.marostega) estiver na index-operator.html OU index-monitor.html, redireciona.
        if ((currentPath.endsWith('index-operador.html') || currentPath.endsWith('index-monitor.html')) && nomeUsuario === 'leandro.marostega') {
            window.location.replace('index.html');
            return;
        }
    }
    
    // --- LÓGICA DE INTERFACE DO HEADER (Para TODAS as páginas, exceto login) ---
    // CORREÇÃO PRINCIPAL: Roda em qualquer página que não seja a de login.
    if (!isLoginPage && usuarioLogado) {
        const nomeCompleto = sessionStorage.getItem('nomeUsuarioCompleto');
        
        // 2a. POPULAR O NOME NO HEADER (Desktop e Mobile)
        if (nomeCompleto) {
            const primeiroNome = nomeCompleto.split(' ')[0];
            const greetingText = `Olá, ${primeiroNome.charAt(0).toUpperCase() + primeiroNome.slice(1)}!`;

            if (userNameGreeting) {
                userNameGreeting.innerText = greetingText; // Desktop
            }
            if (mobileUserGreeting) {
                mobileUserGreeting.innerText = greetingText; // Mobile
            }
        }
        
        // 2b. DROPDOWN DO DESKTOP
        if (userMenuToggle && userMenu) {
            userMenuToggle.addEventListener('click', () => {
                userMenu.classList.toggle('active');
            });
            
            // Fecha o menu se clicar fora
            document.addEventListener('click', (e) => {
                const userProfileArea = document.getElementById('userProfileArea');
                if (userProfileArea && !userProfileArea.contains(e.target)) {
                    userMenu.classList.remove('active');
                }
            });
        }
        
        // 2c. LOGOUT DESKTOP CORRIGIDO (Chama a função handleLogout inteligente)
        if (logoutButtonDesktop) {
            logoutButtonDesktop.addEventListener('click', (e) => {
                e.preventDefault(); 
                handleLogout();     
            });
        }
    }
    
    // --- LÓGICA DE SPLASH SCREEN (Mantida - só para a página de Login) ---
    if (isLoginPage) {
        setTimeout(() => {
            if (splashScreen) {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.classList.add('hidden');
                    if (loginContainer) {
                        loginContainer.classList.remove('hidden');
                        loginContainer.style.opacity = 1; 
                    }
                }, 500); 
            }
        }, 1500);
    }
});

// 3. FUNÇÃO DE LOGIN (Mantida)
const passwordUser = () => {
    const loginUser = document.querySelector('.login--user').value.trim();
    const loginPassword = document.querySelector('.login--password').value.trim();
    const printValidation = document.querySelector('.login-left__print-validation');

    if (loginUser === '' || loginPassword === '') {
        printValidation.innerText = 'Falta preencher um campo acima.';
        return; 
    }

    const userFound = validUsers.find(credential => 
        credential.user === loginUser && credential.password === loginPassword
    );

    if (userFound) {
        sessionStorage.setItem('usuarioLogado', 'true');
        sessionStorage.setItem('nomeUsuario', userFound.user); 
        sessionStorage.setItem('nomeUsuarioCompleto', userFound.fullName); 
        
        // Redirecionamento de login usa ../../ pois sabe que está em pages/login/
        window.location.replace(`../../${userFound.destination}`); 
        
    } else {
        printValidation.innerText = 'Usuário ou senha incorretos.';
    }
};

// Eventos (Mantidos)
document.querySelector('.login-left__button').addEventListener('click', passwordUser);
document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault();
        passwordUser();
    }
});