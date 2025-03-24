/**
 * JavaScript pro práci s tréninky v Balift aplikaci
 */

// Globální počítadlo pro nové cviky v tréninku
let exerciseCounter = 0;

// Funkce pro inicializaci stránky přidání/editace tréninku
function initWorkoutForm() {
    // Inicializace datepickeru pro datum tréninku - explicitní nastavení formátu a lokalizace
    $('.workout-date').datepicker({
        language: 'cs',
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true
    });
    
    // Nastavení dnešního data, pokud je pole prázdné
    if ($('.workout-date').val() === '') {
        $('.workout-date').datepicker('setDate', 'today');
    }
    
    // Načtení typů tréninků
    loadTrainingTypes('#training-type');
    
    // Event handler pro přidání nového cviku
    $('#add-exercise').on('click', function() {
        addExerciseToWorkout();
    });
    
    // Event handler pro odeslání formuláře
    $('#workout-form').on('submit', function(e) {
        e.preventDefault();
        saveWorkout();
    });
}

// Funkce pro přidání nového cviku do tréninku
function addExerciseToWorkout(exerciseData = null) {
    const uniqueId = exerciseCounter++;
    const exerciseHtml = `
        <div class="exercise-entry" id="exercise-${uniqueId}">
            <span class="remove-exercise" data-exercise-id="${uniqueId}">
                <i class="fas fa-times"></i>
            </span>
            <div class="row mb-3">
                <div class="col-md-6">
                    <label for="category-${uniqueId}" class="form-label">Partie</label>
                    <select class="form-select exercise-category" id="category-${uniqueId}" data-exercise-id="${uniqueId}" required>
                        <option value="">-- Vyberte partii --</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label for="exercise-${uniqueId}" class="form-label">Cvik</label>
                    <select class="form-select exercise-select" id="exercise-select-${uniqueId}" name="exercise_id" data-exercise-id="${uniqueId}" required>
                        <option value="">-- Nejprve vyberte partii --</option>
                    </select>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <label for="sets-${uniqueId}" class="form-label">Počet sérií</label>
                    <input type="number" class="form-control" id="sets-${uniqueId}" name="sets" min="1" required value="${exerciseData?.sets || ''}">
                </div>
                <div class="col-md-4">
                    <label for="reps-${uniqueId}" class="form-label">Opakování</label>
                    <input type="text" class="form-control" id="reps-${uniqueId}" name="reps" required placeholder="např. 10-8-6" value="${exerciseData?.reps || ''}">
                </div>
                <div class="col-md-4">
                    <label for="weight-${uniqueId}" class="form-label">Váha (kg)</label>
                    <input type="text" class="form-control" id="weight-${uniqueId}" name="weight" required placeholder="např. 60-70-80" value="${exerciseData?.weight || ''}">
                </div>
            </div>
        </div>
    `;
    
    $('#exercises-container').prepend(exerciseHtml);
    
    // Načtení kategorií cviků
    loadExerciseCategories(`#category-${uniqueId}`, exerciseData?.category_id);
    
    // Event handler pro změnu kategorie
    $(`#category-${uniqueId}`).on('change', function() {
        const categoryId = $(this).val();
        loadExercisesByCategory(categoryId, `#exercise-select-${uniqueId}`);
    });
    
    // Event handler pro odstranění cviku
    $(`#exercise-${uniqueId} .remove-exercise`).on('click', function() {
        const exerciseId = $(this).data('exercise-id');
        $(`#exercise-${exerciseId}`).remove();
    });
    
    // Pokud existují data cviku, nastavíme je
    if (exerciseData && exerciseData.category_id) {
        // Načtení cviků pro danou kategorii a nastavení vybraného cviku
        setTimeout(() => {
            loadExercisesByCategory(exerciseData.category_id, `#exercise-select-${uniqueId}`, exerciseData.exercise_id);
        }, 100);
    }
}

// Funkce pro sběr dat z formuláře
function collectWorkoutData() {
    const rawDate = $('#workout-date').val();
    // Ujistíme se, že datum je ve správném formátu (YYYY-MM-DD)
    const formattedDate = dateToServerFormat(rawDate);
    
    console.log('Odesílané datum:', formattedDate, 'Původní hodnota:', rawDate);
    
    const workoutData = {
        date: formattedDate,
        training_type_id: $('#training-type').val(),
        notes: $('#workout-notes').val(),
        exercises: []
    };
    
    // Sběr dat o cvicích
    $('.exercise-entry').each(function() {
        const exerciseId = $(this).find('.exercise-select').val();
        
        if (exerciseId) {
            workoutData.exercises.push({
                exercise_id: exerciseId,
                sets: $(this).find('input[name="sets"]').val(),
                reps: $(this).find('input[name="reps"]').val(),
                weight: $(this).find('input[name="weight"]').val()
            });
        }
    });
    
    return workoutData;
}

