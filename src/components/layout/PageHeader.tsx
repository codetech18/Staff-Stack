const descriptions: Record<string, string> = {
  Dashboard: 'A clear picture of your people and your operations.',
  Staff: 'Good people. One organised place to manage them.',
  Payroll: 'From salary structures to payday, with clarity at every step.',
  Leave: 'Give your people time to recharge. Keep your school covered.',
  Attendance: 'Know who’s here, and keep every school day on track.',
  Subjects: 'The right teachers, in the right classrooms.',
  Compliance: 'Keep your statutory contributions organised and visible.',
  'My workspace': 'Your payslips, leave requests, and balances in one private space.',
  'Activity log': 'A record of who changed what in your workspace.',
  Settings: 'Make this workspace work for your school.',
}
const names: Record<string, string> = {
  Staff: 'Your people',
  Leave: 'Time off',
  Subjects: 'Subject coverage',
}
export default function PageHeader({
  title,
  actions,
}: {
  title: string
  actions?: React.ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">YOUR WORKSPACE, AT A GLANCE</div>
        <h1>{names[title] ?? title}</h1>
        <p>{descriptions[title]}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
