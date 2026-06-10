import App from '../../App';
import AccessGate from '../../components/AccessGate';

export default function MerchantPage() {
  return (
    <AccessGate area="merchant">
      <App initialRole="owner" mode="merchant" />
    </AccessGate>
  );
}
