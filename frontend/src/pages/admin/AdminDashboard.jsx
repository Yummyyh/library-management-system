import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  return (
    <div className="h-full p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden">

        {/* Header — pure text, no Logout button */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">👑 Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">System Administration Panel</p>
        </div>

        {/* Function Cards — scrollable if content overflows */}
        <div className="flex-1 w-full overflow-y-auto pr-1">
          <div className="grid gap-6 md:grid-cols-1">
            <Link to="/admin/users">
              <div className="p-6 border border-gray-100/60 rounded-xl bg-white/60 hover:shadow-lg hover:bg-white/90 transition-all duration-150 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-2xl">
                    👥
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
                    <p className="text-sm text-muted-foreground">Manage users, roles, and accounts</p>
                  </div>
                </div>
              </div>
            </Link>
            <Link to="/admin/settings">
              <div className="p-6 border border-gray-100/60 rounded-xl bg-white/60 hover:shadow-lg hover:bg-white/90 transition-all duration-150 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-2xl">
                    ⚙️
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">System Settings</h2>
                    <p className="text-sm text-muted-foreground">Configure library policies and preferences</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
