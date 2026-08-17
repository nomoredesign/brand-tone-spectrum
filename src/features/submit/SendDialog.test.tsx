import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SendDialog, type SendStatus } from './SendDialog';

/*
 * jsdom knows the dialog element but not how to open one, so the two methods
 * the component calls are stood in for. Everything being asserted here is the
 * content of the dialog, not the browser's handling of it.
 */
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

function renderDialog(
  status: SendStatus,
  overrides: Partial<Parameters<typeof SendDialog>[0]> = {},
) {
  const props = {
    open: true,
    clientName: 'CARNOT AI',
    author: 'Sam Reed',
    message: '',
    status,
    onAuthorChange: vi.fn(),
    onMessageChange: vi.fn(),
    onSend: vi.fn(),
    onClose: vi.fn(),
    onDownload: vi.fn(),
    onCopyLink: vi.fn(),
    ...overrides,
  };

  render(<SendDialog {...props} />);
  return props;
}

describe('SendDialog', () => {
  it('asks for a name and an optional message', () => {
    renderDialog({ kind: 'idle' });

    expect(screen.getByLabelText('Your name')).toBeRequired();
    expect(screen.getByLabelText('Anything to add? (optional)')).not.toBeRequired();
  });

  it('says that nothing is sent until the button is pressed', () => {
    renderDialog({ kind: 'idle' });
    expect(screen.getByText(/nothing is sent while you are still filling it in/i)).toBeVisible();
  });

  it('shows a pending state and stops a second press', () => {
    renderDialog({ kind: 'sending' });

    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByLabelText('Your name')).toBeDisabled();
  });

  it('confirms the send when it worked', () => {
    renderDialog({ kind: 'sent', emailed: true });
    expect(screen.getByText(/your answers for CARNOT AI are with the studio\./i)).toBeVisible();
  });

  it('says so when the answers arrived but the email did not go', () => {
    renderDialog({ kind: 'sent', emailed: false });
    expect(screen.getByText(/the email notification did not go/i)).toBeVisible();
  });

  it('offers both fallbacks when the send fails, and says nothing was lost', async () => {
    const user = userEvent.setup();
    const props = renderDialog({ kind: 'failed', reason: 'The studio could not be reached.' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The studio could not be reached.');
    expect(alert).toHaveTextContent(/nothing has been lost/i);

    await user.click(screen.getByRole('button', { name: 'Download the file' }));
    expect(props.onDownload).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Copy the link' }));
    expect(props.onCopyLink).toHaveBeenCalledOnce();
  });

  it('keeps what was typed after a failure, so nothing has to be entered twice', () => {
    renderDialog({ kind: 'failed', reason: 'The studio could not be reached.' });
    expect(screen.getByLabelText('Your name')).toHaveValue('Sam Reed');
  });
});
