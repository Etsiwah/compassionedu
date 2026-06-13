import { useState, useEffect } from 'react';
import api from '../../utils/api';
import useAuth from '../../hooks/useAuth';

export default function NotificationsSection() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'announcements', 'updates'

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Fetch announcements (staff-targeted)
      const announcementsRes = await api.get('/announcements');
      const staffAnnouncements = (announcementsRes.data || []).filter(
        a => a.target_role === 'staff' || a.target_role === 'everyone'
      );

      // Fetch system notifications (if endpoint exists)
      let systemNotifications = [];
      try {
        const notifRes = await api.get('/notifications');
        systemNotifications = notifRes.data || [];
      } catch (err) {
        // Notifications endpoint might not exist yet
        console.log('Notifications endpoint not available');
      }

      // Add profile update reminder if profile is incomplete
      const profileReminder = checkProfileCompleteness(user);
      if (profileReminder) {
        systemNotifications.unshift(profileReminder);
      }

      setAnnouncements(staffAnnouncements);
      setNotifications(systemNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  function checkProfileCompleteness(user) {
    // Check if profile needs updating
    const missingFields = [];
    if (!user?.phone) missingFields.push('phone number');
    if (!user?.profile_image_url) missingFields.push('profile photo');
    if (!user?.bio) missingFields.push('bio');

    if (missingFields.length > 0) {
      return {
        id: 'profile-update',
        type: 'profile',
        title: 'Update Your Profile',
        message: `Your profile is missing: ${missingFields.join(', ')}. Please update it for a complete experience.`,
        created_at: new Date().toISOString(),
        is_read: false,
        priority: 'medium'
      };
    }
    return null;
  }

  async function markAsRead(notificationId, type = 'notification') {
    try {
      if (type === 'announcement') {
        await api.patch(`/announcements/${notificationId}/read`);
      } else if (type === 'notification' && notificationId !== 'profile-update') {
        await api.patch(`/notifications/${notificationId}/read`);
      }
      loadData();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  function getFilteredItems() {
    const allItems = [
      ...notifications.map(n => ({ ...n, type: 'notification' })),
      ...announcements.map(a => ({ ...a, type: 'announcement' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filter === 'announcements') {
      return allItems.filter(i => i.type === 'announcement');
    }
    if (filter === 'updates') {
      return allItems.filter(i => i.type === 'notification');
    }
    return allItems;
  }

  function NotificationCard({ item }) {
    const isAnnouncement = item.type === 'announcement';
    const isUnread = !item.is_read;
    const isPriority = item.priority === 'high' || item.priority === 'urgent';

    return (
      <div
        className={`rounded-xl p-4 transition-all ${
          isUnread ? 'border-orange-500/30' : 'border-white/10'
        }`}
        style={{
          background: isUnread 
            ? 'rgba(249,115,22,0.08)' 
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUnread ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
            style={{
              background: isAnnouncement 
                ? 'rgba(168,85,247,0.15)' 
                : item.type === 'profile' 
                ? 'rgba(59,130,246,0.15)' 
                : 'rgba(249,115,22,0.15)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
            {isAnnouncement ? '📢' : item.type === 'profile' ? '👤' : '🔔'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                {item.title}
                {isPriority && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                    Urgent
                  </span>
                )}
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                )}
              </h3>
              <span className="text-xs text-white/30 whitespace-nowrap">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>

            <p className="text-sm text-white/60 mb-3">
              {isAnnouncement ? item.content : item.message}
            </p>

            <div className="flex items-center gap-2">
              {isUnread && (
                <button
                  onClick={() => markAsRead(item.id, item.type)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/70 hover:text-white transition-all"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Mark as Read
                </button>
              )}
              
              {item.type === 'profile' && (
                <button
                  onClick={() => window.location.href = '/staff/profile'}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                  style={{ background: '#f97316', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}
                >
                  Update Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredItems = getFilteredItems();
  const unreadCount = filteredItems.filter(i => !i.is_read).length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white mb-1">Notifications</h2>
        <p className="text-sm text-white/40">
          Stay updated with announcements and important notices
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <div className="text-2xl font-bold text-orange-400">{unreadCount}</div>
          <div className="text-xs text-white/50 mt-1">Unread</div>
        </div>
        <div className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="text-2xl font-bold text-purple-400">{announcements.length}</div>
          <div className="text-xs text-white/50 mt-1">Announcements</div>
        </div>
        <div className="rounded-xl p-4 text-center"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div className="text-2xl font-bold text-blue-400">{notifications.length}</div>
          <div className="text-xs text-white/50 mt-1">Updates</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All', count: filteredItems.length },
          { key: 'announcements', label: 'Announcements', count: announcements.length },
          { key: 'updates', label: 'Updates', count: notifications.length }
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === key
                ? 'text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
            style={{
              background: filter === key ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${filter === key ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.08)'}`
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="py-12 text-center text-white/30">Loading notifications...</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="text-lg font-semibold text-white mb-2">No notifications</h3>
          <p className="text-sm text-white/40">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <NotificationCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
