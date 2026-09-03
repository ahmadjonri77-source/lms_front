"use client";

import Image from "next/image";

/* rasm bo'lmasa ism bosh harfi ko'rsatiladi; rang ismdan hisoblanadi,
   shuning uchun server va klientda bir xil chiqadi (hydration xavfsiz) */
const COLORS = [
  "#C43A76",
  "#3B82F6",
  "#0EA5E9",
  "#8B5CF6",
  "#F59E0B",
  "#10B981",
  "#EF4444",
  "#6366F1",
];

function initialOf(name: string) {
  const ch = (name || "").trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function colorOf(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({
  file,
  name,
  size = 30,
}: {
  /* backend'dagi fayl nomi; null bo'lsa bosh harf chiziladi */
  file: string | null;
  name: string;
  size?: number;
}) {
  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
  };

  if (file) {
    return (
      <div style={box}>
        <Image
          src={`/uploads/images/${file}`}
          alt=""
          width={size}
          height={size}
          unoptimized
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      style={{
        ...box,
        background: colorOf(name || "?"),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: Math.round(size * 0.42),
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {initialOf(name)}
    </div>
  );
}
