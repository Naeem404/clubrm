import React, { useState } from "react";

type Member = {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive";
  joined: string;
  term: string;
  tasksCompleted: number;
  eventsAttended: number;
  lastActive: string;
};

const members: Member[] = [
  {
    name: "John Doe",
    email: "john.doe@university.edu",
    role: "President",
    status: "Active",
    joined: "September 2025",
    term: "Fall 2026",
    tasksCompleted: 24,
    eventsAttended: 8,
    lastActive: "2 hours ago",
  },
  {
    name: "Sarah Smith",
    email: "sarah.smith@university.edu",
    role: "VP Finance",
    status: "Active",
    joined: "October 2025",
    term: "Fall 2026",
    tasksCompleted: 12,
    eventsAttended: 4,
    lastActive: "1 day ago",
  },
];

export default function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  function closeModal() {
    setSelectedMember(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">TechClub</h1>
        <p className="text-sm text-muted-foreground">
          TechClub is a student-led organization focused on collaboration,
          technical growth, and student engagement.
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Members</h2>

        <table className="w-full border border-border mt-3 rounded-lg overflow-hidden">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 border-b">Photo</th>
              <th className="text-left p-3 border-b">Name</th>
              <th className="text-left p-3 border-b">Role</th>
              <th className="text-left p-3 border-b">Status</th>
              <th className="text-left p-3 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr
                key={m.email}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => setSelectedMember(m)}
              >
                <td className="p-3 border-b">👤</td>
                <td className="p-3 border-b font-medium">{m.name}</td>
                <td className="p-3 border-b">{m.role}</td>
                <td className="p-3 border-b">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      m.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="p-3 border-b text-muted-foreground">⋮</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selectedMember && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-xl rounded-xl bg-background shadow-lg border p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top bar */}
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-2xl">
                  👤
                </div>
                <div>
                  <div className="text-xl font-semibold">
                    {selectedMember.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMember.email}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-medium">{selectedMember.role}</span>
                    <span className="text-muted-foreground"> • </span>
                    <span className="text-muted-foreground">
                      {selectedMember.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                className="text-muted-foreground hover:text-foreground"
                onClick={closeModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <hr className="my-4" />

            {/* Membership Info */}
            <div className="space-y-1">
              <div className="text-sm font-semibold tracking-wide">
                MEMBERSHIP INFO
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Joined:</span>{" "}
                {selectedMember.joined}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Current Term:</span>{" "}
                {selectedMember.term}
              </div>
            </div>

            <hr className="my-4" />

            {/* Activity Stats */}
            <div className="space-y-1">
              <div className="text-sm font-semibold tracking-wide">
                ACTIVITY STATS
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Tasks Completed:</span>{" "}
                {selectedMember.tasksCompleted}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Events Attended:</span>{" "}
                {selectedMember.eventsAttended}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Last Active:</span>{" "}
                {selectedMember.lastActive}
              </div>
            </div>

            <hr className="my-4" />

            {/* Buttons */}
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md border hover:bg-muted">
                Change Role
              </button>
              <button className="px-3 py-2 rounded-md border hover:bg-muted">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
