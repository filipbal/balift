/**
 * Hlavní JavaScript soubor pro Balift aplikaci
 */

// Nastavení jazyka datepickeru
$.fn.datepicker.defaults.language = 'cs';
$.fn.datepicker.defaults.format = 'yyyy-mm-dd';
$.fn.datepicker.defaults.autoclose = true;
$.fn.datepicker.defaults.todayHighlight = true;

// Explicitní nastavení formátu a lokalizace pro datepicker
$.fn.datepicker.dates['cs'] = {
    days: ["Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"],
    daysShort: ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"],
    daysMin: ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"],
    months: ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"],
    monthsShort: ["Led", "Úno", "Bře", "Dub", "Kvě", "Čer", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"],
    today: "Dnes",
    clear: "Vymazat",
    weekStart: 1,
    format: "yyyy-mm-dd"
};

// Inicializace všech tooltipů a popoverů
$(function () {
    $('[data-bs-toggle="tooltip"]').tooltip();
    $('[data-bs-toggle="popover"]').popover();
});

// Funkce pro formátování data
function formatDate(dateString) {
    // Validace vstupu
    if (!dateString) return '';

    // Nejprve zkontrolujeme, jestli je datum ve správném formátu
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.error('Neplatné datum:', dateString);
        return dateString;
    }

    // Formátování data pro zobrazení - plný formát
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('cs-CZ', options);
}

// Funkce pro formátování data pro input pole
function formatDateForInput(dateString) {
    // Validace vstupu
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        console.error('Neplatné datum pro input:', dateString);
        return '';
    }

    // Formát YYYY-MM-DD pro input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Funkce pro parsování data z různých formátů
function parseDate(dateString) {
    // Validace vstupu
    if (!dateString) return null;

    // Pokus o parsování standardního ISO formátu
    let date = new Date(dateString);

    // Kontrola, zda je datum platné
    if (!isNaN(date.getTime())) {
        return date;
    }

    // Pokud není, zkusíme parsovat český formát (D. M. YYYY)
    const parts = dateString.split('.');
    if (parts.length === 3) {
        const day = parseInt(parts[0].trim());
        const month = parseInt(parts[1].trim()) - 1; // Měsíce jsou od 0
        const year = parseInt(parts[2].trim());

        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
            return date;
        }
    }

    console.error('Nelze parsovat datum:', dateString);
    return null;
}

// Funkce pro získání dnešního data ve formátu YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    return formatDateForInput(today);
}

// Funkce pro převod data z libovolného formátu na formát pro server (YYYY-MM-DD)
function dateToServerFormat(dateInput) {
    const date = typeof dateInput === 'string' ? parseDate(dateInput) : dateInput;

    if (!date || isNaN(date.getTime())) {
        console.error('Neplatné datum pro server:', dateInput);
        return '';
    }

    return formatDateForInput(date);
}

// Funkce pro zobrazení chybové hlášky
function showError(message) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#alerts-container').html(alertHtml);

    // Automatické skrytí po 5 sekundách
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

// Funkce pro zobrazení úspěšné hlášky
function showSuccess(message) {
    const alertHtml = `
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    $('#alerts-container').html(alertHtml);

    // Automatické skrytí po 5 sekundách
    setTimeout(() => {
        $('.alert').alert('close');
    }, 5000);
}

// Inicializace všech datepickerů
function initDatepickers() {
    $('.datepicker').datepicker({
        language: 'cs',
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true
    });
}

// Funkce pro načtení typů tréninků
function loadTrainingTypes(selectElement, selectedValue = null) {
    $.ajax({
        url: '/api/training_types',
        method: 'GET',
        success: function(data) {
            const select = $(selectElement);
            select.empty();
            select.append('<option value="">-- Vyberte typ tréninku --</option>');

            data.forEach(function(type) {
                const option = $('<option></option>')
                    .attr('value', type.id)
                    .text(type.name);

                if (selectedValue && selectedValue == type.id) {
                    option.attr('selected', 'selected');
                }

                select.append(option);
            });
        },
        error: function() {
            showError('Nepodařilo se načíst typy tréninků');
        }
    });
}

// Funkce pro načtení kategorií cviků
function loadExerciseCategories(selectElement, selectedValue = null) {
    $.ajax({
        url: '/api/exercise_categories',
        method: 'GET',
        success: function(data) {
            const select = $(selectElement);
            select.empty();
            select.append('<option value="">-- Vyberte kategorii --</option>');

            data.forEach(function(category) {
                const option = $('<option></option>')
                    .attr('value', category.id)
                    .text(category.name);

                if (selectedValue && selectedValue == category.id) {
                    option.attr('selected', 'selected');
                }

                select.append(option);
            });
        },
        error: function() {
            showError('Nepodařilo se načíst kategorie cviků');
        }
    });
}

// Funkce pro načtení cviků podle kategorie
function loadExercisesByCategory(categoryId, selectElement, selectedValue = null) {
    const url = categoryId ? `/api/exercises?category_id=${categoryId}` : '/api/exercises';

    $.ajax({
        url: url,
        method: 'GET',
        success: function(data) {
            const select = $(selectElement);
            select.empty();
            select.append('<option value="">-- Vyberte cvik --</option>');

            data.forEach(function(exercise) {
                const option = $('<option></option>')
                    .attr('value', exercise.id)
                    .text(exercise.name);

                if (selectedValue && selectedValue == exercise.id) {
                    option.attr('selected', 'selected');
                }

                select.append(option);
            });
        },
        error: function() {
            showError('Nepodařilo se načíst cviky');
        }
    });
}

// Po načtení dokumentu
$(document).ready(function() {
    // Inicializace datepickerů
    initDatepickers();

    // Přidání aktivní třídy podle aktuální stránky
    const currentPath = window.location.pathname;
    $('nav .nav-link').each(function() {
        const href = $(this).attr('href');
        if (currentPath === href || (href !== '/' && currentPath.startsWith(href))) {
            $(this).addClass('active');
        }
    });
});