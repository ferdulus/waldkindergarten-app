'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SickReport {
  id: string
  date: string
  reason?: string
  created_at: string
  children: {
    id: string
    name: string
    allergies?: string
  }
  profiles: {
    full_name: string
  }
}

interface Child {
  id: string
  name: string
  allergies?: string
  profiles: {
    full_name: string
  }
}

export default function KrankmeldungenVerwaltung() {
  const [sickReports, setSickReports] = useState<SickReport[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedChild, setSelectedChild] = useState('all')

  useEffect(() => {
    fetchSickReports()
    fetchChildren()
  }, [dateFilter, selectedDate, selectedChild])

  const fetchSickReports = async () => {
    setLoading(true)
    let query = supabase
      .from('sick_reports')
      .select(`
        id,
        date,
        reason,
        created_at,
        children (
          id,
          name,
          allergies
        ),
        profiles!sick_reports_reported_by_fkey (
          full_name
        )
      `)
      .order('date', { ascending: false })

    // Datum-Filter anwenden
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('date', today)
    } else if (dateFilter === 'week') {
      const startOfWeek = getMonday(new Date())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 6)
      query = query
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
    } else if (dateFilter === 'month') {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      const endOfMonth = new Date()
      endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0)
      query = query
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0])
    } else if (dateFilter === 'custom') {
      query = query.eq('date', selectedDate)
    }

    // Kind-Filter anwenden
    if (selectedChild !== 'all') {
      query = query.eq('child_id', selectedChild)
    }

    const { data, error } = await query

    if (data) {
      setSickReports(data as any)
    }
    setLoading(false)
  }

  const fetchChildren = async () => {
    const { data, error } = await supabase
      .from('children')
      .select(`
        id,
        name,
        allergies,
        profiles (
          full_name
        )
      `)
      .order('name')

    if (data) {
      setChildren(data as any)
    }
  }

  const getMonday = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    const regex = new RegExp(`(${searchTerm})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  const deleteSickReport = async (id: string) => {
    if (!confirm('Möchten Sie diese Krankmeldung wirklich löschen?')) {
      return
    }

    const { error } = await supabase
      .from('sick_reports')
      .delete()
      .eq('id', id)

    if (!error) {
      setSickReports(sickReports.filter(report => report.id !== id))
    } else {
      alert('Fehler beim Löschen: ' + error.message)
    }
  }

  // Filter-Logik
  const filteredReports = sickReports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.children.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.reason && report.reason.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesSearch
  })

  // Statistiken berechnen
  const stats = {
    total: filteredReports.length,
    withReason: filteredReports.filter(r => r.reason && r.reason.trim()).length,
    withoutReason: filteredReports.filter(r => !r.reason || !r.reason.trim()).length,
    uniqueChildren: new Set(filteredReports.map(r => r.children.id)).size
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const exportToCSV = () => {
    const headers = ['Datum', 'Kind', 'Eltern', 'Grund', 'Gemeldet am', 'Gemeldet um']
    const rows = filteredReports.map(report => [
      report.date,
      report.children.name,
      report.profiles?.full_name || '',
      report.reason || 'Kein Grund angegeben',
      new Date(report.created_at).toLocaleDateString('de-DE'),
      new Date(report.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `krankmeldungen_${selectedDate || 'alle'}.csv`
    link.click()
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Krankmeldungen Verwaltung
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
              placeholder="Suche nach Kind, Eltern oder Grund..."
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
          {/* Datum-Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zeitraum:</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { value: 'today', label: 'Heute', icon: '📅' },
                { value: 'week', label: 'Diese Woche', icon: '📆' },
                { value: 'month', label: 'Dieser Monat', icon: '🗓️' },
                { value: 'custom', label: 'Bestimmtes Datum', icon: '📋' }
              ].map(item => (
                <button
                  key={item.value}
                  onClick={() => setDateFilter(item.value)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    dateFilter === item.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
            
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2 p-2 border border-gray-300 rounded-md text-gray-900"
              />
            )}
          </div>

          {/* Kind-Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kind:</label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="p-2 border border-gray-300 rounded-md text-gray-900"
            >
              <option value="all">Alle Kinder</option>
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name} ({child.profiles?.full_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Statistiken */}
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.total}</div>
            <div className="text-sm text-red-800">Krankmeldungen</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{stats.withReason}</div>
            <div className="text-sm text-orange-800">Mit Grund</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{stats.withoutReason}</div>
            <div className="text-sm text-gray-800">Ohne Grund</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.uniqueChildren}</div>
            <div className="text-sm text-blue-800">Betroffene Kinder</div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {searchTerm || selectedChild !== 'all' ? (
              <>
                {filteredReports.length} von {sickReports.length} Krankmeldungen gefunden
                {filteredReports.length === 0 && (
                  <span className="text-orange-600 ml-2">
                    - Keine Treffer
                  </span>
                )}
              </>
            ) : (
              `${sickReports.length} Krankmeldungen in der Datenbank`
            )}
          </span>
          <button
            onClick={exportToCSV}
            disabled={filteredReports.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            📊 CSV Export
          </button>
        </div>

        {/* Krankmeldungen Liste */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Lade Krankmeldungen...</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map(report => (
              <div
                key={report.id}
                className="border border-red-200 bg-red-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xl">🤒</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-red-200 text-red-800">
                        Krankmeldung
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(report.date)}
                      </span>
                    </div>

                    {/* Kind und Eltern */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      <span dangerouslySetInnerHTML={{ 
                        __html: highlightSearchTerm(report.children.name, searchTerm) 
                      }} />
                    </h3>
                    
                    {report.profiles?.full_name && (
                      <div className="text-sm text-gray-600 mb-2">
                        Gemeldet von: <span dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(report.profiles.full_name, searchTerm) 
                        }} />
                      </div>
                    )}

                    {/* Grund */}
                    {report.reason ? (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Grund: </span>
                        <span className="text-sm text-gray-600" dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(report.reason, searchTerm) 
                        }} />
                      </div>
                    ) : (
                      <div className="mb-2">
                        <span className="text-sm text-gray-500 italic">Kein Grund angegeben</span>
                      </div>
                    )}

                    {/* Allergien-Hinweis */}
                    {report.children.allergies && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-500">⚠️</span>
                        <span className="text-sm text-yellow-700 font-medium">
                          Allergien: {report.children.allergies}
                        </span>
                      </div>
                    )}

                    {/* Gemeldet am */}
                    <div className="text-xs text-gray-500">
                      Gemeldet am {new Date(report.created_at).toLocaleDateString('de-DE')} um {new Date(report.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <button
                      onClick={() => deleteSickReport(report.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-red-700 transition-colors"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredReports.length === 0 && !loading && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm || selectedChild !== 'all' 
                    ? 'Keine Krankmeldungen gefunden, die den Filterkriterien entsprechen.'
                    : 'Keine Krankmeldungen für den ausgewählten Zeitraum vorhanden.'
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 