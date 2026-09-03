import type { Metadata } from "next";
import Landing from "./components/Landing";

export const metadata: Metadata = {
  title: "IT Live Academy – Kelajak kasblarini biz bilan o'rganing",
  description:
    "IT Live Academy onlayn kurslari: dasturlash, dizayn va boshqa yo'nalishlar bo'yicha amaliyotchi mentorlar bilan o'rganing.",
};

export default function HomePage() {
  return <Landing />;
}
