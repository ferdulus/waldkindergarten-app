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
  parent_id: string
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
  relationships: ParentChildRelationship[]
}

export default function FamilienVerwaltung() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [children, setChildren] = useState<ChildWithParents[]>([])
  const [relationships, setRelationships] = useState<ParentChildRelationship[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredChildren, setFilteredChildren] = useState<ChildWithParents[]>([])
  
  // Modal States
  const [showAddChild, setShowAddChild] = useState(false)
  const [showAddParent, setShowAddParent] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  
  // Form States
  const [newChildName, setNewChildName] = useState('')
  const [newChildBirthDate, setNewChildBirthDate] = useState('')
  const [newChildAllergies, setNewChildAllergies] = useState('')
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Filter-Logik für die Suche
    if (!searchTerm.trim()) {
      setFilteredChildren(children)
    } else {
      const filtered = children.filter(child => {
        const searchLower = searchTerm.toLowerCase()
        
        // Suche in Kindname
        const childNameMatch = child.name.toLowerCase().includes(searchLower)
        
        // Suche in Elternnamen
        const parentNameMatch = child.parents.some(parent => 
          parent.full_name?.toLowerCase().includes(searchLower)
        )
        
        // Suche in Telefonnummern
        const phoneMatch = child.parents.some(parent => 
          parent.phone?.toLowerCase().includes(searchLower)
        )
        
        return childNameMatch || parentNameMatch || phoneMatch
      })
      setFilteredChildren(filtered)
    }
  }, [children, searchTerm])

  const fetchData = async () => {
    try {
      // Hole alle Profile (nur Eltern)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'parent')
        .order('full_name')

      if (profilesError) throw profilesError

      // Hole alle Kinder
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('*')
        .order('name')

      if (childrenError) throw childrenError

      // Hole alle Eltern-Kind-Beziehungen
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('parent_child_relationships')
        .select('*')

      // Falls die Tabelle noch nicht existiert, verwende Fallback
      const relationships = relationshipsError ? [] : (relationshipsData || [])

      // Kombiniere Daten
      const childrenWithParents: ChildWithParents[] = (childrenData || []).map(child => {
        // Finde alle Eltern für dieses Kind
        const childRelationships = relationships.filter(rel => rel.child_id === child.id)
        const parentProfiles = childRelationships.map(rel => 
          profilesData?.find(profile => profile.id === rel.parent_id)
        ).filter(Boolean) as Profile[]

        // Fallback: Wenn keine Beziehungen existieren, verwende parent_id
        if (parentProfiles.length === 0 && child.parent_id) {
          const fallbackParent = profilesData?.find(profile => profile.id === child.parent_id)
          if (fallbackParent) {
            parentProfiles.push(fallbackParent)
          }
        }

        return {
          ...child,
          parents: parentProfiles,
          relationships: childRelationships
        }
      })

      setProfiles(profilesData || [])
      setChildren(childrenWithParents)
      setRelationships(relationships)
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedParentIds.length === 0) {
      alert('Bitte wählen Sie mindestens einen Elternteil aus')
      return
    }
    
    setLoading(true)

    try {
      // Kind erstellen
      const { data: childData, error: childError } = await supabase
        .from('children')
        .insert({
          name: newChildName,
          birth_date: newChildBirthDate,
          allergies: newChildAllergies || null,
          parent_id: selectedParentIds[0] // Für Rückwärtskompatibilität
        })
        .select()
        .single()

      if (childError) throw childError

      // Eltern-Kind-Beziehungen erstellen
      const relationshipInserts = selectedParentIds.map(parentId => ({
        parent_id: parentId,
        child_id: childData.id,
        relationship_type: 'parent',
        can_order_meals: true,
        can_report_sick: true,
        can_view_info: true
      }))

      const { error: relationshipError } = await supabase
        .from('parent_child_relationships')
        .insert(relationshipInserts)

      if (relationshipError) {
        console.warn('Beziehungen konnten nicht erstellt werden:', relationshipError)
        // Nicht kritisch, da Fallback über parent_id existiert
      }

      alert('Kind erfolgreich angelegt!')
      setShowAddChild(false)
      setNewChildName('')
      setNewChildBirthDate('')
      setNewChildAllergies('')
      setSelectedParentIds([])
      fetchData()
    } catch (error) {
      alert('Fehler beim Anlegen: ' + (error as Error).message)
    }
    
    setLoading(false)
  }

  const addParentToChild = async (childId: string, parentId: string) => {
    try {
      const { error } = await supabase
        .from('parent_child_relationships')
        .insert({
          parent_id: parentId,
          child_id: childId,
          relationship_type: 'parent',
          can_order_meals: true,
          can_report_sick: true,
          can_view_info: true
        })

      if (!error) {
        alert('Elternteil erfolgreich hinzugefügt!')
        fetchData()
      } else {
        alert('Fehler beim Hinzufügen: ' + error.message)
      }
    } catch (error) {
      alert('Fehler: ' + (error as Error).message)
    }
  }

  const removeParentFromChild = async (relationshipId: string) => {
    if (!confirm('Möchten Sie diese Eltern-Kind-Beziehung wirklich entfernen?')) return

    try {
      const { error } = await supabase
        .from('parent_child_relationships')
        .delete()
        .eq('id', relationshipId)

      if (!error) {
        alert('Beziehung erfolgreich entfernt!')
        fetchData()
      } else {
        alert('Fehler beim Entfernen: ' + error.message)
      }
    } catch (error) {
      alert('Fehler: ' + (error as Error).message)
    }
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
          Familienverwaltung
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
              placeholder="Suche nach Kind oder Elternteil..."
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

        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {searchTerm ? (
              <>
                {filteredChildren.length} von {children.length} Kindern gefunden
                {filteredChildren.length === 0 && (
                  <span className="text-orange-600 ml-2">
                    - Keine Treffer für "{searchTerm}"
                  </span>
                )}
              </>
            ) : (
              `${children.length} Kinder in der Datenbank`
            )}
          </span>
          <button
            onClick={() => setShowAddChild(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            + Kind hinzufügen
          </button>
        </div>

        {/* Kinder-Liste */}
        <div className="space-y-4">
          {filteredChildren.map(child => (
            <div key={child.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col md:flex-row justify-between items-start">
                <div className="flex-1">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {highlightSearchTerm(child.name, searchTerm)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Geboren: {new Date(child.birth_date).toLocaleDateString('de-DE')}
                    </p>
                    {child.allergies && (
                      <p className="text-sm text-orange-600">
                        ⚠️ Allergien: {highlightSearchTerm(child.allergies, searchTerm)}
                      </p>
                    )}
                  </div>

                  {/* Eltern */}
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Elternteile ({child.parents.length}):
                    </h4>
                    {child.parents.length > 0 ? (
                      <div className="space-y-2">
                        {child.parents.map((parent, index) => {
                          const relationship = child.relationships.find(rel => rel.parent_id === parent.id)
                          return (
                            <div key={parent.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {highlightSearchTerm(parent.full_name || 'Kein Name', searchTerm)}
                                </div>
                                {parent.phone && (
                                  <div className="text-sm text-gray-600">
                                    📞 {highlightSearchTerm(parent.phone, searchTerm)}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500">
                                  Berechtigt zu: Essen bestellen, Krankmeldungen, Info-Zugriff
                                </div>
                              </div>
                              {relationship && (
                                <button
                                  onClick={() => removeParentFromChild(relationship.id)}
                                  className="text-red-600 hover:text-red-700 text-sm ml-2 px-2 py-1 rounded hover:bg-red-50"
                                >
                                  Entfernen
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Keine Elternteile zugeordnet</p>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 md:mt-0 md:ml-4">
                  <button
                    onClick={() => {
                      setSelectedChildId(child.id)
                      setShowAddParent(true)
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    + Elternteil hinzufügen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Kind hinzufügen */}
      {showAddChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Elternteile auswählen (mindestens einen)
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {profiles.map(profile => (
                    <label key={profile.id} className="flex items-center space-x-2 p-1">
                      <input
                        type="checkbox"
                        checked={selectedParentIds.includes(profile.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParentIds([...selectedParentIds, profile.id])
                          } else {
                            setSelectedParentIds(selectedParentIds.filter(id => id !== profile.id))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">
                        {profile.full_name || 'Kein Name'}
                        {profile.phone && <span className="text-gray-500"> ({profile.phone})</span>}
                      </span>
                    </label>
                  ))}
                </div>
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
                    setSelectedParentIds([])
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

      {/* Modal: Elternteil hinzufügen */}
      {showAddParent && selectedChildId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Elternteil hinzufügen
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {profiles
                .filter(profile => {
                  const child = children.find(c => c.id === selectedChildId)
                  return !child?.parents.some(parent => parent.id === profile.id)
                })
                .map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      addParentToChild(selectedChildId, profile.id)
                      setShowAddParent(false)
                      setSelectedChildId('')
                    }}
                    className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <div className="font-medium">{profile.full_name || 'Kein Name'}</div>
                    {profile.phone && (
                      <div className="text-sm text-gray-600">📞 {profile.phone}</div>
                    )}
                  </button>
                ))}
            </div>
            <div className="mt-4">
              <button
                onClick={() => {
                  setShowAddParent(false)
                  setSelectedChildId('')
                }}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 