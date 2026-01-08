export function KeyboardShortcuts() {
  const shortcuts = [
    { key: "/", description: "Focus search" },
    { key: "Ctrl + A", description: "Select all" },
    { key: "Ctrl + D", description: "Clear selection" },
    { key: "Delete", description: "Delete selected" },
    { key: "Enter", description: "Open selected" },
    { key: "Escape", description: "Close preview / clear selection" },
    { key: "Arrow keys", description: "Navigate files" },
    { key: "Space + Enter", description: "Toggle selection" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {shortcuts.map((shortcut) => (
          <div
            className="flex items-center justify-between border-b pb-2"
            key={shortcut.key}
          >
            <kbd className="rounded bg-muted px-2 py-1 font-mono text-sm">
              {shortcut.key}
            </kbd>
            <span className="text-sm">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
