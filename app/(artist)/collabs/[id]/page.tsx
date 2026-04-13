interface CollabChatPageProps {
  params: { id: string };
}

export default function CollabChatPage({ params }: CollabChatPageProps) {
  return (
    <main>
      <h1>Collab Chat: {params.id}</h1>
    </main>
  );
}
