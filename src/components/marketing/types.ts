export type CampaignStatus = "draft" | "active" | "completed" | "paused"
export type PostPlatform = "instagram" | "twitter" | "linkedin" | "tiktok" | "facebook"
export type PostStatus = "draft" | "scheduled" | "published"

export interface Campaign {
  id: string
  name: string
  description: string
  status: CampaignStatus
  startDate: string
  endDate: string
  posts: Post[]
  budget: number
  spent: number
  reach: number
  engagement: number
  tags: string[]
}

export interface Post {
  id: string
  campaignId: string
  platform: PostPlatform
  content: string
  status: PostStatus
  scheduledDate?: string
  publishedDate?: string
  likes: number
  comments: number
  shares: number
  impressions: number
  image?: string
}

export const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-500/20 text-slate-400" },
  active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400" },
  completed: { label: "Completed", color: "bg-blue-500/20 text-blue-400" },
  paused: { label: "Paused", color: "bg-amber-500/20 text-amber-400" },
}

export const PLATFORM_CONFIG: Record<PostPlatform, { label: string; color: string; icon: string }> = {
  instagram: { label: "Instagram", color: "bg-pink-500/20 text-pink-400 border-pink-500/30", icon: "IG" },
  twitter: { label: "Twitter / X", color: "bg-sky-500/20 text-sky-400 border-sky-500/30", icon: "X" },
  linkedin: { label: "LinkedIn", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: "in" },
  tiktok: { label: "TikTok", color: "bg-violet-500/20 text-violet-400 border-violet-500/30", icon: "TT" },
  facebook: { label: "Facebook", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30", icon: "fb" },
}

export const POST_STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-500/20 text-slate-400" },
  scheduled: { label: "Scheduled", color: "bg-amber-500/20 text-amber-400" },
  published: { label: "Published", color: "bg-emerald-500/20 text-emerald-400" },
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M"
  if (n >= 1000) return (n / 1000).toFixed(1) + "K"
  return n.toString()
}

export const SEED_CAMPAIGNS: Campaign[] = [
  {
    id: "camp1",
    name: "Winter Recruitment Drive",
    description: "Attract new members for the Winter 2026 semester through social media outreach and event promotion.",
    status: "active",
    startDate: "2026-01-05",
    endDate: "2026-02-28",
    budget: 500,
    spent: 320,
    reach: 12400,
    engagement: 1850,
    tags: ["recruitment", "awareness"],
    posts: [
      { id: "p1", campaignId: "camp1", platform: "instagram", content: "Ready to level up your university experience? Join ClubRM this winter! Link in bio.", status: "published", publishedDate: "2026-01-10", likes: 245, comments: 32, shares: 18, impressions: 3200 },
      { id: "p2", campaignId: "camp1", platform: "twitter", content: "Applications are OPEN for Winter 2026! Don't miss your chance to be part of something great. Apply now at yorku.ca/clubrm", status: "published", publishedDate: "2026-01-12", likes: 89, comments: 14, shares: 42, impressions: 2100 },
      { id: "p3", campaignId: "camp1", platform: "linkedin", content: "ClubRM is looking for passionate students to join our executive team. Gain real-world leadership experience while making a difference on campus.", status: "published", publishedDate: "2026-01-15", likes: 156, comments: 23, shares: 31, impressions: 4500 },
      { id: "p4", campaignId: "camp1", platform: "tiktok", content: "POV: You just joined the best club at YorkU. #ClubRM #YorkU #StudentLife", status: "published", publishedDate: "2026-01-20", likes: 892, comments: 67, shares: 134, impressions: 15200 },
      { id: "p5", campaignId: "camp1", platform: "instagram", content: "Meet our exec team! Swipe to learn about each role and what makes ClubRM special.", status: "scheduled", scheduledDate: "2026-02-18", likes: 0, comments: 0, shares: 0, impressions: 0 },
    ],
  },
  {
    id: "camp2",
    name: "Tech Talk Series Promo",
    description: "Promote the bi-weekly Tech Talk speaker series to maximize attendance and engagement.",
    status: "active",
    startDate: "2026-01-20",
    endDate: "2026-04-15",
    budget: 200,
    spent: 85,
    reach: 6800,
    engagement: 920,
    tags: ["events", "tech"],
    posts: [
      { id: "p6", campaignId: "camp2", platform: "instagram", content: "This week's Tech Talk: AI in 2026 with Dr. Sarah Kim! Feb 10, 6PM, Room 101. Free pizza!", status: "published", publishedDate: "2026-02-08", likes: 178, comments: 28, shares: 15, impressions: 2800 },
      { id: "p7", campaignId: "camp2", platform: "twitter", content: "Don't miss our next Tech Talk on AI in 2026! Register now: yorku.ca/clubrm/events", status: "published", publishedDate: "2026-02-07", likes: 56, comments: 8, shares: 22, impressions: 1400 },
      { id: "p8", campaignId: "camp2", platform: "linkedin", content: "Excited to announce Dr. Sarah Kim as our next Tech Talk speaker. Topic: The State of AI in 2026. Open to all students.", status: "published", publishedDate: "2026-02-06", likes: 98, comments: 12, shares: 19, impressions: 2600 },
    ],
  },
  {
    id: "camp3",
    name: "Valentine Social Event",
    description: "Drive registrations for the Valentine's Day social mixer event.",
    status: "completed",
    startDate: "2026-02-01",
    endDate: "2026-02-14",
    budget: 150,
    spent: 150,
    reach: 8900,
    engagement: 1320,
    tags: ["events", "social"],
    posts: [
      { id: "p9", campaignId: "camp3", platform: "instagram", content: "Valentine Social is almost here! Grab your tickets before they sell out.", status: "published", publishedDate: "2026-02-10", likes: 312, comments: 45, shares: 28, impressions: 4100 },
      { id: "p10", campaignId: "camp3", platform: "tiktok", content: "Getting ready for the ClubRM Valentine Social! Who's coming? #YorkU #ValentinesDay", status: "published", publishedDate: "2026-02-12", likes: 567, comments: 78, shares: 95, impressions: 8200 },
    ],
  },
  {
    id: "camp4",
    name: "Sponsorship Highlight Reel",
    description: "Showcase our sponsors and the value they bring to the club community.",
    status: "draft",
    startDate: "2026-03-01",
    endDate: "2026-03-31",
    budget: 100,
    spent: 0,
    reach: 0,
    engagement: 0,
    tags: ["sponsors", "partnerships"],
    posts: [
      { id: "p11", campaignId: "camp4", platform: "instagram", content: "Thank you to our Platinum sponsor TechNova Solutions for supporting our hackathon!", status: "draft", likes: 0, comments: 0, shares: 0, impressions: 0 },
      { id: "p12", campaignId: "camp4", platform: "linkedin", content: "We're proud to partner with industry leaders who invest in student growth. Here's a look at our sponsors for 2025-26.", status: "draft", likes: 0, comments: 0, shares: 0, impressions: 0 },
    ],
  },
]
