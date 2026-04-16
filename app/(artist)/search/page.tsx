import { listArtistsForDirectory } from "@/lib/queries/artists";
import ArtistSearchClient from "./search-client";

export const dynamic = "force-dynamic";

export default async function ArtistSearchPage() {
  const artists = await listArtistsForDirectory();
  return <ArtistSearchClient artists={artists} />;
}
