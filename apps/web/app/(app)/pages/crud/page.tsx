import { columns, type Payment } from "./columns";
import { ViewToggle } from "./view-toggle";

async function getData(): Promise<Payment[]> {
  // Fetch data from your API here.
  const statuses = ["pending", "processing", "success", "failed"] as const;
  const data: Payment[] = [];

  for (let i = 1; i <= 125; i++) {
    const randomIndex = Math.floor(Math.random() * statuses.length);
    const status = statuses[randomIndex] as Payment["status"];
    data.push({
      id: `payment-${i}`,
      amount: Math.floor(Math.random() * 10_000) + 100,
      status,
      email: `user${i}@example.com`,
    });
  }

  return data;
}

export default async function DemoPage() {
  const data = await getData();

  return (
    <div className="container mx-auto py-10">
      <ViewToggle columns={columns} data={data} />
    </div>
  );
}
