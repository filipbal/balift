from flask import Flask, render_template, request, redirect, url_for, jsonify, g
import sqlite3
import os
import datetime

app = Flask(__name__)
app.config.from_mapping(
    SECRET_KEY='dev',
    DATABASE=os.path.join(app.instance_path, 'balift.sqlite'),
)

# Zajistit, že existuje adresář instance
try:
    os.makedirs(app.instance_path)
except OSError:
    pass

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

app.teardown_appcontext(close_db)

def init_db():
    db = get_db()
    with app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf8'))

@app.cli.command('init-db')
def init_db_command():
    """Inicializace databáze."""
    init_db()
    print('Databáze byla inicializována.')

# Routes pro hlavní stránku
@app.route('/')
def index():
    return render_template('index.html')

# API Routes pro tréninky
@app.route('/api/training_types', methods=['GET'])
def get_training_types():
    db = get_db()
    types = db.execute('SELECT * FROM training_types').fetchall()
    return jsonify([dict(type) for type in types])

@app.route('/api/exercise_categories', methods=['GET'])
def get_exercise_categories():
    db = get_db()
    categories = db.execute('SELECT * FROM exercise_categories').fetchall()
    return jsonify([dict(category) for category in categories])

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    db = get_db()
    category_id = request.args.get('category_id', None)

    if category_id:
        exercises = db.execute(
            'SELECT * FROM exercises WHERE category_id = ?',
            (category_id,)
        ).fetchall()
    else:
        exercises = db.execute('SELECT * FROM exercises').fetchall()

    return jsonify([dict(exercise) for exercise in exercises])

@app.route('/api/exercises', methods=['POST'])
def add_exercise():
    data = request.json
    db = get_db()

    try:
        db.execute(
            'INSERT INTO exercises (name, category_id, description) VALUES (?, ?, ?)',
            (data['name'], data['category_id'], data.get('description', ''))
        )
        db.commit()
        return jsonify({'success': True}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/workouts', methods=['GET'])
def get_workouts():
    db = get_db()
    workouts = db.execute(
        '''SELECT w.id, w.date, tt.name as type_name
        FROM workouts w
        JOIN training_types tt ON w.training_type_id = tt.id
        ORDER BY w.date DESC'''
    ).fetchall()
    return jsonify([dict(workout) for workout in workouts])

@app.route('/api/workouts/<int:workout_id>', methods=['GET'])
def get_workout(workout_id):
    db = get_db()
    workout = db.execute(
        '''SELECT w.id, w.date, w.training_type_id, tt.name as type_name, w.notes
        FROM workouts w
        JOIN training_types tt ON w.training_type_id = tt.id
        WHERE w.id = ?''',
        (workout_id,)
    ).fetchone()

    if workout is None:
        return jsonify({'error': 'Workout not found'}), 404

    exercises = db.execute(
        '''SELECT we.id, e.id as exercise_id, e.name as exercise_name,
        ec.name as category_name, we.sets, we.reps, we.weight
        FROM workout_exercises we
        JOIN exercises e ON we.exercise_id = e.id
        JOIN exercise_categories ec ON e.category_id = ec.id
        WHERE we.workout_id = ?''',
        (workout_id,)
    ).fetchall()

    result = dict(workout)
    result['exercises'] = [dict(exercise) for exercise in exercises]

    return jsonify(result)

@app.route('/api/workouts', methods=['POST'])
def add_workout():
    data = request.json
    db = get_db()

    try:
        # Kontrola formátu data
        workout_date = data['date']
        # Ujistíme se, že datum je ve formátu YYYY-MM-DD
        try:
            parsed_date = datetime.datetime.strptime(workout_date, '%Y-%m-%d').date()
            # Převedeme zpět na string v požadovaném formátu
            formatted_date = parsed_date.strftime('%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Neplatný formát data'}), 400

        db.execute(
            'INSERT INTO workouts (date, training_type_id, notes) VALUES (?, ?, ?)',
            (formatted_date, data['training_type_id'], data.get('notes', ''))
        )
        db.commit()
        workout_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]

        for exercise in data.get('exercises', []):
            db.execute(
                '''INSERT INTO workout_exercises
                (workout_id, exercise_id, sets, reps, weight)
                VALUES (?, ?, ?, ?, ?)''',
                (
                    workout_id,
                    exercise['exercise_id'],
                    exercise['sets'],
                    exercise['reps'],
                    exercise['weight']
                )
            )
        db.commit()

        return jsonify({'success': True, 'id': workout_id}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/workouts/<int:workout_id>', methods=['PUT'])
def update_workout(workout_id):
    data = request.json
    db = get_db()

    try:
        # Kontrola formátu data
        workout_date = data['date']
        # Ujistíme se, že datum je ve formátu YYYY-MM-DD
        try:
            parsed_date = datetime.datetime.strptime(workout_date, '%Y-%m-%d').date()
            # Převedeme zpět na string v požadovaném formátu
            formatted_date = parsed_date.strftime('%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Neplatný formát data'}), 400

        db.execute(
            'UPDATE workouts SET date = ?, training_type_id = ?, notes = ? WHERE id = ?',
            (formatted_date, data['training_type_id'], data.get('notes', ''), workout_id)
        )

        # Smazat existující cviky v tréninku
        db.execute('DELETE FROM workout_exercises WHERE workout_id = ?', (workout_id,))

        # Přidat nové cviky
        for exercise in data.get('exercises', []):
            db.execute(
                '''INSERT INTO workout_exercises
                (workout_id, exercise_id, sets, reps, weight)
                VALUES (?, ?, ?, ?, ?)''',
                (
                    workout_id,
                    exercise['exercise_id'],
                    exercise['sets'],
                    exercise['reps'],
                    exercise['weight']
                )
            )
        db.commit()

        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@app.route('/api/workouts/<int:workout_id>', methods=['DELETE'])
