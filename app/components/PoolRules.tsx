export default function PoolRules() {
  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Pool Rules</h2>
      <div className="space-y-3">
        <div className="flex items-start">
          <span className="text-blue-500 font-bold mr-3">1.</span>
          <p className="text-gray-700">Each week, pick ONE team to win their game</p>
        </div>
        <div className="flex items-start">
          <span className="text-blue-500 font-bold mr-3">2.</span>
          <p className="text-gray-700">You can only use each team ONCE during the entire season</p>
        </div>
        <div className="flex items-start">
          <span className="text-blue-500 font-bold mr-3">3.</span>
          <p className="text-gray-700">Everyone starts with 3 lives</p>
        </div>
        <div className="flex items-start">
          <span className="text-blue-500 font-bold mr-3">4.</span>
          <p className="text-gray-700">If your team loses, you lose a life</p>
        </div>
        <div className="flex items-start">
          <span className="text-blue-500 font-bold mr-3">5.</span>
          <p className="text-gray-700">When you lose all 3 lives, you're eliminated</p>
        </div>
        <div className="flex items-start">
          <span className="text-blue-500 font-bold mr-3">6.</span>
          <p className="text-gray-700">Last player(s) with lives remaining wins!</p>
        </div>
      </div>
    </div>
  );
}