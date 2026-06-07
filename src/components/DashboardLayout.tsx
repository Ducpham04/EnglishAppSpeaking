import Sidebar from './Sidebar';

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 40px', maxWidth: 'calc(100vw - 240px)' }}>
        {title && (
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: 26, color: 'var(--text-primary)', marginBottom: 28,
          }}>
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
}
