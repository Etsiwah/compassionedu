import { useState } from 'react';

export default function StudentHelpSection() {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const helpSections = [
    {
      id: 'dashboard',
      title: '📊 Your Dashboard',
      icon: '📊',
      content: `Your Dashboard is the first page you see when you log in. It shows a summary of everything important.

**What You Can See:**
- Your recent grades and GPA
- Attendance percentage
- Fee payment status
- Upcoming activities and events
- Latest announcements

**Quick Actions:**
- Click any card to see more details
- Use the sidebar menu to go to different sections
- Check for new announcements daily

**Dashboard Cards:**
- **Results**: See your latest grades and academic performance
- **Attendance**: Check how many days you've attended
- **Fees**: View your payment status
- **Activities**: See upcoming school events

**Tips:**
- Visit your dashboard daily to stay updated
- Click on cards to see detailed information
- Check the announcements section for important messages`
    },
    {
      id: 'profile',
      title: '👤 Your Profile',
      icon: '👤',
      content: `Your Profile contains all your personal and academic information.

**Personal Information:**
- Full name and photo
- Date of birth
- Contact details (email, phone)
- Address
- Guardian/parent information

**Academic Information:**
- Student/Beneficiary number
- Project number
- Current grade/level
- School name
- Enrollment date

**Updating Your Profile:**
1. Click "Profile" in the sidebar
2. View your current information
3. To change details, contact your teacher or school administration
4. You can update your profile photo

**Changing Your Password:**
1. Go to Settings
2. Click "Change Password"
3. Enter your current password
4. Enter new password (twice)
5. Click "Save Changes"

**Important:**
- Keep your login details secure
- Don't share your password with anyone
- Contact administration if you forget your password`
    },
    {
      id: 'results',
      title: '📝 Academic Results',
      icon: '📝',
      content: `View your grades, test scores, and academic performance.

**What You Can See:**
- All your subject grades
- Test and exam scores
- Your GPA (Grade Point Average)
- Class rank and position
- Term/semester results
- Report cards

**Understanding Your Results:**
- **Grade**: Letter grade (A, B, C, D, F) or percentage
- **GPA**: Your average score across all subjects (0.0 - 4.0 scale)
- **Rank**: Your position compared to other students
- **Status**: Pass or Fail for each subject

**Viewing Results:**
1. Click "Results" in the sidebar
2. Select term/semester to view
3. See all your subject grades
4. Download your report card

**Grade Scale:**
- A (90-100%): Excellent - 4.0 GPA
- B (80-89%): Good - 3.0 GPA  
- C (70-79%): Average - 2.0 GPA
- D (60-69%): Below Average - 1.0 GPA
- F (Below 60%): Fail - 0.0 GPA

**Tips:**
- Check your results regularly
- Download report cards for your records
- Talk to your teacher if you have questions about grades
- Track your progress over time`
    },
    {
      id: 'fees',
      title: '💳 Fee Payments',
      icon: '💳',
      content: `Track your school fees and payment status.

**Fee Information:**
- Total fees for the term/year
- Amount already paid
- Outstanding balance
- Payment due dates
- Payment history

**Fee Breakdown:**
- Tuition fees
- Activity fees
- Health and wellness fees
- Miscellaneous charges

**Viewing Your Fees:**
1. Click "Fees" in the sidebar
2. See your current balance
3. Check payment history
4. View upcoming due dates

**Payment Status:**
- **Paid**: All fees settled
- **Partial**: Some payment made, balance remaining
- **Pending**: No payment yet
- **Overdue**: Payment past due date

**Important:**
- Check your fee status regularly
- Keep track of payment due dates
- Show fee information to your parent/guardian
- Contact administration office for payment arrangements

**Payment Methods:**
- Cash payments at school office
- Bank transfers
- Mobile money
- Other methods as specified by school

**Tips:**
- Download payment receipts for your records
- Notify administration of any payment issues
- Plan ahead for upcoming payments`
    },
    {
      id: 'attendance',
      title: '📅 Attendance Record',
      icon: '📅',
      content: `View your school attendance history and statistics.

**What You Can See:**
- Total days present
- Total days absent
- Days you were late
- Attendance percentage
- Calendar view of your attendance
- Subject-wise attendance

**Attendance Status:**
- **Present** ✓: You attended class
- **Absent** ✗: You missed class
- **Late** ⏰: You arrived after class started

**Understanding Your Attendance:**
- **Attendance Rate**: Percentage of days you attended
  (Example: 95% means you were present 95 out of 100 days)
- **Good Attendance**: 90% and above
- **Needs Improvement**: Below 90%

**Viewing Attendance:**
1. Click "Attendance" in the sidebar
2. See your attendance summary
3. View calendar with color-coded days
4. Check subject-specific attendance

**Why Attendance Matters:**
- Affects your academic performance
- Required for passing to next level
- Important for scholarship eligibility
- Shows responsibility and commitment

**If You're Absent:**
- Have your parent/guardian notify the school
- Provide medical certificate if sick
- Catch up on missed lessons
- Check with teachers for homework

**Tips:**
- Aim for 95% or higher attendance
- Arrive on time every day
- Plan appointments outside school hours
- Check your attendance record monthly`
    },
    {
      id: 'activities',
      title: '🎯 School Activities',
      icon: '🎯',
      content: `See and participate in school activities and events.

**Types of Activities:**
- **Sports**: Soccer, basketball, athletics, etc.
- **Academic**: Science fair, spelling bee, debate
- **Cultural**: Music, dance, drama, art
- **Community Service**: Volunteering, outreach programs
- **Clubs**: Various interest-based clubs

**Activity Information:**
- Activity name and description
- Date, time, and location
- Who can participate
- How to register or sign up

**Viewing Activities:**
1. Click "Activities" in the sidebar
2. See list of upcoming events
3. Read activity details
4. Check if you're registered

**Participating in Activities:**
1. Find activities you're interested in
2. Check participation requirements
3. Sign up or register (if required)
4. Mark the date on your calendar
5. Attend and participate actively

**Benefits of Participation:**
- Develop new skills and talents
- Make new friends
- Build confidence
- Improve your portfolio
- Get certificates and awards

**Tips:**
- Try different types of activities
- Don't overcommit - balance with studies
- Attend activities you sign up for
- Share your achievements with family`
    },
    {
      id: 'portfolio',
      title: '📁 Your Portfolio',
      icon: '📁',
      content: `Showcase your skills, achievements, and experiences.

**What's in a Portfolio:**
- Academic achievements and awards
- Project work and assignments
- Skills and competencies
- Extracurricular activities
- Work experience or internships
- Certificates and qualifications
- Personal statement or bio
- CV/Resume

**Portfolio Sections:**
- **Education**: Your academic background
- **Skills**: What you can do (languages, computer skills, etc.)
- **Experience**: Work or volunteer experience
- **Projects**: School projects and assignments
- **Awards**: Certificates and recognitions
- **Activities**: Clubs and sports participation

**Building Your Portfolio:**
1. Click "Portfolio" in the sidebar
2. Click "Add Item" or "Add Section"
3. Choose what type of item to add
4. Fill in the details
5. Upload photos or documents
6. Save your work

**Types of Items to Add:**
- Certificates (scan and upload)
- Project photos
- Award letters
- Skills list
- Activity participation records
- Personal achievements

**Why Portfolio Matters:**
- Shows your complete profile
- Helps with scholarship applications
- Useful for job applications
- Documents your growth and development
- Shared with sponsors (for beneficiaries)

**Tips:**
- Update your portfolio regularly
- Add new achievements as they happen
- Include photos when possible
- Write clear descriptions
- Keep documents organized
- Ask teachers for help if needed`
    },
    {
      id: 'health',
      title: '🏥 Health Records',
      icon: '🏥',
      content: `View your health and wellness information.

**Health Information:**
- Medical check-up records
- Immunization/vaccination history
- Growth tracking (height, weight)
- Vision and hearing tests
- Dental check-ups
- Known allergies or conditions
- Medications (if any)

**What You Can See:**
- Date of each health check
- Test results and measurements
- Doctor's notes and recommendations
- Upcoming health appointments
- Health trends over time

**Viewing Health Records:**
1. Click "Health" in the sidebar
2. See your recent health records
3. View details of each check-up
4. Check growth charts and trends

**Health Check-ups Include:**
- Weight and height measurements
- Body Mass Index (BMI)
- Blood pressure
- Vision screening
- Dental examination
- General physical exam

**Privacy:**
- Your health information is confidential
- Only authorized school staff can see it
- Your records are kept secure
- Share information with your guardian

**Important:**
- Attend all scheduled health check-ups
- Tell school nurse about any health problems
- Inform staff of allergies or medical conditions
- Keep emergency contact information updated

**Tips:**
- Track your health progress over time
- Ask questions during health check-ups
- Tell your family about health screenings
- Follow health recommendations from school nurse`
    },
    {
      id: 'announcements',
      title: '📢 Announcements',
      icon: '📢',
      content: `Stay updated with important messages from your school.

**Types of Announcements:**
- **Academic**: Exam schedules, results release dates
- **Events**: Upcoming activities and programs
- **General**: School policies, schedule changes
- **Emergency**: Urgent notifications
- **Holidays**: School breaks and vacations

**Announcement Details:**
- Title: Brief summary
- Content: Full message
- Date posted
- Who posted it (Admin, Teacher)
- Priority level (Normal, Important, Urgent)

**Viewing Announcements:**
1. Click "Announcements" in the sidebar
2. See latest messages at the top
3. Read full announcement details
4. Check for action items or deadlines

**Priority Levels:**
- **Urgent** 🔴: Read immediately
- **Important** 🟡: Read today
- **Normal** 🟢: Read when convenient

**Best Practices:**
- Check announcements daily
- Read urgent messages first
- Note important dates in your calendar
- Share relevant info with your family
- Follow instructions in announcements

**Common Announcements:**
- Exam timetables
- Parent-teacher meeting dates
- School event notifications
- Holiday schedules
- Policy updates
- Emergency closures

**Tips:**
- Check announcements every morning
- Don't miss important deadlines
- Ask teachers if you don't understand something
- Save important announcements`
    },
    {
      id: 'settings',
      title: '⚙️ Settings',
      icon: '⚙️',
      content: `Customize your account and preferences.

**Available Settings:**
- Change your password
- Update profile photo
- Notification preferences
- Language settings
- Theme preferences (light/dark mode)

**Changing Your Password:**
1. Click "Settings" in the sidebar
2. Go to "Security" section
3. Click "Change Password"
4. Enter current password
5. Enter new password (twice to confirm)
6. Click "Save Changes"

**Password Requirements:**
- At least 8 characters long
- Include uppercase letter (A-Z)
- Include lowercase letter (a-z)
- Include a number (0-9)
- Include special character (!@#$%^&*)

**Profile Photo:**
1. Go to Settings
2. Click on your current photo
3. Choose "Upload New Photo"
4. Select image from your device
5. Crop if needed
6. Save changes

**Notification Settings:**
- Email notifications
- Important announcements only
- Activity reminders
- Grade updates

**Privacy & Security:**
- Keep your password secure
- Don't share login details
- Log out on shared computers
- Report any suspicious activity

**Tips:**
- Use a strong, unique password
- Change password every 3-6 months
- Keep your email updated for notifications
- Personalize your profile with a good photo`
    }
  ];

  const workflowSteps = [
    {
      phase: 'Daily Routine',
      steps: [
        '1. Log in to your student portal',
        '2. Check your dashboard for updates',
        '3. Read new announcements',
        '4. Review today's assignments (if any)',
        '5. Check attendance record',
        '6. Log out when done'
      ]
    },
    {
      phase: 'Weekly Tasks',
      steps: [
        '1. Review your attendance percentage',
        '2. Check for new activities to join',
        '3. Update your portfolio with new achievements',
        '4. Review upcoming events',
        '5. Check fee payment status',
        '6. Communicate any issues to teachers'
      ]
    },
    {
      phase: 'Monthly Tasks',
      steps: [
        '1. Review your academic progress',
        '2. Check GPA and class rank',
        '3. Update portfolio with new items',
        '4. Review health records (if check-up done)',
        '5. Plan for next month activities',
        '6. Share progress with family'
      ]
    },
    {
      phase: 'End of Term',
      steps: [
        '1. View your final grades and report card',
        '2. Download and save report card',
        '3. Review attendance for the term',
        '4. Update portfolio with term achievements',
        '5. Check fee balance for next term',
        '6. Set goals for next term'
      ]
    }
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Student Help Center</h1>
        <p className="text-white/60">Learn how to use your CompassionEdu Student Portal</p>
      </div>

      {/* Workflow Section */}
      <div className="mb-10 rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(74,222,128,0.05) 100%)',
          border: '1px solid rgba(34,197,94,0.2)',
        }}>
        <h2 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
          <span>🔄</span>
          <span>Your Success Routine</span>
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
              border: `1px solid ${expandedSection === section.id ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
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
        style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
        <h2 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
          <span>💡</span>
          <span>Quick Tips for Success</span>
        </h2>
        <ul className="space-y-3">
          {[
            'Check your portal daily to stay updated',
            'Read all announcements - they contain important information',
            'Keep your attendance above 90%',
            'Update your portfolio regularly with achievements',
            'Download and save your report cards',
            'Tell your teacher immediately if something looks wrong',
            'Change your password regularly and keep it secure',
            'Participate in school activities to improve your portfolio',
            'Check your fee status and inform your guardian',
            'Set goals and track your progress each term',
          ].map((tip, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-white/70">
              <span className="text-orange-400 mt-1">✓</span>
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
          If you can't find the answer to your question:
        </p>
        <ul className="space-y-2 text-sm text-white/60">
          <li>• Ask your teacher or class instructor</li>
          <li>• Visit the school administration office</li>
          <li>• Have your parent/guardian contact the school</li>
          <li>• Send an email to support@compassionedu.com</li>
        </ul>
      </div>
    </div>
  );
}
