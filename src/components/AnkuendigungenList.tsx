'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  category: string
  important: boolean
  attachment_url?: string
  attachment_name?: string
  event_date?: string
  event_time?: string
  event_location?: string
  event_end_date?: string
  profiles: {
    full_name: string
  }
}

export default function AnkuendigungenList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'news' | 'events' | 'documents'>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (data) {
      setAnnouncements(data as any)
    }
    setLoading(false)
  }

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
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
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 1) {
      return 'Heute'
    } else if (diffDays === 1) {
      return 'Gestern'
    } else if (diffDays < 7) {
      return `vor ${diffDays} Tagen`
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  }

  const filteredAnnouncements = announcements.filter(announcement => {
    if (filter === 'all') return true
    return announcement.category === filter
  })

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">Laden...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Ankündigungen & Neuigkeiten
        </h2>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('news')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'news'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📰 Neuigkeiten
          </button>
          <button
            onClick={() => setFilter('events')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'events'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🎉 Veranstaltungen
          </button>
          <button
            onClick={() => setFilter('documents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'documents'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📄 Dokumente
          </button>
        </div>

        {/* Ankündigungen Liste */}
        {filteredAnnouncements.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            Keine Ankündigungen in dieser Kategorie vorhanden.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className={`border rounded-lg p-4 ${
                  announcement.important 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
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
                      <span className="text-sm text-gray-500">
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>

                    {/* Titel */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {announcement.title}
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
                            📍 {announcement.event_location}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Inhalt */}
                    <div className={`text-gray-700 ${
                      expandedItems.has(announcement.id) ? '' : 'line-clamp-3'
                    }`}>
                      {announcement.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-2">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Mehr/Weniger Button */}
                    {announcement.content.length > 200 && (
                      <button
                        onClick={() => toggleExpanded(announcement.id)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium mt-2"
                      >
                        {expandedItems.has(announcement.id) ? '← Weniger anzeigen' : 'Mehr anzeigen →'}
                      </button>
                    )}

                    {/* Anhang */}
                    {announcement.attachment_url && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-gray-500">📎</span>
                        <a
                          href={announcement.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 text-sm font-medium underline"
                        >
                          {announcement.attachment_name || 'Anhang herunterladen'}
                        </a>
                      </div>
                    )}

                    {/* Author */}
                    {announcement.profiles?.full_name && (
                      <div className="mt-3 text-xs text-gray-500">
                        Von {announcement.profiles.full_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hinweis Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Tipp:</strong> Wichtige Ankündigungen sind rot markiert. 
          Überprüfen Sie regelmäßig diese Seite für aktuelle Informationen vom Kindergarten.
          Termine mit Datum finden Sie auch im <Link href="/dashboard/termine" className="underline font-medium">Kalender</Link>.
        </p>
      </div>
    </div>
  )
}