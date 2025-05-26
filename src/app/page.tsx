import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-800 mb-8">
          Waldkindergarten Wurzelzwerge
        </h1>
        <Link 
          href="/login"
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
        >
          Zur Anmeldung
        </Link>
      </div>
    </div>
  )
}