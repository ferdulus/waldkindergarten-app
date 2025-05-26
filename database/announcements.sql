-- Tabelle für Ankündigungen
CREATE TABLE announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('news', 'document', 'important', 'event')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  document_url TEXT,
  document_name VARCHAR(255),
  valid_until TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index für bessere Performance
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_valid_until ON announcements(valid_until);

-- RLS (Row Level Security) Policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Benutzer können Ankündigungen lesen
CREATE POLICY "Alle können Ankündigungen lesen" ON announcements
  FOR SELECT
  TO authenticated
  USING (true);

-- Nur Administratoren können Ankündigungen erstellen, bearbeiten und löschen
-- (Diese Policy muss angepasst werden, wenn Sie ein Rollen-System implementieren)
CREATE POLICY "Nur Admins können Ankündigungen verwalten" ON announcements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Storage Bucket für Dokumente (falls noch nicht vorhanden)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy für Dokumente
CREATE POLICY "Authentifizierte Benutzer können Dokumente lesen" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Nur Admins können Dokumente hochladen" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_announcements_updated_at 
  BEFORE UPDATE ON announcements 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 