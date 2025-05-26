'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  category: string
  important: boolean
  published: boolean
  attachment_url?: string
  attachment_name?: string
  event_date?: string
  event_time?: string
  event_location?: string
  event_end_date?: string
  author_id: string
  profiles: {
    full_name: string
  }
}

export default function AnkuendigungenVerwaltung() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'news' | 'events' | 'documents' | 'urgent'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([])
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  
  // Form States
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'news',
    important: false,
    published: false,
    event_date: '',
    event_time: '',
    event_location: '',
    event_end_date: ''
  })
  
  // File Upload
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  useEffect(() => {
    // Filter-Logik
    let filtered = announcements

    // Kategorie-Filter
    if (filter !== 'all') {
      filtered = filtered.filter(announcement => announcement.category === filter)
    }

    // Status-Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(announcement => 
        statusFilter === 'published' ? announcement.published : !announcement.published
      )
    }

    // Such-Filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(announcement =>
        announcement.title.toLowerCase().includes(searchLower) ||
        announcement.content.toLowerCase().includes(searchLower) ||
        announcement.event_location?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredAnnouncements(filtered)
  }, [announcements, filter, statusFilter, searchTerm])

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data as any || [])
    } catch (error) {
      console.error('Error fetching announcements:', error)
      alert('Fehler beim Laden der Ankündigungen')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      let attachmentUrl = null
      let attachmentName = null

      // Datei hochladen falls vorhanden
      if (selectedFile) {
        setUploadingFile(true)
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `announcements/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, selectedFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        attachmentUrl = publicUrl
        attachmentName = selectedFile.name
        setUploadingFile(false)
      }

      const announcementData = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        important: formData.important,
        published: formData.published,
        event_date: formData.event_date || null,
        event_time: formData.event_time || null,
        event_location: formData.event_location || null,
        event_end_date: formData.event_end_date || null,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        author_id: user.id
      }

      if (editingAnnouncement) {
        // Update
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingAnnouncement.id)

        if (error) throw error
        alert('Ankündigung erfolgreich aktualisiert!')
      } else {
        // Create
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData)

        if (error) throw error
        alert('Ankündigung erfolgreich erstellt!')
      }

      resetForm()
      fetchAnnouncements()
    } catch (error) {
      console.error('Error saving announcement:', error)
      alert('Fehler beim Speichern: ' + (error as Error).message)
    } finally {
      setLoading(false)
      setUploadingFile(false)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      important: announcement.important,
      published: announcement.published,
      event_date: announcement.event_date || '',
      event_time: announcement.event_time || '',
      event_location: announcement.event_location || '',
      event_end_date: announcement.event_end_date || ''
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Ankündigung wirklich löschen?')) return

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error
      alert('Ankündigung erfolgreich gelöscht!')
      fetchAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      alert('Fehler beim Löschen: ' + (error as Error).message)
    }
  }

  const togglePublished = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ published: !announcement.published })
        .eq('id', announcement.id)

      if (error) throw error
      fetchAnnouncements()
    } catch (error) {
      console.error('Error toggling published status:', error)
      alert('Fehler beim Ändern des Status: ' + (error as Error).message)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'news',
      important: false,
      published: false,
      event_date: '',
      event_time: '',
      event_location: '',
      event_end_date: ''
    })
    setSelectedFile(null)
    setEditingAnnouncement(null)
    setShowCreateModal(false)
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'news': return '📰'
      case 'events': return '🎉'
      case 'documents': return '📄'
      case 'urgent': return '🚨'
      default: return '📢'
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'news': return 'Neuigkeiten'
      case 'events': return 'Veranstaltungen'
      case 'documents': return 'Dokumente'
      case 'urgent': return 'Wichtig'
      default: return 'Allgemein'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  if (loading) {
    return <div className="text-center py-8">Laden...</div>
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Ankündigungsverwaltung
        </h2>

        {/* Suchfeld */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Suche nach Titel, Inhalt oder Ort..."
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 space-y-4">
          {/* Kategorie-Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kategorie:</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Alle', icon: '📋' },
                { value: 'news', label: 'Neuigkeiten', icon: '📰' },
                { value: 'events', label: 'Veranstaltungen', icon: '🎉' },
                { value: 'documents', label: 'Dokumente', icon: '📄' },
                { value: 'urgent', label: 'Wichtig', icon: '🚨' }
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setFilter(item.value as any)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    filter === item.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status-Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Alle' },
                { value: 'published', label: 'Veröffentlicht' },
                { value: 'draft', label: 'Entwürfe' }
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setStatusFilter(item.value as any)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === item.value
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {searchTerm || filter !== 'all' || statusFilter !== 'all' ? (
              <>
                {filteredAnnouncements.length} von {announcements.length} Ankündigungen gefunden
                {filteredAnnouncements.length === 0 && (
                  <span className="text-orange-600 ml-2">
                    - Keine Treffer
                  </span>
                )}
              </>
            ) : (
              `${announcements.length} Ankündigungen in der Datenbank`
            )}
          </span>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            + Neue Ankündigung
          </button>
        </div>

        {/* Ankündigungen Liste */}
        <div className="space-y-4">
          {filteredAnnouncements.map(announcement => (
            <div
              key={announcement.id}
              className={`border rounded-lg p-4 ${
                announcement.important 
                  ? 'border-red-300 bg-red-50' 
                  : announcement.published
                  ? 'border-gray-200 bg-white'
                  : 'border-yellow-300 bg-yellow-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xl">
                      {getCategoryIcon(announcement.category)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      announcement.important
                        ? 'bg-red-200 text-red-800'
                        : 'bg-gray-200 text-gray-700'
                    }`}>
                      {getCategoryLabel(announcement.category)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      announcement.published
                        ? 'bg-green-200 text-green-800'
                        : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {announcement.published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(announcement.created_at)}
                    </span>
                  </div>

                  {/* Titel */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {highlightSearchTerm(announcement.title, searchTerm)}
                  </h3>

                  {/* Termin-Info wenn vorhanden */}
                  {announcement.event_date && (
                    <div className="flex flex-wrap gap-3 mb-3 text-sm">
                      <span className="flex items-center gap-1 text-green-700">
                        📅 {new Date(announcement.event_date).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      {announcement.event_time && (
                        <span className="flex items-center gap-1 text-green-700">
                          🕐 {announcement.event_time.slice(0, 5)} Uhr
                        </span>
                      )}
                      {announcement.event_location && (
                        <span className="flex items-center gap-1 text-green-700">
                          📍 {highlightSearchTerm(announcement.event_location, searchTerm)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Inhalt (gekürzt) */}
                  <div className="text-gray-700 line-clamp-2 mb-2">
                    {highlightSearchTerm(announcement.content.substring(0, 150) + (announcement.content.length > 150 ? '...' : ''), searchTerm)}
                  </div>

                  {/* Anhang */}
                  {announcement.attachment_url && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-500">📎</span>
                      <span className="text-sm text-gray-600">
                        {announcement.attachment_name || 'Anhang vorhanden'}
                      </span>
                    </div>
                  )}

                  {/* Author */}
                  {announcement.profiles?.full_name && (
                    <div className="text-xs text-gray-500">
                      Von {announcement.profiles.full_name}
                    </div>
                  )}
                </div>
                
                <div className="ml-4 flex flex-col gap-2">
                  <button
                    onClick={() => togglePublished(announcement)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      announcement.published
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {announcement.published ? 'Verstecken' : 'Veröffentlichen'}
                  </button>
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700 transition-colors"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-700 transition-colors"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Ankündigung erstellen/bearbeiten */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingAnnouncement ? 'Ankündigung bearbeiten' : 'Neue Ankündigung erstellen'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Titel */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                  required
                />
              </div>

              {/* Kategorie */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Kategorie *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                  required
                >
                  <option value="news">📰 Neuigkeiten</option>
                  <option value="events">🎉 Veranstaltungen</option>
                  <option value="documents">📄 Dokumente</option>
                  <option value="urgent">🚨 Wichtig</option>
                </select>
              </div>

              {/* Inhalt */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Inhalt *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  rows={6}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                  required
                />
              </div>

              {/* Termin-Felder (nur bei Events) */}
              {formData.category === 'events' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Termin-Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Datum
                      </label>
                      <input
                        type="date"
                        value={formData.event_date}
                        onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Uhrzeit
                      </label>
                      <input
                        type="time"
                        value={formData.event_time}
                        onChange={(e) => setFormData({...formData, event_time: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Ort
                    </label>
                    <input
                      type="text"
                      value={formData.event_location}
                      onChange={(e) => setFormData({...formData, event_location: e.target.value})}
                      placeholder="z.B. Kindergarten Garten, Turnhalle..."
                      className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      End-Datum (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.event_end_date}
                      onChange={(e) => setFormData({...formData, event_end_date: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* Datei-Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Dokument anhängen (optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Erlaubte Formate: PDF, Word, Bilder (max. 10MB)
                </p>
              </div>

              {/* Optionen */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Veröffentlichungsoptionen</h4>
                
                <div 
                  onClick={() => setFormData({...formData, important: !formData.important})}
                  className="flex items-start space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  <div className="flex items-center h-5">
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      formData.important 
                        ? 'bg-red-600 border-red-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {formData.important && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-red-600">🚨</span>
                      <span className="text-sm font-medium text-gray-900">Als wichtig markieren</span>
                    </div>
                    <span className="text-xs text-gray-500">Ankündigung wird rot hervorgehoben</span>
                  </div>
                </div>
                
                <div 
                  onClick={() => setFormData({...formData, published: !formData.published})}
                  className="flex items-start space-x-3 cursor-pointer hover:bg-gray-100 p-2 rounded"
                >
                  <div className="flex items-center h-5">
                    <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                      formData.published 
                        ? 'bg-green-600 border-green-600' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {formData.published && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-green-600">✅</span>
                      <span className="text-sm font-medium text-gray-900">Sofort veröffentlichen</span>
                    </div>
                    <span className="text-xs text-gray-500">Sonst als Entwurf speichern</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading || uploadingFile}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {uploadingFile ? 'Datei wird hochgeladen...' : (editingAnnouncement ? 'Aktualisieren' : 'Erstellen')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 