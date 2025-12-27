import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { Children, type ReactNode } from "react";
import { AppSidebar } from "@/components/layouts/app-sidebar";
import { AppHeader } from "@/components/layouts/header/app-header";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // TODO: Add authentication check here
  // For now, we'll just render the layout
  // When Better Auth is integrated, add:
  // const session = await getSession()
  // if (!session) redirect("/login")

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageContent>{children}</PageContent>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PageContent({ children }: { children: ReactNode }) {
  // Extract breadcrumb (first child) and content (rest)
  // Children.toArray() properly handles fragments and flattens them
  const childrenArray = Children.toArray(children);
  const breadcrumb = childrenArray[0];
  const content = childrenArray.slice(1);

  return (
    <>
      <AppHeader breadcrumb={breadcrumb} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {content.length > 0 ? content : null}
      </div>
    </>
  );
}
