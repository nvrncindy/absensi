import { redirect } from "next/navigation";

// The actual UI lives in public/absensi.html (static page: employee
// check-in flow + admin tab). Redirect the root so visiting the deployed
// domain directly still lands somewhere useful.
export default function Home() {
  redirect("/absensi.html");
}
