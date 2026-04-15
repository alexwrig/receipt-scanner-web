import './globals.css';

export const metadata = {
  title: 'Receipt Scanner',
  description: 'Extract receipt data and export to Excel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
