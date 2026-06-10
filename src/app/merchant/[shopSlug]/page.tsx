import App from '../../../App';
import AccessGate from '../../../components/AccessGate';
import { shopSlugToId } from '../../../lib/shopSlug';

interface MerchantShopPageProps {
  params: Promise<{
    shopSlug: string;
  }>;
}

export default async function MerchantShopPage({ params }: MerchantShopPageProps) {
  const { shopSlug } = await params;

  return (
    <AccessGate area="merchant">
      <App
        initialRole="owner"
        mode="merchant"
        initialShopId={shopSlugToId(shopSlug)}
        initialShopSlug={shopSlug}
      />
    </AccessGate>
  );
}
