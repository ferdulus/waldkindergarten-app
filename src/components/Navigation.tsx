'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface UserProfile {
  role: string
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const menuItems = [
    { href: '/dashboard', label: 'Übersicht', icon: '🏠' },
    { href: '/dashboard/essen', label: 'Essensbestellung', icon: '🍽️' },
    { href: '/dashboard/krankmeldung', label: 'Krankmeldung', icon: '🤒' },
    { href: '/dashboard/ankuendigungen', label: 'Ankündigungen', icon: '📢' },
    { href: '/dashboard/termine', label: 'Termine', icon: '📅' },
  ]

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('🔍 Navigation - Current user:', user)

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          console.log('🔍 Navigation - Profile query result:', { profile })
          
          if (profile) {
            setUserProfile(profile)
            console.log('🔍 Navigation - User role:', profile.role)
            console.log('🔍 Navigation - Is admin?', profile.role === 'admin')
          }
        }
      } catch (err) {
        console.error('❌ Navigation - Error fetching user:', err)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = userProfile?.role === 'admin'
  console.log('🔍 Navigation - Final isAdmin check:', isAdmin, 'loading:', loading)

  return (
    <nav className="bg-green-800 text-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center h-16">
          <div className="flex space-x-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 hover:text-green-200 transition-colors ${
                  pathname === item.href ? 'text-green-200 font-bold' : ''
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            {/* Admin Button - Temporär immer sichtbar für Debug */}
            {!loading && (
              <Link
                href="/admin"
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors font-semibold"
              >
                🔧 Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex justify-between items-center h-16">
            <div className="font-semibold text-lg">
              Waldkindergarten
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="pb-4 border-t border-green-700">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 hover:bg-green-700 transition-colors ${
                    pathname === item.href ? 'bg-green-700 font-bold' : ''
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              {/* Admin Button für Mobile - Temporär immer sichtbar */}
              {!loading && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 bg-red-600 hover:bg-red-700 transition-colors font-semibold"
                >
                  <span className="text-xl">🔧</span>
                  <span>Admin</span>
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 hover:bg-green-700 transition-colors border-t border-green-700 mt-2"
              >
                Abmelden
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}