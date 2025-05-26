'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminNavigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const menuItems = [
    { href: '/admin', label: 'Übersicht', icon: '🏠' },
    { href: '/admin/nutzer', label: 'Nutzerverwaltung', icon: '👥' },
    { href: '/admin/familien', label: 'Familienverwaltung', icon: '👨‍👩‍👧‍👦' },
    { href: '/admin/ankuendigungen', label: 'Ankündigungen', icon: '📢' },
    { href: '/admin/essensbestellungen', label: 'Essensbestellungen', icon: '🍽️' },
    { href: '/admin/krankmeldungen', label: 'Krankmeldungen', icon: '🤒' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const goToUserArea = () => {
    router.push('/dashboard')
  }

  return (
    <nav className="bg-red-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center h-14">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🔧</span>
              <span className="font-bold text-lg">Admin-Bereich</span>
            </div>
            <div className="flex items-center space-x-6">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors ${
                    pathname === item.href ? 'bg-red-700 text-red-100' : 'text-red-200 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={goToUserArea}
              className="bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Nutzerbereich
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-900 hover:bg-red-800 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              Abmelden
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🔧</span>
              <span className="font-bold text-lg">Admin</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg
                className="h-5 w-5"
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

          {mobileMenuOpen && (
            <div className="pb-3 border-t border-red-700">
              <div className="pt-2 space-y-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors ${
                      pathname === item.href ? 'bg-red-700 text-red-100' : 'text-red-200'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="border-t border-red-700 mt-3 pt-3 space-y-1">
                <button
                  onClick={() => {
                    goToUserArea()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-700 hover:text-white transition-colors"
                >
                  Nutzerbereich
                </button>
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-700 hover:text-white transition-colors"
                >
                  Abmelden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}