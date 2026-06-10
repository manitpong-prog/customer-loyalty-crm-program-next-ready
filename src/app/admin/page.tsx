import App from '../../App';
import AccessGate from '../../components/AccessGate';

export default function AdminPage() {
  return (
    <AccessGate area="admin">
      <App initialRole="webmaster" mode="admin" />
    </AccessGate>
  );
}
