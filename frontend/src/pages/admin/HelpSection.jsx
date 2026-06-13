import { useState } from 'react';

export default function AdminHelpSection() {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const helpSections = [
    {
      id: 'dashboard',
      title: '📊 Dashboard Overview',
      icon: '📊',
      content: `The Admin Dashboard provides a comprehensive overview of your entire school management system.
      
**Key Metrics:**
- Total Students: View the current number of enrolled students
- Staff Members: Track total teaching and support staff
- Attendance Rate: Monitor overall student attendance
- Fee Collection Status: See pending and collected fees

**Quick Actions:**
- Click any metric card to navigate to that section
- Use the "At-Risk Students" panel to identify students needing attention
- Access recent announcements directly from the dashboard

**Best Practices:**
- Check the dashboard daily for important metrics
- Review at-risk students weekly
- Monitor fee collection status regularly`
    },
    {
      id: 'students',
      title: '🎓 Students Management',
      icon: '🎓',
      content: `Manage all student information, enrollment, and academic records.

**Features:**
- **Search & Filter**: Find students by name, email, or level
- **Add New Students**: Register new beneficiaries with complete details
- **View Profiles**: Access detailed student information including:
  - Personal information (name, contact, address)
  - Academic records (current level, school)
  - Attendance history
  - Fee payment status
  - Health records
  - Portfolio items

**How to Add a Student:**
1. Click "Add New Student" button
2. Fill in required fields (name, email, date of birth)
3. Select school level and project number
4. Add guardian information
5. Click "Create Student"

**Managing Students:**
- Click "View" to see full student profile
- Use "Edit" to update student information
- "Deactivate" to mark a student as inactive
- Export student data using the export button`
    },
    {
      id: 'users',
      title: '👥 Users Management',
      icon: '👥',
      content: `Control system access and manage user accounts.

**User Roles:**
- **Admin**: Full system access and management
- **Staff**: Can record attendance, view students, manage announcements
- **Teacher**: Similar to staff with additional grading capabilities
- **Student**: Limited access to their own data
- **Parent**: View their child's information

**Creating New Users:**
1. Navigate to Users section
2. Click "Add User"
3. Enter user details (name, email, role)
4. Set initial password
5. Assign appropriate role
6. Save user

**User Management Tasks:**
- **Activate/Deactivate**: Control user access to the system
- **Reset Password**: Help users who forgot their password
- **Change Role**: Update user permissions
- **View Activity Logs**: Track user actions in the system`
    },
    {
      id: 'staff',
      title: '👨‍🏫 Staff Management',
      icon: '👨‍🏫',
      content: `Manage teaching and support staff members.

**Staff Information Tracked:**
- Personal details (name, contact, address)
- Employment information (hire date, position)
- Department and subject assignments
- Performance records
- Attendance and leave tracking

**Staff Actions:**
- **Add Staff**: Create new staff member profiles
- **Assign Subjects**: Link staff to teaching subjects
- **Schedule Management**: Set teaching schedules
- **Performance Review**: Track and record evaluations

**Best Practices:**
- Keep staff contact information updated
- Regularly review staff assignments
- Document all performance reviews
- Maintain accurate attendance records`
    },
    {
      id: 'beneficiaries',
      title: '❤️ Beneficiaries Management',
      icon: '❤️',
      content: `Track and manage sponsored children (beneficiaries).

**Beneficiary Program Features:**
- **Sponsorship Tracking**: Link beneficiaries to sponsors
- **Project Numbers**: Assign and manage project identifiers
- **Progress Monitoring**: Track educational and personal development
- **Communication**: Manage letters and updates to sponsors

**Key Information:**
- Beneficiary number and project number
- Sponsor details and communication history
- Educational progress and milestones
- Health and wellness updates
- Family and community information

**Monthly Tasks:**
- Update beneficiary progress reports
- Review sponsor communications
- Check health and wellness status
- Document educational achievements`
    },
    {
      id: 'announcements',
      title: '📢 Announcements',
      icon: '📢',
      content: `Broadcast important messages to students, staff, or everyone.

**Creating Announcements:**
1. Click "Create Announcement"
2. Enter a clear title
3. Write detailed message content
4. Select target audience (Students, Staff, or All)
5. Set priority level (Normal, Important, Urgent)
6. Publish or schedule for later

**Announcement Types:**
- **General**: School-wide information
- **Academic**: Exam schedules, results, academic calendar
- **Events**: Upcoming activities and programs
- **Emergency**: Urgent notifications requiring immediate attention

**Best Practices:**
- Use clear, concise titles
- Include all relevant details in the content
- Set appropriate priority levels
- Schedule announcements for optimal visibility`
    },
    {
      id: 'reports',
      title: '📈 Reports & Analytics',
      icon: '📈',
      content: `Generate and view comprehensive reports and analytics.

**Available Reports:**
- **Student Performance**: Academic results analysis
- **Attendance Reports**: Daily, weekly, monthly attendance
- **Fee Collection**: Payment status and financial reports
- **Health Records**: Wellness and medical tracking
- **Activity Participation**: Engagement metrics

**Report Features:**
- **Date Range Selection**: Custom reporting periods
- **Export Options**: PDF, Excel, CSV formats
- **Visual Charts**: Graphs and charts for data visualization
- **Filtering**: Narrow reports by class, subject, or student

**Generating Reports:**
1. Select report type
2. Choose date range
3. Apply filters (optional)
4. Click "Generate Report"
5. View or download results`
    },
    {
      id: 'results',
      title: '📝 Results Management',
      icon: '📝',
      content: `Manage student academic results and grading.

**Grade Management:**
- **Upload Results**: Bulk import or manual entry
- **Grade Calculation**: Automatic GPA calculation
- **Report Cards**: Generate printable report cards
- **Progress Tracking**: Monitor student improvement

**Result Entry Process:**
1. Select term/semester
2. Choose subject and class
3. Enter student grades
4. Review and verify entries
5. Publish results to students

**Grading System:**
- Letter grades (A, B, C, D, F)
- Percentage scores
- GPA calculation (4.0 scale)
- Class rank calculation

**Best Practices:**
- Double-check all grade entries
- Publish results promptly after verification
- Maintain grade confidentiality
- Document any grade changes with reasons`
    },
    {
      id: 'fees',
      title: '💳 Fee Management',
      icon: '💳',
      content: `Track and manage student fee payments.

**Fee Tracking:**
- **Payment Recording**: Log fee payments manually
- **Status Monitoring**: Track pending, partial, and completed payments
- **Payment History**: View complete payment records
- **Receipt Generation**: Create payment receipts

**Fee Structure:**
- Tuition fees
- Activity fees
- Health fees
- Miscellaneous charges

**Recording Payments:**
1. Find student record
2. Navigate to Fees section
3. Click "Record Payment"
4. Enter amount and payment method
5. Add receipt number
6. Save payment

**Reports:**
- Outstanding fees summary
- Collection reports by period
- Student payment history
- Payment method breakdown`
    },
    {
      id: 'activities',
      title: '📅 Activities Management',
      icon: '📅',
      content: `Organize and track school activities and events.

**Activity Types:**
- **Sports**: Athletic events and competitions
- **Academic**: Quiz bowls, science fairs, debates
- **Cultural**: Music, dance, drama performances
- **Community**: Service projects and outreach

**Creating Activities:**
1. Click "Create Activity"
2. Enter activity name and description
3. Set date, time, and location
4. Add participation criteria
5. Publish to students

**Tracking Participation:**
- Record student attendance
- Document achievements and awards
- Take photos and notes
- Update parents and sponsors

**Best Practices:**
- Plan activities well in advance
- Communicate clearly with students
- Document all events with photos
- Recognize student participation`
    },
    {
      id: 'health',
      title: '🏥 Health Records',
      icon: '🏥',
      content: `Maintain student health and wellness records.

**Health Information Tracked:**
- Medical history and conditions
- Immunization records
- Allergies and medications
- Growth monitoring (height, weight)
- Vision and hearing screenings
- Dental check-ups

**Recording Health Data:**
1. Access student profile
2. Navigate to Health section
3. Click "Add Health Record"
4. Select record type
5. Enter medical details
6. Upload documents (optional)
7. Save record

**Health Monitoring:**
- Schedule regular check-ups
- Track immunization compliance
- Monitor chronic conditions
- Maintain emergency contact information

**Confidentiality:**
- Health records are strictly confidential
- Only authorized staff can access
- Follow data protection guidelines
- Obtain parental consent for sharing`
    },
    {
      id: 'activity-logs',
      title: '📜 Activity Logs',
      icon: '📜',
      content: `Monitor system usage and track user activities.

**Logged Activities:**
- User login/logout events
- Data modifications (create, update, delete)
- File uploads and downloads
- Permission changes
- Failed login attempts

**Log Information Includes:**
- User who performed the action
- Timestamp of the activity
- Type of action performed
- Affected records or data
- IP address and device information

**Using Activity Logs:**
- **Security Monitoring**: Detect unauthorized access
- **Audit Trail**: Track data changes for accountability
- **Troubleshooting**: Identify system issues
- **Compliance**: Meet regulatory requirements

**Filtering Logs:**
1. Select date range
2. Choose user (optional)
3. Filter by action type
4. Click "Search"
5. Export results if needed`
    },
    {
      id: 'settings',
      title: '⚙️ System Settings',
      icon: '⚙️',
      content: `Configure system preferences and settings.

**Available Settings:**
- **School Information**: Name, logo, contact details
- **Academic Calendar**: Terms, holidays, exam periods
- **Grading System**: Grade scales and passing marks
- **Fee Structure**: Define fee categories and amounts
- **User Permissions**: Custom role permissions
- **Notifications**: Email and system notification settings
- **Backup**: Data backup and restore options

**Configuring Settings:**
1. Navigate to Settings
2. Select setting category
3. Make desired changes
4. Click "Save Changes"
5. Confirm updates

**Important Settings:**
- **School Year**: Set current academic year
- **Grade Levels**: Define available class levels
- **Subjects**: Add or modify subject list
- **Payment Methods**: Configure accepted payment types

**Backup & Security:**
- Schedule automatic backups
- Set password policies
- Enable two-factor authentication
- Configure session timeout`
    }
  ];

  const workflowSteps = [
    {
      phase: 'Start of Academic Year',
      steps: [
        '1. Update school year in Settings',
        '2. Review and update fee structure',
        '3. Create class schedules',
        '4. Enroll or re-enroll students',
        '5. Assign teachers to subjects',
        '6. Set up academic calendar',
        '7. Communicate important dates to stakeholders'
      ]
    },
    {
      phase: 'Daily Operations',
      steps: [
        '1. Monitor attendance rates',
        '2. Review and respond to announcements',
        '3. Process fee payments',
        '4. Handle student/parent inquiries',
        '5. Update student records as needed',
        '6. Review activity logs for security',
        '7. Check system notifications'
      ]
    },
    {
      phase: 'End of Term',
      steps: [
        '1. Collect and verify all grades',
        '2. Calculate student GPAs and rankings',
        '3. Generate report cards',
        '4. Review attendance records',
        '5. Update beneficiary progress reports',
        '6. Conduct staff performance reviews',
        '7. Prepare term summary reports'
      ]
    },
    {
      phase: 'Monthly Tasks',
      steps: [
        '1. Generate fee collection reports',
        '2. Update beneficiary sponsor communications',
        '3. Review and update health records',
        '4. Schedule upcoming activities',
        '5. Backup system data',
        '6. Review user access and permissions',
        '7. Plan next month activities'
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Help Center</h1>
        <p className="text-white/60">Complete guide to managing the CompassionEdu platform</p>
      </div>

      {/* Workflow Section */}
      <div className="mb-10 rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(251,146,60,0.05) 100%)',
          border: '1px solid rgba(249,115,22,0.2)',
        }}>
        <h2 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
          <span>🔄</span>
          <span>Admin Workflow Overview</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {workflowSteps.map((workflow, idx) => (
            <div key={idx} className="rounded-xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-base font-semibold text-white mb-3">{workflow.phase}</h3>
              <ul className="space-y-2">
                {workflow.steps.map((step, stepIdx) => (
                  <li key={stepIdx} className="text-sm text-white/70 leading-relaxed">{step}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Help Sections */}
      <div className="space-y-3">
        {helpSections.map((section) => (
          <div key={section.id}
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${expandedSection === section.id ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}>
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                <span className="text-base font-semibold text-white">{section.title}</span>
              </div>
              <svg
                className={`w-5 h-5 text-white/50 transition-transform duration-300 ${expandedSection === section.id ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSection === section.id && (
              <div className="px-6 py-5 border-t border-white/8"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-white/80 text-sm leading-relaxed">
                    {section.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="mt-10 rounded-2xl p-6"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
          <span>💡</span>
          <span>Quick Tips for Admins</span>
        </h2>
        <ul className="space-y-3">
          {[
            'Check the dashboard daily to stay updated on key metrics',
            'Use search and filter features to quickly find information',
            'Export data regularly for backup and reporting purposes',
            'Review activity logs weekly for security monitoring',
            'Keep student and staff information up-to-date',
            'Communicate important dates through announcements',
            'Use bulk operations for efficiency when managing multiple records',
            'Document all important decisions and changes',
          ].map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
              <span className="text-blue-400 mt-1">✓</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
