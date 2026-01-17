document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.question-filter__search');
    const questionSections = document.querySelectorAll('.question-infor');

    searchInput.addEventListener('input', (event) => {
        const searchText = event.target.value.toLowerCase().trim();

        questionSections.forEach(section => {
            const summaryText = section.querySelector('.question-infor__title').textContent.toLowerCase();
            const detailsText = section.querySelector('.question-infor__container').textContent.toLowerCase();

            if (summaryText.includes(searchText) || detailsText.includes(searchText)) {
                section.style.display = '';
            } else {
                section.style.display = 'none';
            }
        });
    });
});