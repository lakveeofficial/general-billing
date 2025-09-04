export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/20">
          <div className="text-sm text-zinc-500">Today Sales</div>
          <div className="text-2xl font-bold">₹ 0.00</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
          <div className="text-sm text-zinc-500">Outstanding</div>
          <div className="text-2xl font-bold">₹ 0.00</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="text-sm text-zinc-500">Invoices</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
          <div className="text-sm text-zinc-500">Customers</div>
          <div className="text-2xl font-bold">0</div>
        </div>
      </div>
    </div>
  );
}
