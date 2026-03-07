'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Bug, Lightbulb, FileText } from 'lucide-react'
import { useTranslations } from '@/lib/hooks/use-translations'

export default function ReportPage() {
  const t = useTranslations()
  const f = t.forms

  const REPORT_TYPES: { value: string; Icon: React.ComponentType<{ className?: string }>; label: string }[] = [
    { value: 'bug', Icon: Bug, label: f.reportTypeBug },
    { value: 'suggestion', Icon: Lightbulb, label: f.reportTypeSuggestion },
    { value: 'other', Icon: FileText, label: f.reportTypeOther },
  ]

  const [type, setType] = useState('bug')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description, email: email || undefined }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al enviar')
      }

      setSent(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-lg">
        {sent ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">{f.reportThankYou}</h2>
              <p className="text-sm text-gray-500 mb-6">
                {f.reportReceived}
              </p>
              <Button onClick={() => { setSent(false); setDescription(''); setEmail('') }} variant="outline" size="sm">
                {f.reportSendAnother}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{f.reportTitle}</CardTitle>
              <CardDescription>
                {f.reportDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label>{f.reportTypeLabel}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {REPORT_TYPES.map((rt) => (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() => setType(rt.value)}
                        className={`p-3 rounded-lg border-2 text-center transition ${
                          type === rt.value
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <rt.Icon className="h-5 w-5 mx-auto mb-1 text-gray-600" />
                        <span className="text-[11px] font-medium leading-tight block">{rt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{f.reportDescLabel}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    placeholder={f.reportDescPlaceholder}
                    rows={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{f.reportEmailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? f.reportSubmitting : f.reportSubmit}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
