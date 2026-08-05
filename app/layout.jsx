import "./globals.css";
import PushInit from "@/components/PushInit";

export const metadata = {
  title: "War Room — Rapid Response Desk",
  description: "Political intelligence and rapid-response tool for a comms team.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "War Room",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14141a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PushInit />
      </body>
    </html>
  );
}
