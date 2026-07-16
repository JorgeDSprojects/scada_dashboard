import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { EditorRoutePage } from "./pages/EditorPage";
import { MainPage } from "./pages/MainPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/editor/:id" element={<EditorRoutePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
