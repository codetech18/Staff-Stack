import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { isDemo } from '@/lib/demo'
const NAV = [
  { to: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { to: '/staff', label: 'People', icon: 'staff' },
  { to: '/payroll', label: 'Payroll', icon: 'payroll' },
  { to: '/leave', label: 'Time off', icon: 'leave' },
  { to: '/attendance', label: 'Attendance', icon: 'attendance' },
  { to: '/subjects', label: 'Subject coverage', icon: 'subjects' },
  { to: '/compliance', label: 'Compliance', icon: 'compliance' },
]
export default function AppShell() {
  const { org, orgLoading, session, role, error, refreshOrg, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobile, setMobile] = useState(false)
  const [search, setSearch] = useState('')
  const [notifications, setNotifications] = useState(false)
  const [help, setHelp] = useState(false)
  useEffect(() => {
    if (!orgLoading && !org && !error) navigate('/onboarding')
  }, [org, orgLoading, error, navigate])
  useEffect(() => {
    setMobile(false)
    setSearch('')
    setNotifications(false)
  }, [location.pathname])
  const visibleNav =
    role === 'employee'
      ? [{ to: '/me', label: 'My workspace', icon: 'staff' }]
      : [
          ...NAV,
          ...(role === 'owner' || role === 'auditor'
            ? [{ to: '/audit', label: 'Activity log', icon: 'compliance' }]
            : []),
          ...(isDemo ? [{ to: '/me', label: 'Employee preview', icon: 'staff' }] : []),
        ]
  if (error)
    return (
      <div className="p-8">
        <p role="alert" className="text-danger mb-4">
          {error}
        </p>
        <button className="btn-primary" onClick={() => void refreshOrg()}>
          Retry workspace
        </button>
      </div>
    )
  const current = visibleNav.find((n) => n.to === location.pathname)?.label ?? 'Settings'
  return (
    <div className="app-layout">
      {mobile && (
        <button
          className="mobile-scrim"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <Link to={role === 'employee' ? '/me' : '/dashboard'} className="brand">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          staffstack<span className="brand-dot">.</span>
        </Link>
        <button className="org-switch" onClick={() => navigate('/settings')}>
          <span className="org-mark">
            <Icon name="building" size={19} />
          </span>
          <span>
            <strong>{org?.name ?? 'Your workspace'}</strong>
            <small>School workspace</small>
          </span>
          <Icon name="down" size={14} />
        </button>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="sidebar-nav">
          {visibleNav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/dashboard'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={n.icon} size={19} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-orbit">
              <Icon name="compliance" size={20} />
            </span>
            <strong>
              A little less admin.
              <br />A lot more possibility.
            </strong>
            <p>Your people, in good hands.</p>
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon name="settings" size={19} />
            Settings
          </NavLink>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <Icon name="help" size={19} />
            Help & getting started
          </button>
          <div className="account">
            <span className="account-avatar">
              {isDemo ? 'TA' : session?.user.email?.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{isDemo ? 'Tolu Adewale' : session?.user.email?.split('@')[0]}</strong>
              <small>Workspace admin</small>
            </span>
            <button
              onClick={signOut}
              aria-label={isDemo ? 'Exit demo' : 'Sign out'}
              title={isDemo ? 'Exit demo' : 'Sign out'}
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              onClick={() => setMobile(true)}
              aria-label="Open navigation"
            >
              <Icon name="menu" />
            </button>
            <span>Workspace</span>
            <Icon name="chevron" size={13} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-tools">
            <div className="global-search">
              <Icon name="search" size={16} />
              <input
                aria-label="Find a page"
                placeholder="Find a page…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌕</kbd>
              {search && (
                <div className="search-results">
                  {visibleNav
                    .filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
                    .map((n) => (
                      <Link key={n.to} to={n.to}>
                        <Icon name={n.icon} size={17} />
                        {n.label}
                        <Icon name="arrow" size={14} />
                      </Link>
                    ))}
                  {!visibleNav.some((n) =>
                    n.label.toLowerCase().includes(search.toLowerCase())
                  ) && <p>No pages found.</p>}
                </div>
              )}
            </div>
            <span className={`workspace-status ${isDemo ? 'demo-status' : ''}`}>
              <i />
              {isDemo ? 'Demo workspace' : 'Live workspace'}
            </span>
            <div className="notification-wrap">
              <button
                className="notification-button"
                aria-label="Notifications"
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="bell" size={19} />
              </button>
              {notifications && (
                <div className="notification-popover">
                  <strong>Notifications</strong>
                  <p>
                    {isDemo
                      ? 'You’re exploring a local demo. Review pending time-off requests on the overview.'
                      : 'Review time-off requests and subject coverage from your overview.'}
                  </p>
                  <Link to="/leave">Review time off →</Link>
                </div>
              )}
            </div>
            <span className="top-avatar">
              {isDemo ? 'TA' : session?.user.email?.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>Made for your people. Built for your peace of mind.</span>
          <span>StaffStack {isDemo && '· Sample data · Changes stay in this browser session'}</span>
        </footer>
      </div>
      {help && (
        <div className="help-overlay" onClick={() => setHelp(false)}>
          <section className="panel help-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <strong>Make yourself at home</strong>
              <button onClick={() => setHelp(false)} aria-label="Close help">
                <Icon name="close" />
              </button>
            </div>
            <div className="p-6">
              <p>
                Start with People to add staff and salary structures. Run payroll to calculate
                payslips, then export a bank transfer CSV.
              </p>
              <p>
                Use Time off to review requests, Attendance to mark school days, and Subject
                coverage to spot gaps before they affect your classes.
              </p>
              {isDemo && (
                <p className="demo-help">
                  This is a local sandbox with fictional people. Email delivery is disabled. To use
                  your real organisation, exit the demo and sign in.
                </p>
              )}
              <button className="btn-primary mt-4" onClick={() => setHelp(false)}>
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
