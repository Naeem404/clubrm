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
    addMember(member)
  }

  function handleEdit(member: Member) {
    updateMember(member)
    setEditMember(null)
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
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
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
              onEdit={setEditMember}
              onDelete={deleteMember}
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
                  onEdit={setEditMember}
                  onDelete={deleteMember}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialogs */}
      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={handleAdd}
      />
      <EditMemberDialog
        open={!!editMember}
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