'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Child {
  id: string
  name: string
}

interface SickReport {
  id: string
  date: string
  reason: string
  created_at: string
  children: {
    name: string
  }
}

export default function KrankmeldungForm() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [reason, setReason] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [recentReports, setRecentReports] = useState<SickReport[]>([])
  const [successMessage, setSuccessMessage] = useState('')

  const fetchRecentReports = useCallback(async () => {
    const { data } = await supabase
      .from('sick_reports')
      .select(`
        id,
        date,
        reason,
        created_at,
        children (
          name
        )
      `)
      .eq('child_id', selectedChild)
      .order('date', { ascending: false })
      .limit(5)

    if (data) {
      setRecentReports(data as unknown as SickReport[])
    }
  }, [selectedChild])

  useEffect(() => {
    fetchChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) {
      fetchRecentReports()
    }
  }, [selectedChild, fetchRecentReports])

  const fetchChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id)

    if (data && data.length > 0) {
      setChildren(data)
      setSelectedChild(data[0].id)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMessage('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('sick_reports')
      .insert({
        child_id: selectedChild,
        date: date,
        reason: reason.trim() || null,
        reported_by: user.id
      })

    if (!error) {
      setSuccessMessage('Krankmeldung wurde erfolgreich übermittelt!')
      setReason('')
      // Setze Datum auf morgen für die nächste mögliche Krankmeldung
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setDate(tomorrow.toISOString().split('T')[0])
      
      // Aktualisiere die Liste
      fetchRecentReports()
      
      // Nachricht nach 3 Sekunden ausblenden
      setTimeout(() => setSuccessMessage(''), 3000)
    } else {
      alert('Fehler beim Speichern: ' + error.message)
    }

    setLoading(false)
  }

  // Heute als Minimum-Datum
  const today = new Date().toISOString().split('T')[0]
  
  // Maximum ist 14 Tage in der Zukunft
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 14)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <div>
      {/* Formular */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Kind krankmelden
        </h2>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {children.length > 0 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kind auswählen:
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                required
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Datum:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                max={maxDateStr}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Sie können Ihr Kind für heute oder zukünftige Tage (max. 14 Tage) krankmelden.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund (optional):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Fieber, Erkältung, Arzttermin..."
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Wird übermittelt...' : '🤒 Kind krankmelden'}
            </button>
          </form>
        ) : (
          <p className="text-gray-500">
            Keine Kinder gefunden. Bitte wenden Sie sich an die Verwaltung.
          </p>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Hinweis:</strong> Bitte melden Sie Ihr Kind so früh wie möglich krank, 
            spätestens bis 8:00 Uhr morgens. Bei längerer Krankheit melden Sie bitte jeden Tag einzeln.
          </p>
        </div>
      </div>

      {/* Letzte Krankmeldungen */}
      {recentReports.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Letzte Krankmeldungen
          </h3>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div key={report.id} className="border-l-4 border-red-500 pl-4 py-2">
                <div className="flex justify-between">
                  <span className="font-medium">
                    {new Date(report.date).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-sm text-gray-500">
                    Gemeldet am {new Date(report.created_at).toLocaleDateString('de-DE')}
                  </span>
                </div>
                {report.reason && (
                  <p className="text-gray-600 text-sm mt-1">
                    Grund: {report.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}