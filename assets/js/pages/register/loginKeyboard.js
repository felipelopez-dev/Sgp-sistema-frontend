const loginKeyboard = (e) => {
    const loginUserKey         = document.querySelector('.login--user').value.trim();
    const loginPasswordKey     = document.querySelector('.login--password').value.trim();
    const printValidationClick = document.querySelector('.login-right__print-validation');

    if (e.key === 'Enter') {
        e.preventDefault();

        if (loginUserKey === '' || loginPasswordKey === '') {
            printValidationClick.innerText = 'Falta preencher um campo acima.';
            return;
        }

        let isLoggedIn = false;

        if (loginUserKey === 'adm' && loginPasswordKey === 'adm2025*') {
            sessionStorage.setItem('usuarioLogado', 'true');
            window.location.replace('../index.html');
            isLoggedIn = true;
        }

        if (loginUserKey === 'monitor' && loginPasswordKey === 'monitor2025*') {
            sessionStorage.setItem('usuarioLogado', 'true');
            window.location.replace('../index2.html');
            isLoggedIn = true;
        }
        
        if (loginUserKey === 'Tunel' && loginPasswordKey === 'tcm1234') {
            sessionStorage.setItem('usuarioLogado', 'true');
            window.location.replace('../index3.html');
            isLoggedIn = true;
        }

        if (!isLoggedIn) {
            printValidationClick.innerText = 'Usuário ou senha incorretos.';
        }
    }
};

document.addEventListener('keydown', loginKeyboard);