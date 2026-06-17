import LegalLayout from './LegalLayout';
import { ArtistTermsBody, ARTIST_TERMS_UPDATED } from './legalContent';

export default function ArtistTerms() {
  return (
    <LegalLayout
      title="Artist Terms"
      updated={ARTIST_TERMS_UPDATED}
      path="/legal/artist-terms"
      description="Universflow Artist Terms — for verified independent artists."
    >
      <ArtistTermsBody />
    </LegalLayout>
  );
}
