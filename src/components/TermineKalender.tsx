'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  content: string
  event_date: string
  event_time: string | null
  event_location: string | null
  event_end_date: string | null
  category: string
  important: boolean
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  events: Event[]
}

export default function TermineKalender() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('published', true)
      .not('event_date', 'is', null)
      .order('event_date', { ascending: true })

    if (data) {
      setEvents(data as Event[])
    }
    setLoading(false)
  }

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() || 7 // Montag = 1, Sonntag = 7
    
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Vormonat-Tage
    for (let i = startingDayOfWeek - 1; i > 0; i--) {
      const date = new Date(year, month, 1 - i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: []
      })
    }

    // Aktueller Monat
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const dayEvents = events.filter(event => event.event_date === dateStr)
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        events: dayEvents
      })
    }

    // Nächster Monat (bis 42 Tage = 6 Wochen)
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        events: []
      })
    }

    return days
  }

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatEventTime = (event: Event) => {
    if (!event.event_time) return ''
    return event.event_time.slice(0, 5) + ' Uhr'
  }

  const getCategoryColor = (category: string, important: boolean) => {
    if (important) return 'bg-red-500'
    switch (category) {
      case 'events': return 'bg-green-600'
      case 'documents': return 'bg-blue-600'
      default: return 'bg-gray-600'
    }
  }

  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.event_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return eventDate >= today
  }).slice(0, 10) // Nächste 10 Termine

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">Laden...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">
            Termine & Veranstaltungen
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📅 Kalender
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📋 Liste
            </button>
          </div>
        </div>

        {viewMode === 'month' ? (
          <>
            {/* Kalender Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ←
              </button>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button
                  onClick={goToToday}
                  className="text-sm text-green-600 hover:text-green-700 mt-1"
                >
                  Heute
                </button>
              </div>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                →
              </button>
            </div>

            {/* Kalender Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Wochentage Header */}
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}

              {/* Kalendertage */}
              {getDaysInMonth(currentDate).map((day, index) => (
                <div
                  key={index}
                  className={`
                    min-h-[80px] p-2 border rounded-lg
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${day.isToday ? 'border-green-500 border-2' : 'border-gray-200'}
                    ${day.events.length > 0 ? 'cursor-pointer hover:bg-gray-50' : ''}
                  `}
                  onClick={() => day.events.length > 0 && setSelectedEvent(day.events[0])}
                >
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {day.date.getDate()}
                  </div>
                  {day.events.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className={`text-xs text-white px-1 py-0.5 rounded mb-1 truncate ${
                        getCategoryColor(event.category, event.important)
                      }`}
                      title={event.title}
                    >
                      {event.event_time && formatEventTime(event).split(' ')[0]} {event.title}
                    </div>
                  ))}
                  {day.events.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{day.events.length - 2} weitere
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Listen-Ansicht */
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Keine anstehenden Termine
              </p>
            ) : (
              upcomingEvents.map(event => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded text-white ${
                          getCategoryColor(event.category, event.important)
                        }`}>
                          {new Date(event.event_date).toLocaleDateString('de-DE', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                        {event.event_time && (
                          <span className="text-sm text-gray-600">
                            {formatEventTime(event)}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      {event.event_location && (
                        <p className="text-sm text-gray-600 mt-1">
                          📍 {event.event_location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Event-Detail Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedEvent.title}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-gray-700">
              <div>
                <strong>📅 Datum:</strong> {new Date(selectedEvent.event_date).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
              
              {selectedEvent.event_time && (
                <div>
                  <strong>🕐 Uhrzeit:</strong> {formatEventTime(selectedEvent)}
                </div>
              )}
              
              {selectedEvent.event_location && (
                <div>
                  <strong>📍 Ort:</strong> {selectedEvent.event_location}
                </div>
              )}
              
              <div className="pt-3 border-t">
                <strong>Beschreibung:</strong>
                <p className="mt-2 whitespace-pre-line">{selectedEvent.content}</p>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
              <Link
                href="/dashboard/ankuendigungen"
                className="flex-1 bg-green-600 text-white text-center py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Zur Ankündigung
              </Link>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hinweis Box */}
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800">
          <strong>Tipp:</strong> Klicken Sie auf einen Termin für mehr Details. 
          Wichtige Termine sind rot markiert. Alle Termine finden Sie auch in den Ankündigungen.
        </p>
      </div>
    </div>
  )
}