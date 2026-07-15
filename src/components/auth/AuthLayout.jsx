import { isStaticDemoHost } from '../../services/demoAuth'

const AuthLayout = ({ title, subtitle, children }) => {
  const demo = isStaticDemoHost()

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-panel">
          <div className="auth-card">
            <div className="auth-card-head">
              <h2>{title}</h2>
              {subtitle && <p>{subtitle}</p>}
              {demo && (
                <p className="auth-demo-note">
                  GitHub Pages demo — accounts are saved in this browser.
                  Try <strong>demo</strong> / <strong>demo123</strong> or create a new account.
                </p>
              )}
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthLayout
