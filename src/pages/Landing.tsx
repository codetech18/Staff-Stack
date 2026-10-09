import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '@/components/ui/Icon'
import { useAuth } from '@/lib/auth'
import { useScrollReveal } from '@/lib/useScrollReveal'
import './landing.css'

type PreviewTab = 'dashboard' | 'staff' | 'payroll' | 'subjects'
const tabs: { id: PreviewTab; label: string; short: string; title: string; description: string }[] = [
  { id: 'dashboard', label: 'Your school at a glance', short: 'Overview', title: 'A clearer start to every school day.', description: 'See your people, upcoming payroll, and time-off requests together. Know what needs your attention before the day gets busy.' },
  { id: 'staff', label: 'People, all together', short: 'People', title: 'Every person. One place.', description: 'Keep teaching and non-teaching staff records, departments, salary structures, and bank details in one organised workspace.' },
  { id: 'payroll', label: 'A calmer payday', short: 'Payroll', title: 'Bring a little order to payday.', description: 'Prepare monthly payroll, review deductions and payslips, then export a salary file for your bank. You stay in control of the payment.' },
  { id: 'subjects', label: 'Coverage you can see', short: 'Coverage', title: 'Keep your classrooms covered.', description: 'Connect teachers to subjects and class levels. See unassigned subjects and single-teacher coverage before making staffing decisions.' },
]
const people = [
  { initials: 'AO', name: 'Adesola Okafor', role: 'Mathematics teacher', department: 'Secondary', salary: '₦310,000', color: 'sage' },
  { initials: 'CE', name: 'Chinedu Eze', role: 'Science teacher', department: 'Secondary', salary: '₦285,000', color: 'sand' },
  { initials: 'FB', name: 'Fatima Bello', role: 'Head of primary', department: 'Primary', salary: '₦420,000', color: 'pink' },
]

function Brand() {
  return <Link to="/" className="lp-brand" aria-label="StaffStack home"><span className="lp-brand-mark" aria-hidden="true"><i /><i /><i /></span>staffstack<span className="lp-brand-period">.</span></Link>
}

