import { createFileRoute } from "@tanstack/react-router";
import { Route as IndexRoute } from "./index";

export const Route = createFileRoute("/r/$reportId")({
  component: IndexRoute.options.component,
});
