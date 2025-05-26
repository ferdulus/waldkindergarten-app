'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface MealOrder {
  id: string
  date: string
  will_eat: boolean
  created_at: string
  child_id: string
  children: {
    id: string
    name: string
    parent_id: string
    profiles: {
      full_name: string
    }
  } | null
}

interface Child {
  id: string
  name: string
  profiles: {
    full_name: string
  } | null
}

interface WeekStats {
  week: string
  weekLabel: string
  totalOrders: number
  eatingCount: number
  notEatingCount: number
  orderingAllowed: boolean
  deadline: string
}

export default function EssensbestellungenVerwaltung() {
  const [mealOrders, setMealOrders] = useState<MealOrder[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('current_week')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showDetails, setShowDetails] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  const fetchMealOrders = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('meal_orders')
      .select(`
        id,
        date,
        will_eat,
        created_at,
        child_id,
        children (
          id,
          name,
          parent_id,
          profiles (
            full_name
          )
        )
      `)
      .order('date', { ascending: false })

    // Datum-Filter anwenden
    if (dateFilter === 'today') {
      const today = new Date().toISOString().split('T')[0]
      query = query.eq('date', today)
    } else if (dateFilter === 'current_week') {
      const startOfWeek = getMonday(new Date())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(endOfWeek.getDate() + 4) // Freitag
      query = query
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
    } else if (dateFilter === 'next_week') {
      const startOfNextWeek = getMonday(new Date())
      startOfNextWeek.setDate(startOfNextWeek.getDate() + 7)
      const endOfNextWeek = new Date(startOfNextWeek)
      endOfNextWeek.setDate(endOfNextWeek.getDate() + 4) // Freitag
      query = query
        .gte('date', startOfNextWeek.toISOString().split('T')[0])
        .lte('date', endOfNextWeek.toISOString().split('T')[0])
    } else if (dateFilter === 'week_after_next') {
      const startOfWeekAfterNext = getMonday(new Date())
      startOfWeekAfterNext.setDate(startOfWeekAfterNext.getDate() + 14)
      const endOfWeekAfterNext = new Date(startOfWeekAfterNext)
      endOfWeekAfterNext.setDate(endOfWeekAfterNext.getDate() + 4) // Freitag
      query = query
        .gte('date', startOfWeekAfterNext.toISOString().split('T')[0])
        .lte('date', endOfWeekAfterNext.toISOString().split('T')[0])
    } else if (dateFilter === 'custom') {
      query = query.eq('date', selectedDate)
    }

    const { data } = await query

    if (data) {
      setMealOrders(data as unknown as MealOrder[])
    }
    setLoading(false)
  }, [dateFilter, selectedDate])

  const fetchChildren = useCallback(async () => {
    const { data } = await supabase
      .from('children')
      .select(`
        id,
        name,
        profiles (
          full_name
        )
      `)
      .order('name')

    if (data) {
      setChildren(data as unknown as Child[])
    }
  }, [])

  useEffect(() => {
    fetchMealOrders()
    fetchChildren()
  }, [fetchMealOrders, fetchChildren])

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

  const getWeekStats = (): WeekStats[] => {
    const now = new Date()
    const currentWeekMonday = getMonday(now)
    const stats: WeekStats[] = []

    for (let weekOffset = 0; weekOffset < 3; weekOffset++) {
      const weekStart = new Date(currentWeekMonday)
      weekStart.setDate(weekStart.getDate() + (weekOffset * 7))
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 4) // Freitag

      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      // Nur Bestellungen für diese Woche filtern (will_eat = true) und nur Wochentage
      const weekOrders = mealOrders.filter(order => {
        const orderDate = new Date(order.date)
        const dayOfWeek = orderDate.getDay()
        
        return order.date >= weekStartStr && 
               order.date <= weekEndStr && 
               order.will_eat === true &&
               dayOfWeek >= 1 && dayOfWeek <= 5 // Nur Montag (1) bis Freitag (5)
      })

      // Bestellfrist berechnen
      let orderingAllowed = false
      let deadline = ''

      if (weekOffset === 0) {
        // Aktuelle Woche - keine Bestellungen möglich
        orderingAllowed = false
        deadline = 'Bestellungen nicht mehr möglich'
      } else if (weekOffset === 1) {
        // Nächste Woche - bis Freitag 15 Uhr der aktuellen Woche
        const deadlineDate = new Date(currentWeekMonday)
        deadlineDate.setDate(deadlineDate.getDate() + 4) // Freitag
        deadlineDate.setHours(15, 0, 0, 0)
        
        orderingAllowed = now < deadlineDate
        if (orderingAllowed) {
          const hoursLeft = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
          if (hoursLeft < 24) {
            deadline = `⚠️ Noch ${hoursLeft} Stunden`
          } else {
            deadline = `Bis Freitag, ${deadlineDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, 15:00`
          }
        } else {
          deadline = 'Bestellfrist abgelaufen'
        }
      } else {
        // Übernächste Woche - Bestellungen möglich
        orderingAllowed = true
        deadline = 'Bestellungen möglich'
      }

      const weekLabel = weekOffset === 0 ? 'Aktuelle Woche' : 
                       weekOffset === 1 ? 'Nächste Woche' : 'Übernächste Woche'

      // Berechne Kinder ohne Bestellung für diese Woche
      const totalChildren = children.length
      const childrenWithOrders = new Set(weekOrders.map(order => order.child_id)).size
      const childrenWithoutOrders = totalChildren - childrenWithOrders

      stats.push({
        week: `${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`,
        weekLabel,
        totalOrders: weekOrders.length,
        eatingCount: weekOrders.length, // Alle Bestellungen sind "isst mit"
        notEatingCount: childrenWithoutOrders, // Kinder ohne Bestellung
        orderingAllowed,
        deadline
      })
    }

    return stats
  }

  const getCurrentWeekStats = (): WeekStats | null => {
    if (dateFilter !== 'current_week' && dateFilter !== 'next_week' && dateFilter !== 'week_after_next') {
      return null
    }

    const now = new Date()
    const currentWeekMonday = getMonday(now)
    
    let weekOffset = 0
    let weekLabel = ''
    
    if (dateFilter === 'current_week') {
      weekOffset = 0
      weekLabel = 'Aktuelle Woche'
    } else if (dateFilter === 'next_week') {
      weekOffset = 1
      weekLabel = 'Nächste Woche'
    } else if (dateFilter === 'week_after_next') {
      weekOffset = 2
      weekLabel = 'Übernächste Woche'
    }

    const weekStart = new Date(currentWeekMonday)
    weekStart.setDate(weekStart.getDate() + (weekOffset * 7))
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 4) // Freitag

    const weekStartStr = weekStart.toISOString().split('T')[0]
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Nur Bestellungen für diese Woche filtern (will_eat = true) und nur Wochentage
    const weekOrders = mealOrders.filter(order => {
      const orderDate = new Date(order.date)
      const dayOfWeek = orderDate.getDay()
      
      return order.date >= weekStartStr && 
             order.date <= weekEndStr && 
             order.will_eat === true &&
             dayOfWeek >= 1 && dayOfWeek <= 5 // Nur Montag (1) bis Freitag (5)
    })

    // Bestellfrist berechnen
    let orderingAllowed = false
    let deadline = ''

    if (weekOffset === 0) {
      // Aktuelle Woche - keine Bestellungen möglich
      orderingAllowed = false
      deadline = 'Bestellungen nicht mehr möglich'
    } else if (weekOffset === 1) {
      // Nächste Woche - bis Freitag 15 Uhr der aktuellen Woche
      const deadlineDate = new Date(currentWeekMonday)
      deadlineDate.setDate(deadlineDate.getDate() + 4) // Freitag
      deadlineDate.setHours(15, 0, 0, 0)
      
      orderingAllowed = now < deadlineDate
      if (orderingAllowed) {
        const hoursLeft = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
        if (hoursLeft < 24) {
          deadline = `⚠️ Noch ${hoursLeft} Stunden`
        } else {
          deadline = `Bis Freitag, ${deadlineDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, 15:00`
        }
      } else {
        deadline = 'Bestellfrist abgelaufen'
      }
    } else {
      // Übernächste Woche - Bestellungen möglich
      orderingAllowed = true
      deadline = 'Bestellungen möglich'
    }

    // Berechne Kinder ohne Bestellung für diese Woche
    const totalChildren = children.length
    const childrenWithOrders = new Set(weekOrders.map(order => order.child_id)).size
    const childrenWithoutOrders = totalChildren - childrenWithOrders

    return {
      week: `${weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`,
      weekLabel,
      totalOrders: weekOrders.length,
      eatingCount: weekOrders.length, // Alle Bestellungen sind "isst mit"
      notEatingCount: childrenWithoutOrders, // Kinder ohne Bestellung
      orderingAllowed,
      deadline
    }
  }

  // Filter-Logik - nur echte Bestellungen anzeigen
  const filteredOrders = mealOrders.filter(order => {
    // Nur Bestellungen anzeigen (will_eat = true)
    if (!order.will_eat) return false

    // Nur Wochentage (Montag-Freitag) anzeigen
    const orderDate = new Date(order.date)
    const dayOfWeek = orderDate.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) return false // Keine Wochenenden

    const matchesSearch = searchTerm === '' || 
      order.children?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.children?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  // Statistiken berechnen
  const stats = {
    total: filteredOrders.length,
    eating: filteredOrders.length, // Alle gefilterten Bestellungen sind "isst mit"
    notEating: children.length - new Set(mealOrders.filter(o => o.will_eat).map(o => o.child_id)).size // Kinder ohne Bestellung
  }

  // Paginierung
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, dateFilter, selectedDate])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const exportToCSV = () => {
    const headers = ['Datum', 'Kind', 'Eltern', 'Isst mit', 'Bestellt am']
    const rows = filteredOrders.map(order => [
      order.date,
      order.children?.name || '',
      order.children?.profiles?.full_name || '',
      order.will_eat ? 'Ja' : 'Nein',
      new Date(order.created_at).toLocaleDateString('de-DE')
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `essensbestellungen_${selectedDate || 'alle'}.csv`
    link.click()
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Essensbestellungen Verwaltung
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
              placeholder="Suche nach Kind oder Eltern..."
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
                { value: 'current_week', label: 'Diese Woche', icon: '📆' },
                { value: 'next_week', label: 'Nächste Woche', icon: '📆' },
                { value: 'week_after_next', label: 'Übernächste Woche', icon: '📅📆🗓️' },
                { value: 'custom', label: 'Bestimmtes Datum', icon: '🗓️' }
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
        </div>

        {/* Statistiken */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.eating}</div>
            <div className="text-sm text-green-800">Bestellungen</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.notEating}</div>
            <div className="text-sm text-red-800">Ohne Bestellung</div>
          </div>
        </div>

        {/* Wochen-Auswertung */}
        {(dateFilter === 'current_week' || dateFilter === 'next_week' || dateFilter === 'week_after_next') && (
          <div className="mb-6">
            {(() => {
              const weekStat = getCurrentWeekStats()
              if (!weekStat) return null
              
              return (
                <div className="bg-white border rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">📊 {weekStat.weekLabel}</h3>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      weekStat.orderingAllowed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {weekStat.orderingAllowed ? '✅ Bestellungen offen' : '🔒 Bestellungen geschlossen'}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    {weekStat.week}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">{weekStat.eatingCount}</div>
                      <div className="text-sm text-green-800">🍽️ Bestellungen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">{weekStat.notEatingCount}</div>
                      <div className="text-sm text-red-800">🚫 Ohne Bestellung</div>
                    </div>
                  </div>
                  
                  <div className={`text-sm p-3 rounded-lg text-center ${
                    weekStat.deadline.includes('⚠️') 
                      ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                      : weekStat.orderingAllowed 
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    <strong>Bestellfrist:</strong> {weekStat.deadline}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {searchTerm ? (
                <>
                  {filteredOrders.length} von {mealOrders.length} Bestellungen gefunden
                  {filteredOrders.length === 0 && (
                    <span className="text-orange-600 ml-2">
                      - Keine Treffer
                    </span>
                  )}
                </>
              ) : (
                `${mealOrders.length} Bestellungen in der Datenbank`
              )}
            </span>
            
            {/* Toggle für Details */}
            {(dateFilter === 'today' || dateFilter === 'custom') && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {showDetails ? 'Kompakte Ansicht' : 'Details anzeigen'}
              </button>
            )}
          </div>
          
          <button
            onClick={exportToCSV}
            disabled={filteredOrders.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            📊 CSV Export
          </button>
        </div>

        {/* Bestellungen Anzeige */}
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Lade Essensbestellungen...</div>
          </div>
        ) : (dateFilter === 'current_week' || dateFilter === 'next_week' || dateFilter === 'week_after_next') ? (
          // Für Wochen-Ansicht: Statistik + Tabellarische Übersicht
          <div className="space-y-6">
            {/* Kompakte Tabellenansicht für Wochen */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <h4 className="text-lg font-medium text-gray-900">📋 Bestellungsdetails</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Datum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kind
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Eltern
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bestellt am
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <span className="text-green-500 mr-2">🍽️</span>
                            {new Date(order.date).toLocaleDateString('de-DE', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span dangerouslySetInnerHTML={{ 
                            __html: highlightSearchTerm(order.children?.name || '', searchTerm) 
                          }} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span dangerouslySetInnerHTML={{ 
                            __html: highlightSearchTerm(order.children?.profiles?.full_name || '', searchTerm) 
                          }} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('de-DE')}
                          <div className="text-xs text-gray-400">
                            {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredOrders.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    {searchTerm ? 'Keine Bestellungen gefunden, die den Filterkriterien entsprechen.' : 'Keine Essensbestellungen für diese Woche vorhanden.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : showDetails ? (
          // Detaillierte Kartenansicht (wie vorher)
          <div className="space-y-4">
            {paginatedOrders.map(order => (
              <div
                key={order.id}
                className="border border-green-200 bg-green-50 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-xl">🍽️</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-green-200 text-green-800">
                        Bestellung
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDate(order.date)}
                      </span>
                    </div>

                    {/* Kind und Eltern */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      <span dangerouslySetInnerHTML={{ 
                        __html: highlightSearchTerm(order.children?.name || '', searchTerm) 
                      }} />
                    </h3>
                    
                    {order.children?.profiles?.full_name && (
                      <div className="text-sm text-gray-600 mb-2">
                        Eltern: <span dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(order.children.profiles.full_name, searchTerm) 
                        }} />
                      </div>
                    )}

                    {/* Bestellt am */}
                    <div className="text-xs text-gray-500">
                      Bestellt am {new Date(order.created_at).toLocaleDateString('de-DE')} um {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm ? 'Keine Bestellungen gefunden, die den Filterkriterien entsprechen.' : 'Keine Essensbestellungen für den ausgewählten Zeitraum vorhanden.'}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Kompakte Tabellenansicht
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Datum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kind
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eltern
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bestellt am
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedOrders.map(order => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="text-green-500 mr-2">🍽️</span>
                          {new Date(order.date).toLocaleDateString('de-DE', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(order.children?.name || '', searchTerm) 
                        }} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(order.children?.profiles?.full_name || '', searchTerm) 
                        }} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('de-DE')}
                        <div className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm ? 'Keine Bestellungen gefunden, die den Filterkriterien entsprechen.' : 'Keine Essensbestellungen für den ausgewählten Zeitraum vorhanden.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paginierung */}
        {filteredOrders.length > itemsPerPage && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Zeige {startIndex + 1} bis {Math.min(endIndex, filteredOrders.length)} von {filteredOrders.length} Bestellungen
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
