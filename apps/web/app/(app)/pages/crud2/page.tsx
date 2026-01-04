"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  type BulkAction,
  type ColumnDef,
  DataView as DataViewComponent,
  DataViewExport,
  type RowAction,
} from "@workspace/ui/composed/data-view";
import { Copy, Download, Edit, Eye, Mail, Plus, Trash2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "moderator";
  status: "active" | "inactive" | "pending";
  department: string;
  createdAt: string;
  lastLogin: string;
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
];

const roles: User["role"][] = ["admin", "user", "moderator"];
const statuses: User["status"][] = ["active", "inactive", "pending"];
const departments = ["Engineering", "Marketing", "Sales", "HR", "Finance"];

function generateSampleUsers(): User[] {
  // Use a fixed base date to avoid hydration mismatch
  const baseDate = new Date("2025-01-01").getTime();

  return Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: names[i % names.length] as string,
    email: `user${i + 1}@example.com`,
    role: roles[i % roles.length] as User["role"],
    status: statuses[i % statuses.length] as User["status"],
    department: departments[i % departments.length] as string,
    // Use deterministic offsets based on index to avoid hydration mismatch
    createdAt: new Date(baseDate - ((i * 7 + 3) % 365) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] as string,
    lastLogin: new Date(baseDate - ((i * 3 + 1) % 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0] as string,
  }));
}

const sampleUsers = generateSampleUsers();

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
      };
      return (
        <Badge variant={roleColors[value as string] ?? "outline"}>
          {String(value)}
        </Badge>
      );
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
        "default" | "destructive" | "secondary"
      > = {
        active: "default",
        inactive: "destructive",
        pending: "secondary",
      };
      return (
        <Badge variant={statusColors[value as string] ?? "outline"}>
          {String(value)}
        </Badge>
      );
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
];

// ============================================================================
// Row Actions
// ============================================================================

const rowActions: RowAction<User>[] = [
  {
    id: "view",
    label: "View Details",
    icon: Eye,
    onAction: (row) => {
      console.log(`Viewing user: ${row.name}`);
    },
  },
  {
    id: "edit",
    label: "Edit",
    icon: Edit,
    onAction: (row) => {
      console.log(`Editing user: ${row.name}`);
    },
  },
  {
    id: "duplicate",
    label: "Duplicate",
    icon: Copy,
    onAction: (row) => {
      console.log(`Duplicating user: ${row.name}`);
    },
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    onAction: (row) => {
      console.log(`Deleted user: ${row.name}`);
    },
  },
];

// ============================================================================
// Bulk Actions
// ============================================================================

const bulkActions: BulkAction<User>[] = [
  {
    id: "export",
    label: "Export",
    icon: Download,
    onAction: (rows) => {
      console.log(`Exporting ${rows.length} users`);
    },
  },
  {
    id: "email",
    label: "Send Email",
    icon: Mail,
    onAction: (rows) => {
      console.log(`Sending email to ${rows.length} users`);
    },
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    variant: "destructive",
    confirmMessage: "Are you sure you want to delete the selected users?",
    onAction: (rows) => {
      console.log(`Deleted ${rows.length} users`);
    },
  },
];

// ============================================================================
// Page Component
// ============================================================================

export default function CrudPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Users Management</h1>
        <p className="mt-1 text-muted-foreground">
          Manage users with table, list, or grid view. Try resizing your browser
          to see responsive behavior.
        </p>
      </div>

      <DataViewComponent<User>
        afterFilters={
          <button
            className="rounded bg-violet-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            afterFilters
          </button>
        }
        afterSearch={
          <button
            className="rounded bg-green-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            afterSearch
          </button>
        }
        afterSort={
          <button
            className="rounded bg-cyan-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            afterSort
          </button>
        }
        afterViewToggle={
          <button
            className="rounded bg-orange-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            afterViewToggle
          </button>
        }
        availableViews={["table", "list", "grid"]}
        beforeFilters={
          <button
            className="rounded bg-purple-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            beforeFilters
          </button>
        }
        // Features
        beforeSearch={
          <button
            className="rounded bg-blue-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            beforeSearch
          </button>
        }
        beforeSort={
          <button
            className="rounded bg-indigo-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            beforeSort
          </button>
        }
        beforeViewToggle={
          <button
            className="rounded bg-amber-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            beforeViewToggle
          </button>
        }
        bulkActions={bulkActions}
        columns={columns}
        data={sampleUsers}
        defaultPageSize={10}
        defaultView="table"
        emptyMessage="No users found"
        filterable
        getRowId={(row) => row.id}
        // Views
        hoverable
        loadingMessage="Loading users..."
        // Actions
        multiSelect
        pageSizeOptions={[5, 10, 25, 50]}
        // Styling
        paginated
        primaryAction={
          <Button onClick={() => console.log("Add user clicked")}>
            <Plus className="mr-2 size-4" />
            Add User
          </Button>
        }
        // Messages
        responsiveBreakpoints={{
          list: 1024,
          grid: 640,
        }}
        // Primary action
        rowActions={rowActions}
        // Field selector dropdown
        searchable
        searchPlaceholder="Search users..."
        // Responsive breakpoints
        selectable
        // Toolbar slot demonstrations
        showFieldSelector
        sortable
        striped
        toolbarLeft={
          <button
            className="rounded bg-pink-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            toolbarLeft
          </button>
        }
        toolbarRight={
          <>
            <button
              className="rounded bg-yellow-500 px-2 py-1 text-black text-xs"
              type="button"
            >
              toolbarRight
            </button>
            <DataViewExport />
          </>
        }
        toolbarTop={
          <button
            className="rounded bg-red-500 px-2 py-1 text-white text-xs"
            type="button"
          >
            toolbarTop (full width above toolbar)
          </button>
        }
      />
    </div>
  );
}
