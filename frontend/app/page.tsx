"use client";
import { useState } from 'react';
import HomePage from './pages/HomePage';
import ResultsPage from './results/page';





export default function PageController() {
  const [page, setPage] = useState('home');
  

  return (
    <HomePage />
  );
};