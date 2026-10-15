import { describe, expect, it } from 'vitest';
import {
  getSubmitBlocker,
  isReportEditable,
  needsRevision,
} from '@/features/task-report/lib/report-state';

/** @param {Record<string, unknown>} fields */
const report = (fields = {}) => ({
  status: 'IN_PROGRESS',
  revision_status: 'NONE',
  before_url: 'https://storage/before.jpg',
  after_url: 'https://storage/after.jpg',
  ...fields,
});

describe('isReportEditable / needsRevision', () => {
  it.each([
    ['in progress', {}, true, false],
    ['rejected', { status: 'REJECTED' }, true, true],
    ['revision requested', { status: 'SUBMITTED', revision_status: 'REQUESTED' }, true, true],
    ['waiting for review', { status: 'SUBMITTED' }, false, false],
    ['resubmitted', { status: 'SUBMITTED', revision_status: 'RESUBMITTED' }, false, false],
    ['approved', { status: 'COMPLETED' }, false, false],
  ])('%s', (_case, fields, editable, revision) => {
    expect(isReportEditable(report(fields))).toBe(editable);
    expect(needsRevision(report(fields))).toBe(revision);
  });
});

describe('getSubmitBlocker', () => {
  it('allows sending when both photos are on the server and the worker is online', () => {
    expect(getSubmitBlocker(report())).toBeNull();
  });

  it('asks for the missing photo, before first', () => {
    expect(getSubmitBlocker(report({ before_url: null, after_url: null }))).toBe(
      'Lengkapi foto sebelum untuk mengirim laporan.',
    );
    expect(getSubmitBlocker(report({ after_url: null }))).toBe(
      'Lengkapi foto sesudah untuk mengirim laporan.',
    );
  });

  it('does not count a photo that is only queued offline', () => {
    expect(getSubmitBlocker(report({ after_url: null }), { waiting: { after: true } })).toBe(
      'Foto sesudah masih menunggu sinyal.',
    );
    // A retaken photo still queued replaces the one already on the server.
    expect(getSubmitBlocker(report(), { waiting: { before: true } })).toBe(
      'Foto sebelum masih menunggu sinyal.',
    );
  });

  it('blocks while something runs, when offline, and for read-only reports', () => {
    expect(getSubmitBlocker(report(), { busy: true })).toBe(
      'Tunggu proses yang sedang berjalan selesai.',
    );
    expect(getSubmitBlocker(report(), { online: false })).toBe(
      'Butuh sinyal untuk mengirim laporan.',
    );
    expect(getSubmitBlocker(report({ status: 'SUBMITTED' }))).toBe(
      'Laporan ini tidak bisa dikirim.',
    );
    expect(getSubmitBlocker(report({ status: 'COMPLETED' }))).toBe(
      'Laporan ini tidak bisa dikirim.',
    );
  });
});
