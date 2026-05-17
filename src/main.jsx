import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import { SubscriptionProvider } from "@/context/SubscriptionContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <SubscriptionProvider>
    <App />
  </SubscriptionProvider>,
);