// Funkce pro uložení tréninku (nový nebo editace)
function saveWorkout() {
    const workoutData = collectWorkoutData();
    const workoutId = $('#workout-id').val();
    
    // Kontrola povinných polí
    if (!workoutData.date || !workoutData.training_type_id) {
        showError('Prosím vyplňte datum a typ tréninku');
        return;
    }
    
    if (workoutData.exercises.length === 0) {
        showError('Přidejte alespoň jeden cvik');
        return;
    }
    
    // Zobrazení indikátoru načítání
    $('#save-workout-btn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Ukládám...');
    
    // URL a metoda závisí na tom, zda jde o nový trénink nebo editaci
    const url = workoutId ? `/api/workouts/${workoutId}` : '/api/workouts';
    const method = workoutId ? 'PUT' : 'POST';
    
    $.ajax({
        url: url,
        method: method,
        contentType: 'application/json',
        data: JSON.stringify(workoutData),
        success: function(response) {
            if (response.success) {
                // Přesměrování na detail tréninku nebo seznam
                const redirectId = workoutId || response.id;
                window.location.href = `/workouts/${redirectId}`;
            } else {
                showError('Něco se pokazilo při ukládání tréninku');
                $('#save-workout-btn').prop('disabled', false).html('Uložit trénink');
            }
        },
        error: function(xhr) {
            showError('Chyba při ukládání tréninku: ' + (xhr.responseJSON?.error || 'Neznámá chyba'));
            $('#save-workout-btn').prop('disabled', false).html('Uložit trénink');
        }
    });
}

// Funkce pro získání ID kategorie pro daný cvik
function getCategoryIdForExercise(exerciseId) {
    let categoryId = null;
    
    // Synchronní AJAX volání pro získání kategorie
    $.ajax({
        url: `/api/exercises/${exerciseId}`,
        method: 'GET',
        async: false,  // Důležité pro správné určení kategorie před vykreslením
        success: function(exercise) {
            categoryId = exercise.category_id;
        },
        error: function() {
            console.error('Nepodařilo se načíst data o cviku');
        }
    });
    
    return categoryId;
}

// Funkce pro načtení detailu tréninku (pro editaci)
function loadWorkoutForEdit(workoutId) {
    $.ajax({
        url: `/api/workouts/${workoutId}`,
        method: 'GET',
        success: function(workout) {
            // Nastavení základních údajů o tréninku
            // Zajistíme, že datum je ve formátu, který datepicker očekává (YYYY-MM-DD)
            const formattedDate = dateToServerFormat(workout.date);
            $('#workout-date').val(formattedDate);
            $('#workout-id').val(workout.id);
            
            console.log('Načtené datum:', workout.date, 'Formátované:', formattedDate);
            
            // Načtení typu tréninku a nastavení vybraného
            loadTrainingTypes('#training-type', workout.training_type_id);
            
            // Nastavení poznámek
            $('#workout-notes').val(workout.notes);
            
            // Přidání cviků
            workout.exercises.forEach(function(exercise) {
                // Pro každý cvik nejprve získáme jeho kategorii
                const categoryId = getCategoryIdForExercise(exercise.exercise_id);
                
                addExerciseToWorkout({
                    exercise_id: exercise.exercise_id,
                    category_id: categoryId,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    weight: exercise.weight
                });
            });
        },
        error: function() {
            showError('Nepodařilo se načíst data tréninku');
        }
    });
}

