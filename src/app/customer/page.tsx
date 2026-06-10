import { redirect } from 'next/navigation';
import { getDefaultCustomerPath } from '../../lib/shopSlug';

export default function CustomerIndexPage() {
  redirect(getDefaultCustomerPath());
}
