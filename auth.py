"""
Modul pro správu autentizace uživatelů v aplikaci Balift
"""

from functools import wraps
from flask import session, redirect, url_for, flash, g, request, current_app
from werkzeug.security import check_password_hash, generate_password_hash

def login_required(f):
    """
    Dekorátor, který zajistí, že funkce bude přístupná jen přihlášeným uživatelům.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Pro přístup na tuto stránku se musíte přihlásit.', 'warning')
            # Uložíme původní URL, abychom se po přihlášení mohli vrátit
            session['next_url'] = request.url
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """
    Dekorátor, který zajistí, že funkce bude přístupná jen administrátorům.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Pro přístup na tuto stránku se musíte přihlásit.', 'warning')
            session['next_url'] = request.url
            return redirect(url_for('login'))
        
        # Získání informací o uživateli
        db = get_db()
        user = db.execute('SELECT * FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        
        if not user or not user['is_admin']:
            flash('Pro přístup na tuto stránku potřebujete administrátorská práva.', 'danger')
            return redirect(url_for('index'))
            
        return f(*args, **kwargs)
    return decorated_function

def get_db():
    """
    Funkce pro získání připojení k databázi - re-export z app.py
    """
    if 'db' not in g:
        from app import get_db as app_get_db
        return app_get_db()
    return g.db

def authenticate_user(username, password):
    """
    Ověří přihlašovací údaje uživatele.
    Vrací dvojici (user_id, is_admin) pokud je autentizace úspěšná, jinak (None, None).
    """
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    
    if user and check_password_hash(user['password_hash'], password):
        return user['id'], user['is_admin']
        
    return None, None

def register_user(username, password, is_admin=False):
    """
    Zaregistruje nového uživatele.
    Vrací user_id v případě úspěchu, jinak None.
    """
    # Kontrola délky hesla
    if len(password) < 6:
        return None, "Heslo musí mít alespoň 6 znaků."
        
    db = get_db()
    
    try:
        # Kontrola, zda uživatel již existuje
        existing_user = db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
        if existing_user:
            return None, "Uživatelské jméno již existuje."
            
        # Vytvoření hash hesla
        password_hash = generate_password_hash(password)
        
        # Vložení uživatele do databáze
        db.execute(
            'INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)',
            (username, password_hash, is_admin)
        )
        db.commit()
        
        # Získání ID nového uživatele
        user_id = db.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()['id']
        return user_id, None
        
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Chyba při registraci: {e}")
        return None, "Chyba při registraci uživatele."

def change_password(user_id, old_password, new_password):
    """
    Změní heslo uživatele.
    Vrací True v případě úspěchu, jinak False.
    """
    # Kontrola délky nového hesla
    if len(new_password) < 6:
        return False, "Nové heslo musí mít alespoň 6 znaků."
        
    db = get_db()
    
    # Získání uživatele
    user = db.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    if not user:
        return False, "Uživatel neexistuje."
        
    # Ověření starého hesla
    if not check_password_hash(user['password_hash'], old_password):
        return False, "Staré heslo není správné."
        
    try:
        # Vytvoření hash nového hesla
        new_password_hash = generate_password_hash(new_password)
        
        # Aktualizace hesla
        db.execute(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            (new_password_hash, user_id)
        )
        db.commit()
        return True, "Heslo bylo úspěšně změněno."
        
    except Exception as e:
        db.rollback()
        current_app.logger.error(f"Chyba při změně hesla: {e}")
        return False, "Chyba při změně hesla."

def get_user_by_id(user_id):
    """
    Získá informace o uživateli podle ID.
    """
    db = get_db()
    return db.execute('SELECT id, username, is_admin, created_at FROM users WHERE id = ?', (user_id,)).fetchone()

def get_all_users():
    """
    Získá seznam všech uživatelů (pouze pro administrátora).
    """
    db = get_db()
    return db.execute('SELECT id, username, is_admin, created_at FROM users ORDER BY username').fetchall()