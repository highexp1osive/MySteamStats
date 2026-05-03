export default function StatsOverview({
  totalGames,
  totalHours,
  total2Weeks,
  userName,
}: {
  totalGames: number;
  totalHours: number;
  total2Weeks: number;
  userName: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-bold text-[#171a21] mb-4">
        {userName} 的游戏库
      </h1>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center">
          <div className="text-2xl font-bold text-[#1a9fff]">{totalGames}</div>
          <div className="text-[#5f7d9a] text-xs mt-1">游戏总数</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center">
          <div className="text-2xl font-bold text-[#1a9fff]">
            {totalHours.toLocaleString()}h
          </div>
          <div className="text-[#5f7d9a] text-xs mt-1">总时长</div>
        </div>
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 text-center">
          <div className="text-2xl font-bold text-[#1a9fff]">
            {total2Weeks}h
          </div>
          <div className="text-[#5f7d9a] text-xs mt-1">近两周</div>
        </div>
      </div>
    </div>
  );
}
