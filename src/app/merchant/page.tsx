import { redirect } from 'next/navigation';
import { getDefaultMerchantPath } from '../../lib/shopSlug';

export default function MerchantIndexPage() {
  redirect(getDefaultMerchantPath());
}
