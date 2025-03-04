DROP TABLE IF EXISTS workout_exercises;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS exercise_categories;
DROP TABLE IF EXISTS training_types;

-- Tabulka pro typy tréninků
CREATE TABLE training_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Tabulka pro partie (kategorie cviků)
CREATE TABLE exercise_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- Tabulka pro cviky
CREATE TABLE exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER,
    description TEXT,
    FOREIGN KEY(category_id) REFERENCES exercise_categories(id)
);

-- Tabulka pro tréninky
CREATE TABLE workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    training_type_id INTEGER,
    notes TEXT,
    FOREIGN KEY(training_type_id) REFERENCES training_types(id)
);

-- Tabulka pro jednotlivé cviky v tréninku
CREATE TABLE workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    sets INTEGER NOT NULL,
    reps TEXT NOT NULL,
    weight TEXT NOT NULL,
    FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY(exercise_id) REFERENCES exercises(id)
);

-- Vložení základních typů tréninků
INSERT INTO training_types (name, description) VALUES 
('ZPR', 'Záda, Prsa, Ramena'),
('NRB', 'Nohy, Ruce, Břicho'),
('Fullbody', 'Celé tělo'),
('Vršek', 'Horní část těla'),
('Push', 'Tlakové cviky'),
('Pull', 'Tahové cviky'),
('Funkční', 'Funkční trénink');

-- Vložení základních partií
INSERT INTO exercise_categories (name) VALUES 
('Záda'),
('Prsa'),
('Ramena'),
('Nohy'),
('Biceps'),
('Triceps'),
('Břicho'),
('TRX'),
('GTS'),
('Funkční');

-- Vložení základních cviků podle vašich dat
INSERT INTO exercises (name, category_id) VALUES 
-- Záda
('Mrtvý tah', 1),
('Přítahy VČ v předklonu', 1),
('Přítahy JČ v předklonu', 1),
('Přítahy spodní kladky v předklonu', 1),
('Shyby', 1),
('Stahování horní kladky na úzko v sedě', 1),
('Stahování horní kladky na široko v sedě', 1),
('Stahování horní kladky nataženýma rukama', 1),
('Veslování na spodní kladce', 1),
('Veslování na stroji', 1),
('Přítahy horní kladky k bradě', 1),

-- Prsa
('Tlaky s JČ v leže', 2),
('Tlaky s JČ v leže na úzko', 2),
('Benchpress', 2),
('Multipress', 2),
('Rozpažky s JČ', 2),
('Pull-over', 2),
('Rozpažky na horní kladce', 2),
('Rozpažky na spodní kladce', 2),
('Pec-deck', 2),
('Kliky', 2),
('Kliky na bradlech', 2),

-- Ramena
('Upažování s JČ ve stoje', 3),
('Upažování s JČ v předklonu', 3),
('Upažování s JČ v leže', 3),
('Předpažování s JČ', 3),
('Předpažování s osou', 3),
('Předpažování s kotoučem', 3),
('Předpažování na spodní kladce', 3),
('Tlaky s JČ v sedě', 3),
('Tlaky s VČ ve stoje', 3),
('Tlaky na MP v sedě', 3),
('Arnoldovy tlaky s JČ', 3),
('Nadhoz-výraz s VČ', 3),
('Nadhoz-výraz s JČ', 3),

-- Nohy
('Dřepy s VČ', 4),
('Dřepy na MP', 4),
('Goblet dřepy s JČ', 4),
('Sumo dřepy s JČ', 4),
('Sumo mrtvý tah', 4),
('Rumunský MT s JČ', 4),
('Rumunský MT s VČ', 4),
('Výpady s JČ', 4),
('Výpady s VČ', 4),
('Bulharské dřepy s JČ', 4),
('Zakopávání na stroji', 4),
('Zakopávání v leže s JČ', 4),
('Předkopávání', 4),
('Kettlebell swing', 4),
('Výpony ve stoje na MP', 4),
('Výpony v sedě na LP', 4),
('Legpress', 4),

-- Biceps
('Zdvihy s VČ', 5),
('Zdvihy s JČ', 5),
('Zdvihy s vytáčením', 5),
('Zdvihy s oporou', 5),
('Kladiva', 5),
('Zdvihy s EZ', 5),
('Spodní kladka biceps', 5),
('Zdvihy s kotoučem', 5),

-- Triceps
('Francouzské tlaky s EZ', 6),
('Francouzské tlaky s VČ', 6),
('Francouzské tlaky s JČ v leže', 6),
('Francouzské tlaky s JČ v sedě obouruč', 6),
('Kickback', 6),
('Multipress na úzko', 6),
('Horní kladka triceps', 6),
('Kliky na úzko', 6),
('Extenze za hlavou s kotoučem', 6),

-- Břicho
('Plank', 7),
('Přítahy ve visu', 7),
('Zkracovačky', 7),
('Pokládání natažených nohou', 7),
('Vytáčení boků v planku', 7),
('Kolečko', 7),

-- TRX
('TRX přítahy', 8),
('TRX tlaky', 8),
('TRX zdvihy', 8),
('TRX extenze', 8),
('TRX pullover', 8),
('TRX zapažování', 8),

-- GTS
('Zapažování v sedě', 9),
('Zdvihy v sedě', 9),
('Upažování v leže', 9),
('Zdvihy v leže', 9),
('Vysoké přítahy v kleče', 9),
('Extenze v kleče', 9),
('Stahování v leže', 9),
('Extenze v leže', 9),

-- Funkční
('Muscle-up', 10),
('Angličák', 10);