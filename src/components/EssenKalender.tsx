'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Child {
  id: string
  name: string
}

interface MealOrder {
  date: string
  will_eat: boolean
}

export default function EssenKalender() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [mealOrders, setMealOrders] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchChildren()
  }, [])

  useEffect(() => {
    if (selectedChild) {
      fetchMealOrders()
    }
  }, [selectedChild])

  const fetchChildren = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('children')
      .select('id, name')
      .eq('parent_id', user.id)

    if (data) {
      setChildren(data)
      if (data.length > 0) {
        setSelectedChild(data[0].id)
      }
    }
  }

  const fetchMealOrders = async () => {
    // Hole Bestellungen für 3 Wochen
    const startOfCurrentWeek = getMonday(new Date())
    const endOfThirdWeek = new Date(startOfCurrentWeek)
    endOfThirdWeek.setDate(endOfThirdWeek.getDate() + 18) // 3 Wochen minus Wochenende

    const { data, error } = await supabase
      .from('meal_orders')
      .select('date, will_eat')
      .eq('child_id', selectedChild)
      .gte('date', formatDateForDB(startOfCurrentWeek))
      .lte('date', formatDateForDB(endOfThirdWeek))

    if (data) {
      const orders: Record<string, boolean> = {}
      data.forEach(order => {
        orders[order.date] = order.will_eat
      })
      setMealOrders(orders)
    }
  }

  const getMonday = (date: Date) => {
    const d = new Date(date.getTime()) // Erstelle eine Kopie
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0) // Setze auf Mitternacht für konsistente Vergleiche
    return d
  }

  // Hilfsfunktion für konsistente Datums-Konvertierung (lokale Zeit statt UTC)
  const formatDateForDB = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getWeekDays = (weekOffset: number) => {
    const today = new Date()
    const monday = getMonday(today)
    monday.setDate(monday.getDate() + (weekOffset * 7))
    
    const days = []
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday.getTime()) // Erstelle eine Kopie des Monday-Datums
      date.setDate(date.getDate() + i)
      days.push(date)
    }
    
    return days
  }

  const isOrderingAllowed = (date: Date) => {
    const now = new Date()
    const currentWeekMonday = getMonday(now)
    const dateWeekMonday = getMonday(date)
    
    // Berechne die Wochendifferenz
    const weekDiff = Math.floor((dateWeekMonday.getTime() - currentWeekMonday.getTime()) / (1000 * 60 * 60 * 24 * 7))
    
    // Aktuelle Woche (weekDiff = 0) ist immer gesperrt
    if (weekDiff === 0) {
      return false
    }
    
    // Vergangene Wochen sind auch gesperrt
    if (weekDiff < 0) {
      return false
    }
    
    // Für nächste Woche (weekDiff = 1): Bestellschluss Freitag 15 Uhr
    if (weekDiff === 1) {
      const friday = new Date(currentWeekMonday)
      friday.setDate(friday.getDate() + 4) // Freitag
      friday.setHours(15, 0, 0, 0) // 15:00 Uhr
      
      return now < friday
    }
    
    // Übernächste Woche (weekDiff = 2) und später sind erlaubt
    return weekDiff === 2
  }

  const toggleMealOrder = async (date: Date) => {
    if (!isOrderingAllowed(date)) return
    
    // Zusätzliche Validierung: Keine Bestellungen am Wochenende
    const dayOfWeek = date.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = Sonntag, 6 = Samstag
      alert('Bestellungen sind nur von Montag bis Freitag möglich.')
      return
    }
    
    // Verwende lokales Datum statt UTC um Zeitzonenfehler zu vermeiden
    const dateStr = formatDateForDB(date)
    
    const currentValue = mealOrders[dateStr] || false
    
    setLoading(true)
    
    if (currentValue) {
      // Wenn bereits bestellt, dann löschen
      const { error } = await supabase
        .from('meal_orders')
        .delete()
        .eq('child_id', selectedChild)
        .eq('date', dateStr)
        
      if (!error) {
        const newOrders = { ...mealOrders }
        delete newOrders[dateStr]
        setMealOrders(newOrders)
      } else {
        alert('Fehler beim Löschen: ' + error.message)
      }
    } else {
      // Wenn nicht bestellt, dann erstellen
      const { error } = await supabase
        .from('meal_orders')
        .insert({
          child_id: selectedChild,
          date: dateStr,
          will_eat: true
        })
        
      if (!error) {
        setMealOrders({
          ...mealOrders,
          [dateStr]: true
        })
      } else {
        alert('Fehler beim Speichern: ' + error.message)
      }
    }
    
    setLoading(false)
  }

  const getWeekLabel = (weekOffset: number) => {
    if (weekOffset === 0) return 'Aktuelle Woche'
    if (weekOffset === 1) return 'Nächste Woche'
    if (weekOffset === 2) return 'Übernächste Woche'
    return ''
  }

  const getDeadlineInfo = (weekOffset: number) => {
    if (weekOffset === 0) return 'Bestellung nicht mehr möglich'
    
    if (weekOffset === 1) {
      const now = new Date()
      const friday = getMonday(now)
      friday.setDate(friday.getDate() + 4)
      friday.setHours(15, 0, 0, 0)
      
      if (now >= friday) {
        return 'Bestellung nicht mehr möglich'
      }
      
      const hoursLeft = Math.floor((friday.getTime() - now.getTime()) / (1000 * 60 * 60))
      if (hoursLeft < 24) {
        return `⚠️ Bestellschluss in ${hoursLeft} Stunden!`
      }
      return `Bestellschluss: Freitag, ${friday.toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit' 
      })}, 15:00 Uhr`
    }
    
    return 'Bestellung möglich'
  }

  const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Essensbestellung
      </h2>

      {children.length > 0 ? (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kind auswählen:
            </label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3 Wochen anzeigen */}
          {[0, 1, 2].map(weekOffset => {
            const weekDays = getWeekDays(weekOffset)
            const deadlineInfo = getDeadlineInfo(weekOffset)
            const isCurrentWeek = weekOffset === 0
            
            return (
              <div key={weekOffset} className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-700">
                    {getWeekLabel(weekOffset)}
                  </h3>
                  <span className={`text-sm ${
                    deadlineInfo.includes('⚠️') ? 'text-red-600 font-semibold' : 'text-gray-500'
                  }`}>
                    {deadlineInfo}
                  </span>
                </div>
                
                <div className="grid grid-cols-5 gap-3">
                  {weekDays.map((date, index) => {
                    const dateStr = formatDateForDB(date)
                    const isOrdered = mealOrders[dateStr] || false
                    const canOrder = isOrderingAllowed(date)
                    
                    return (
                      <div
                        key={dateStr}
                        className={`text-center ${!canOrder ? 'opacity-60' : ''}`}
                      >
                        <div className="font-medium text-gray-700 mb-1 text-sm">
                          {dayNames[index]}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {date.toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </div>
                        {canOrder ? (
                          <button
                            onClick={() => toggleMealOrder(date)}
                            disabled={loading}
                            className={`
                              w-full py-2 px-3 rounded-lg font-medium transition-colors text-sm
                              ${isOrdered 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }
                              ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                            `}
                          >
                            {isOrdered ? '✓' : '-'}
                          </button>
                        ) : (
                          <div className={`
                            w-full py-2 px-3 rounded-lg font-medium text-sm
                            ${isOrdered 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-500'
                            }
                          `}>
                            {isOrdered ? '✓ Bestellt' : '—'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Wichtig:</strong> Bestellungen für die kommende Woche müssen bis 
              spätestens Freitag, 15:00 Uhr getätigt werden. Änderungen für die aktuelle 
              Woche sind nicht mehr möglich.
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Keine Kinder gefunden. Bitte wenden Sie sich an die Verwaltung.
          </p>
        </div>
      )}
    </div>
  )
}