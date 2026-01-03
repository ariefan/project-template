"use client"

import * as React from "react"
import {
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  Mail,
  MoreHorizontal,
} from "lucide-react"

import {
  DataView,
  type ColumnDef,
  type BulkAction,
  type RowAction,
} from "@workspace/ui/composed/data-view"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"

// ============================================================================
// Types
// ============================================================================

interface User {
  id: number
  name: string
  email: string
  role: "admin" | "user" | "moderator"
  status: "active" | "inactive" | "pending"
  department: string
  createdAt: string
  lastLogin: string
}

// ============================================================================
// Sample Data
// ============================================================================

const names = [
  "John Doe",
  "Jane Smith",
  "Bob Johnson",
  "Alice Williams",
  "Charlie Brown",
  "Diana Ross",
  "Edward Norton",
  "Fiona Apple",
  "George Lucas",
  "Helen Hunt",
]

const roles: User["role"][] = ["admin", "user", "moderator"]
const statuses: User["status"][] = ["active", "inactive", "pending"]
const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance"]

function generateSampleUsers(): User[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: names[i % names.length] as string,
    email: `user${i + 1}@example.com`,
    role: roles[i % roles.length] as User["role"],
    status: statuses[i % statuses.length] as User["status"],
    department: departments[i % departments.length] as string,
    createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] as string,
    lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] as string,
  }))
}

const sampleUsers = generateSampleUsers()

// ============================================================================
// Column Definitions
// ============================================================================

const columns: ColumnDef<User>[] = [
  {
    id: "id",
    header: "ID",
    accessorKey: "id",
    width: 60,
    align: "center",
    sortable: true,
  },
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    filterable: true,
    filterType: "text",
    minWidth: 150,
  },
  {
    id: "email",
    header: "Email",
    accessorKey: "email",
    sortable: true,
    filterable: true,
    filterType: "text",
    minWidth: 200,
  },
  {
    id: "role",
    header: "Role",
    accessorKey: "role",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "admin", label: "Admin" },
      { value: "user", label: "User" },
      { value: "moderator", label: "Moderator" },
    ],
    cell: ({ value }) => {
      const roleColors: Record<string, "default" | "secondary" | "outline"> = {
        admin: "default",
        moderator: "secondary",
        user: "outline",
      }
      return (
        <Badge variant={roleColors[value as string] ?? "outline"}>
          {String(value)}
        </Badge>
      )
    },
    width: 120,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "pending", label: "Pending" },
    ],
    cell: ({ value }) => {
      const statusColors: Record<
        string,
        "success" | "destructive" | "warning"
      > = {
        active: "success",
        inactive: "destructive",
        pending: "warning",
      }
      return (
        <Badge variant={statusColors[value as string] ?? "outline"}>
          {String(value)}
        </Badge>
      )
    },
    width: 100,
  },
  {
    id: "department",
    header: "Department",
    accessorKey: "department",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "Engineering", label: "Engineering" },
      { value: "Marketing", label: "Marketing" },
      { value: "Sales", label: "Sales" },
      { value: "HR", label: "HR" },
      { value: "Finance", label: "Finance" },
    ],
    width: 130,
  },
  {
    id: "createdAt",
    header: "Created",
    accessorKey: "createdAt",
    sortable: true,
    width: 110,
  },
  {
    id: "lastLogin",
    header: "Last Login",
    accessorKey: "lastLogin",
    sortable: true,
    width: 110,
  },
]

// ============================================================================
// Row Actions
// ============================================================================

const rowActions: RowAction<User>[] = [
  {
    id: "view",
    label: "View Details",
    icon: Eye,
    onAction: (row) => {
      alert(`Viewing user: ${row.name}`)
    },
  },
  {
    id: "edit",
    label: "Edit",
    icon: Edit,
    onAction: (row) => {
      alert(`Editing user: ${row.name}`)
    },
  },
  {
    id: "duplicate",
    label: "Duplicate",
    icon: Copy,
    onAction: (row) => {
      alert(`Duplicating user: ${row.name}`)
    },
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    onAction: (row) => {
      if (confirm(`Are you sure you want to delete ${row.name}?`)) {
        alert(`Deleted user: ${row.name}`)
      }
    },
  },
]

// ============================================================================
// Bulk Actions
// ============================================================================

const bulkActions: BulkAction<User>[] = [
  {
    id: "export",
    label: "Export",
    icon: Download,
    onAction: (rows) => {
      alert(`Exporting ${rows.length} users`)
    },
  },
  {
    id: "email",
    label: "Send Email",
    icon: Mail,
    onAction: (rows) => {
      alert(`Sending email to ${rows.length} users`)
    },
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    confirmMessage: "Are you sure you want to delete the selected users?",
    onAction: (rows) => {
      alert(`Deleted ${rows.length} users`)
    },
  },
]

// ============================================================================
// Page Component
// ============================================================================

export default function CrudPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage users with table, list, or grid view. Try resizing your browser to see responsive behavior.
        </p>
      </div>

      <DataView<User>
        data={sampleUsers}
        columns={columns}
        getRowId={(row) => row.id}
        // Features
        selectable
        multiSelect
        sortable
        searchable
        searchPlaceholder="Search users..."
        filterable
        paginated
        defaultPageSize={10}
        pageSizeOptions={[5, 10, 25, 50]}
        // Views
        availableViews={["table", "list", "grid"]}
        defaultView="table"
        // Actions
        rowActions={rowActions}
        bulkActions={bulkActions}
        // Styling
        hoverable
        striped
        // Messages
        emptyMessage="No users found"
        loadingMessage="Loading users..."
        // Responsive breakpoints
        responsiveBreakpoints={{
          list: 1024,
          grid: 640,
        }}
      />
    </div>
  )
}
