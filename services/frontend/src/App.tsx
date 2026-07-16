import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { MainPage } from "./pages/MainPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
