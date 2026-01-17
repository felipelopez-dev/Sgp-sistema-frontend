const passwordShadow = () => {
    const inputPassword = document.querySelector('.login--password');
    const iconEye = document.querySelector('.login-right__icon-eye'); 
    const iconEyeSlash = document.querySelector('.login-right__icon-eye-slash'); 

    const isPasswordVisible = inputPassword.getAttribute('type') === 'text';

    if (isPasswordVisible) {
        inputPassword.setAttribute('type', 'password');
        iconEye.classList.remove('active');
        iconEyeSlash.classList.add('active');
    } else {
        inputPassword.setAttribute('type', 'text');
        iconEye.classList.add('active');
        iconEyeSlash.classList.remove('active');
    }
}

document.querySelectorAll('.login-right__icon-eye, .login-right__icon-eye-slash')
    .forEach(icon => icon.addEventListener('click', passwordShadow));