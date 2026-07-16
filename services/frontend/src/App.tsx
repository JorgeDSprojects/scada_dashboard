import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { EditorRoutePage } from "./pages/EditorPage";
import { FixedViewRoutePage } from "./pages/FixedViewPage";
import { MainPage } from "./pages/MainPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/editor/:id" element={<EditorRoutePage />} />
        <Route path="/fixed/:id" element={<FixedViewRoutePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
