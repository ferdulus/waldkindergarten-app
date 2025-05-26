import Navigation from '@/components/Navigation'
import AnkuendigungenList from '@/components/AnkuendigungenList'

export default function AnkuendigungenPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        <AnkuendigungenList />
      </div>
    </div>
  )
}