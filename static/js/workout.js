/**
 * JavaScript pro práci s tréninky v Balift aplikaci
 */

// Globální počítadlo pro nové cviky v tréninku
let exerciseCounter = 0;

// Funkce pro inicializaci stránky přidání/editace tréninku
function initWorkoutForm() {
    // Inicializace datepickeru pro datum tréninku
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

// Funkce pro přidání nového cviku do tréninku (pouze pro nové cviky)
function addExerciseToWorkout() {
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
                    <input type="number" class="form-control" id="sets-${uniqueId}" name="sets" min="0">
                </div>
                <div class="col-md-4">
                    <label for="reps-${uniqueId}" class="form-label">Opakování/Čas <i class="fas fa-clock text-muted"></i></label>
                    <input type="text" class="form-control" id="reps-${uniqueId}" name="reps" placeholder="např. 10-8-6 nebo 60s-45s-30s">
                </div>
                <div class="col-md-4">
                    <label for="weight-${uniqueId}" class="form-label">Váha (kg)</label>
                    <input type="text" class="form-control" id="weight-${uniqueId}" name="weight" placeholder="např. 60-70-80">
                </div>
            </div>
        </div>
    `;
    
    $('#exercises-container').prepend(exerciseHtml);
    
    // Načtení kategorií cviků
    loadExerciseCategories(`#category-${uniqueId}`);
    
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
}

// Funkce pro přidání existujícího cviku do formuláře (pro editaci, s neměnným názvem a partií)
function addExistingExerciseToWorkout(exercise) {
    const uniqueId = exerciseCounter++;
    
    // HTML s neměnnými poli pro název cviku a partii (použijeme skrytá pole pro hodnoty)
    const exerciseHtml = `
        <div class="exercise-entry" id="exercise-${uniqueId}">
            <span class="remove-exercise" data-exercise-id="${uniqueId}">
                <i class="fas fa-times"></i>
            </span>
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Partie</label>
                    <input type="text" class="form-control" value="${exercise.category_name}" readonly>
                    <input type="hidden" name="category_id" value="${exercise.category_id}">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Cvik</label>
                    <input type="text" class="form-control" value="${exercise.exercise_name}" readonly>
                    <input type="hidden" class="exercise-select" name="exercise_id" value="${exercise.exercise_id}">
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <label for="sets-${uniqueId}" class="form-label">Počet sérií</label>
                    <input type="number" class="form-control" id="sets-${uniqueId}" name="sets" min="0" value="${exercise.sets || ''}">
                </div>
                <div class="col-md-4">
                    <label for="reps-${uniqueId}" class="form-label">Opakování/Čas <i class="fas fa-clock text-muted"></i></label>
                    <input type="text" class="form-control" id="reps-${uniqueId}" name="reps" placeholder="např. 10-8-6 nebo 60s-45s-30s" value="${exercise.reps || ''}">
                </div>
                <div class="col-md-4">
                    <label for="weight-${uniqueId}" class="form-label">Váha (kg)</label>
                    <input type="text" class="form-control" id="weight-${uniqueId}" name="weight" placeholder="např. 60-70-80" value="${exercise.weight || ''}">
                </div>
            </div>
        </div>
    `;
    
    $('#exercises-container').prepend(exerciseHtml);
    
    // Event handler pro odstranění cviku
    $(`#exercise-${uniqueId} .remove-exercise`).on('click', function() {
        const exerciseId = $(this).data('exercise-id');
        $(`#exercise-${exerciseId}`).remove();
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
            select.append('<option value="">-- Vyberte partii --</option>');
            
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
    if (!categoryId) {
        const select = $(selectElement);
        select.empty();
        select.append('<option value="">-- Nejprve vyberte partii --</option>');
        return;
    }
    
    const url = `/api/exercises?category_id=${categoryId}`;
    
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

// Vylepšená funkce pro sběr dat z formuláře
function collectWorkoutData() {
    const rawDate = $('#workout-date').val();
    const formattedDate = dateToServerFormat(rawDate);
    
    const workoutData = {
        date: formattedDate,
        training_type_id: $('#training-type').val(),
        notes: $('#workout-notes').val(),
        exercises: []
    };
    
    // Sběr dat o cvicích - s výchozí hodnotou "0" pro prázdná pole
    $('.exercise-entry').each(function() {
        const exerciseId = $(this).find('input[name="exercise_id"], .exercise-select').val();
        
        if (exerciseId) {
            const sets = $(this).find('input[name="sets"]').val() || "0";
            const reps = $(this).find('input[name="reps"]').val() || "0";
            const weight = $(this).find('input[name="weight"]').val() || "0";
            
            workoutData.exercises.push({
                exercise_id: exerciseId,
                sets: sets,
                reps: reps,
                weight: weight
            });
        }
    });
    
    return workoutData;
}

// Vylepšená funkce pro uložení tréninku
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
    
    // Kontrola nevyplněných dat - pokud jsou některá pole "0", zobrazíme varování
    const incompleteExercises = workoutData.exercises.filter(exercise => 
        exercise.sets === "0" || exercise.reps === "0" || exercise.weight === "0");
    
    if (incompleteExercises.length > 0) {
        // Místo chyby zobrazíme potvrzovací dialog
        const confirmSave = confirm(
            `U ${incompleteExercises.length} z cviků chybí některé údaje. ` +
            `Pro nevyplněné údaje bude použita hodnota "0". Chcete trénink přesto uložit?`
        );
        
        if (!confirmSave) {
            return; // Uživatel se rozhodl data doplnit
        }
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
                $('#save-workout-btn').prop('disabled', false).html('<i class="fas fa-save"></i> Uložit trénink');
            }
        },
        error: function(xhr) {
            showError('Chyba při ukládání tréninku: ' + (xhr.responseJSON?.error || 'Neznámá chyba'));
            $('#save-workout-btn').prop('disabled', false).html('<i class="fas fa-save"></i> Uložit trénink');
        }
    });
}

