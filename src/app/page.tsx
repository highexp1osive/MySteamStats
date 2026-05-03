export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-5xl font-bold mb-4">
        <span className="text-orange-500">My</span>
        <span className="text-white">Steam</span>
        <span className="text-orange-500">Stats</span>
      </h1>
      <p className="text-xl text-gray-400 mb-8">
        连接你的 Steam 账号，深度分析你的游戏人生
      </p>
    </div>
  );
}
