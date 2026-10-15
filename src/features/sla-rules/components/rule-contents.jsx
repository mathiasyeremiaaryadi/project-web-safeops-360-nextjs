import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  formatScore,
  formatTarget,
  indicatorLabel,
  LEVEL_NAMES,
  RULE_TYPES,
  UNITS,
} from '@/features/sla-shared';

/** @typedef {import('@/features/sla-rules/api/schemas').Rule} Rule */
/** @typedef {import('@/features/sla-rules/api/schemas').CatalogItem} CatalogItem */

const CHANGED = 'bg-warning-bg font-semibold text-warning';

/**
 * Indicators (weight, target) or dimensions (weight) of a rule version; cells changed from the
 * previous version are highlighted.
 * @param {object} props
 * @param {Rule} props.rule
 * @param {'sla' | 'maturity'} props.type
 * @param {Record<string, CatalogItem>} props.catalogByCode
 * @param {Record<string, { weight?: boolean, target?: boolean, added?: boolean }>} [props.changed]
 */
export function RuleIndicatorsTable({ rule, type, catalogByCode, changed = {} }) {
  const isSla = type === RULE_TYPES.SLA;
  const rows = isSla ? rule.indicators : rule.dimensions;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{isSla ? 'Indikator SLA' : 'Dimensi maturity'}</caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              {isSla ? 'Indikator' : 'Dimensi'}
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Bobot
            </th>
            {isSla ? (
              <th scope="col" className="py-2 text-right font-medium">
                Target
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = catalogByCode[row.code];
            const diff = changed[row.code] ?? {};
            return (
              <tr key={row.code} className="border-b last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium text-foreground">
                  {indicatorLabel(row.code)}
                  {diff.added ? (
                    <Badge variant="info" className="ml-2">
                      Baru
                    </Badge>
                  ) : null}
                </th>
                <td className={cn('py-2 pr-3 text-right tabular-nums', diff.weight && CHANGED)}>
                  {formatScore(row.weight)}%
                </td>
                {isSla ? (
                  <td className={cn('py-2 text-right tabular-nums', diff.target && CHANGED)}>
                    {formatTarget(
                      /** @type {{ target?: number | null }} */ (row).target,
                      meta?.unit ?? UNITS.SCORE,
                      meta?.direction ?? 'up',
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Level requirements of a maturity rule (read-only).
 * @param {{ levels: import('@/features/sla-rules/api/schemas').LevelRequirement[], changedLevels?: number[] }} props
 */
export function LevelRequirementsSummary({ levels, changedLevels = [] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <caption className="sr-only">Syarat level maturity</caption>
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-medium">
              Level
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Skor minimum
            </th>
            <th scope="col" className="py-2 pr-3 text-right font-medium">
              Nilai minimum per dimensi
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Periode berturut-turut
            </th>
          </tr>
        </thead>
        <tbody>
          {levels.map((row) => (
            <tr
              key={row.level}
              className={cn('border-b last:border-0', changedLevels.includes(row.level) && CHANGED)}
            >
              <th scope="row" className="py-2 pr-3 text-left font-medium">
                Level {row.level} ·{' '}
                {LEVEL_NAMES[/** @type {keyof typeof LEVEL_NAMES} */ (row.level)]}
              </th>
              <td className="py-2 pr-3 text-right tabular-nums">{formatScore(row.min_score)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatScore(row.min_dimension)}
              </td>
              <td className="py-2 text-right tabular-nums">{row.consecutive_periods}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
