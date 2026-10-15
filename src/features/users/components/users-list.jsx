'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsString } from 'nuqs';
import { Users } from 'lucide-react';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { FilterBar } from '@/components/shared/filter-bar';
import { QueryList } from '@/components/shared/query-list';
import { useListParams } from '@/hooks/use-list-params';
import { can } from '@/lib/auth/permissions';
import { useSession } from '@/features/auth';
import { useOptionLabels } from '@/hooks/use-option-labels';
import { formatDateTime } from '@/lib/date';
import { searchRows } from '@/lib/search';
import { ROLE_LABELS } from '@/lib/constants';
import { useUsers } from '@/features/users/api/queries';
import { RoleBadges, UserStatusBadge } from '@/features/users/components/user-badges';
import { UserCard, UserIdentity } from '@/features/users/components/user-card';
import {
  USER_ROLE_FILTERS,
  USER_STATUS_BADGES,
  USER_STATUS_FILTERS,
} from '@/features/users/constants';
import { describeScope } from '@/features/users/lib/describe-scope';
import { filterUsers } from '@/features/users/lib/filter-users';
import { getUserStatus } from '@/features/users/lib/get-user-status';

const FILTERS = { role: parseAsString.withDefault(''), status: parseAsString.withDefault('') };

/** `/users` body: search, role/status filters, cards (< 768) or table. */
export function UsersList() {
  const router = useRouter();
  const { params, limit, setFilters, setPage } = useListParams(FILTERS);
  const { user: currentUser } = useSession();
  // Super Admin sees every role; an Admin vendor only manages Worker accounts of their vendor.
  const manageAccess = can(currentUser, 'USER_ACCESS_ADMIN');
  // `is_active` too: the backend may filter on it rather than on `status`.
  const isActive = params.status ? String(params.status === 'ACTIVE') : '';
  const query = useUsers({ ...params, is_active: isActive, limit });
  const sites = useOptionLabels('sites');
  const vendors = useOptionLabels('vendors');
  /** @param {import('@/features/users/api/schemas').User} user */
  const scopeOf = (user) =>
    describeScope(user, { siteName: sites.labelOf, vendorName: vendors.labelOf });
  /** @param {import('@/features/users/api/schemas').User} user */
  const rolesOf = (user) => user.roles.map((role) => ROLE_LABELS[role] ?? role).join(', ');
  /** @param {import('@/features/users/api/schemas').User} user */
  const statusOf = (user) => USER_STATUS_BADGES[getUserStatus(user)]?.label ?? '';
  // Server filters + the same filters and search here, in case the backend ignores them.
  const rows = query.data
    ? searchRows(filterUsers(query.data.data, params), params.q, (user) => [
        user.full_name,
        user.username,
        user.email,
        rolesOf(user),
        scopeOf(user),
        statusOf(user),
      ])
    : [];

  const columns = [
    {
      id: 'user',
      header: 'User',
      meta: { sortValue: (/** @type {any} */ user) => user.full_name || user.username },
      cell: ({ row }) => (
        <Link
          href={`/users/${row.original.id}`}
          className="block outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <UserIdentity user={row.original} />
        </Link>
      ),
    },
    {
      id: 'roles',
      header: 'Role',
      meta: { sortValue: rolesOf },
      cell: ({ row }) => <RoleBadges roles={row.original.roles} />,
    },
    {
      id: 'scope',
      header: 'Scope',
      meta: { hideBelow: 'lg', sortValue: scopeOf },
      cell: ({ row }) => <span className="text-muted-foreground">{scopeOf(row.original)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      meta: { sortValue: statusOf },
      cell: ({ row }) => <UserStatusBadge user={row.original} />,
    },
    {
      id: 'last_login',
      header: 'Login terakhir',
      meta: { hideBelow: 'xl', sortValue: (/** @type {any} */ user) => user.last_login_at },
      cell: ({ row }) => formatDateTime(row.original.last_login_at),
    },
  ].filter((column) => manageAccess || column.id !== 'scope');

  return (
    <>
      <FilterBar
        search={params.q}
        onSearchChange={(q) => setFilters({ q })}
        searchPlaceholder="Cari nama, username, email, role, atau scope"
      >
        {manageAccess ? (
          <NativeSelect
            aria-label="Filter role"
            value={params.role}
            onChange={(e) => setFilters({ role: e.target.value })}
          >
            {USER_ROLE_FILTERS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
        <NativeSelect
          aria-label="Filter status"
          value={params.status}
          onChange={(e) => setFilters({ status: e.target.value })}
        >
          {USER_STATUS_FILTERS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FilterBar>

      <QueryList
        query={query}
        rows={rows}
        empty={{
          icon: Users,
          title: 'Belum ada user',
          description: 'Ubah pencarian atau filter, atau tambahkan user baru.',
        }}
        noun="user"
        onPageChange={setPage}
        columns={columns}
        getRowId={(user) => user.id}
        caption="Daftar user"
        cardGridClassName="sm:grid-cols-2"
        onRowClick={(user) => router.push(`/users/${user.id}`)}
        renderCard={(user) => <UserCard user={user} scopeText={scopeOf(user)} />}
      />
    </>
  );
}
