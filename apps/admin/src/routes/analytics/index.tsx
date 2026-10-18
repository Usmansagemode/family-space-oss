import { createFileRoute } from '@tanstack/react-router'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminLayout } from '@/components/AdminLayout'
import { PageHeader } from '@/components/shared/PageHeader'
import { usePlatformStats } from '@/hooks/usePlatformStats'

export const Route = createFileRoute('/analytics/')({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const { data: stats } = usePlatformStats()

  const planData = stats
    ? [
        { name: 'Free', value: stats.freeFamilies, fill: 'var(--color-muted-foreground)' },
        { name: 'Plus', value: stats.plusFamilies, fill: 'oklch(0.58 0.14 222)' },
        { name: 'Pro', value: stats.proFamilies, fill: 'oklch(0.6 0.15 285)' },
      ]
    : []

  const healthData = stats
    ? [
        { name: 'Active', families: stats.totalFamilies - stats.suspendedFamilies },
        { name: 'Suspended', families: stats.suspendedFamilies },
      ]
    : []

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <PageHeader title="Platform Analytics" description="High-level platform metrics" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Plan Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={planData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Family Health</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={healthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="families" fill="oklch(0.58 0.14 222)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {stats && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold">Summary</h2>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
              {[
                { label: 'Total Families', value: stats.totalFamilies },
                { label: 'Total Users', value: stats.totalUsers },
                { label: 'Pending Invites', value: stats.pendingInvites },
                { label: 'Banned Users', value: stats.bannedUsers },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-2xl font-bold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