function SampleWorkspace({ tab = 'dashboard', compact = false }: { tab?: PreviewTab; compact?: boolean }) {
  return <div className={`lp-workspace ${compact ? 'lp-workspace-compact' : ''}`}>
    <aside className="lp-preview-sidebar" aria-hidden="true">
      <div className="lp-preview-logo"><span className="lp-brand-mark"><i /><i /><i /></span><b>staffstack.</b></div>
      <div className="lp-preview-school"><Icon name="building" size={17} /><span>Greenfield Academy<small>School workspace</small></span></div>
      <span className="lp-preview-caption">WORKSPACE</span>
      {tabs.map(item => <div key={item.id} className={`lp-preview-nav ${item.id === tab ? 'selected' : ''}`}><Icon name={item.id} size={16} />{item.short}</div>)}
      <div className="lp-preview-nav"><Icon name="leave" size={16} />Time off</div>
      <div className="lp-preview-nav"><Icon name="attendance" size={16} />Attendance</div>
      <div className="lp-preview-sidebar-bottom">A little less admin.<br />A lot more possibility.<span>Made for your people.</span></div>
    </aside>
    <div className="lp-preview-main">
      <div className="lp-preview-top"><span>Workspace <span>/</span> {tabs.find(t => t.id === tab)?.short}</span><span className="lp-sample-tag">Sample data</span></div>
      <div className="lp-preview-body">
        <div className="lp-preview-heading"><div><span className="lp-small-label">GREENFIELD ACADEMY</span><h3>{tab === 'dashboard' ? 'A good day starts here.' : tab === 'staff' ? 'Good people. Great school.' : tab === 'payroll' ? 'Let’s get payday ready.' : 'Every classroom, considered.'}</h3><p>{tab === 'dashboard' ? 'A little clarity for your school day.' : tab === 'staff' ? 'Your team, together in one place.' : tab === 'payroll' ? 'October 2026 · Monthly payroll' : 'First term · 2026 / 2027'}</p></div><span className="lp-preview-date">October 2026</span></div>
        {tab === 'dashboard' && <>
          <div className="lp-preview-stats"><div><span>Total people</span><strong>12 <small>staff members</small></strong><Icon name="staff" size={18} /></div><div><span>Monthly gross payroll</span><strong>₦3.66m</strong><Icon name="payroll" size={18} /></div><div><span>On leave today</span><strong>2 <small>people</small></strong><Icon name="leave" size={18} /></div></div>
          <div className="lp-preview-columns"><div className="lp-preview-panel"><div className="lp-preview-panel-title">Payroll overview <span>Last 6 months</span></div><div className="lp-chart" role="img" aria-label="Illustrative monthly payroll bar chart from May to October">{[48, 64, 57, 74, 69, 87].map((height, i) => <div key={i}><span style={{ height: `${height}%` }} /><small>{['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][i]}</small></div>)}</div><div className="lp-chart-key"><i /> Monthly gross payroll</div></div><div className="lp-preview-panel lp-today"><div className="lp-preview-panel-title">On your radar <span>Today</span></div><div><span className="lp-task-icon"><Icon name="leave" size={17} /></span><p><b>3 time-off requests</b><small>Ready for your review</small></p><Icon name="chevron" size={14} /></div><div><span className="lp-task-icon amber"><Icon name="subjects" size={17} /></span><p><b>Fine arts needs cover</b><small>No teacher assigned · JSS1</small></p><Icon name="chevron" size={14} /></div><div className="lp-payday-note"><span>Next salary day</span><b>25 October <Icon name="payroll" size={18} /></b><small>A little planning. A calmer payday.</small></div></div></div>
          <div className="lp-preview-panel lp-team-preview"><div className="lp-preview-panel-title">The people behind your school <span>12 staff members</span></div><div className="lp-mini-team">{people.map(p => <div key={p.initials}><span className={`lp-avatar ${p.color}`}>{p.initials}</span><span><b>{p.name}</b><small>{p.role}</small></span><span className="lp-person-status">{p.initials === 'FB' ? 'On leave' : 'Active'}</span></div>)}</div></div>
        </>}
        {tab === 'staff' && <><div className="lp-preview-stats"><div><span>Your people</span><strong>12</strong></div><div><span>Departments</span><strong>4</strong></div><div><span>Teaching staff</span><strong>8</strong></div></div><div className="lp-preview-panel"><div className="lp-preview-panel-title">Staff directory <span>Teaching & non-teaching</span></div><div className="lp-sample-table"><div className="lp-table-head"><span>NAME & ROLE</span><span>DEPARTMENT</span><span>STATUS</span></div>{people.map(p => <div className="lp-table-row" key={p.initials}><span className="lp-person-cell"><span className={`lp-avatar ${p.color}`}>{p.initials}</span><span><b>{p.name}</b><small>{p.role}</small></span></span><span>{p.department}</span><span><span className="lp-status-pill">{p.initials === 'FB' ? 'On leave' : 'Active'}</span></span></div>)}</div></div><div className="lp-preview-tip"><Icon name="staff" size={19} /><span>From the classroom to the front office.<small>Salary structures and bank details stay with each person’s record.</small></span></div></>}
        {tab === 'payroll' && <><div className="lp-preview-stats"><div><span>Gross payroll</span><strong>₦3.66m</strong></div><div><span>People included</span><strong>12</strong></div><div><span>Run status</span><strong className="lp-draft">Draft</strong></div></div><div className="lp-preview-panel"><div className="lp-preview-panel-title">October payroll <span>Sample salary structures</span></div><div className="lp-sample-table"><div className="lp-table-head"><span>EMPLOYEE</span><span>GROSS SALARY</span><span>PAYSLIP</span></div>{people.map(p => <div className="lp-table-row" key={p.initials}><span className="lp-person-cell"><span className={`lp-avatar ${p.color}`}>{p.initials}</span><span><b>{p.name}</b><small>{p.role}</small></span></span><span>{p.salary}</span><span className="lp-status-pill">Prepared</span></div>)}</div></div><div className="lp-preview-tip"><Icon name="download" size={20} /><span>Review. Approve. Export.<small>Prepare a bank transfer file after reviewing your payroll.</small></span></div></>}
        {tab === 'subjects' && <><div className="lp-preview-stats"><div><span>Subjects tracked</span><strong>6</strong></div><div><span>Unassigned</span><strong>1</strong></div><div><span>Single-teacher subjects</span><strong>2</strong></div></div><div className="lp-preview-panel"><div className="lp-preview-panel-title">Subject coverage <span>See where support is needed</span></div><div className="lp-coverage-row"><span><b>Mathematics</b><small>SS2 · 2 teachers assigned</small></span><span className="lp-status-pill">Covered</span></div><div className="lp-coverage-row"><span><b>English language</b><small>SS2 · 1 teacher assigned</small></span><span className="lp-status-pill warning">Single teacher</span></div><div className="lp-coverage-row"><span><b>Fine arts</b><small>JSS1 · No teacher assigned</small></span><span className="lp-status-pill warning">Needs cover</span></div></div><div className="lp-preview-tip"><Icon name="subjects" size={20} /><span>A little visibility goes a long way.<small>Check a teacher’s subjects when reviewing their leave request.</small></span></div></>}
      </div>
    </div>
  </div>
}

const faqs = [
  ['Who is StaffStack for?', 'StaffStack brings people and payroll administration together for Nigerian schools. School owners, administrators, and finance teams can manage teaching and non-teaching staff in the same workspace.'],
  ['What do I need to get started?', 'Create an account, set up your school and departments, then add your staff and salary structures. You can build your workspace gradually before preparing your first payroll.'],
  ['Does StaffStack transfer salaries to staff?', 'StaffStack prepares payroll and bank-ready CSV exports for supported banks, including GTBank, Access, and Zenith. You upload the file to your bank and complete the transfer there. StaffStack does not move money.'],
  ['Can I manage leave and teaching coverage together?', 'Yes. Assign teachers to subjects and class levels, then see their assigned subjects when reviewing leave requests. The coverage view also highlights unassigned subjects and subjects with only one teacher.'],
  ['Can I explore the product before signing up?', 'Yes. The interactive preview on this page shows example screens for people, payroll, and coverage using fictional school data. It is a walkthrough; creating an account gives you your own workspace.'],
]

export default function Landing() {
  const { session, role } = useAuth()
  const revealRoot = useScrollReveal()
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState<PreviewTab>('dashboard')
  const [previewPlaying, setPreviewPlaying] = useState(true)

  useEffect(() => {
    if (!previewPlaying) return
    const timer = window.setTimeout(() => {
      setTab(current => tabs[(tabs.findIndex(item => item.id === current) + 1) % tabs.length].id)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [tab, previewPlaying])
  const workspacePath = role === 'employee' ? '/me' : '/dashboard'
  return <div className="landing" ref={revealRoot}>
    <a className="lp-skip" href="#main">Skip to content</a>
    <header className="lp-header" onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false) }}><div className="lp-container lp-nav"><Brand /><nav id="landing-navigation" className={menuOpen ? 'lp-nav-links is-open' : 'lp-nav-links'} aria-label="Main navigation"><a href="#workspace" onClick={() => setMenuOpen(false)}>The workspace</a><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#questions" onClick={() => setMenuOpen(false)}>FAQs</a><Link className="lp-mobile-login" to={session ? workspacePath : '/login'}>{session ? 'Your workspace' : 'Log in'}</Link></nav><div className="lp-nav-actions"><Link className="lp-login" to={session ? workspacePath : '/login'}>{session ? 'Your workspace' : 'Log in'}<Icon name="arrow" size={16} /></Link><Link className="lp-button lp-button-small" to={session ? workspacePath : '/signup'}>{session ? 'Open workspace' : 'Get started'}<Icon name="arrow" size={16} /></Link><button className="lp-menu-toggle" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button></div></div></header>
    <main id="main">
      <section className="lp-hero"><div className="lp-container lp-hero-grid"><div className="lp-hero-copy" data-reveal="rise"><div className="lp-eyebrow"><span /> A LITTLE LESS ADMIN. A LOT MORE POSSIBILITY.</div><h1>Great schools<br />start with<br /><em>supported people.</em></h1><p>People, payroll, and the everyday in between.<br className="lp-desktop-break" /> One thoughtful workspace for Nigerian schools.</p><div className="lp-hero-actions"><Link className="lp-button" to={session ? workspacePath : '/signup'}>{session ? 'Open your workspace' : 'Create your school workspace'}<Icon name="arrow" size={19} /></Link><a className="lp-text-link" href="#workspace"><span className="lp-play" aria-hidden="true">▷</span>Take a look inside</a></div><div className="lp-hero-footnote"><Icon name="check" size={15} /> Built around your school day <span>·</span> Made for Nigeria</div></div><div className="lp-hero-art" data-reveal="scale" data-reveal-delay="1"><div className="lp-orbit lp-orbit-one" /><div className="lp-orbit lp-orbit-two" /><span className="lp-art-spark" aria-hidden="true">✳</span><div className="lp-hero-window"><SampleWorkspace compact /></div><div className="lp-floating lp-floating-pay"><span className="lp-floating-icon"><Icon name="check" size={20} /></span><span><small>A little peace of mind</small><strong>Payday, prepared.</strong></span><span className="lp-floating-dot" /></div><div className="lp-floating lp-floating-people"><div className="lp-avatar-stack"><span className="lp-avatar sage">AO</span><span className="lp-avatar sand">CE</span><span className="lp-avatar pink">FB</span></div><span>Good people.<br /><b>In good hands.</b></span></div><span className="lp-art-note">Your school, a little more in sync.<svg width="62" height="35" viewBox="0 0 62 35" fill="none" aria-hidden="true"><path d="M2 28C22 35 43 26 53 7M44 9l11-6 4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg></span></div></div></section>
      <div className="lp-capabilities" data-reveal="rise"><div className="lp-container"><span>ONE WORKSPACE.<br /><b>THE WHOLE SCHOOL.</b></span>{[{ name: 'Your people', icon: 'staff' }, { name: 'Monthly payroll', icon: 'payroll' }, { name: 'Time off', icon: 'leave' }, { name: 'Attendance', icon: 'attendance' }, { name: 'Subject coverage', icon: 'subjects' }].map(item => <div key={item.name}><Icon name={item.icon} size={22} />{item.name}</div>)}</div></div>
      <section className="lp-section lp-intro"><div className="lp-container"><span className="lp-eyebrow">MORE SPACE FOR WHAT MATTERS</span><div className="lp-intro-grid"><h2 data-reveal="rise">You run a school.<br />Let’s make the admin lighter.</h2><p data-reveal="rise" data-reveal-delay="1">Between spreadsheets, salary calculations, and “who’s covering that class?”, there’s a lot to hold together. Give your team one place to keep the everyday moving.</p></div></div></section>
      <section className="lp-workspace-section" id="workspace">
        <div className="lp-container">
          <div className="lp-section-top">
            <span className="lp-eyebrow">MEET YOUR NEW WORKSPACE</span>
            <div className="lp-preview-controls">
              <span className="lp-section-note">A real feel for the everyday.</span>
              <button
                className="lp-preview-playback"
                type="button"
                onClick={() => setPreviewPlaying(playing => !playing)}
                aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}
              >
                <span aria-hidden="true">{previewPlaying ? 'Ⅱ' : '▷'}</span>
                {previewPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
          </div>
          <div className="lp-preview-tabs" data-reveal="rise" role="tablist" aria-label="Explore the workspace">
            {tabs.map(item => (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                aria-selected={tab === item.id}
                aria-controls={`workspace-preview-${item.id}`}
                tabIndex={tab === item.id ? 0 : -1}
                onClick={() => setTab(item.id)}
                onKeyDown={event => {
                  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
                  event.preventDefault()
                  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
                    : (tabs.findIndex(t => t.id === item.id) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
                  setTab(tabs[next].id)
                  document.getElementById(`tab-${tabs[next].id}`)?.focus()
                }}
              >
                <Icon name={item.id} size={19} />{item.label}<Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
          <div className="lp-preview-slides" data-reveal="scale" aria-live="off">
            {tabs.map(item => (
              <div
                key={item.id}
                id={`workspace-preview-${item.id}`}
                className={`lp-preview-slide ${tab === item.id ? 'is-active' : ''}`}
                role="tabpanel"
                aria-labelledby={`tab-${item.id}`}
                aria-hidden={tab !== item.id}
                tabIndex={tab === item.id ? 0 : -1}
              >
                <div className="lp-preview-description"><h3>{item.title}</h3><p>{item.description}</p></div>
                <div className="lp-preview-stage">
                  <SampleWorkspace tab={item.id} />
                  <span className="lp-preview-stage-note"><span /> Greenfield Academy is a fictional school. Preview only.</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="lp-section lp-benefits"><div className="lp-container"><div className="lp-section-top"><span className="lp-eyebrow">THOUGHTFUL DETAILS. BETTER DAYS.</span></div><div className="lp-benefit-grid"><article className="lp-payroll-card" data-reveal="left"><div className="lp-card-icon"><Icon name="payroll" size={24} /></div><h2>A calmer end<br />to every month.</h2><p>Bring salary structures, deductions, and payslips into a clear payroll workflow. Prepare your bank export when you’re ready.</p><div className="lp-payroll-flow"><span><Icon name="check" size={15} /> Prepare</span><i /><span><Icon name="check" size={15} /> Review</span><i /><span><Icon name="download" size={15} /> Export</span></div><div className="lp-export-file"><span className="lp-file-icon"><Icon name="payroll" size={22} /></span><span><b>October salary export</b><small>Bank-ready CSV · Your next step, sorted</small></span><Icon name="download" size={20} /></div><span className="lp-card-footnote">You make the transfer through your bank.</span></article><article className="lp-coverage-card" data-reveal="right" data-reveal-delay="1"><div className="lp-card-icon"><Icon name="subjects" size={24} /></div><h2>Ahead of the gaps.<br />There for your team.</h2><p>Time off is part of life. See a teacher’s assigned subjects alongside their leave request, so you can plan with the whole school in mind.</p><div className="lp-leave-card"><div className="lp-leave-person"><span className="lp-avatar sage">AO</span><span><b>Adesola Okafor</b><small>Annual leave · 5 days</small></span><span className="lp-status-pill warning">Pending</span></div><div className="lp-leave-subjects"><span>SUBJECTS TO CONSIDER</span><div><span>Mathematics · SS2</span><span>Basic science · JSS1</span></div></div><div className="lp-coverage-notice"><Icon name="subjects" size={17} />See the coverage. Make a considered decision.</div></div></article></div></div></section>
      <section className="lp-section lp-steps" id="how-it-works"><div className="lp-container"><span className="lp-eyebrow">A FRESH START, WITHOUT THE FUSS</span><h2 data-reveal="rise">A little setup.<br /><em>A better everyday.</em></h2><div className="lp-steps-grid">{[{ title: 'Make yourself at home', text: 'Create your account and set up your school, departments, and salary day.', icon: 'building' }, { title: 'Bring your people together', text: 'Add your staff, their salary structures, bank details, and teaching assignments.', icon: 'staff' }, { title: 'Find your new rhythm', text: 'Prepare payroll, keep up with attendance, and make room for time off.', icon: 'check' }].map((step, i) => <article key={step.title} data-reveal="rise" data-reveal-delay={i}><div className="lp-step-number"><span>0{i + 1}</span><Icon name={step.icon} size={23} /></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></div></section>
      <section className="lp-section lp-faq" id="questions"><div className="lp-container lp-faq-grid"><div data-reveal="rise"><span className="lp-eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</span><h2>Good questions.<br />Clear answers.</h2><p>Get to know StaffStack<br />before you make yourself at home.</p><a className="lp-text-link" href="#workspace">Explore the workspace <Icon name="arrow" size={18} /></a></div><div className="lp-faq-list">{faqs.map(([question, answer]) => <details key={question} data-reveal="rise"><summary>{question}<span className="lp-faq-plus" aria-hidden="true"><Icon name="plus" size={18} /></span></summary><p>{answer}</p></details>)}</div></div></section>
      <section className="lp-closing"><div className="lp-container lp-closing-inner"><span className="lp-eyebrow">PEOPLE FIRST. ALWAYS.</span><h2 data-reveal="rise">Make room for<br /><em>what matters.</em></h2><p data-reveal="rise" data-reveal-delay="1">A little less admin. A little more time for your people.</p><Link className="lp-button lp-button-lime" data-reveal="rise" data-reveal-delay="2" to={session ? workspacePath : '/signup'}>{session ? 'Open your workspace' : 'Create your school workspace'}<Icon name="arrow" size={20} /></Link><div className="lp-closing-flower" aria-hidden="true">✳</div><div className="lp-closing-orbit" aria-hidden="true" /></div></section>
    </main>
    <footer className="lp-footer"><div className="lp-container"><div className="lp-footer-top" data-reveal="rise"><div><Brand /><p>Made for your people.<br />Built for your peace of mind.</p></div><nav aria-label="Footer navigation"><a href="#workspace">The workspace</a><a href="#how-it-works">How it works</a><a href="#questions">FAQs</a><Link to="/login">Log in <Icon name="arrow" size={14} /></Link></nav><span className="lp-made-in"><span /> Thoughtfully built for Nigerian schools.</span></div><div className="lp-footer-bottom"><span>© {new Date().getFullYear()} StaffStack</span><span>People. Payroll. Possibility.</span><a href="#main">Back to top ↑</a></div></div></footer>
  </div>
}
