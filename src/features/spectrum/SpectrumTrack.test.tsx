import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Scale } from '@shared/schema';
import { SpectrumTrack } from './SpectrumTrack';

const scale: Scale = { min: 1, max: 5, step: 0.5, snap: false };

function Harness({ start = 3, readOnly = false }: { start?: number; readOnly?: boolean }) {
  const [value, setValue] = useState(start);
  return (
    <SpectrumTrack
      scale={scale}
      value={value}
      leftLabel="Feminine"
      rightLabel="Masculine"
      readOnly={readOnly}
      onChange={setValue}
    />
  );
}

function slider() {
  return screen.getByRole('slider', { name: 'Feminine to Masculine' });
}

describe('SpectrumTrack', () => {
  it('names both ends of the pair', () => {
    render(<Harness />);
    expect(slider()).toBeInTheDocument();
  });

  it('describes the position in words as well as numbers', () => {
    render(<Harness />);
    expect(slider()).toHaveAttribute('aria-valuetext', '3 of 5, midway');
  });

  it('moves by one step on an arrow key', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(slider()).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(slider()).toHaveValue('3.5');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(slider()).toHaveValue('2.5');
  });

  it('moves by one step on the up and down keys too', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();

    await user.keyboard('{ArrowUp}');
    expect(slider()).toHaveValue('3.5');
    await user.keyboard('{ArrowDown}');
    expect(slider()).toHaveValue('3');
  });

  it('jumps to the ends on Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();

    await user.keyboard('{End}');
    expect(slider()).toHaveValue('5');
    expect(slider()).toHaveAttribute('aria-valuetext', '5 of 5, at Masculine');

    await user.keyboard('{Home}');
    expect(slider()).toHaveValue('1');
    expect(slider()).toHaveAttribute('aria-valuetext', '1 of 5, at Feminine');
  });

  it('stops at the ends rather than running past them', async () => {
    const user = userEvent.setup();
    render(<Harness start={5} />);
    await user.tab();

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(slider()).toHaveValue('5');
  });

  it('lands on a step even when the value started between two', async () => {
    const user = userEvent.setup();
    render(<Harness start={3.27} />);
    await user.tab();

    await user.keyboard('{ArrowRight}');
    expect(slider()).toHaveValue('4');
  });

  it('cannot be changed when the page is read only', async () => {
    const user = userEvent.setup();
    render(<Harness readOnly />);

    expect(slider()).toBeDisabled();
    await user.tab();
    expect(slider()).not.toHaveFocus();
  });
});
