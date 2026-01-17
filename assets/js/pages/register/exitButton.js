const exitButton = () => {
    const buttonExit = document.querySelector('.header-exit__image');

    if (buttonExit) {
        sessionStorage.removeItem('usuarioLogado');
        window.location.replace('../pages/login.html');
    }
}

const clickExit = document.querySelector('.header-exit__image');
clickExit.addEventListener('click', exitButton);