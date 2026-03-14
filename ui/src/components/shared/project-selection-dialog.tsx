/**
 * Project Selection Dialog Component
 *
 * Displays during OAuth flow when CLIProxyAPI requires user to select
 * a Google Cloud project. Shows list of available projects with option
 * to select one or ALL.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FolderOpen, Check, Circle, CheckCircle } from 'lucide-react';

interface GCloudProject {
  id: string;
  name: string;
  index: number;
}

interface ProjectSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  provider: string;
  projects: GCloudProject[];
  defaultProjectId: string;
  supportsAll: boolean;
  onSelect: (selectedId: string) => Promise<void>;
  /** Timeout in seconds before auto-selecting default */
  timeoutSeconds?: number;
}

export function ProjectSelectionDialog({
  open,
  onClose,
  sessionId,
  provider,
  projects,
  defaultProjectId,
  supportsAll,
  onSelect,
  timeoutSeconds = 30,
}: ProjectSelectionDialogProps) {
  const [selectedId, setSelectedId] = useState(defaultProjectId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(timeoutSeconds);

  // Countdown timer for auto-selection
  useEffect(() => {
    if (!open) {
      setCountdown(timeoutSeconds);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit on timeout
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, timeoutSeconds]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedId(defaultProjectId);
      setIsSubmitting(false);
      setCountdown(timeoutSeconds);
    }
  }, [open, defaultProjectId, timeoutSeconds]);

  const handleSubmit = async (isTimeout = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Empty string means use default (press Enter behavior)
      const submitId = isTimeout ? '' : selectedId;
      await onSelect(submitId);
      onClose();
    } catch (error) {
      console.error('Failed to submit project selection:', error);
      // On error, submit empty to use default
      try {
        await onSelect('');
      } catch {
        // Ignore double-error
      }
      onClose();
    }
  };

  const providerDisplay = provider.charAt(0).toUpperCase() + provider.slice(1);

  // Suppress unused variable warning - sessionId used for identification
  void sessionId;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Select Google Cloud Project
          </DialogTitle>
          <DialogDescription>
            Choose which project to use for {providerDisplay} authentication.
            {countdown > 0 && (
              <span className="text-muted-foreground ml-1">
                (Auto-selecting default in {countdown}s)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === project.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => !isSubmitting && setSelectedId(project.id)}
              >
                {selectedId === project.id ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-muted-foreground font-mono">{project.id}</div>
                </div>
                {project.id === defaultProjectId && (
                  <span className="text-xs px-2 py-1 bg-secondary rounded">Default</span>
                )}
              </div>
            ))}

            {supportsAll && (
              <div
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === 'ALL'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => !isSubmitting && setSelectedId('ALL')}
              >
                {selectedId === 'ALL' ? (
                  <CheckCircle className="w-5 h-5 text-primary" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">All Projects</div>
                  <div className="text-sm text-muted-foreground">
                    Onboard all {projects.length} listed projects
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => handleSubmit(true)} disabled={isSubmitting}>
              Use Default
            </Button>
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Selecting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Selection
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
