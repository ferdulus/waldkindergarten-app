-- Datenbank-Constraint: Nur Wochentage (Montag-Freitag) für Essensbestellungen erlauben
-- Dies verhindert Wochenend-Bestellungen auf Datenbankebene

-- Zuerst alle existierenden Wochenend-Bestellungen löschen
DELETE FROM meal_orders 
WHERE EXTRACT(dow FROM date::date) IN (0, 6);

-- Dann die Constraint hinzufügen
ALTER TABLE meal_orders 
ADD CONSTRAINT meal_orders_weekdays_only 
CHECK (EXTRACT(dow FROM date::date) BETWEEN 1 AND 5);

-- Zur Kontrolle: Teste die Constraint
-- Dieser INSERT sollte fehlschlagen:
-- INSERT INTO meal_orders (child_id, date, will_eat) 
-- VALUES ('test-id', '2025-06-01', true); -- Sonntag - sollte Fehler geben

-- Zeige alle Constraints der Tabelle
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'meal_orders'::regclass; 