import App from '../../App';
import AccessGate from '../../components/AccessGate';

export default function DemoPage() {
  return (
    <AccessGate area="demo">
      <App initialRole="customer" mode="demo" />
    </AccessGate>
  );
}
