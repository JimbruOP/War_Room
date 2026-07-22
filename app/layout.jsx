import "./globals.css";

export const metadata = {
  title: "War Room — Rapid Response Desk",
  description: "Political intelligence and rapid-response tool for a comms team.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
