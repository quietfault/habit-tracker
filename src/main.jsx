import React from "react";
import { createRoot } from "react-dom/client";

/* Гарнитуры брендбука, самохостятся пакетами @fontsource.
   Google Fonts и любой сторонний CDN запрещены — они отдают IP
   посетителя на каждом заходе (BRANDBOOK.md §5).

   Имена семейств берутся из пакетов, а не угадываются:
   'Inter Variable' и 'JetBrains Mono' — так они себя публикуют.
   Подмножества браузер тянет по unicode-range, кириллица приедет,
   греческий и вьетнамский — нет. */
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";

/* Токены до компонентов: переменные должны быть объявлены раньше,
   чем кто-то прочитает их через getComputedStyle (см. theme.js). */
import "./tokens.css";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
