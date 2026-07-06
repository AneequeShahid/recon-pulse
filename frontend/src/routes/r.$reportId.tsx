import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "../components/Dashboard";

export const Route = createFileRoute("/r/$reportId")({
  component: Dashboard,
});
