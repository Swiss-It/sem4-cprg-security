import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "CPRG Security Project" },
    { name: "Test site for local authentication and SSO strategies, with role based account controls", content: "Welcome to Talson's Panel" },
  ];
}

export default function Home() {
  return <Welcome />;
}
