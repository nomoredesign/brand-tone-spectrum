/** Saves text as a file, which is how everything leaves this tool. */
export function downloadText(fileName: string, text: string, mimeType = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
