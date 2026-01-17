document.addEventListener('DOMContentLoaded', () => {
    const menuIcon        = document.querySelector('.header-mobile__image');
    const closeMenuButton = document.querySelector('.close-menu');
    const mobileMenu      = document.querySelector('.mobile');

    menuIcon.addEventListener('click', () => {
        mobileMenu.classList.add('active');
    });

    closeMenuButton.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
    });
});

document.addEventListener('DOMContentLoaded', () => {

    const menuButton = document.querySelector('.header-mobile__image');
    const closeButton = document.querySelector('.close-menu');
    const mobileMenu = document.querySelector('.mobile');
    const linksComSubMenu = document.querySelectorAll('.sgp-header__link[href="#"]');

    if (menuButton && mobileMenu) {
        menuButton.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });
    }

    if (closeButton && mobileMenu) {
        closeButton.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    }

    if (mobileMenu) {
        mobileMenu.addEventListener('click', (event) => {
            if (event.target === mobileMenu) {
                mobileMenu.classList.remove('active');
            }
        });
    }

    linksComSubMenu.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
        });
    });

});