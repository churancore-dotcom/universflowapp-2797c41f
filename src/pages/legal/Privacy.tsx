import LegalLayout from './LegalLayout';
import { UserPrivacyBody, USER_TERMS_UPDATED } from './legalContent';

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated={USER_TERMS_UPDATED}
      path="/legal/privacy"
      description="Universflow Privacy Policy for listeners."
    >
      <UserPrivacyBody />
    </LegalLayout>
  );
}
