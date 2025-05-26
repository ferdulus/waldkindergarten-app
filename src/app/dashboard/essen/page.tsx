import Navigation from '@/components/Navigation'
import EssenKalender from '@/components/EssenKalender'

export default function EssenPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <EssenKalender />
      </div>
    </div>
  )
}