import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './app/App';
import InviteAcceptPage from './app/InviteAcceptPage';

export default function RootRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}
