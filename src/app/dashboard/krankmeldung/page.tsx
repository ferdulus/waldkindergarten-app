import Navigation from '@/components/Navigation'
import KrankmeldungForm from '@/components/KrankmeldungForm'

export default function KrankmeldungPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <KrankmeldungForm />
      </div>
    </div>
  )
}