// Funkce pro načtení detailu tréninku pro zobrazení
function loadWorkoutDetail(workoutId) {
    $.ajax({
        url: `/api/workouts/${workoutId}`,
        method: 'GET',
        success: function(workout) {
            // Nastavení základních údajů o tréninku
            // Formátování data v českém formátu
            const formattedDate = formatDate(workout.date);
            $('#workout-date').text(formattedDate);
            $('#workout-type').text(workout.type_name);
            
            if (workout.notes) {
                $('#workout-notes').text(workout.notes).parent().show();
            } else {
                $('#workout-notes').parent().hide();
            }
            
            // Vykreslení tabulky cviků
            const exercisesTable = $('#exercises-table tbody');
            exercisesTable.empty();
            
            if (workout.exercises.length === 0) {
                exercisesTable.append('<tr><td colspan="5" class="text-center">Žádné cviky</td></tr>');
            } else {
                // Seskupení cviků podle kategorií
                const exercisesByCategory = {};
                
                workout.exercises.forEach(function(exercise) {
                    if (!exercisesByCategory[exercise.category_name]) {
                        exercisesByCategory[exercise.category_name] = [];
                    }
                    exercisesByCategory[exercise.category_name].push(exercise);
                });
                
                // Vykreslení cviků po kategoriích
                Object.keys(exercisesByCategory).forEach(function(category) {
                    // Nadpis kategorie
                    exercisesTable.append(`
                        <tr class="exercise-category">
                            <td colspan="5">${category}</td>
                        </tr>
                    `);
                    
                    // Cviky v kategorii
                    exercisesByCategory[category].forEach(function(exercise) {
                        exercisesTable.append(`
                            <tr>
                                <td>${exercise.exercise_name}</td>
                                <td>${exercise.sets}</td>
                                <td>${exercise.reps}</td>
                                <td>${exercise.weight}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-secondary view-history" 
                                            data-exercise-id="${exercise.exercise_id}" 
                                            data-exercise-name="${exercise.exercise_name}">
                                        <i class="fas fa-history"></i>
                                    </button>
                                </td>
                            </tr>
                        `);
                    });
                });
            }
            
            // Event handler pro zobrazení historie cviku
            $('.view-history').on('click', function() {
                const exerciseId = $(this).data('exercise-id');
                const exerciseName = $(this).data('exercise-name');
                showExerciseHistory(exerciseId, exerciseName);
            });
        },
        error: function() {
            showError('Nepodařilo se načíst detail tréninku');
        }
    });
}

// Funkce pro zobrazení historie cviku
function showExerciseHistory(exerciseId, exerciseName) {
    // Implementace zobrazení historie by potřebovala další API endpoint
    // Toto je jen demonstrační placeholder
    alert(`Historie cviku ${exerciseName} (ID: ${exerciseId}) - tato funkce není zatím implementována`);
}

// Funkce pro načtení seznamu tréninků
function loadWorkoutsList() {
    $.ajax({
        url: '/api/workouts',
        method: 'GET',
        success: function(workouts) {
            const tbody = $('#workouts-table tbody');
            tbody.empty();
            
            if (workouts.length === 0) {
                tbody.append('<tr><td colspan="4" class="text-center">Žádné tréninky</td></tr>');
                return;
            }
            
            workouts.forEach(function(workout) {
                // Formátování data v českém formátu
                const formattedDate = formatDate(workout.date);
                
                tbody.append(`
                    <tr>
                        <td>${formattedDate}</td>
                        <td>${workout.type_name}</td>
                        <td>
                            <a href="/workouts/${workout.id}" class="btn btn-sm btn-info">
                                <i class="fas fa-eye"></i>
                            </a>
                            <a href="/workouts/${workout.id}/edit" class="btn btn-sm btn-warning">
                                <i class="fas fa-edit"></i>
                            </a>
                            <button class="btn btn-sm btn-danger delete-workout" data-workout-id="${workout.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `);
            });
            
            // Event handler pro smazání tréninku
            $('.delete-workout').on('click', function() {
                const workoutId = $(this).data('workout-id');
                deleteWorkout(workoutId);
            });
        },
        error: function() {
            const tbody = $('#workouts-table tbody');
            tbody.html('<tr><td colspan="4" class="text-center text-danger">Chyba při načítání tréninků</td></tr>');
        }
    });
}

// Funkce pro smazání tréninku
function deleteWorkout(workoutId) {
    if (confirm('Opravdu chcete smazat tento trénink? Tato akce je nevratná.')) {
        $.ajax({
            url: `/api/workouts/${workoutId}`,
            method: 'DELETE',
            success: function(response) {
                if (response.success) {
                    showSuccess('Trénink byl úspěšně smazán');
                    loadWorkoutsList();
                } else {
                    showError('Něco se pokazilo při mazání tréninku');
                }
            },
            error: function() {
                showError('Chyba při mazání tréninku');
            }
        });
    }
}