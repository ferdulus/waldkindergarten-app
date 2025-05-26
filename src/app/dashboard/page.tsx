'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/Navigation'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const cards = [
    {
      href: '/dashboard/essen',
      icon: '🍽️',
      title: 'Essensbestellung',
      description: 'Bestellen Sie das Mittagessen für Ihr Kind'
    },
    {
      href: '/dashboard/krankmeldung',
      icon: '🤒',
      title: 'Krankmeldung',
      description: 'Melden Sie Ihr Kind krank'
    },
    {
      href: '/dashboard/ankuendigungen',
      icon: '📢',
      title: 'Ankündigungen',
      description: 'Aktuelle Neuigkeiten'
    },
    {
      href: '/dashboard/termine',
      icon: '📅',
      title: 'Termine',
      description: 'Wichtige Termine und Veranstaltungen'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Willkommen im Waldkindergarten Portal
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link 
              key={card.href}
              href={card.href}
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 block group"
            >
              <h2 className="text-xl font-semibold mb-2 text-gray-900 group-hover:text-green-600 transition-colors">
                {card.icon} {card.title}
              </h2>
              <p className="text-gray-600">{card.description}</p>
              <div className="mt-4 text-green-600 text-sm font-medium group-hover:underline">
                Öffnen →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}