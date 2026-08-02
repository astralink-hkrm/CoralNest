import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/users/")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
