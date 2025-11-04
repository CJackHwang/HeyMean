import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';

interface MarkdownSurfaceProps {
  content?: string;
  className?: string;
  contentClassName?: string;
  contentPadded?: boolean;
  scrollable?: boolean;
  children?: React.ReactNode;
}

interface MarkdownSurfaceContentProps {
  content: string;
  className?: string;
  padded?: boolean;
}

type MarkdownSurfaceComponent = React.FC<MarkdownSurfaceProps> & {
  Content: React.FC<MarkdownSurfaceContentProps>;
};

const MarkdownSurfaceComponent: React.FC<MarkdownSurfaceProps> = ({
  content,
  children,
  className = '',
  contentClassName = '',
  contentPadded = true,
  scrollable = false,
}) => {
  const baseClasses = 'rounded-2xl bg-heymean-l dark:bg-heymean-d text-primary-text-light dark:text-primary-text-dark';
  const overflowClasses = scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden';
  const combinedClasses = [baseClasses, overflowClasses, className].filter(Boolean).join(' ').trim();

  if (content !== undefined) {
    return (
      <div className={combinedClasses}>
        <MarkdownSurfaceContent content={content} className={contentClassName} padded={contentPadded} />
      </div>
    );
  }

  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
};

const MarkdownSurfaceContent: React.FC<MarkdownSurfaceContentProps> = ({ content, className = '', padded = true }) => {
  const paddingClass = padded ? 'p-4' : '';
  const contentClasses = [paddingClass, className].filter(Boolean).join(' ').trim();

  return (
    <div className={contentClasses}>
      <MarkdownRenderer content={content} />
    </div>
  );
};

const MarkdownSurface = Object.assign(MarkdownSurfaceComponent, {
  Content: MarkdownSurfaceContent,
}) as MarkdownSurfaceComponent;

export default MarkdownSurface;
