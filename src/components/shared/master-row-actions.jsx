'use client';

import { Button } from '@/components/ui/button';
import { MASTER_STATUS } from '@/lib/constants';

/**
 * "Edit" + "Nonaktifkan"/"Aktifkan" for a master-data row (sites, vendors, master task, …).
 * DELETE on master data is a soft deactivate, so the UI never says "Hapus".
 * @param {object} props
 * @param {string} props.status `ACTIVE` | `INACTIVE`
 * @param {string} props.name Row name for accessible labels.
 * @param {() => void} props.onEdit
 * @param {() => void} props.onToggleStatus
 */
export function MasterRowActions({ status, name, onEdit, onToggleStatus }) {
  const active = status === MASTER_STATUS.ACTIVE;
  return (
    <div className="flex flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
      <Button
        type="button"
        variant="outline"
        className="h-10 bg-card"
        aria-label={`Edit ${name}`}
        onClick={onEdit}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        className={active ? 'h-10 bg-card text-danger hover:text-danger' : 'h-10 bg-card'}
        aria-label={`${active ? 'Nonaktifkan' : 'Aktifkan'} ${name}`}
        onClick={onToggleStatus}
      >
        {active ? 'Nonaktifkan' : 'Aktifkan'}
      </Button>
    </div>
  );
}
