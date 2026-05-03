interface StatsOverviewProps {
  totalGames: number;
  totalHours: number;
  total2Weeks: number;
  userName: string;
}

export default function StatsOverview({
  totalGames,
  totalHours,
  total2Weeks,
  userName,
}: StatsOverviewProps) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold mb-2">{userName} 的游戏库</h1>
      <div className="grid grid-cols-3 gap-4 mt-4">
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">
            {totalGames}
          </div>
          <div className="text-gray-400 text-sm">游戏总数</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">
            {totalHours.toLocaleString()}h
          </div>
          <div className="text-gray-400 text-sm">总时长</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-500">
            {total2Weeks}h
          </div>
          <div className="text-gray-400 text-sm">近两周</div>
        </div>
      </div>
    </div>
  );
}
