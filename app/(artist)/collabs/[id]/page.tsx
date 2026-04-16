interface CollabChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollabChatPage({ params }: CollabChatPageProps) {
  const { id } = await params;
  return (
    <main>
      <h1>Collab Chat: {id}</h1>
    </main>
  );
}
