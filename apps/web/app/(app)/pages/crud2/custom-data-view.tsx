"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  type ColumnDef,
  DataViewGrid,
  DataViewList,
  DataViewPagination,
  DataViewProvider,
  DataViewTable,
  DataViewToolbar,
  FilterButton,
  InlineBulkActions,
  SearchInput,
  SortButton,
  useDataView,
  type ViewMode,
  ViewToggle,
} from "@workspace/ui/composed/data-view";
import { cn } from "@workspace/ui/lib/utils";
import { Download, RefreshCw, Upload } from "lucide-react";
import * as React from "react";

// ============================================================================
// Custom Data View Example
// This demonstrates how to create a custom layout using composable components
// ============================================================================

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

const categories = ["Electronics", "Clothing", "Home", "Sports", "Books"];
const productStatuses: Product["status"][] = [
  "in_stock",
  "low_stock",
  "out_of_stock",
];

function generateSampleProducts(): Product[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    category: categories[i % categories.length] as string,
    price: Math.round(Math.random() * 1000 * 100) / 100,
    stock: Math.floor(Math.random() * 100),
    status: productStatuses[i % productStatuses.length] as Product["status"],
  }));
}

const sampleProducts = generateSampleProducts();

const productColumns: ColumnDef<Product>[] = [
  {
    id: "id",
    header: "ID",
    accessorKey: "id",
    width: 60,
  },
  {
    id: "name",
    header: "Product Name",
    accessorKey: "name",
    sortable: true,
    filterable: true,
  },
  {
    id: "category",
    header: "Category",
    accessorKey: "category",
    sortable: true,
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "Electronics", label: "Electronics" },
      { value: "Clothing", label: "Clothing" },
      { value: "Home", label: "Home" },
      { value: "Sports", label: "Sports" },
      { value: "Books", label: "Books" },
    ],
  },
  {
    id: "price",
    header: "Price",
    accessorKey: "price",
    sortable: true,
    align: "right",
    cell: ({ value }) => `$${(value as number).toFixed(2)}`,
  },
  {
    id: "stock",
    header: "Stock",
    accessorKey: "stock",
    sortable: true,
    align: "right",
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    filterable: true,
    filterType: "select",
    filterOptions: [
      { value: "in_stock", label: "In Stock" },
      { value: "low_stock", label: "Low Stock" },
      { value: "out_of_stock", label: "Out of Stock" },
    ],
    cell: ({ value }) => {
      const statusMap: Record<
        string,
        { label: string; variant: "default" | "secondary" | "destructive" }
      > = {
        in_stock: { label: "In Stock", variant: "default" },
        low_stock: { label: "Low Stock", variant: "secondary" },
        out_of_stock: { label: "Out of Stock", variant: "destructive" },
      };
      const config = statusMap[value as string];
      return <Badge variant={config?.variant}>{config?.label}</Badge>;
    },
  },
];

// ============================================================================
// Custom Toolbar Component
// ============================================================================

function CustomToolbar() {
  const { selectedIds, processedData } = useDataView<Product>();

  const handleImport = () => {
    console.log("Import clicked");
  };

  const handleExport = () => {
    console.log("Export clicked");
  };

  const handleRefresh = () => {
    console.log("Refresh clicked");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{processedData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{selectedIds.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              ${processedData.reduce((sum, p) => sum + p.price, 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Total Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">
              {processedData.reduce((sum, p) => sum + p.stock, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar - using DataViewToolbar with composable components */}
      <DataViewToolbar
        leftContent={
          <>
            <SearchInput showFieldSelector />
            <InlineBulkActions />
          </>
        }
        rightContent={
          <>
            <Button onClick={handleImport} size="sm" variant="outline">
              <Upload className="mr-1.5 size-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            <Button onClick={handleExport} size="sm" variant="outline">
              <Download className="mr-1.5 size-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <FilterButton />
            <SortButton />
            <ViewToggle />
            <Button onClick={handleRefresh} size="sm" variant="ghost">
              <RefreshCw className="size-4" />
            </Button>
          </>
        }
      />
    </div>
  );
}

// ============================================================================
// Custom Grid Card
// ============================================================================

function ProductCard({
  row,
  selected,
  onSelect,
}: {
  row: Product;
  selected: boolean;
  onSelect: () => void;
}) {
  const statusMap: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
    in_stock: { label: "In Stock", variant: "default" },
    low_stock: { label: "Low Stock", variant: "secondary" },
    out_of_stock: { label: "Out of Stock", variant: "destructive" },
  };
  const statusConfig = statusMap[row.status];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{row.name}</CardTitle>
          <Badge variant={statusConfig?.variant}>{statusConfig?.label}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{row.category}</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="font-bold text-2xl">${row.price.toFixed(2)}</span>
          <span className="text-muted-foreground text-sm">
            {row.stock} in stock
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Custom View Content
// ============================================================================

function CustomViewContent() {
  const { view } = useDataView<Product>();

  switch (view) {
    case "table":
      return (
        <div className="rounded-lg border">
          <DataViewTable />
        </div>
      );
    case "list":
      return <DataViewList />;
    case "grid":
      return (
        <DataViewGrid<Product>
          cardRenderer={({ row, selected, onSelect }) => (
            <ProductCard
              onSelect={onSelect}
              row={row as Product}
              selected={selected}
            />
          )}
          columns={4}
        />
      );
    default:
      return <DataViewTable />;
  }
}

// ============================================================================
// Main Custom Data View Component
// ============================================================================

export function CustomDataView() {
  const [view, setView] = React.useState<ViewMode>("table");

  return (
    <DataViewProvider
      config={{
        columns: productColumns,
        getRowId: (row) => row.id,
        selectable: true,
        multiSelect: true,
        sortable: true,
        searchable: true,
        filterable: true,
        paginated: true,
        defaultPageSize: 12,
        pageSizeOptions: [6, 12, 24, 48],
        availableViews: ["table", "list", "grid"],
        bulkActions: [
          {
            id: "delete",
            label: "Delete Selected",
            onAction: (rows) => console.log(`Deleting ${rows.length} products`),
            variant: "destructive",
          },
        ],
      }}
      data={sampleProducts}
      onViewChange={setView}
      view={view}
    >
      <div className="space-y-4">
        <CustomToolbar />
        <CustomViewContent />
        <DataViewPagination />
      </div>
    </DataViewProvider>
  );
}

// ============================================================================
// Usage Example Page
// ============================================================================

export default function CustomDataViewPage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-bold text-2xl">Custom Data View</h1>
        <p className="mt-1 text-muted-foreground">
          This example shows how to create a completely custom layout using the
          composable data-view components.
        </p>
      </div>

      <CustomDataView />
    </div>
  );
}
