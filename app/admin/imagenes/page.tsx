import { redirect } from "next/navigation";

export default function ImagenesRedirect() {
  redirect("/admin?section=imagenes");
}
