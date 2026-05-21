export type SponsorTier = "platinum" | "gold" | "silver" | "bronze" | "prospect"
export type SponsorStatus = "active" | "pending" | "churned" | "prospect"
export type InteractionType = "email" | "call" | "meeting" | "event" | "proposal"

export interface SponsorContact {
  id: string
  name: string
  title: string
  email: string
  phone: string
  organization: string;
  tags: string[];
  createdAt: string;
  linkedIn?: string
}

export interface Interaction {
  id: string
  type: InteractionType
  date: string
  summary: string
  contactId: string
}

export interface Sponsor {
  id: string
  company: string
  logo?: string
  tier: SponsorTier
  status: SponsorStatus

  amount: number
  startDate: string
  endDate?: string
  contacts: SponsorContact[]
  interactions: Interaction[]
  notes?: string
  industry: string
}

export const TIER_CONFIG: Record<SponsorTier, { label: string; color: string; bg: string }> = {
  platinum: { label: "Platinum", color: "text-slate-300", bg: "bg-slate-300/20 border-slate-300/30" },
  gold: { label: "Gold", color: "text-amber-400", bg: "bg-amber-400/20 border-amber-400/30" },
  silver: { label: "Silver", color: "text-slate-400", bg: "bg-slate-400/20 border-slate-400/30" },
  bronze: { label: "Bronze", color: "text-orange-400", bg: "bg-orange-400/20 border-orange-400/30" },
  prospect: { label: "Prospect", color: "text-blue-400", bg: "bg-blue-400/20 border-blue-400/30" },
}

export const STATUS_CONFIG: Record<SponsorStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400" },
  pending: { label: "Pending", color: "bg-amber-500/20 text-amber-400" },
  churned: { label: "Churned", color: "bg-red-500/20 text-red-400" },
  prospect: { label: "Prospect", color: "bg-blue-500/20 text-blue-400" },
}

export const INTERACTION_ICONS: Record<InteractionType, string> = {
  email: "Mail",
  call: "Phone",
  meeting: "Users",
  event: "Calendar",
  proposal: "FileText",
}

export const INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Consulting",
  "Food & Beverage",
  "Retail",
  "Media & Entertainment",
  "Healthcare",
  "Education",
  "Non-Profit",
  "Other",
] as const

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(amount)
}

