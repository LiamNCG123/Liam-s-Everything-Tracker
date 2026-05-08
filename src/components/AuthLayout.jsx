export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-theme-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-theme-primary mb-1">Spora</div>
          <div className="text-sm text-theme-muted">Your personal tracker</div>
        </div>
        <div className="bg-theme-card rounded-2xl shadow-sm border border-theme-subtle p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
