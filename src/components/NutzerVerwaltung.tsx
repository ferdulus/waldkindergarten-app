'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: string
  created_at: string
}

interface Child {
  id: string
  name: string
  birth_date: string
  allergies: string | null
  parent_id: string // Wird deprecated, aber für Rückwärtskompatibilität beibehalten
}

interface ParentChildRelationship {
  id: string
  parent_id: string
  child_id: string
  relationship_type: string
  can_order_meals: boolean
  can_report_sick: boolean
  can_view_info: boolean
  created_at: string
}

interface ChildWithParents extends Child {
  parents: Profile[]
}

export default function NutzerVerwaltung() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddChild, setShowAddChild] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  
  // Formular-States für Kind
  const [newChildName, setNewChildName] = useState('')
  const [newChildBirthDate, setNewChildBirthDate] = useState('')
  const [newChildAllergies, setNewChildAllergies] = useState('')

  // Edit-States für Profile
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')

  // Such-States
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Filter-Logik für die Suche
    if (!searchTerm.trim()) {
      setFilteredProfiles(profiles)
    } else {
      const filtered = profiles.filter(profile => {
        const searchLower = searchTerm.toLowerCase()
        
        // Suche in Name
        const nameMatch = profile.full_name?.toLowerCase().includes(searchLower)
        
        // Suche in Telefonnummer
        const phoneMatch = profile.phone?.toLowerCase().includes(searchLower)
        
        // Suche in Kindernamen
        const userChildren = getChildrenForUser(profile.id)
        const childrenMatch = userChildren.some(child => 
          child.name.toLowerCase().includes(searchLower)
        )
        
        return nameMatch || phoneMatch || childrenMatch
      })
      setFilteredProfiles(filtered)
    }
  }, [profiles, children, searchTerm])

  const fetchData = async () => {
    try {
      // Hole alle Profile
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      if (profilesError) throw profilesError

      // Hole alle Kinder
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .order('name')

      if (childrenError) throw childrenError

      setProfiles(profilesData || [])
      setChildren(childrenData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const getChildrenForUser = (userId: string) => {
    return children.filter(child => child.parent_id === userId)
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) return
    
    setLoading(true)

    const { error } = await supabase
      .from('children')
      .insert({
        parent_id: selectedUserId,
        name: newChildName,
        birth_date: newChildBirthDate,
        allergies: newChildAllergies || null
      })

    if (!error) {
      alert('Kind erfolgreich angelegt!')
      setShowAddChild(false)
      setNewChildName('')
      setNewChildBirthDate('')
      setNewChildAllergies('')
      setSelectedUserId('')
      fetchData()
    } else {
      alert('Fehler beim Anlegen: ' + error.message)
    }
    
    setLoading(false)
  }

  const handleDeleteChild = async (childId: string) => {
    if (!confirm('Möchten Sie dieses Kind wirklich löschen? Alle zugehörigen Essensbestellungen und Krankmeldungen werden ebenfalls gelöscht.')) return

    setLoading(true)

    try {
      console.log('🔍 Starte Löschvorgang für Kind:', childId)

      // Methode 1: Versuche normale Löschung mit detaillierter Prüfung
      console.log('📋 Prüfe alle abhängigen Datensätze...')

      // Prüfe meal_orders
      const { data: mealOrders, error: mealOrdersCheckError } = await supabase
        .from('meal_orders')
        .select('id, created_at')
        .eq('child_id', childId)

      if (mealOrdersCheckError) {
        console.error('❌ Fehler beim Prüfen der meal_orders:', mealOrdersCheckError)
        throw new Error(`Fehler beim Prüfen der Essensbestellungen: ${mealOrdersCheckError.message}`)
      }

      console.log('📊 Gefundene meal_orders:', mealOrders?.length || 0, mealOrders)

      // Prüfe sick_reports
      const { data: sickReports, error: sickReportsCheckError } = await supabase
        .from('sick_reports')
        .select('id, created_at')
        .eq('child_id', childId)

      if (sickReportsCheckError) {
        console.error('❌ Fehler beim Prüfen der sick_reports:', sickReportsCheckError)
        throw new Error(`Fehler beim Prüfen der Krankmeldungen: ${sickReportsCheckError.message}`)
      }

      console.log('📊 Gefundene sick_reports:', sickReports?.length || 0, sickReports)

      // Lösche meal_orders einzeln mit Bestätigung
      if (mealOrders && mealOrders.length > 0) {
        console.log('🗑️ Lösche meal_orders einzeln...')
        for (const order of mealOrders) {
          console.log(`🗑️ Lösche meal_order: ${order.id}`)
          const { error: deleteOrderError } = await supabase
            .from('meal_orders')
            .delete()
            .eq('id', order.id)

          if (deleteOrderError) {
            console.error('❌ Fehler beim Löschen der meal_order:', order.id, deleteOrderError)
            throw new Error(`Fehler beim Löschen der Essensbestellung ${order.id}: ${deleteOrderError.message}`)
          }
          console.log(`✅ meal_order ${order.id} gelöscht`)
        }

        // Nochmal prüfen, ob wirklich alle gelöscht wurden
        const { data: remainingOrders } = await supabase
          .from('meal_orders')
          .select('id')
          .eq('child_id', childId)

        console.log('🔍 Verbleibende meal_orders nach Löschung:', remainingOrders?.length || 0)
        
        if (remainingOrders && remainingOrders.length > 0) {
          throw new Error(`Es sind noch ${remainingOrders.length} Essensbestellungen vorhanden, die nicht gelöscht werden konnten.`)
        }
      }

      // Lösche sick_reports einzeln mit Bestätigung
      if (sickReports && sickReports.length > 0) {
        console.log('🗑️ Lösche sick_reports einzeln...')
        for (const report of sickReports) {
          console.log(`🗑️ Lösche sick_report: ${report.id}`)
          const { error: deleteReportError } = await supabase
            .from('sick_reports')
            .delete()
            .eq('id', report.id)

          if (deleteReportError) {
            console.error('❌ Fehler beim Löschen der sick_report:', report.id, deleteReportError)
            throw new Error(`Fehler beim Löschen der Krankmeldung ${report.id}: ${deleteReportError.message}`)
          }
          console.log(`✅ sick_report ${report.id} gelöscht`)
        }

        // Nochmal prüfen, ob wirklich alle gelöscht wurden
        const { data: remainingReports } = await supabase
          .from('sick_reports')
          .select('id')
          .eq('child_id', childId)

        console.log('🔍 Verbleibende sick_reports nach Löschung:', remainingReports?.length || 0)
        
        if (remainingReports && remainingReports.length > 0) {
          throw new Error(`Es sind noch ${remainingReports.length} Krankmeldungen vorhanden, die nicht gelöscht werden konnten.`)
        }
      }

      // Finale Prüfung vor dem Löschen des Kindes
      console.log('🔍 Finale Prüfung aller abhängigen Datensätze...')
      const { data: finalMealOrders } = await supabase
        .from('meal_orders')
        .select('id')
        .eq('child_id', childId)

      const { data: finalSickReports } = await supabase
        .from('sick_reports')
        .select('id')
        .eq('child_id', childId)

      if ((finalMealOrders && finalMealOrders.length > 0) || (finalSickReports && finalSickReports.length > 0)) {
        throw new Error(`Finale Prüfung fehlgeschlagen: Es sind noch abhängige Datensätze vorhanden (meal_orders: ${finalMealOrders?.length || 0}, sick_reports: ${finalSickReports?.length || 0})`)
      }

      // Jetzt das Kind löschen
      console.log('🗑️ Lösche Kind...')
      const { error: childError } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)

      if (childError) {
        console.error('❌ Fehler beim Löschen des Kindes:', childError)
        throw new Error(`Fehler beim Löschen des Kindes: ${childError.message}`)
      }

      console.log('✅ Kind erfolgreich gelöscht')
      alert('Kind und alle zugehörigen Daten wurden erfolgreich gelöscht.')
      fetchData()

    } catch (error) {
      console.error('❌ Gesamtfehler beim Löschen:', error)
      alert('Fehler beim Löschen: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      fetchData()
    } else {
      alert('Fehler beim Ändern der Rolle: ' + error.message)
    }
  }

  const startEditProfile = (profile: Profile) => {
    setEditingProfile(profile.id)
    setEditName(profile.full_name || '')
    setEditPhone(profile.phone || '')
  }

  const cancelEditProfile = () => {
    setEditingProfile(null)
    setEditName('')
    setEditPhone('')
  }

  const saveProfileChanges = async (userId: string) => {
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: editName.trim(),
        phone: editPhone.trim() || null
      })
      .eq('id', userId)

    if (!error) {
      alert('Profil erfolgreich aktualisiert!')
      setEditingProfile(null)
      setEditName('')
      setEditPhone('')
      fetchData()
    } else {
      alert('Fehler beim Speichern: ' + error.message)
    }
    
    setLoading(false)
  }

  // Hilfsfunktion zum Hervorheben von Suchbegriffen
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
          Nutzerverwaltung
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
              placeholder="Suche nach Name, Telefonnummer oder Kindername..."
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

        <div className="mb-4 text-sm text-gray-600 flex items-center justify-between">
          <span>
            {searchTerm ? (
              <>
                {filteredProfiles.length} von {profiles.length} Nutzern gefunden
                {filteredProfiles.length === 0 && (
                  <span className="text-orange-600 ml-2">
                    - Keine Treffer für "{searchTerm}"
                  </span>
                )}
              </>
            ) : (
              `${profiles.length} Nutzer in der Datenbank`
            )}
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Alle anzeigen
            </button>
          )}
        </div>

        {/* Nutzer-Liste */}
        <div className="space-y-4">
          {filteredProfiles.map(profile => {
            const userChildren = getChildrenForUser(profile.id)
            const isEditing = editingProfile === profile.id
            
            return (
              <div key={profile.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {isEditing ? (
                        <div className="flex-1 space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                              placeholder="Vollständiger Name"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Telefonnummer
                            </label>
                            <input
                              type="tel"
                              value={editPhone}
                              onChange={(e) => setEditPhone(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded text-sm"
                              placeholder="z.B. +49 123 456789"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveProfileChanges(profile.id)}
                              disabled={loading}
                              className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-700 disabled:opacity-50"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={cancelEditProfile}
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs hover:bg-gray-300"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">
                              {highlightSearchTerm(profile.full_name || 'Kein Name', searchTerm)}
                            </h3>
                            {profile.phone && (
                              <p className="text-sm text-gray-600">
                                📞 {highlightSearchTerm(profile.phone, searchTerm)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => startEditProfile(profile)}
                            className="text-blue-600 hover:text-blue-700 text-xs px-3 py-1 rounded-lg border border-blue-300 hover:bg-blue-50"
                          >
                            ✏️ Bearbeiten
                          </button>
                        </>
                      )}
                      
                      <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                        disabled={isEditing}
                        className={`text-xs px-2 py-1 rounded border ${
                          profile.role === 'admin' 
                            ? 'bg-red-100 text-red-800 border-red-300' 
                            : 'bg-blue-100 text-blue-800 border-blue-300'
                        } ${isEditing ? 'opacity-50' : ''}`}
                      >
                        <option value="parent">Elternteil</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    
                    {/* Kinder */}
                    {userChildren.length > 0 ? (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Kinder:</h4>
                        <div className="space-y-2">
                          {userChildren.map(child => (
                            <div key={child.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <div>
                                <span className="font-medium text-gray-900">{highlightSearchTerm(child.name, searchTerm)}</span>
                                <span className="text-sm text-gray-600 ml-2">
                                  (geb. {new Date(child.birth_date).toLocaleDateString('de-DE')})
                                </span>
                                {child.allergies && (
                                  <span className="text-sm text-orange-600 ml-2">
                                    ⚠️ {highlightSearchTerm(child.allergies, searchTerm)}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleDeleteChild(child.id)}
                                className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
                              >
                                Löschen
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">Keine Kinder zugeordnet</p>
                    )}
                  </div>
                  
                  <div className="mt-4 md:mt-0 md:ml-4">
                    <button
                      onClick={() => {
                        setSelectedUserId(profile.id)
                        setShowAddChild(true)
                      }}
                      disabled={isEditing}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        isEditing 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      + Kind hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal: Kind hinzufügen */}
      {showAddChild && selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Kind hinzufügen
            </h3>
            <form onSubmit={handleAddChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Name des Kindes
                </label>
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Geburtsdatum
                </label>
                <input
                  type="date"
                  value={newChildBirthDate}
                  onChange={(e) => setNewChildBirthDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Allergien/Unverträglichkeiten (optional)
                </label>
                <textarea
                  value={newChildAllergies}
                  onChange={(e) => setNewChildAllergies(e.target.value)}
                  placeholder="z.B. Laktoseintoleranz, Nussallergie..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Hinzufügen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddChild(false)
                    setSelectedUserId('')
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hinweis für neue Nutzer */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Neue Nutzer anlegen:</h3>
        <p className="text-sm text-blue-800">
          1. Gehen Sie zum Supabase Dashboard → Authentication → Users<br/>
          2. Klicken Sie "Add user" und geben Sie E-Mail und Passwort ein<br/>
          3. Das Profil wird automatisch erstellt und erscheint hier<br/>
          4. Sie können dann die Rolle ändern und Kinder hinzufügen
        </p>
      </div>
    </div>
  )
}