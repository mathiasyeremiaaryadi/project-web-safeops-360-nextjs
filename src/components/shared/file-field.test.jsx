import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FILE_RULES, FileField, MIB } from '@/components/shared/file-field';

/** @param {number} size @param {string} type @param {string} name */
const fakeFile = (size, type, name) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

/** @param {keyof typeof FILE_RULES} rule */
function setup(rule) {
  const onChange = vi.fn();
  render(<FileField label="File" rule={FILE_RULES[rule]} value={null} onChange={onChange} />);
  return {
    onChange,
    input: screen.getByLabelText('File'),
    user: userEvent.setup({ applyAccept: false }),
  };
}

describe('FileField', () => {
  it('rejects a PDF larger than 10 MiB', async () => {
    const { onChange, input, user } = setup('PDF');
    await user.upload(input, fakeFile(10 * MIB + 1, 'application/pdf', 'sop.pdf'));
    expect(screen.getByText('Ukuran file melebihi batas.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('rejects an image larger than 5 MiB', async () => {
    const { onChange, input, user } = setup('IMAGE');
    await user.upload(input, fakeFile(5 * MIB + 1, 'image/png', 'foto.png'));
    expect(screen.getByText('Ukuran file melebihi batas.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('rejects other formats', async () => {
    const { onChange, input, user } = setup('IMAGE');
    await user.upload(input, fakeFile(1000, 'image/gif', 'foto.gif'));
    expect(screen.getByText('Format file tidak didukung.')).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('accepts a valid file', async () => {
    const { onChange, input, user } = setup('PDF');
    const file = fakeFile(2 * MIB, 'application/pdf', 'sop.pdf');
    await user.upload(input, file);
    expect(onChange).toHaveBeenLastCalledWith(file);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
