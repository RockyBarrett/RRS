export default function EnrollmentVideosPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-16 px-6">
      <h1 className="text-4xl font-bold mb-12 text-center">
        Enrollment Overview Videos
      </h1>

      <div className="w-full max-w-3xl space-y-16">

        {/* Video 1 */}
        <div className="w-full">
          <h2 className="text-2xl font-semibold mb-4">English Overview</h2>
          <video
            controls
            className="w-full rounded-xl shadow-lg"
          >
            <source src="/videos/simrp_video_493 (1).mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Video 2 */}
        <div className="w-full">
          <h2 className="text-2xl font-semibold mb-4">Spanish Overview</h2>
          <video
            controls
            className="w-full rounded-xl shadow-lg"
          >
            <source src="/videos/simrp_video_spanish_401 (1).mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

      </div>
    </div>
  );
}