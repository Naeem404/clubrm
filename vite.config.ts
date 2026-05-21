/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'

// ─── Shared helpers (mirror of api/stats.ts) ─────────────────
function groupCount(items: any[], key: string) {
  const map: Record<string, number> = {}
  for (const item of items) {
    const v = String(item[key] ?? 'Unknown')
    map[v] = (map[v] || 0) + 1
  }
  const total = items.length || 1
  return Object.entries(map).map(([label, count]) => ({
    label,
    count,
    percentage: Math.round((count / total) * 1000) / 10,
  }))
}

function buildCategorySpend(allExpenses: any[], totalBudget: number) {
  const spent: Record<string, number> = {}
  for (const e of allExpenses) {
    if (e.status === 'approved') {
      spent[e.category] = (spent[e.category] || 0) + Number(e.amount)
    }
  }
  const totalSpent = Object.values(spent).reduce((a, b) => a + b, 0)
  return Object.keys(spent).map((name) => {
    const catSpent = spent[name]
    const allocShare = totalSpent > 0 ? (catSpent / totalSpent) * 1.5 : 0.25
    const allocated = Math.round(totalBudget * Math.min(allocShare, 0.4))
    const status: 'good' | 'warning' | 'critical' =
      catSpent > allocated ? 'critical' : catSpent > allocated * 0.85 ? 'warning' : 'good'
    return { name, allocated, spent: catSpent, status }
  })
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'dashboard-api',
        configureServer(server) {
          server.middlewares.use(async (req: any, res: any, next: any) => {
            if (req.url === '/api/dashboard/stats') {
              try {
                const authHeader = req.headers['authorization']
                const token =
                  authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
                    ? authHeader.split(' ')[1]
                    : null

                const supabase = createClient(env.VITE_SUPABASE_URL || '', env.VITE_SUPABASE_ANON_KEY || '', {
                  global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                })

                const now = new Date()

                // ── Members ──────────────────────────────────
                const { data: membersData } = await supabase
                  .from('members')
                  .select('id, name, role, status, department, year, join_date, tasks_completed, events_attended')
                const allMembers = membersData || []
                const totalMembers = allMembers.length
                const activeMembers = allMembers.filter((m: any) => m.status === 'active').length
                const termStart = new Date(now.getFullYear(), now.getMonth() - 4, 1)
                const newThisTerm = allMembers.filter((m: any) => new Date(m.join_date) >= termStart).length
                const avgTasksCompleted = totalMembers > 0
                  ? Math.round((allMembers.reduce((s: number, m: any) => s + (m.tasks_completed || 0), 0) / totalMembers) * 10) / 10 : 0
                const avgEventsAttended = totalMembers > 0
                  ? Math.round((allMembers.reduce((s: number, m: any) => s + (m.events_attended || 0), 0) / totalMembers) * 10) / 10 : 0
                const recentJoiners = [...allMembers]
                  .sort((a: any, b: any) => new Date(b.join_date).getTime() - new Date(a.join_date).getTime())
                  .slice(0, 3).map((m: any) => ({ name: m.name, role: m.role, department: m.department, joinDate: m.join_date }))
                const membersInsight = {
                  totalMembers, activeMembers, newThisTerm,
                  retentionRate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 100,
                  avgTasksCompleted, avgEventsAttended,
                  recentJoiners,
                  byDepartment: groupCount(allMembers, 'department'),
                  byYear: groupCount(allMembers, 'year'),
                  byRole: groupCount(allMembers, 'role'),
                  inactiveWarnings: allMembers.filter((m: any) => m.status !== 'active').slice(0, 3)
                    .map((m: any) => ({ name: m.name, lastActive: m.join_date, reason: `Status: ${m.status}` })),
                }

                // ── Budget ───────────────────────────────────
                const { data: budgetRow } = await supabase.from('budgets').select('total_budget').limit(1).single()
                const totalBudget = budgetRow ? Number(budgetRow.total_budget) : 18000
                const { data: allExpenses } = await supabase.from('expenses').select('*')
                const expenses = allExpenses || []
                const { data: allReimbursements } = await supabase.from('reimbursements').select('*')
                const reimbursements = allReimbursements || []
                const approvedExpenses = expenses.filter((e: any) => e.status === 'approved')
                const spentBudget = approvedExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0)
                const remainingBudget = totalBudget - spentBudget
                const percentRemaining = totalBudget > 0 ? Math.round((remainingBudget / totalBudget) * 100) : 100
                const monthlySpend: { label: string; value: number }[] = []
                for (let i = 5; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
                  const label = d.toLocaleString('en-US', { month: 'short' })
                  const value = approvedExpenses.filter((e: any) => {
                    const ed = new Date(e.date)
                    return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth()
                  }).reduce((s: number, e: any) => s + Number(e.amount), 0)
                  monthlySpend.push({ label, value })
                }
                const monthValues = monthlySpend.map((m) => m.value).filter((v) => v > 0)
                const burnRate = monthValues.length > 0 ? Math.round(monthValues.reduce((a, b) => a + b, 0) / monthValues.length) : 0
                const targetBurnRate = Math.round(totalBudget / 10)
                const budgetInsight = {
                  totalBudget, spent: spentBudget, remaining: remainingBudget,
                  percentRemaining, burnRate, targetBurnRate,
                  projectedRunway: burnRate > 0 ? `${(remainingBudget / burnRate).toFixed(1)} months` : 'N/A',
                  monthlySpend,
                  categories: buildCategorySpend(expenses, totalBudget),
                  biggestExpenses: [...approvedExpenses].sort((a: any, b: any) => Number(b.amount) - Number(a.amount)).slice(0, 5)
                    .map((e: any) => ({ description: e.description, amount: Number(e.amount), date: e.date, category: e.category })),
                  alerts: [
                    percentRemaining < 20 ? { label: 'Budget critically low', status: 'critical', detail: `Only ${percentRemaining}% remaining` } :
                    percentRemaining < 40 ? { label: 'Budget below 40%', status: 'warning', detail: `${percentRemaining}% remaining` } :
                    { label: 'Budget healthy', status: 'good', detail: `${percentRemaining}% remaining ($${remainingBudget.toLocaleString()})` },
                    ...(burnRate > targetBurnRate * 1.2 ? [{ label: 'Burn rate above target', status: 'warning', detail: `$${burnRate}/mo vs $${targetBurnRate}/mo` }] : []),
                  ],
                }

                // ── Events ───────────────────────────────────
                const { data: allEventsData } = await supabase.from('events').select('id, title, start_date, end_date, capacity, registered, status, location')
                const eventsData = allEventsData || []
                const upcomingEvents = eventsData.filter((e: any) => new Date(e.start_date) >= now)
                const eventDetails = upcomingEvents.map((e: any) => {
                  const reg = e.registered || 0, cap = e.capacity || 0
                  const regPct = cap > 0 ? reg / cap : 1
                  const risks: string[] = cap > 0 && regPct < 0.5 ? [`Only ${Math.round(regPct * 100)}% registered`] : []
                  return { title: e.title,
                    date: new Date(e.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    registered: reg, capacity: cap, volunteersFilled: 0, volunteersNeeded: 0,
                    status: regPct >= 0.7 ? 'on_track' : regPct >= 0.4 ? 'at_risk' : 'critical', risks }
                })
                const onTrackEvents = eventsData.filter((e: any) => { const r = e.registered || 0, c = e.capacity || 0; return c === 0 || r / c >= 0.5 }).length
                const eventsInsight = {
                  totalUpcoming: upcomingEvents.length,
                  avgRegistrationRate: eventDetails.length > 0 ? Math.round(eventDetails.reduce((s: number, e: any) => s + (e.capacity > 0 ? (e.registered / e.capacity) * 100 : 100), 0) / eventDetails.length) : 100,
                  volunteerCoverageRate: 100, events: eventDetails,
                  trend: monthlySpend.map((m) => ({ label: m.label, value: 70 })),
                  strengths: upcomingEvents.length > 0 ? [`${upcomingEvents.length} upcoming event(s) scheduled`] : ['No upcoming events'],
                  concerns: eventDetails.filter((e: any) => e.status !== 'on_track').map((e: any) => `${e.title}: ${e.risks.join(', ')}`),
                }

                // ── Tasks ─────────────────────────────────────
                const { data: allTasks } = await supabase.from('tasks').select('id, title, status, due_date, priority')
                const tasks = allTasks || []
                const totalTasks = tasks.length
                const completedTasks = tasks.filter((t: any) => t.status === 'done').length
                const overdueTasks = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'done')

                // ── Risks ─────────────────────────────────────
                const totalPending =
                  expenses.filter((e: any) => e.status === 'pending').reduce((s: number, e: any) => s + Number(e.amount), 0) +
                  reimbursements.filter((r: any) => r.status === 'pending').reduce((s: number, r: any) => s + Number(r.amount), 0)
                const risksList: any[] = []
                if (overdueTasks.length > 0) risksList.push({
                  title: `${overdueTasks.length} overdue task(s)`, category: 'tasks',
                  severity: overdueTasks.length >= 3 ? 'high' : 'medium',
                  description: `Tasks past due: ${overdueTasks.map((t: any) => t.title).join(', ')}`,
                  recommendation: 'Review and reassign overdue tasks immediately.',
                  affectedEntity: `${overdueTasks.length} task(s)`, detectedAt: now.toISOString().split('T')[0],
                })
                if (totalPending > 500) risksList.push({
                  title: 'High pending approvals', category: 'budget',
                  severity: totalPending > 2000 ? 'high' : 'medium',
                  description: `$${totalPending.toFixed(0)} in pending approvals.`,
                  recommendation: 'Review the approvals queue.',
                  affectedEntity: 'Finance', detectedAt: now.toISOString().split('T')[0],
                })
                const risksInsight = {
                  totalRisks: risksList.length,
                  highCount: risksList.filter((r) => r.severity === 'high').length,
                  mediumCount: risksList.filter((r) => r.severity === 'medium').length,
                  lowCount: 0, resolvedThisWeek: 0, trendingUp: risksList.length > 2, risks: risksList,
                }

                // ── Approvals ─────────────────────────────────
                const pendingExpenses = expenses.filter((e: any) => e.status === 'pending')
                const pendingReimbs = reimbursements.filter((r: any) => r.status === 'pending')
                const approvalItems = [
                  ...pendingExpenses.slice(0, 5).map((e: any) => ({
                    id: e.id, type: 'finance', title: e.description, submittedBy: e.submitted_by,
                    submittedAt: e.date, daysWaiting: Math.floor((now.getTime() - new Date(e.date).getTime()) / 86400000),
                    priority: Number(e.amount) > 500 ? 'high' : 'medium', amount: Number(e.amount),
                    description: `${e.category} expense — $${e.amount}`,
                  })),
                  ...pendingReimbs.slice(0, 3).map((r: any) => ({
                    id: r.id, type: 'finance', title: r.description, submittedBy: r.submitted_by,
                    submittedAt: r.date, daysWaiting: Math.floor((now.getTime() - new Date(r.date).getTime()) / 86400000),
                    priority: Number(r.amount) > 200 ? 'high' : 'medium', amount: Number(r.amount),
                    description: `Reimbursement — $${r.amount}`,
                  })),
                ]
                const approvalsInsight = {
                  totalPending: approvalItems.length,
                  avgWaitDays: approvalItems.length > 0 ? Math.round(approvalItems.reduce((s, a) => s + a.daysWaiting, 0) / approvalItems.length) : 0,
                  oldestItem: approvalItems.length > 0 ? Math.max(...approvalItems.map((a) => a.daysWaiting)) : 0,
                  byType: [{ type: 'Finance', count: pendingExpenses.length }, { type: 'Reimbursement', count: pendingReimbs.length }],
                  items: approvalItems,
                  recentlyApproved: [...approvedExpenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 3).map((e: any) => ({ title: e.description, approvedAt: e.date, type: 'Finance' })),
                }

                // ── Org Health ────────────────────────────────
                const stats = { members: totalMembers, activeMembers, totalBudget, spentBudget, onTrackEvents, totalEvents: eventsData.length, completedTasks, totalTasks }
                const memberScoreN = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 25) : 25
                const budgetRatioN = totalBudget > 0 ? spentBudget / totalBudget : 0
                const budgetScoreN = Math.round((budgetRatioN <= 1 ? 1 - budgetRatioN : Math.max(0, 1 - (budgetRatioN - 1) * 2)) * 25)
                const eventScoreN = eventsData.length > 0 ? Math.round((onTrackEvents / eventsData.length) * 25) : 25
                const taskScoreN = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 25) : 25
                const totalScore = memberScoreN + budgetScoreN + eventScoreN + taskScoreN
                const orgHealthInsight = {
                  overallScore: totalScore, previousScore: Math.max(0, totalScore - 5),
                  trend: monthlySpend.map((m, i) => ({ label: m.label, value: Math.min(100, totalScore - 8 + i * 2) })),
                  breakdowns: [
                    { category: 'Member Engagement', score: memberScoreN, maxScore: 25,
                      status: memberScoreN >= 20 ? 'good' : memberScoreN >= 12 ? 'warning' : 'critical',
                      insights: [{ label: `${activeMembers}/${totalMembers} active`, status: activeMembers / (totalMembers || 1) >= 0.8 ? 'good' : 'warning', detail: `${Math.round((activeMembers / (totalMembers || 1)) * 100)}% active ratio` }] },
                    { category: 'Financial Health', score: budgetScoreN, maxScore: 25,
                      status: budgetScoreN >= 18 ? 'good' : budgetScoreN >= 10 ? 'warning' : 'critical',
                      insights: [{ label: `${percentRemaining}% remaining`, status: percentRemaining >= 40 ? 'good' : 'warning', detail: `$${spentBudget.toLocaleString()} spent of $${totalBudget.toLocaleString()}` }] },
                    { category: 'Event Delivery', score: eventScoreN, maxScore: 25,
                      status: eventScoreN >= 18 ? 'good' : eventScoreN >= 10 ? 'warning' : 'critical',
                      insights: [{ label: `${onTrackEvents}/${eventsData.length} on track`, status: eventScoreN >= 18 ? 'good' : 'warning', detail: 'Based on registration ratio' }] },
                    { category: 'Task Completion', score: taskScoreN, maxScore: 25,
                      status: taskScoreN >= 18 ? 'good' : taskScoreN >= 10 ? 'warning' : 'critical',
                      insights: [{ label: `${completedTasks}/${totalTasks} done`, status: taskScoreN >= 18 ? 'good' : 'warning', detail: `${overdueTasks.length} overdue` }] },
                  ],
                  topStrengths: [
                    activeMembers > totalMembers * 0.8 ? 'Strong member engagement' : null,
                    percentRemaining > 50 ? 'Budget well under control' : null,
                    overdueTasks.length === 0 ? 'No overdue tasks' : null,
                  ].filter(Boolean),
                  topConcerns: [
                    overdueTasks.length > 0 ? `${overdueTasks.length} overdue task(s) need attention` : null,
                    percentRemaining < 30 ? 'Budget running low' : null,
                  ].filter(Boolean),
                }

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  stats, score: totalScore,
                  insights: { orgHealth: orgHealthInsight, members: membersInsight, budget: budgetInsight, events: eventsInsight, risks: risksInsight, approvals: approvalsInsight },
                }))
              } catch (err) {
                console.error('Vite Middleware API Error:', err)
                res.statusCode = 500
                res.end(JSON.stringify({ error: 'Failed to fetch stats from Supabase' }))
              }
              return
            }
            next()
          })
        },
      },
    ],
    server: {
      allowedHosts: ['.ngrok-free.dev'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true, 
      environment: 'happy-dom',
      include: ['test/**/*.test.{ts,tsx}'],
      setupFiles: ['./test/setup.ts'],
      server: {
        deps: {
          inline: [/html-encoding-sniffer/, /@exodus\/bytes/],
        },
      },
    },
  }
})