export const SEED_SPONSORS: Sponsor[] = [
  {
    id: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    company: "TechNova Solutions",
    tier: "platinum",
    status: "active",
    amount: 5000,
    startDate: "2025-09-01",
    endDate: "2026-08-31",
    industry: "Technology",
    notes: "Interested in co-hosting a hackathon in Winter 2026.",
    contacts: [
      { id: "e1f1a2b3-c4d5-4e6f-8a9b-0c1d2e3f4a5b", name: "Jennifer Wu", title: "Campus Relations Manager", email: "j.wu@technova.com", phone: "(416) 555-1001", organization: "TechNova Solutions", tags: ["University Relations", "Hackathon"], createdAt: "2025-09-15", linkedIn: "https://linkedin.com/in/jenniferwu" },
      { id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6g", name: "Raj Patel", title: "VP Marketing", email: "r.patel@technova.com", phone: "(416) 555-1002", organization: "TechNova Solutions", tags: ["Marketing", "Decision Maker"], createdAt: "2025-09-15", linkedIn: "https://linkedin.com/in/rajpatel" },
    ],
    interactions: [
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", type: "meeting", date: "2026-02-10", summary: "Discussed hackathon sponsorship details and brand placement.", contactId: "e1f1a2b3-c4d5-4e6f-8a9b-0c1d2e3f4a5b" },
      { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", type: "email", date: "2026-02-05", summary: "Sent sponsorship renewal proposal for 2026-27.", contactId: "e1f1a2b3-c4d5-4e6f-8a9b-0c1d2e3f4a5b" },
      { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", type: "call", date: "2026-01-20", summary: "Initial check-in for new term.", contactId: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6g" },
    ],
  },
  {
    id: "2f9a9412-1f4f-4a34-a3f2-1d5d9c2a6327",
    company: "Global Bank Corp",
    tier: "gold",
    status: "active",
    amount: 3000,
    startDate: "2025-10-15",
    endDate: "2026-10-14",
    industry: "Finance & Banking",
    notes: "Prefer email communication for initial outreach.",
    contacts: [
      { id: "d3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7g", name: "Sarah Jenkins", title: "Global Talent Lead", email: "s.jenkins@globalbank.com", phone: "(416) 555-2001", organization: "Global Bank Corp", tags: ["Talent", "Recruitment"], createdAt: "2025-10-20" },
    ],
    interactions: [
      { id: "e4f5a6b7-c8d9-4e0f-1a2b-3c4d5e6f7g8h", type: "call", date: "2026-02-15", summary: "Talent acquisition strategy session.", contactId: "d3e4f5a6-b7c8-4d9e-0f1a-2b3c4d5e6f7g" },
    ],
  },
  {
    id: "3e5f2a1a-4b6c-4d8e-9f0a-1b2c3d4e5f6g",
    company: "Quantum Consulting",
    tier: "silver",
    status: "pending",
    amount: 1500,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    industry: "Consulting",
    contacts: [
      { id: "f5a6b7c8-d9e0-4f1a-2b3c-4d5e6f7g8h9i", name: "Anna Schmidt", title: "HR Director", email: "a.schmidt@quantum.io", phone: "(647) 555-3001", organization: "Quantum Consulting", tags: ["Recruiting", "HR"], createdAt: "2026-01-05" },
    ],
    interactions: [
      { id: "g6h7i8j9-k0l1-4m2n-3o4p-5q6r7s8t9u0v", type: "proposal", date: "2025-12-15", summary: "Sent silver tier sponsorship proposal.", contactId: "f5a6b7c8-d9e0-4f1a-2b3c-4d5e6f7g8h9i" },
    ],
  },
  {
    id: "4d6e1c2b-3a5f-4d8e-9f0a-1b2c3d4e5f6g",
    company: "Campus Eats Co.",
    tier: "bronze",
    status: "active",
    amount: 750,
    startDate: "2025-09-01",
    endDate: "2026-04-30",
    industry: "Food & Beverage",
    contacts: [
      { id: "h7i8j9k0-l1m2-4n3o-4p5q-6r7s8t9u0v1w", name: "Derek Chan", title: "Owner", email: "derek@campuseats.ca", phone: "(416) 555-4001", organization: "Campus Eats Co.", tags: ["Catering", "Local Vendor"], createdAt: "2025-09-05" },
    ],
    interactions: [],
  },
  {
    id: "5c7d1e2f-1a3b-4c5d-6e7f-8a9b0c1d2e3f",
    company: "Innovate Consulting",
    tier: "prospect",
    status: "prospect",
    amount: 0,
    startDate: "2026-02-15",
    industry: "Consulting",
    notes: "Warm lead from LinkedIn. Interested in recruiting pipeline.",
    contacts: [
      { id: "i8j9k0l1-m2n3-4o4p-5q6r-7s8t9u0v1w2x", name: "Samantha Green", title: "Talent Acquisition", email: "s.green@innovateconsulting.ca", phone: "(905) 555-5001", organization: "Innovate Consulting", tags: ["Potential Speaker", "Recruiting"], createdAt: "2026-02-15" },
    ],
    interactions: [],
  },
  {
    id: "6b5a4d3c-2e1f-4a0b-9c8d-7e6f5a4b3c2d",
    company: "UrbanPrint Media",
    tier: "gold",
    status: "churned",
    amount: 2500,
    startDate: "2024-09-01",
    endDate: "2025-08-31",
    industry: "Media & Entertainment",
    notes: "Budget cuts caused them to drop sponsorship. Keep warm for future.",
    contacts: [
      { id: "j9k0l1m2-n3o4-4p5q-6r7s-8t9u0v1w2x3y", name: "Karen Osei", title: "Partnerships Manager", email: "k.osei@urbanprint.ca", phone: "(416) 555-6001", organization: "UrbanPrint Media", tags: ["Past Sponsor"], createdAt: "2024-09-05" },
    ],
    interactions: [],
  },
]
