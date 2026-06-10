import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  // States for expanding sections
  const [selectedRole, setSelectedRole] = useState(null);
  const [expandedInfo, setExpandedInfo] = useState(null);

  // Subtle parallax on scroll - DISABLED to prevent white space
  // useEffect(() => {
  //   const hero = heroRef.current;
  //   if (!hero) return;
  //   const handleScroll = () => {
  //     const y = window.scrollY;
  //     hero.style.backgroundPositionY = `calc(50% + ${y * 0.3}px)`;
  //   };
  //   window.addEventListener('scroll', handleScroll, { passive: true });
  //   return () => window.removeEventListener('scroll', handleScroll);
  // }, []);

  const roleDetails = {
    Student: "Students can view their academic results, track attendance, submit portfolio items, and stay updated with class announcements.",
    Staff: "Staff members can manage student attendance, upload results, review portfolios, and communicate with students.",
    Admin: "Administrators have full oversight. They can manage users, oversee fee payments, configure system settings, and generate platform-wide reports."
  };

  const infoPanels = [
    {
      id: 'history',
      title: 'History of Compassion',
      images: ['/images/history1.png', '/images/history2.png'],
      content: 'Founded in 1952 by Rev. Everett Swanson after seeing the plight of war orphans in South Korea. What began as an effort to help 35 children has grown into a global ministry serving over 2.4 million children across 29 countries today.'
    },
    {
      id: 'ghana',
      title: 'What Compassion Does in Ghana',
      images: ['/images/ghana.png', '/images/ghana2.jpg'],
      content: 'Operating in Ghana since 2004, Compassion partners with over 400 local churches. They focus on holistic child development including health, education, child protection, and livelihood empowerment.'
    },
    {
      id: 'mission',
      title: 'Mission of Compassion',
      images: ['/images/mission.png'],
      content: '"In response to the Great Commission, Compassion International exists as an advocate for children, to release them from their spiritual, economic, social, and physical poverty and enable them to become responsible and fulfilled Christian adults."'
    },
    {
      id: 'motto',
      title: 'Motto of Compassion',
      images: ['/images/motto.png'],
      content: '"Releasing children from poverty in Jesus\' name." This simple phrase captures the core identity and Christ-centered focus of the organization.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
      
      {/* ── BACKGROUND LAYER ── */}
      <div
        ref={heroRef}
        className="fixed inset-0 -z-10 w-full h-full"
        style={{
          backgroundImage: 'url(/compassion-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          width: '100vw',
          height: '100vh',
        }}
      >
        {/* Lighter overlay for brighter background */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{ 
            background: 'rgba(4, 14, 35, 0.25)',
            width: '100%',
            height: '100%'
          }}
        />
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: 'linear-gradient(160deg, rgba(7,26,62,0.3) 0%, rgba(10,35,80,0.15) 50%, rgba(4,14,35,0.25) 100%)',
            width: '100%',
            height: '100%'
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[280px]"
          style={{
            background: 'radial-gradient(ellipse, rgba(249,115,22,0.25) 0%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />
      </div>

      {/* ── NAVBAR ── */}
      <header
        className="relative z-20 flex items-center justify-between px-8 py-4"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-3">
          <img 
            src="/images/logo.jpg.jfif" 
            alt="Logo" 
            className="h-10 w-10 object-contain rounded-lg"
          />
          <span className="text-xl font-bold text-orange-400" style={{ letterSpacing: '-0.02em' }}>
            CompassionEdu
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="text-sm font-semibold px-5 py-2 rounded-xl transition-all"
          style={{
            background: '#f97316',
            color: '#fff',
            boxShadow: '0 2px 12px rgba(249,115,22,0.4)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#ea6c0a'}
          onMouseLeave={e => e.currentTarget.style.background = '#f97316'}
        >
          Sign In
        </button>
      </header>

      {/* ── HERO ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
        
        {/* Glassmorphism hero card */}
        <div
          className="max-w-2xl w-full mx-auto px-8 py-12 rounded-3xl mb-12"
          style={{
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex justify-center mb-5">
            <img
              src="/compassion-logo.png"
              alt="Compassion"
              style={{ height: '70px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          <h1
            className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5"
            style={{ color: '#ffffff', letterSpacing: '-0.03em', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            Welcome to{' '}
            <span style={{ color: '#fb923c' }}>CompassionEdu</span>
          </h1>

          <p className="text-base sm:text-lg mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            A modern school management platform for students, staff, and administrators.
            Track attendance, results, fees, portfolios, and more — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="font-semibold px-8 py-3 rounded-xl text-base transition-all"
              style={{ background: '#f97316', color: '#fff', boxShadow: '0 4px 20px rgba(249,115,22,0.45)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ea6c0a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f97316'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Get Started
            </button>
          </div>
        </div>

        {/* ── FEATURE CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-4xl w-full mb-12">
          {[
            { img: '/images/results-icon.png', title: 'Results & Grades', desc: 'View academic results, GPA, and download report cards.' },
            { img: '/images/attendance-icon.png', title: 'Attendance',       desc: 'Track daily attendance with visual calendar and percentage.' },
            { img: '/images/fee-icon.png', title: 'Fee Management',   desc: 'Monitor fee status, due dates, and payment history.' },
            { img: '/images/portfolio-icon.png', title: 'Portfolio',        desc: 'Showcase skills, experiences, projects, and CV uploads.' },
          ].map(({ img, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-6 flex flex-col items-center text-center gap-3 transition-all cursor-default"
              style={{
                backdropFilter: 'blur(20px)',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <img src={img} alt={title} className="h-16 w-16 object-contain drop-shadow-lg rounded-full bg-white p-2" />
              <h3 className="font-semibold text-white text-sm">{title}</h3>
              <p className="text-xs leading-relaxed text-gray-200">{desc}</p>
            </div>
          ))}
        </div>

        {/* ── ROLE BADGES (Interactive) ── */}
        <div className="max-w-2xl w-full mx-auto mb-16">
          <h3 className="text-white font-semibold mb-4 opacity-80">Tap a role to learn more</h3>
          <div className="flex flex-wrap gap-4 justify-center mb-6">
            {[
              { role: 'Student', icon: '🎒' },
              { role: 'Staff', icon: '📚' },
              { role: 'Admin',   icon: '🛡️' },
            ].map(({ role, icon }) => (
              <button
                key={role}
                onClick={() => setSelectedRole(selectedRole === role ? null : role)}
                className={`text-sm font-medium px-6 py-3 rounded-full flex items-center gap-2 transition-all cursor-pointer ${selectedRole === role ? 'ring-2 ring-orange-400' : ''}`}
                style={{
                  backdropFilter: 'blur(12px)',
                  background: selectedRole === role ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  outline: 'none',
                }}
              >
                {icon} {role}
              </button>
            ))}
          </div>
          
          {selectedRole && (
            <div className="p-5 rounded-2xl transition-all" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 className="text-orange-400 font-bold mb-2 flex items-center gap-2 justify-center">
                {selectedRole} Portal
              </h4>
              <p className="text-gray-200 text-sm leading-relaxed max-w-lg mx-auto">
                {roleDetails[selectedRole]}
              </p>
            </div>
          )}
        </div>

        {/* ── COMPASSION INFO PANELS (Expandable) ── */}
        <div className="max-w-4xl w-full mx-auto mb-12">
          <h2 className="text-2xl font-bold text-white mb-2">About Compassion</h2>
          <p className="text-gray-300 text-sm mb-8">Tap any panel below to read more</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {infoPanels.map((panel) => (
              <div 
                key={panel.id}
                onClick={() => setExpandedInfo(expandedInfo === panel.id ? null : panel.id)}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: expandedInfo === panel.id ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div className="h-40 bg-gray-800 relative flex">
                  {panel.images.map((imgSrc, idx) => (
                    <img 
                      key={idx}
                      src={imgSrc} 
                      alt={`${panel.title} ${idx + 1}`} 
                      className="flex-1 w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
                      onError={(e) => { e.target.src = `https://via.placeholder.com/400x200/0a2350/ffffff?text=${encodeURIComponent(panel.title)}`; }}
                    />
                  ))}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-none">
                    <h3 className="text-white font-bold text-lg text-left drop-shadow-md">{panel.title}</h3>
                  </div>
                </div>
                
                {expandedInfo === panel.id && (
                  <div className="p-5 bg-black/60 text-left">
                    <p className="text-gray-200 text-sm leading-relaxed">{panel.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 text-center py-5 text-xs"
        style={{
          color: 'rgba(255,255,255,0.5)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        © {new Date().getFullYear()} CompassionEdu · Releasing Children from Poverty in Jesus' Name
      </footer>
    </div>
  );
}
