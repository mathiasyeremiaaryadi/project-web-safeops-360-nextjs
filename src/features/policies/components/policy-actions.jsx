'use client';

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MasterRowActions } from '@/components/shared/master-row-actions';
import { MASTER_STATUS } from '@/lib/constants';

/**
 * "Buka" (everyone) + Edit / Nonaktifkan (managers) for one SOP. The backend only signs files
 * of active SOPs, so "Buka" is disabled for an inactive one.
 * @param {object} props
 * @param {import('@/features/policies/api/schemas').Policy} props.policy
 * @param {boolean} props.canEdit
 * @param {boolean} props.opening This SOP's file is being requested.
 * @param {() => void} props.onOpen
 * @param {() => void} props.onEdit
 * @param {() => void} props.onToggleStatus
 */
export function PolicyActions({ policy, canEdit, opening, onOpen, onEdit, onToggleStatus }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-10 bg-card"
        aria-label={`Buka ${policy.name}`}
        disabled={opening || policy.status !== MASTER_STATUS.ACTIVE}
        onClick={onOpen}
      >
        <ExternalLink aria-hidden="true" />
        {opening ? 'Membuka…' : 'Buka'}
      </Button>
      {canEdit ? (
        <MasterRowActions
          status={policy.status}
          name={policy.name}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
        />
      ) : null}
    </div>
  );
}
