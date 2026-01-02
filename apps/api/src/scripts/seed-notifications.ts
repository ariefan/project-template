import { randomBytes } from "node:crypto";
import { db, notifications } from "@workspace/db";

function generateId(): string {
  return randomBytes(16).toString("hex");
}

async function seedNotifications() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("Usage: pnpm tsx seed-notifications.ts <userId>");
    process.exit(1);
  }

  console.log(`Seeding notifications for user: ${userId}`);

  const testNotifications = [
    {
      id: generateId(),
      userId,
      channel: "email" as const,
      category: "transactional" as const,
      priority: "normal" as const,
      status: "sent" as const,
      subject: "Welcome to the platform!",
      body: "Thank you for signing up. We're excited to have you on board!",
      readAt: null,
      sentAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      updatedAt: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      id: generateId(),
      userId,
      channel: "email" as const,
      category: "security" as const,
      priority: "high" as const,
      status: "sent" as const,
      subject: "Security Alert: New login detected",
      body: "We detected a new login to your account from a new device. If this wasn't you, please change your password immediately.",
      readAt: null,
      sentAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60),
    },
    {
      id: generateId(),
      userId,
      channel: "email" as const,
      category: "system" as const,
      priority: "normal" as const,
      status: "sent" as const,
      subject: "Your account has been verified",
      body: "Your email address has been successfully verified. You now have full access to all features.",
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: generateId(),
      userId,
      channel: "email" as const,
      category: "marketing" as const,
      priority: "low" as const,
      status: "sent" as const,
      subject: "New features available!",
      body: "Check out our latest features and improvements. We've added several new tools to help you be more productive.",
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
    {
      id: generateId(),
      userId,
      channel: "email" as const,
      category: "transactional" as const,
      priority: "normal" as const,
      status: "sent" as const,
      subject: "Your subscription has been renewed",
      body: "Your subscription has been successfully renewed. Thank you for your continued support!",
      readAt: null,
      sentAt: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
  ];

  try {
    await db.insert(notifications).values(testNotifications);
    console.log(
      `Successfully seeded ${testNotifications.length} notifications`
    );
    process.exit(0);
  } catch (error) {
    console.error("Error seeding notifications:", error);
    process.exit(1);
  }
}

seedNotifications();
