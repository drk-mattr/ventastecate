import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { ReportForm } from '@/components/report/report-form'

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardContent className="pt-6">
            <ReportForm />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
