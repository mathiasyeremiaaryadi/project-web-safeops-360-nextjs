'use client';

import { InventoryReportDetail } from '@/features/inventory-reports/components/inventory-report-detail';

/** `/reports/inventory/[id]` body. @param {{ id: string }} props */
export function InventoryReportPage({ id }) {
  return <InventoryReportDetail id={id} variant="page" />;
}
