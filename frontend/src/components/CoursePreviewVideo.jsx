import { Play } from 'lucide-react';

/**
 * Responsive YouTube embed for course preview videos.
 * Shows a placeholder if no URL is provided.
 */
export const CoursePreviewVideo = ({ videoUrl, title = 'Course Preview' }) => {
  if (!videoUrl) return null;

  // Ensure embed format
  const embedUrl = videoUrl.includes('/embed/')
    ? videoUrl
    : videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Play className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        <span className="ml-auto text-xs text-slate-400">Watch before you start</span>
      </div>
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default CoursePreviewVideo;
