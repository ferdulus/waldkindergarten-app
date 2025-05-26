'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  totalChildren: number
  totalAnnouncements: number
  publishedAnnouncements: number
  upcomingEvents: number
  todayMealOrders: number
  activeSickReports: number
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalChildren: 0,
    totalAnnouncements: 0,
    publishedAnnouncements: 0,
    upcomingEvents: 0,
    todayMealOrders: 0,
    activeSickReports: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await fetchStats()
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Benutzer zählen
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Kinder zählen
      const { count: childrenCount } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true })

      // Ankündigungen zählen
      const { count: announcementCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })

      const { count: publishedCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('published', true)

      // Kommende Events zählen
      const today = new Date().toISOString().split('T')[0]
      const { count: eventsCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('category', 'events')
        .eq('published', true)
        .gte('event_date', today)

      // Heutige Essensbestellungen zählen
      const { count: mealOrdersCount } = await supabase
        .from('meal_orders')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)

      // Aktive Krankmeldungen zählen
      const { count: sickReportsCount } = await supabase
        .from('sick_reports')
        .select('*', { count: 'exact', head: true })
        .lte('start_date', today)
        .gte('end_date', today)

      setStats({
        totalUsers: userCount || 0,
        totalChildren: childrenCount || 0,
        totalAnnouncements: announcementCount || 0,
        publishedAnnouncements: publishedCount || 0,
        upcomingEvents: eventsCount || 0,
        todayMealOrders: mealOrdersCount || 0,
        activeSickReports: sickReportsCount || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-500">Laden...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-500">Zugriff verweigert</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Admin-Übersicht
        </h1>
        
        {/* Statistiken */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="text-2xl mr-3">👥</div>
              <div>
                <p className="text-sm text-gray-600">Benutzer</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="text-2xl mr-3">👶</div>
              <div>
                <p className="text-sm text-gray-600">Kinder</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalChildren}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📢</div>
              <div>
                <p className="text-sm text-gray-600">Ankündigungen</p>
                <p className="text-2xl font-bold text-gray-900">{stats.publishedAnnouncements}/{stats.totalAnnouncements}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎉</div>
              <div>
                <p className="text-sm text-gray-600">Kommende Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingEvents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Heutige Aktivitäten */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
              📊 Heute
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🍽️ Essensbestellungen</span>
                <span className="font-semibold text-gray-900">{stats.todayMealOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">🤒 Krankmeldungen</span>
                <span className="font-semibold text-gray-900">{stats.activeSickReports}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
              🔗 Schnellzugriff
            </h2>
            <div className="space-y-2">
              <Link 
                href="/admin/ankuendigungen" 
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Neue Ankündigung erstellen
              </Link>
              <Link 
                href="/admin/nutzer" 
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Neuen Nutzer anlegen
              </Link>
              <Link 
                href="/admin/familien" 
                className="block text-blue-600 hover:text-blue-800 hover:underline"
              >
                → Familien verwalten
              </Link>
            </div>
          </div>
        </div>
        
        {/* Verwaltungsbereiche */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Verwaltungsbereiche</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/nutzer" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                👥 Nutzerverwaltung
              </h3>
              <p className="text-gray-600 mb-3">
                Eltern und Kinder verwalten, neue Nutzer anlegen
              </p>
              <div className="text-sm text-blue-600">
                {stats.totalUsers} Benutzer • {stats.totalChildren} Kinder
              </div>
            </div>
          </Link>

          <Link href="/admin/familien" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                👨‍👩‍👧‍👦 Familienverwaltung
              </h3>
              <p className="text-gray-600 mb-3">
                Familienstrukturen und Beziehungen verwalten
              </p>
              <div className="text-sm text-blue-600">
                Mehrere Eltern pro Kind möglich
              </div>
            </div>
          </Link>
          
          <Link href="/admin/ankuendigungen" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                📢 Ankündigungen
              </h3>
              <p className="text-gray-600 mb-3">
                Neuigkeiten, Termine und Dokumente erstellen
              </p>
              <div className="text-sm text-blue-600">
                {stats.publishedAnnouncements} veröffentlicht • {stats.upcomingEvents} Events
              </div>
            </div>
          </Link>
          
          <Link href="/admin/essen" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                🍽️ Essensbestellungen
              </h3>
              <p className="text-gray-600 mb-3">
                Übersicht der Bestellungen für die Küche
              </p>
              <div className="text-sm text-blue-600">
                {stats.todayMealOrders} heute bestellt
              </div>
            </div>
          </Link>

          <Link href="/admin/krankmeldungen" className="block">
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <h3 className="text-xl font-semibold mb-2 text-gray-900 flex items-center">
                🤒 Krankmeldungen
              </h3>
              <p className="text-gray-600 mb-3">
                Übersicht aller Krankmeldungen
              </p>
              <div className="text-sm text-blue-600">
                {stats.activeSickReports} aktuell krank
              </div>
            </div>
          </Link>

          <div className="bg-gray-100 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-700 flex items-center">
              📊 Berichte
            </h3>
            <p className="text-gray-500 mb-3">
              Statistiken und Auswertungen (geplant)
            </p>
            <div className="text-sm text-gray-400">
              Bald verfügbar
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}