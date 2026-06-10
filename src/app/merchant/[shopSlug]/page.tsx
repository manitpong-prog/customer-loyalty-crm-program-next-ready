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

  const shopId = shopSlugToId(shopSlug);

  return (
    <AccessGate area="merchant" shopId={shopId}>
      <App
        initialRole="owner"
        mode="merchant"
        initialShopId={shopId}
        initialShopSlug={shopSlug}
      />
    </AccessGate>
  );
}
