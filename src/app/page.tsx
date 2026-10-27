import { prisma } from '@/lib/prisma';
import { EventListView } from '@/components/EventListView';

export const revalidate = 0;

export default async function HomePage() {
  const events = await prisma.event.findMany({
    include: {
      listings: {
        include: {
          seller: {
            select: { id: true, name: true },
          },
        },
        orderBy: { pricePerTicketVnd: 'asc' },
      },
    },
    orderBy: { eventDate: 'asc' },
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <EventListView events={events as any} />
    </main>
  );
}
