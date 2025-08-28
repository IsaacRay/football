export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Authentication Error
        </h2>
        <p className="text-gray-600 mb-8">
          Sorry, we couldn't sign you in. The magic link may have expired or been used already.
        </p>
        <a
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Try Again
        </a>
      </div>
    </div>
  );
}