import React from 'react';
import { HashRouter } from 'react-router-dom';
import AnimatedRoutes from './AnimatedRoutes';

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <AnimatedRoutes />
    </HashRouter>
  );
};

export default AppRouter;
