import LegalLayout from './LegalLayout';
import { UserTermsBody, USER_TERMS_UPDATED } from './legalContent';

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated={USER_TERMS_UPDATED}
      path="/legal/terms"
      description="Universflow Terms of Service for listeners."
    >
      <UserTermsBody />
    </LegalLayout>
  );
}
