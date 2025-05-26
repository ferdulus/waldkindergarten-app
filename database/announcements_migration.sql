-- Migration für announcements Tabelle
-- Erweitere die bestehende Struktur um neue Felder

-- Neue Spalten hinzufügen (falls noch nicht vorhanden)
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'news' CHECK (category IN ('news', 'events', 'documents', 'urgent')),
ADD COLUMN IF NOT EXISTS important BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS event_time TIME,
ADD COLUMN IF NOT EXISTS event_location TEXT,
ADD COLUMN IF NOT EXISTS event_end_date DATE;

-- Bestehende Daten migrieren (nur wenn type-Spalte existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'announcements' AND column_name = 'type') THEN
        UPDATE announcements 
        SET category = CASE 
          WHEN type = 'news' THEN 'news'
          WHEN type = 'event' THEN 'events'
          WHEN type = 'document' THEN 'documents'
          WHEN type = 'important' THEN 'urgent'
          ELSE 'news'
        END
        WHERE category IS NULL;
    END IF;
END $$;

-- Important-Flag basierend auf priority setzen (nur wenn priority-Spalte existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'announcements' AND column_name = 'priority') THEN
        UPDATE announcements 
        SET important = CASE 
          WHEN priority = 'high' THEN true
          ELSE false
        END
        WHERE important IS NULL;
    END IF;
END $$;

-- Attachment-Felder migrieren (nur wenn document_url-Spalte existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'announcements' AND column_name = 'document_url') THEN
        UPDATE announcements 
        SET attachment_url = document_url,
            attachment_name = document_name
        WHERE document_url IS NOT NULL;
    END IF;
END $$;

-- RLS Policies aktualisieren
DROP POLICY IF EXISTS "Alle können Ankündigungen lesen" ON announcements;
DROP POLICY IF EXISTS "Nur Admins können Ankündigungen verwalten" ON announcements;

-- Neue RLS Policies
CREATE POLICY "Nutzer sehen veröffentlichte Ankündigungen" ON announcements
  FOR SELECT USING (
    published = true AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins verwalten alle Ankündigungen" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Storage Bucket für Dokumente erstellen (falls noch nicht vorhanden)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies für Dokumente
DO $$
BEGIN
    -- Policy für Lesen
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authentifizierte Benutzer können Dokumente lesen'
    ) THEN
        CREATE POLICY "Authentifizierte Benutzer können Dokumente lesen" ON storage.objects
          FOR SELECT
          TO authenticated
          USING (bucket_id = 'documents');
    END IF;

    -- Policy für Upload
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Nur Admins können Dokumente hochladen'
    ) THEN
        CREATE POLICY "Nur Admins können Dokumente hochladen" ON storage.objects
          FOR INSERT
          TO authenticated
          WITH CHECK (
            bucket_id = 'documents' AND
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE profiles.id = auth.uid() 
              AND profiles.role = 'admin'
            )
          );
    END IF;
END $$;

-- Test-Ankündigungen einfügen (nur wenn noch keine vorhanden)
INSERT INTO announcements (title, content, author_id, published, category, important, event_date, event_time, event_location) 
SELECT 
  'Sommerfest 2025',
  'Liebe Eltern,

wir laden Sie herzlich zu unserem diesjährigen Sommerfest ein! 

Datum: Samstag, 21. Juni 2025
Zeit: 14:00 - 18:00 Uhr
Ort: Waldplatz am großen Baum

Bitte bringen Sie mit:
- Eine Kleinigkeit für das Buffet
- Eigenes Geschirr und Besteck
- Gute Laune!

Wir freuen uns auf einen schönen Nachmittag mit Ihnen und Ihren Kindern.',
  (SELECT id FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%admin%' LIMIT 1),
  true,
  'events',
  true,
  '2025-06-21',
  '14:00',
  'Waldplatz am großen Baum'
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Sommerfest 2025');

INSERT INTO announcements (title, content, author_id, published, category, important) 
SELECT 
  'Neue Öffnungszeiten ab Mai',
  'Ab dem 1. Mai gelten folgende neue Öffnungszeiten:

Montag - Freitag: 7:30 - 16:30 Uhr (bisher 8:00 - 16:00 Uhr)

Die erweiterten Öffnungszeiten kommen vielen berufstätigen Eltern entgegen.',
  (SELECT id FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%admin%' LIMIT 1),
  true,
  'news',
  false
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Neue Öffnungszeiten ab Mai');

INSERT INTO announcements (title, content, author_id, published, category, important) 
SELECT 
  'Elternbrief März 2025',
  'Der aktuelle Elternbrief mit allen wichtigen Informationen für die kommenden Wochen ist jetzt verfügbar.',
  (SELECT id FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%admin%' LIMIT 1),
  true,
  'documents',
  false
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Elternbrief März 2025');

INSERT INTO announcements (title, content, author_id, published, category, important, event_date, event_time, event_location) 
SELECT 
  'Elternabend',
  'Wichtiger Elternabend für alle Eltern. Themen: Jahresplanung, Personaländerungen, Verschiedenes.',
  (SELECT id FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%admin%' LIMIT 1),
  true,
  'events',
  true,
  '2025-06-03',
  '19:30',
  'Gemeindehaus'
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Elternabend');

INSERT INTO announcements (title, content, author_id, published, category, important, event_date, event_time, event_location) 
SELECT 
  'Waldtag - Ausflug zum Förster',
  'Die Kinder lernen den Förster kennen und erfahren viel über den Wald und seine Bewohner. Bitte wetterfeste Kleidung!',
  (SELECT id FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%admin%' LIMIT 1),
  true,
  'events',
  false,
  '2025-05-30',
  '09:00',
  'Treffpunkt: Parkplatz Waldeingang'
WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE title = 'Waldtag - Ausflug zum Förster'); 