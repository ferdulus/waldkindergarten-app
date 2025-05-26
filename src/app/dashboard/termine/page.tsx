import Navigation from '@/components/Navigation'
import TermineKalender from '@/components/TermineKalender'

export default function TerminePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <TermineKalender />
      </div>
    </div>
  )
}