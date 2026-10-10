import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Calendar, Tag, User } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import { ErrorBox, PageLoading } from '../components/StateViews';
import { formatDay } from '../lib/dates';

// Open links in a new tab; react-markdown already refuses javascript: links and raw HTML.
const markdownComponents = {
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  img: ({ node, ...props }) => <img {...props} loading="lazy" alt={props.alt || ''} />,
};

export default function BlogDetail() {
  const { id } = useParams();
  const post = useFetch(`/blog/${id}`);

  if (post.loading && !post.data) return <PageLoading />;
  if (post.error) {
    return (
      <div className="min-h-[60vh] py-24 max-w-3xl mx-auto px-6">
        <ErrorBox message={post.error} onRetry={post.reload} />
        <Link to="/blog" className="inline-flex items-center gap-2 mt-8 text-brand-green underline"><ArrowLeft size={16} aria-hidden="true" /> Back to stories</Link>
      </div>
    );
  }
  const p = post.data;

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="blog-detail-page">
      <PageMeta title={p.title} description={p.excerpt} />
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <Link to="/blog" data-testid="back-button" className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-brand-muted hover:text-brand-ink mb-12 transition-colors">
          <ArrowLeft size={16} aria-hidden="true" /> Back to stories
        </Link>

        <article>
          {p.published === false && (
            <p className="mb-6 border border-brand-orange/50 bg-white/60 p-4 text-brand-ink" role="status">
              Draft. Only admins can see this post.
            </p>
          )}
          <span className="text-xs uppercase tracking-widest px-4 py-1 bg-brand-sand text-brand-ink inline-block mb-6">{p.category}</span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-8 leading-tight" data-testid="post-title">{p.title}</h1>

          <div className="flex flex-wrap items-center gap-6 text-brand-muted mb-12">
            <span className="flex items-center gap-2 text-sm"><User size={18} aria-hidden="true" />{p.author_name}</span>
            <span className="flex items-center gap-2 text-sm"><Calendar size={18} aria-hidden="true" />{formatDay(p.created_at, 'MMMM d, yyyy')}</span>
          </div>

          {p.image_url && (
            <div className="mb-12 border border-black/10">
              <img src={p.image_url} alt="" className="w-full h-auto object-cover" style={{ maxHeight: '600px' }} />
            </div>
          )}

          <p className="text-xl leading-relaxed text-brand-muted mb-8">{p.excerpt}</p>
          <div className="post-body" data-testid="post-content">
            <ReactMarkdown components={markdownComponents}>{p.content}</ReactMarkdown>
          </div>

          {p.tags?.length > 0 && (
            <div className="mt-16 pt-8 border-t border-black/10">
              <h2 className="text-sm uppercase tracking-widest text-brand-muted mb-4">Tags</h2>
              <div className="flex flex-wrap gap-3">
                {p.tags.map((tag) => (
                  <span key={tag} data-testid={`tag-${tag}`} className="flex items-center gap-2 px-4 py-2 text-sm border border-black/10 bg-white/50"><Tag size={14} aria-hidden="true" />{tag}</span>
                ))}
              </div>
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
