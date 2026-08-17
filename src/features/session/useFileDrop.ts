import { useEffect, useState } from 'react';

/**
 * Accepts a dropped file anywhere on the page, so a client does not have to find
 * the button. The browser's own behaviour for a dropped file is to navigate away
 * from the page, which would lose the session, so both events are cancelled.
 */
export function useFileDrop(enabled: boolean, onFile: (file: File) => void): boolean {
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    function handleDragOver(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      setIsOver(true);
    }

    function handleDragLeave(event: DragEvent) {
      if (event.relatedTarget === null) setIsOver(false);
    }

    function handleDrop(event: DragEvent) {
      const file = event.dataTransfer?.files[0];
      if (!file) return;
      event.preventDefault();
      setIsOver(false);
      onFile(file);
    }

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [enabled, onFile]);

  return isOver;
}
