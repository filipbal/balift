from flask import Flask, render_template, request, redirect, url_for, jsonify, g, session, flash
import sqlite3
import os
import datetime
from werkzeug.security import check_password_hash, generate_password_hash
from functools import wraps

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

# Autentizační dekorátory
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session or not session.get('is_admin', False):
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

# Přihlášení
@app.route('/login', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
        if user is None:
            error = 'Nesprávné uživatelské jméno.'
        elif not check_password_hash(user['password_hash'], password):
            error = 'Nesprávné heslo.'
            
        if error is None:
            session.clear()
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['is_admin'] = bool(user['is_admin'])
            return redirect(url_for('index'))
    
    return render_template('login.html', error=error)

# Odhlášení
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Registrace nového uživatele (pouze pro adminy)
@app.route('/admin/add-user', methods=['GET', 'POST'])
@login_required
@admin_required
def add_user():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        is_admin = 'is_admin' in request.form
        
        if not username or not password:
            error = 'Vyplňte uživatelské jméno i heslo.'
        else:
            db = get_db()
            try:
                # Kontrola, zda uživatel již existuje
                existing = db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
                if existing:
                    error = 'Uživatel s tímto jménem již existuje.'
                else:
                    # Vytvoření nového uživatele
                    db.execute(
                        'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
                        (username, generate_password_hash(password), is_admin)
                    )
                    db.commit()
                    flash(f'Uživatel {username} byl úspěšně vytvořen.', 'success')
                    return redirect(url_for('add_user'))
            except Exception as e:
                error = f'Chyba při vytváření uživatele: {str(e)}'
    
    # Zobrazení seznamu existujících uživatelů
    db = get_db()
    users = db.execute('SELECT id, username, is_admin FROM users ORDER BY username').fetchall()
    return render_template('admin/add_user.html', error=error, users=users)

# Routes pro hlavní stránku
@app.route('/')
@login_required
def index():
    return render_template('index.html')

# API Routes s omezením na přihlášené uživatele
@app.route('/api/training_types', methods=['GET'])
@login_required
def get_training_types():
    db = get_db()
    types = db.execute('SELECT * FROM training_types').fetchall()
    return jsonify([dict(type) for type in types])

@app.route('/api/exercise_categories', methods=['GET'])
@login_required
def get_exercise_categories():
    db = get_db()
    categories = db.execute('SELECT * FROM exercise_categories').fetchall()
    return jsonify([dict(category) for category in categories])

@app.route('/api/exercises', methods=['GET'])
@login_required
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

# Výpis seznamu všech tréninků
@app.route('/api/workouts', methods=['GET'])
def get_workouts():
    db = get_db()
    
    # Pro admina zobrazíme všechny tréninky, pro běžného uživatele jen jeho
    if session.get('is_admin'):
        workouts = db.execute(
            '''SELECT w.id, w.date, tt.name as type_name, u.username as username
            FROM workouts w
            JOIN training_types tt ON w.training_type_id = tt.id
            JOIN users u ON w.user_id = u.id
            ORDER BY w.date DESC'''
        ).fetchall()
    else:
        workouts = db.execute(
            '''SELECT w.id, w.date, tt.name as type_name
            FROM workouts w
            JOIN training_types tt ON w.training_type_id = tt.id
            WHERE w.user_id = ?
            ORDER BY w.date DESC''',
            (session['user_id'],)
        ).fetchall()
    
    return jsonify([dict(workout) for workout in workouts])
@app.route('/api/workouts/<int:workout_id>', methods=['GET'])
@login_required
def get_workout(workout_id):
    db = get_db()
    
    # Admin má přístup ke všem tréninkům, běžný uživatel jen ke svým
    if session.get('is_admin', False):
        workout = db.execute(
            '''SELECT w.id, w.date, w.training_type_id, tt.name as type_name, w.notes, w.user_id,
            u.username as username
            FROM workouts w
            JOIN training_types tt ON w.training_type_id = tt.id
            LEFT JOIN users u ON w.user_id = u.id
            WHERE w.id = ?''',
            (workout_id,)
        ).fetchone()
    else:
        workout = db.execute(
            '''SELECT w.id, w.date, w.training_type_id, tt.name as type_name, w.notes, w.user_id
            FROM workouts w
            JOIN training_types tt ON w.training_type_id = tt.id
            WHERE w.id = ? AND w.user_id = ?''',
            (workout_id, session['user_id'])
        ).fetchone()

    if workout is None:
        return jsonify({'error': 'Trénink nebyl nalezen nebo k němu nemáte přístup'}), 404

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
@login_required
def add_workout():
    data = request.json
    db = get_db()

    try:
        # Formátování data
        workout_date = data['date']
        try:
            parsed_date = datetime.datetime.strptime(workout_date, '%Y-%m-%d').date()
            formatted_date = parsed_date.strftime('%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Neplatný formát data'}), 400
        
        # Přidání id přihlášeného uživatele
        user_id = session['user_id']

        db.execute(
            'INSERT INTO workouts (date, training_type_id, notes, user_id) VALUES (?, ?, ?, ?)',
            (formatted_date, data['training_type_id'], data.get('notes', ''), user_id)
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
@login_required
def update_workout(workout_id):
    data = request.json
    db = get_db()

    try:
        # Kontrola vlastnictví
        if not session.get('is_admin', False):
            owner = db.execute('SELECT user_id FROM workouts WHERE id = ?', (workout_id,)).fetchone()
            if not owner or owner['user_id'] != session['user_id']:
                return jsonify({'success': False, 'error': 'Nemáte oprávnění upravovat tento trénink'}), 403
        
        # Formátování data
        workout_date = data['date']
        try:
            parsed_date = datetime.datetime.strptime(workout_date, '%Y-%m-%d').date()
            formatted_date = parsed_date.strftime('%Y-%m-%d')
        except ValueError:
            return jsonify({'success': False, 'error': 'Neplatný formát data'}), 400

        db.execute(
            'UPDATE workouts SET date = ?, training_type_id = ?, notes = ? WHERE id = ?',
            (formatted_date, data['training_type_id'], data.get('notes', ''), workout_id)
        )

        # Smazání stávajících cviků
        db.execute('DELETE FROM workout_exercises WHERE workout_id = ?', (workout_id,))

        # Přidání nových cviků
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
@login_required
def delete_workout(workout_id):
    db = get_db()

    try:
        # Kontrola vlastnictví
        if not session.get('is_admin', False):
            owner = db.execute('SELECT user_id FROM workouts WHERE id = ?', (workout_id,)).fetchone()
            if not owner or owner['user_id'] != session['user_id']:
                return jsonify({'success': False, 'error': 'Nemáte oprávnění smazat tento trénink'}), 403
        
        db.execute('DELETE FROM workouts WHERE id = ?', (workout_id,))
        db.commit()
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Routes pro zobrazení šablon
@app.route('/workouts')
@login_required
def workout_list():
    return render_template('workouts/list.html')

@app.route('/workouts/add')
@login_required
def workout_add():
    return render_template('workouts/add.html')

@app.route('/workouts/<int:workout_id>')
@login_required
def workout_detail(workout_id):
    return render_template('workouts/detail.html', workout_id=workout_id)

@app.route('/workouts/<int:workout_id>/edit')
@login_required
def workout_edit(workout_id):
    return render_template('workouts/edit.html', workout_id=workout_id)

@app.route('/exercises')
@login_required
def exercise_list():
    return render_template('exercises/list.html')

@app.route('/exercises/add')
@login_required
def exercise_add():
    return render_template('exercises/add.html')

# Změna hesla
@app.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    error = None
    success = None
    
    if request.method == 'POST':
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        if not current_password or not new_password or not confirm_password:
            error = 'Všechna pole jsou povinná.'
        elif new_password != confirm_password:
            error = 'Nové heslo a jeho potvrzení se neshodují.'
        elif len(new_password) < 6:
            error = 'Nové heslo musí mít alespoň 6 znaků.'
        else:
            db = get_db()
            user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
            
            if not check_password_hash(user['password_hash'], current_password):
                error = 'Současné heslo není správné.'
            else:
                # Aktualizace hesla
                db.execute(
                    'UPDATE users SET password_hash = ? WHERE id = ?',
                    (generate_password_hash(new_password), session['user_id'])
                )
                db.commit()
                success = 'Heslo bylo úspěšně změněno.'
    
    return render_template('change_password.html', error=error, success=success)

# Kopírování tréninku
@app.route('/api/workouts/<int:workout_id>/copy', methods=['POST'])
def copy_workout(workout_id):
    db = get_db()
    
    try:
        # Načtení zdrojového tréninku
        source_workout = db.execute(
            'SELECT date, training_type_id, notes, user_id FROM workouts WHERE id = ?',
            (workout_id,)
        ).fetchone()
        
        if source_workout is None:
            return jsonify({'success': False, 'error': 'Zdrojový trénink nenalezen'}), 404
        
        # Použijeme stejné user_id jako má původní trénink
        # Nebo session['user_id'] pokud chceme vždy vytvářet kopii pro přihlášeného uživatele
        user_id = source_workout['user_id']  # nebo session.get('user_id')
        
        # Vložení nového tréninku s dnešním datem
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        db.execute(
            'INSERT INTO workouts (date, training_type_id, notes, user_id) VALUES (?, ?, ?, ?)',
            (today, source_workout['training_type_id'], source_workout['notes'], user_id)
        )
        db.commit()
        
        # Získání ID nového tréninku
        new_workout_id = db.execute('SELECT last_insert_rowid()').fetchone()[0]
        
        # Kopírování cviků
        exercises = db.execute(
            'SELECT exercise_id, sets, reps, weight FROM workout_exercises WHERE workout_id = ?',
            (workout_id,)
        ).fetchall()
        
        for exercise in exercises:
            db.execute(
                '''INSERT INTO workout_exercises
                (workout_id, exercise_id, sets, reps, weight)
                VALUES (?, ?, ?, ?, ?)''',
                (
                    new_workout_id,
                    exercise['exercise_id'],
                    exercise['sets'],
                    exercise['reps'],
                    exercise['weight']
                )
            )
        
        db.commit()
        return jsonify({'success': True, 'id': new_workout_id}), 201
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)