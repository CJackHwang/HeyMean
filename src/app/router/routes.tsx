import React from 'react';
import HomePage from '@pages/HomePage';
import ChatPage from '@pages/ChatPage';
import SettingsPage from '@pages/SettingsPage';
import HistoryPage from '@pages/HistoryPage';
import AboutPage from '@pages/AboutPage';

export type RouteDefinition = {
  key: string;
  path?: string;
  index?: boolean;
  element: React.ReactElement;
  waitForAnchorEvent?: string;
};

export const appRoutes: RouteDefinition[] = [
  {
    key: 'index',
    index: true,
    element: <HomePage />,
  },
  {
    key: 'root',
    path: '/',
    element: <HomePage />,
  },
  {
    key: 'chat',
    path: '/chat',
    element: <ChatPage />,
    waitForAnchorEvent: 'hm:chat-anchored',
  },
  {
    key: 'settings',
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    key: 'history',
    path: '/history',
    element: <HistoryPage />,
  },
  {
    key: 'about',
    path: '/about',
    element: <AboutPage />,
  },
];