def delete_workout(workout_id):
    db = get_db()

    try:
        db.execute('DELETE FROM workouts WHERE id = ?', (workout_id,))
        db.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Routes pro zobrazení šablon
@app.route('/workouts')
def workout_list():
    return render_template('workouts/list.html')

@app.route('/workouts/add')
def workout_add():
    return render_template('workouts/add.html')

@app.route('/workouts/<int:workout_id>')
def workout_detail(workout_id):
    return render_template('workouts/detail.html', workout_id=workout_id)

@app.route('/workouts/<int:workout_id>/edit')
def workout_edit(workout_id):
    return render_template('workouts/edit.html', workout_id=workout_id)

@app.route('/api/exercises/<int:exercise_id>', methods=['GET'])
def get_exercise(exercise_id):
    db = get_db()
    exercise = db.execute(
        '''SELECT e.id, e.name, e.category_id, e.description, ec.name as category_name
        FROM exercises e
        JOIN exercise_categories ec ON e.category_id = ec.id
        WHERE e.id = ?''',
        (exercise_id,)
    ).fetchone()

    if exercise is None:
        return jsonify({'error': 'Exercise not found'}), 404

    return jsonify(dict(exercise))

@app.route('/exercises')
def exercise_list():
    return render_template('exercises/list.html')

@app.route('/exercises/add')
def exercise_add():
    return render_template('exercises/add.html')

@app.route('/api/exercises/<int:exercise_id>', methods=['DELETE'])
def delete_exercise(exercise_id):
    db = get_db()

    try:
        # Nejprve ověřit, zda cvik není používán v nějakém tréninku
        workout_count = db.execute(
            'SELECT COUNT(*) FROM workout_exercises WHERE exercise_id = ?',
            (exercise_id,)
        ).fetchone()[0]

        if workout_count > 0:
            return jsonify({'success': False, 'error': 'Nelze smazat cvik, který je použit v tréninku'}), 400

        # Pokud cvik není používán, provést smazání
        db.execute('DELETE FROM exercises WHERE id = ?', (exercise_id,))
        db.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)