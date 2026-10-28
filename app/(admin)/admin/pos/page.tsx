import { redirect } from "next/navigation";

/**
 * The admin panel used to carry its own copy of the POS register, with the same
 * bugs as the standalone one (always sold the first colour, ignored variant prices,
 * no stock limits). There is now a single register at /pos — admins are signed in
 * there automatically with the same session.
 */
export default function AdminPOSRedirect() {
  redirect("/pos");
}
