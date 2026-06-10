import AccessGate from '../../components/AccessGate';
import PlatformAdminDashboard from '../../components/PlatformAdminDashboard';

export default function AdminPage() {
  return (
    <AccessGate area="admin">
      <PlatformAdminDashboard />
    </AccessGate>
  );
}
