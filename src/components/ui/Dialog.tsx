import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { MOTION_FAST } from '@/lib/motion';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
      'data-[state=open]:animate-fade-in',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = 'DialogOverlay';

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  description?: string;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, title, description, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
        'w-full max-w-lg max-h-[90vh] overflow-auto',
        'bg-bg-surface border border-border rounded-[12px] shadow-[var(--shadow-elevated)]',
        'p-6 outline-none',
        'data-[state=open]:animate-fade-in',
        className,
      )}
      {...props}
    >
      {(title || description) && (
        <div className="mb-4 pr-8">
          {title && (
            <DialogPrimitive.Title className="text-lg font-semibold text-text-primary">
              {title}
            </DialogPrimitive.Title>
          )}
          {description && (
            <DialogPrimitive.Description className="text-sm text-text-secondary mt-1">
              {description}
            </DialogPrimitive.Description>
          )}
        </div>
      )}
      {children}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-4 top-4 rounded-[6px] p-1',
          'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
          'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">关闭</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} className="max-w-md">
        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <button
              className={cn(
                'h-9 px-4 rounded-[6px] text-sm font-medium',
                'text-text-primary border border-border hover:bg-bg-elevated transition-colors',
              )}
            >
              {cancelText}
            </button>
          </DialogClose>
          <motion.button
            whileTap={{ scale: 0.98 }}
            transition={MOTION_FAST}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn(
              'h-9 px-4 rounded-[6px] text-sm font-medium text-white shadow-sm',
              destructive ? 'bg-red-500/90 hover:bg-red-500' : 'bg-accent hover:brightness-110',
              'transition-colors',
            )}
          >
            {confirmText}
          </motion.button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
