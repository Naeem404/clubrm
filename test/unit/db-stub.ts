/**
 * Stub Database Engine for Unit Testing
 * Provides a predictable, in-memory mock of the Supabase data structure
 * to test business logic independently of the network or actual database state.
 */

export const MOCK_MEMBERS = [
  { id: "m1", name: "Alice President", role: "President", joinDate: "2024-01-01", status: "active" },
  { id: "m2", name: "Bob Admin", role: "Administrator", joinDate: "2024-02-15", status: "active" },
  { id: "m3", name: "Charlie Finance", role: "VP Finance", joinDate: "2024-03-10", status: "active" },
  { id: "m4", name: "Diana Events", role: "VP Events", joinDate: "2024-04-01", status: "active" },
  { id: "m5", name: "Inactive User", role: "Member", joinDate: "2023-11-01", status: "inactive" },
];

export const MOCK_TASKS = [
  { id: "t1", title: "Review Budget", status: "in_progress", priority: "urgent", assignees: ["m3"], section: "Finance", createdAt: "2026-03-01T10:00:00Z", subtasks: [{ id: "s1", title: "Check receipts", done: false }] },
  { id: "t2", title: "Approve Venue", status: "done", priority: "high", assignees: ["m4"], section: "Events", createdAt: "2026-02-28T09:00:00Z", subtasks: [{ id: "s2", title: "Sign contract", done: true }] },
  { id: "t3", title: "Social Media Post", status: "todo", priority: "medium", assignees: ["m2"], section: "Marketing", createdAt: "2026-03-05T15:00:00Z", subtasks: [] },
  { id: "t4", title: "Overdue Item", status: "todo", priority: "high", assignees: ["m1"], section: "General", dueDate: "2026-03-01", createdAt: "2026-02-20T12:00:00Z", subtasks: [] },
];

export const MOCK_EVENTS = [
  { id: "e1", title: "Valentine Social", startDate: "2026-02-14T19:00:00Z", location: "Main Hall", capacity: 100, registered: 85, status: "confirmed", collaborators: ["m4", "m1"] },
  { id: "e2", title: "Tech Talk", startDate: "2026-02-10T18:00:00Z", location: "Room 101", capacity: 50, registered: 45, status: "confirmed", collaborators: ["m2"] },
  { id: "e3", title: "Future Workshop", startDate: "2026-06-15T10:00:00Z", location: "Online", capacity: 200, registered: 20, status: "draft", collaborators: ["m4"] },
];

export const MOCK_FINANCE = {
  budget: { totalBudget: 25000, termLabel: "Winter 2026" },
  expenses: [
    { id: "ex1", description: "Decorations", amount: 500, category: "events", status: "approved", date: "2026-02-01", submittedBy: "Diana Events" },
    { id: "ex2", description: "Server Costs", amount: 150, category: "technology", status: "approved", date: "2026-02-15", submittedBy: "Bob Admin" },
    { id: "ex3", description: "Pizza", amount: 200, category: "food", status: "pending", date: "2026-03-06", submittedBy: "Charlie Finance" },
  ],
  income: [
    { id: "in1", source: "Dues", amount: 12000, type: "dues", date: "2026-01-15" },
    { id: "in2", source: "Sponsor A", amount: 5000, type: "sponsorship", date: "2026-02-20" },
  ],
  reimbursements: [
    { id: "r1", amount: 50, description: "Travel", status: "pending", date: "2026-03-01", submittedBy: "Diana Events" },
  ]
};

export class StubDbEngine {
  async getMembers() { return [...MOCK_MEMBERS]; }
  async getTasks() { return [...MOCK_TASKS]; }
  async getEvents() { return [...MOCK_EVENTS]; }
  async getFinance() { return JSON.parse(JSON.stringify(MOCK_FINANCE)); }
}
