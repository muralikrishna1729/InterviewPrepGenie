import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
