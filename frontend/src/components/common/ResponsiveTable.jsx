/**
 * ResponsiveTable Component
 * 
 * Displays as a standard table on desktop (md and up)
 * Converts to card view on mobile (below md breakpoint)
 * 
 * Usage:
 * <ResponsiveTable
 *   headers={['Name', 'Email', 'Status']}
 *   data={users}
 *   renderRow={(user) => (
 *     <>
 *       <td>{user.name}</td>
 *       <td>{user.email}</td>
 *       <td>{user.status}</td>
 *     </>
 *   )}
 *   renderMobileCard={(user) => (
 *     <div>Mobile card content</div>
 *   )}
 * />
 */

export default function ResponsiveTable({ 
  headers = [], 
  data = [], 
  renderRow, 
  renderMobileCard,
  emptyMessage = 'No data available',
  className = ''
}) {
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-white/30 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View (md and up) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <table className={`w-full text-sm ${className}`}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className="text-left px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wide"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr 
                key={item.id || idx} 
                style={{ 
                  borderBottom: idx < data.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' 
                }}
              >
                {renderRow(item, idx)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (below md) */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((item, idx) => (
          <div 
            key={item.id || idx}
            className="rounded-xl p-4"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {renderMobileCard(item, idx)}
          </div>
        ))}
      </div>
    </>
  );
}
