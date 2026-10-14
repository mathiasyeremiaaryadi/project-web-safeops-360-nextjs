import { Package } from 'lucide-react';
import { SignedImage } from '@/components/shared/signed-image';

/**
 * Inventory photo from its signed URL, or a package icon.
 * @param {{ url?: string | null, alt: string, className?: string }} props
 */
export function InventoryPhoto({ url, alt, className }) {
  return <SignedImage url={url} alt={alt} className={className} icon={Package} />;
}
