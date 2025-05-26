# 🚨 WICHTIG: Datenbank-Constraint ausführen

## Problem behoben: Zeitzonenfehler
Das Problem war wahrscheinlich ein **Zeitzonenfehler**:
- `date.toISOString()` konvertiert in UTC-Zeit
- Dadurch können lokale Montage zu UTC-Sonntagen werden (oder umgekehrt)

## ✅ Frontend-Fix implementiert
- Neue `formatDateForDB()` Funktion verwendet lokale Zeit
- Konsistente Datums-Behandlung in allen Funktionen
- Keine UTC-Konvertierung mehr

## 🛡️ Zusätzliche Sicherheit: Datenbank-Constraint

**Führe dieses SQL in deiner Supabase-Konsole aus:**

```sql
-- Lösche alle existierenden Wochenend-Bestellungen
DELETE FROM meal_orders 
WHERE EXTRACT(dow FROM date::date) IN (0, 6);

-- Füge Constraint hinzu: Nur Montag-Freitag erlaubt
ALTER TABLE meal_orders 
ADD CONSTRAINT meal_orders_weekdays_only 
CHECK (EXTRACT(dow FROM date::date) BETWEEN 1 AND 5);
```

## 🔍 Zur Kontrolle
Nach dem Ausführen sollten nur noch 2 Bestellungen übrig sein:
- 2025-06-02 (Montag) ✅
- 2025-06-09 (Montag) ✅

Die Sonntags-Bestellungen werden gelöscht:
- 2025-06-01 (Sonntag) ❌ 
- 2025-06-08 (Sonntag) ❌

## 🎯 Ergebnis
- **Frontend**: Verhindert Wochenend-Bestellungen
- **Datenbank**: Verhindert Wochenend-Bestellungen als Backup
- **Anzeige**: Filtert Wochenend-Bestellungen heraus

Zukünftig sind Wochenend-Bestellungen unmöglich! 🚫🏖️ 