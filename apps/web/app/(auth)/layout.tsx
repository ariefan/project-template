export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side - Branding/Marketing */}
      <div className="hidden flex-col justify-between bg-muted p-10 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
              <title>Logo</title>
            </svg>
          </div>
          <span className="font-bold text-xl">Your App</span>
        </div>

        <div className="space-y-4">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "This application has transformed how we work. The intuitive
              interface and powerful features make it indispensable for our
              team."
            </p>
            <footer className="text-muted-foreground text-sm">
              Sofia Davis, Product Manager
            </footer>
          </blockquote>
        </div>

        <div className="text-muted-foreground text-sm">
          © 2025 Your Company. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex items-center justify-center p-6 lg:p-8">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
