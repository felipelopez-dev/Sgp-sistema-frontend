const exitButtonIndex = () => {
    const buttonExitIndex = document.querySelector('.header-exit__image');

    if (buttonExitIndex) {
        sessionStorage.removeItem('usuarioLogado');
        window.location.replace('./pages/login.html');
    }
}

const clickExitIndex = document.querySelector('.header-exit__image');
clickExitIndex.addEventListener('click', exitButtonIndex);