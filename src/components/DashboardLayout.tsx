import Sidebar from './Sidebar';

export default function DashboardLayout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="dashboard-shell" style={{ background: 'var(--bg-base)', minHeight: '100vh', display: 'flex' }}>
      <Sidebar />
      <main className="dashboard-main" style={{ marginLeft: 260, flex: 1, padding: '32px 40px', maxWidth: 'calc(100vw - 260px)' }}>
        {title && (
          <h1 style={{
            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
            fontSize: 24, color: 'var(--text-primary)', marginBottom: 24,
          }}>
            {title}
          </h1>
        )}
        <div style={{ maxWidth: 1180 }}>
          {children}
        </div>
      </main>
    </div>
  );
}
