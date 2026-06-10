import App from '../../../App';
import { shopSlugToId } from '../../../lib/shopSlug';

interface CustomerShopPageProps {
  params: Promise<{
    shopSlug: string;
  }>;
}

export default async function CustomerShopPage({ params }: CustomerShopPageProps) {
  const { shopSlug } = await params;

  return (
    <App
      initialRole="customer"
      mode="customer"
      initialShopId={shopSlugToId(shopSlug)}
      initialShopSlug={shopSlug}
    />
  );
}
