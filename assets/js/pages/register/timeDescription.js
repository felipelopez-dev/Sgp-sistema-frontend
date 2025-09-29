const inputSaida = document.getElementById("register-card__input-time");
const inputDuracao = document.getElementById("register-card__input-return");
const retornoPrevisto = document.getElementById("register-return");

const calcularRetorno = () => {
    const horaSaida = inputSaida.value;
    const duracao = parseInt(inputDuracao.value, 10);

    inputDuracao.addEventListener("input", () => {
        if (inputDuracao.value > 120) {
            inputDuracao.value = 120;
        } else if (inputDuracao.value < 1) {
            inputDuracao.value = '';
        }
    });

    if (!horaSaida || isNaN(duracao)) {
        retornoPrevisto.textContent = "--:--";
        return;
    }

    const [hora, minuto] = horaSaida.split(":").map(Number);

    let totalMin = hora * 60 + minuto + duracao;

    let horaRetorno = Math.floor(totalMin / 60) % 24;
    let minutoRetorno = totalMin % 60;

    const retornoFormatado = 
        String(horaRetorno).padStart(2, "0") + ":" + 
        String(minutoRetorno).padStart(2, "0");

    retornoPrevisto.textContent = retornoFormatado;
}

inputSaida.addEventListener("input", calcularRetorno);
inputDuracao.addEventListener("input", calcularRetorno);


const areaTextarea = document.querySelector(".register-description__text");
const buttons = document.querySelectorAll('.register-description__button');

buttons.forEach(button => {
    button.addEventListener('click', (event) => {

        const titulo = `${button.textContent.toUpperCase()} \n ⮕`;
        areaTextarea.value = titulo + areaTextarea.value;
        areaTextarea.focus();
        areaTextarea.setSelectionRange(areaTextarea.value.length, areaTextarea.value.length);
    });
});
