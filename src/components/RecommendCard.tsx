interface RecommendItem {
  name: string;
  score: number;
  reason: string;
  coverUrl: string | null;
  inLibrary: boolean;
}

export default function RecommendCard({ item, index }: { item: RecommendItem; index: number }) {
  const scoreColor = item.score >= 8 ? "text-green-500" : item.score >= 6 ? "text-yellow-500" : "text-gray-400";

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 flex gap-4 items-center hover:border-[#1a9fff] transition">
      <div className="text-2xl font-bold text-[#c7d5e0] w-8 text-center shrink-0">
        {index + 1}
      </div>
      {item.coverUrl ? (
        <img src={item.coverUrl} alt={item.name} className="w-12 h-16 object-cover rounded-lg shrink-0" />
      ) : (
        <div className="w-12 h-16 bg-[#e2e8f0] rounded-lg shrink-0 flex items-center justify-center text-[#8ba3b8] text-xs">暂无</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-[#171a21] truncate">{item.name}</h3>
          <span className={`text-sm font-bold shrink-0 ${scoreColor}`} title="AI 推荐评分：越高越值得玩">
            {item.score}/10
          </span>
          {!item.inLibrary && (
            <span className="text-xs bg-[#1a9fff]/10 text-[#1a9fff] px-2 py-0.5 rounded-full shrink-0">库外</span>
          )}
        </div>
        <p className="text-[#5f7d9a] text-sm mt-0.5">{item.reason}</p>
      </div>
    </div>
  );
}
