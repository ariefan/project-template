"use client";

import type { ScheduledJob } from "@workspace/contracts";
import { Button } from "@workspace/ui/components/button";
import {
	ColumnsButton,
	DataView as DataViewComponent,
	ExportButton,
	FilterButton,
	SearchInput,
	SortButton,
	ViewToggle,
} from "@workspace/ui/composed/data-view";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layouts/page-header";
import { ScheduleFormDialog } from "./components/schedule-form-dialog";
import { schedulesTableColumns } from "./schedules.config";
import { useSchedulesTable } from "./use-schedules-table";

export default function SchedulesPage() {
	const {
		orgId,
		isLoading,
		totalCount,
		useServerMode,
		schedules,
		fetchSchedules,
		rowActions,
		bulkActions,
		dialogOpen,
		editingSchedule,
		handleCreateNew,
		handleDialogChange,
	} = useSchedulesTable();

	function renderContent() {
		if (isLoading) {
			return (
				<div className="py-8 text-center text-muted-foreground">
					Loading schedules...
				</div>
			);
		}

		if (!orgId) {
			return (
				<div className="py-8 text-center text-muted-foreground">
					Please select an organization
				</div>
			);
		}

		const modeIndicator = (
			<div className="mb-2 text-muted-foreground text-xs">
				{useServerMode
					? `Server mode (${totalCount.toLocaleString()} schedules)`
					: `Client mode (${totalCount.toLocaleString()} schedules)`}
			</div>
		);

		const commonProps = {
			availableViews: ["table", "list"] as ("table" | "list")[],
			bulkActions,
			columns: schedulesTableColumns,
			defaultPageSize: 10,
			defaultView: "table" as "table" | "list",
			emptyMessage: "No schedules found",
			filterable: true,
			getRowId: (row: ScheduledJob) => row.id,
			hoverable: true,
			loadingMessage: "Loading schedules...",
			multiSelect: true,
			pageSizeOptions: [10, 25, 50, 100],
			paginated: true,
			primaryAction: (
				<Button onClick={handleCreateNew} size="sm">
					<Plus className="size-4" />
					<span className="hidden sm:inline">New Schedule</span>
				</Button>
			),
			rowActions,
			searchable: true,
			selectable: true,
			sortable: true,
			striped: true,
			toolbarLeft: <SearchInput showFieldSelector />,
			toolbarRight: (
				<>
					<ViewToggle />
					<ColumnsButton />
					<FilterButton />
					<SortButton />
					<ExportButton />
				</>
			),
		};

		return (
			<>
				{modeIndicator}
				{useServerMode ? (
					<DataViewComponent<ScheduledJob>
						{...commonProps}
						data={[]}
						mode="server"
						onFetchData={fetchSchedules}
					/>
				) : (
					<DataViewComponent<ScheduledJob> {...commonProps} data={schedules} />
				)}
			</>
		);
	}

	return (
		<div className="container mx-auto max-w-7xl px-4 py-8">
			<PageHeader
				description="Automate any job type with flexible scheduling. Set up recurring tasks for reports, exports, imports, and custom jobs."
				title="Scheduled Jobs"
			/>

			{renderContent()}

			<ScheduleFormDialog
				mode={editingSchedule ? "edit" : "create"}
				onOpenChange={handleDialogChange}
				open={dialogOpen}
				schedule={editingSchedule}
			/>
		</div>
	);
}
