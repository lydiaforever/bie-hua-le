import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") || incoming.get("host") || "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return {
    title: "别花了别花了！｜朋友省钱挑战",
    description: "和朋友一起挑战每日预算，让火柴人告诉你花的钱到底有多重。",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title: "别花了别花了！", description: "你花的每一分钱，都压在了它的肩膀上。", images: [image] },
    twitter: { card: "summary_large_image", title: "别花了别花了！", description: "朋友之间的省钱挑战", images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