// Funkce pro načtení detailu tréninku (pro editaci)
function loadWorkoutForEdit(workoutId) {
    $.ajax({
        url: `/api/workouts/${workoutId}`,
        method: 'GET',
        success: function(workout) {
            // Nastavení základních údajů o tréninku
            const formattedDate = dateToServerFormat(workout.date);
            $('#workout-date').val(formattedDate);
            $('#workout-id').val(workout.id);
            
            // Načtení typu tréninku a nastavení vybraného
            loadTrainingTypes('#training-type', workout.training_type_id);
            
            // Nastavení poznámek
            $('#workout-notes').val(workout.notes);
            
            // Nejprve vymažeme existující cviky
            $('#exercises-container').empty();
            
            // Obrátíme pořadí cviků, aby odpovídalo pořadí v detailu tréninku
            // (nejnovější nahoře)
            const reversedExercises = [...workout.exercises].reverse();
            
            // Přidání cviků - pro každý cvik vytvoříme neměnné pole pro název a partii
            reversedExercises.forEach(function(exercise) {
                // Přidáme k objektu cviku také kategorii, pokud ji známe
                if (exercise.category_name) {
                    addExistingExerciseToWorkout(exercise);
                } else {
                    // V případě chybějících dat zobrazíme chybovou hlášku
                    showError('Nepodařilo se načíst některé cviky v tréninku');
                }
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
                // Vykreslení cviků v pořadí, v jakém přišly z API
                // (bez obracení a bez seskupování podle kategorií)
                workout.exercises.forEach(function(exercise) {
                    exercisesTable.append(`
                        <tr>
                            <td>${exercise.exercise_name} <small class="text-muted">(${exercise.category_name})</small></td>
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

// Funkce pro kopírování tréninku
function copyWorkout(workoutId) {
    if (confirm('Opravdu chcete vytvořit kopii tohoto tréninku? Kopie bude vytvořena s dnešním datem.')) {
        $.ajax({
            url: `/api/workouts/${workoutId}/copy`,
            method: 'POST',
            success: function(response) {
                if (response.success) {
                    showSuccess('Trénink byl úspěšně zkopírován');
                    // Přesměrování na detail nového tréninku
                    window.location.href = `/workouts/${response.id}`;
                } else {
                    showError('Něco se pokazilo při kopírování tréninku');
                }
            },
            error: function(xhr) {
                showError('Chyba při kopírování tréninku: ' + (xhr.responseJSON?.error || 'Neznámá chyba'));
            }
        });
    }
}