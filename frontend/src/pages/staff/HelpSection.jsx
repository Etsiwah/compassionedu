import { useState } from 'react';

export default function StaffHelpSection() {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const helpSections = [
    {
      id: 'dashboard',
      title: '📊 Dashboard Overview',
      icon: '📊',
      content: `Your Staff Dashboard gives you quick access to essential teaching tools and student information.

**What You See:**
- Total number of students you interact with
- Pending attendance records
- Recent announcements from administration
- Quick action buttons for common tasks

**Quick Actions Available:**
- Record Attendance: Take daily class attendance
- View Announcements: Read messages from admin
- View Students: Access student list and information
- Settings: Update your profile and preferences

**Daily Checklist:**
- Check dashboard for new announcements
- Review today's attendance needs
- Check for any urgent notifications
- Update your profile if needed`
    },
    {
      id: 'students',
      title: '🎓 Students List',
      icon: '🎓',
      content: `View information about all students in the school.

**Student Information You Can See:**
- Student name and email
- Current school level/grade
- Active/Inactive status
- Basic contact information

**Features:**
- **Search**: Find students quickly by name or email
- **Filter**: View students by level or status
- **Read-Only Access**: View student information (you cannot edit)

**How to Use:**
1. Use the search bar at the top to find specific students
2. Scroll through the list to browse all students
3. Check student status to see who is active

**Note**: This is a read-only view. Contact administration if student information needs to be updated.`
    },
    {
      id: 'attendance',
      title: '📅 Recording Attendance',
      icon: '📅',
      content: `Record student attendance for your classes daily.

**Step-by-Step Guide:**

**1. Access the Attendance Page**
   - Click "Attendance" in the sidebar
   - Or use "Record Attendance" quick action from dashboard

**2. Fill in Required Information:**
   - **Student ID**: Paste the student's unique ID
     (Get this from the Students list - copy from admin)
   - **Subject**: Enter the subject name (e.g., Mathematics, English)
   - **Date**: Select the date (defaults to today)
   - **Status**: Choose one:
     • Present: Student attended class
     • Absent: Student did not attend
     • Late: Student arrived after start time

**3. Submit the Record**
   - Click "Record Attendance" button
   - Wait for confirmation message
   - Form clears automatically for next entry

**Best Practices:**
- Record attendance daily, preferably at the start of class
- Double-check the student ID before submitting
- Keep accurate records - they affect student reports
- If you make a mistake, contact administration

**Tips:**
- Keep a list of student IDs handy for quick entry
- Record attendance right after taking roll call
- Use consistent subject names (e.g., always "Mathematics" not "Math")
- Submit attendance same day - don't let it accumulate`
    },
    {
      id: 'announcements',
      title: '📢 Announcements',
      icon: '📢',
      content: `View important messages and updates from school administration.

**What's Included:**
- School-wide announcements
- Schedule changes
- Event notifications
- Important dates and deadlines
- Emergency alerts

**Announcement Information:**
- **Title**: Brief description of the message
- **Content**: Full announcement details
- **Author**: Who posted the announcement
- **Date**: When it was posted

**How to Stay Updated:**
1. Check announcements daily
2. Read all messages marked as "Important" or "Urgent"
3. Note any action items or deadlines
4. Share relevant information with students

**Types of Announcements:**
- **General**: Routine school information
- **Academic**: Class schedules, exam dates
- **Events**: Upcoming activities
- **Emergency**: Urgent notifications requiring immediate attention

**Best Practices:**
- Check announcements at the start of each day
- Keep a calendar for important dates mentioned
- Communicate relevant info to your students
- Contact administration if you have questions about any announcement`
    },
    {
      id: 'profile',
      title: '👤 Your Profile',
      icon: '👤',
      content: `View and update your personal information and preferences.

**Profile Information:**
- Full name
- Email address
- Contact details
- Profile photo
- Department/subject area

**What You Can Update:**
- Profile photo
- Contact information
- Password
- Notification preferences

**Updating Your Profile:**
1. Click "Profile" in the sidebar
2. Click "Edit Profile" button
3. Make your changes
4. Click "Save Changes"

**Password Change:**
1. Go to your profile
2. Click "Change Password"
3. Enter current password
4. Enter new password (twice)
5. Save changes

**Best Practices:**
- Keep your contact information current
- Use a professional profile photo
- Choose a strong, unique password
- Update your password regularly (every 3-6 months)`
    }
  ];

  const workflowSteps = [
    {
      phase: 'Morning Routine (Before Class)',
      steps: [
        '1. Log into your staff account',
        '2. Check dashboard for new announcements',
        '3. Review any urgent notifications',
        '4. Check today\'s class schedule',
        '5. Prepare attendance materials (student ID list)'
      ]
    },
    {
      phase: 'During Class',
      steps: [
        '1. Take class attendance (roll call)',
        '2. Note any late arrivals',
        '3. Record any student absences',
        '4. Conduct your lesson',
        '5. Observe student participation'
      ]
    },
    {
      phase: 'After Class',
      steps: [
        '1. Go to Attendance section',
        '2. Record attendance for each student',
        '3. Mark status (Present, Absent, Late)',
        '4. Submit attendance records',
        '5. Verify submission confirmation'
      ]
    },
    {
      phase: 'End of Day',
      steps: [
        '1. Ensure all attendance is recorded',
        '2. Check for any new announcements',
        '3. Respond to any admin requests',
        '4. Prepare for next day',
        '5. Log out securely'
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Staff Help Center</h1>
        <p className="text-white/60">Your guide to using the CompassionEdu Staff Portal</p>
      </div>

      {/* Workflow Section */}
      <div className="mb-10 rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(96,165,250,0.05) 100%)',
          border: '1px solid rgba(59,130,246,0.2)',
        }}>
        <h2 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
          <span>🔄</span>
          <span>Daily Workflow for Staff</span>
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
              border: `1px solid ${expandedSection === section.id ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
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
        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
        <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
          <span>💡</span>
          <span>Quick Tips for Staff</span>
        </h2>
        <ul className="space-y-3">
          {[
            'Record attendance daily - don't wait until end of week',
            'Check announcements every morning for important updates',
            'Keep your profile information up-to-date',
            'Use the search feature to quickly find student information',
            'Contact administration if you spot any data errors',
            'Log out when you're done to keep student data secure',
            'Save or bookmark student ID lists for quick attendance entry',
            'Report any system issues to administration immediately',
          ].map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
              <span className="text-green-400 mt-1">✓</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Need More Help */}
      <div className="mt-6 rounded-2xl p-6"
        style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}>
        <h3 className="text-base font-bold text-purple-400 mb-3 flex items-center gap-2">
          <span>❓</span>
          <span>Need More Help?</span>
        </h3>
        <p className="text-white/70 text-sm mb-4">
          If you have questions not covered in this help guide, please contact:
        </p>
        <ul className="space-y-2 text-sm text-white/60">
          <li>• School Administration Office</li>
          <li>• IT Support Team</li>
          <li>• Your Department Head</li>
        </ul>
      </div>
    </div>
  );
}
