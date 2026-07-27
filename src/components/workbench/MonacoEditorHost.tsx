import React from 'react';
import { CodeEditorHost } from './CodeEditorHost';

export const MonacoEditorHost: React.FC<React.ComponentProps<typeof CodeEditorHost>> = (props) => {
  return <CodeEditorHost {...props} />;
};
