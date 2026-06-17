import LegalLayout from './LegalLayout';
import { ArtistPrivacyBody, ARTIST_TERMS_UPDATED } from './legalContent';

export default function ArtistPrivacy() {
  return (
    <LegalLayout
      title="Artist Privacy"
      updated={ARTIST_TERMS_UPDATED}
      path="/legal/artist-privacy"
      description="How Universflow handles artist KYC documents and personal data."
    >
      <ArtistPrivacyBody />
    </LegalLayout>
  );
}
