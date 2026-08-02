import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/publishers/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
