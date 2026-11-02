import { useState, useMemo } from "react"
import { useMembers } from "@/context/members-context"
import { type Member } from "./types"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { MembersStats } from "./members-stats"
import { MembersToolbar } from "./members-toolbar"
import { MemberCard } from "./member-card"
import { MemberRow } from "./member-row"
import { AddMemberDialog } from "./add-member-dialog"
import { EditMemberDialog } from "./edit-member-dialog"
import { MemberDetailDialog } from "./member-detail-dialog"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRole } from "@/context/role-context"
import { hasPermission } from "@/lib/permissions"
import { objectsToCsv, downloadCsv } from "@/lib/csv"

const ALL_ROLES = [
  "President",
  "VP Internal",
  "VP Finance",
  "VP Events",
  "VP External",
  "Marketing",
  "Executive",
  "Administrator",
]

export function MembersPage() {
  const { members, addMember, updateMember, deleteMember, stats } = useMembers()
  const { role } = useRole()
  // UI gating only — RLS on `members` is the real enforcement.
  const canWrite = hasPermission(role, "members.write")
  const canRemove = hasPermission(role, "members.remove")

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [view, setView] = useState<"grid" | "table">("grid")
  const [addOpen, setAddOpen] = useState(false)
  const [detailMember, setDetailMember] = useState<Member | null>(null)
  const [editMember, setEditMember] = useState<Member | null>(null)

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.department.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "all" || m.status === statusFilter
      const matchesRole = roleFilter === "all" || m.role === roleFilter
      return matchesSearch && matchesStatus && matchesRole
    })
  }, [members, search, statusFilter, roleFilter])

  function handleAdd(member: Member) {
    if (!canWrite) return
    addMember(member)
  }

  function handleEdit(member: Member) {
    if (!canWrite) return
    updateMember(member)
    setEditMember(null)
  }

  function handleDelete(id: string) {
    if (!canRemove) return
    const target = members.find((m) => m.id === id)
    if (!window.confirm(`Remove ${target?.name ?? "this member"} from the roster?`)) return
    deleteMember(id)
  }

  function handleExportCsv() {
    const csv = objectsToCsv(filtered, [
      { header: "Name", value: (m) => m.name },
      { header: "Email", value: (m) => m.email },
      { header: "Phone", value: (m) => m.phone },
      { header: "Role", value: (m) => m.role },
      { header: "Status", value: (m) => m.status },
      { header: "Department", value: (m) => m.department },
      { header: "Year", value: (m) => m.year },
      { header: "Join Date", value: (m) => m.joinDate },
      { header: "Tasks Completed", value: (m) => m.tasksCompleted },
      { header: "Events Attended", value: (m) => m.eventsAttended },
    ])
    downloadCsv(`members-${new Date().toISOString().split("T")[0]}.csv`, csv)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your club's roster, roles, and member information
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>

      {/* Stat Cards */}
      <MembersStats
        total={stats.total}
        active={stats.active}
        inactive={stats.inactive}
        alumni={stats.alumni}
      />

      {/* Toolbar */}
      <MembersToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        view={view}
        onViewChange={setView}
        roles={ALL_ROLES as string[]}
        onExportCsv={handleExportCsv}
        exportDisabled={filtered.length === 0}
      />

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {members.length} members
      </p>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onView={setDetailMember}
              onEdit={canWrite ? setEditMember : undefined}
              onDelete={canRemove ? handleDelete : undefined}
            />
          ))}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onView={setDetailMember}
                  onEdit={canWrite ? setEditMember : undefined}
                  onDelete={canRemove ? handleDelete : undefined}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AddMemberDialog
        open={addOpen && canWrite}
        onOpenChange={setAddOpen}
        onAdd={handleAdd}
      />
      <EditMemberDialog
        open={!!editMember && canWrite}
        onOpenChange={(open) => !open && setEditMember(null)}
        member={editMember}
        onUpdate={handleEdit}
      />
      <MemberDetailDialog
        open={!!detailMember}
        onOpenChange={(open) => !open && setDetailMember(null)}
        member={detailMember}
      />
    </div>
  )
}