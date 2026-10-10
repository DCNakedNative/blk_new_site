import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, User } from 'lucide-react';
import useFetch from '../hooks/useFetch';
import PageMeta from '../components/PageMeta';
import { EmptyBox, ErrorBox, PageLoading } from '../components/StateViews';
import { formatDay } from '../lib/dates';

export default function Blog() {
  const posts = useFetch('/blog');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => ['all', ...new Set((posts.data || []).map((p) => p.category))], [posts.data]);
  const shown = useMemo(
    () => (posts.data || []).filter((p) => category === 'all' || p.category === category),
    [posts.data, category]
  );

  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="blog-page">
      <PageMeta title="Blog" description="Trip recaps, tips and stories from The Shenanigators community." />
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6" data-testid="blog-title">
            Stories
          </h1>
          <p className="text-xl text-brand-muted leading-relaxed max-w-3xl">Trip recaps, tips and stories from the community.</p>
        </div>

        {categories.length > 2 && (
          <div className="flex gap-3 mb-10 overflow-x-auto pb-4" data-testid="category-filters" role="group" aria-label="Filter by category">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                data-testid={`filter-${cat}`}
                aria-pressed={category === cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-2 text-xs uppercase tracking-widest font-medium border transition-colors whitespace-nowrap ${
                  category === cat ? 'bg-brand-green text-brand-cream border-brand-green' : 'bg-white/50 text-brand-muted border-black/10 hover:border-brand-green'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {posts.loading && !posts.data ? (
          <PageLoading />
        ) : posts.error ? (
          <ErrorBox message={posts.error} onRetry={posts.reload} />
        ) : shown.length === 0 ? (
          <EmptyBox><span data-testid="no-posts">No posts yet. Check back soon.</span></EmptyBox>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="blog-grid">
            {shown.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug || post.id}`}
                data-testid={`post-card-${post.id}`}
                className="card-brutalist overflow-hidden block group"
              >
                {post.image_url && (
                  <div className="h-64 overflow-hidden">
                    <img
                      src={post.image_url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover motion-safe:group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-8">
                  <span className="text-xs uppercase tracking-widest px-4 py-1 bg-brand-sand text-brand-ink inline-block mb-4">{post.category}</span>
                  <h2 className="text-2xl font-bold mb-4 tracking-tight leading-tight group-hover:text-brand-orange transition-colors">{post.title}</h2>
                  <p className="text-brand-muted leading-relaxed mb-6 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-sm text-brand-muted gap-4">
                    <span className="flex items-center gap-2 min-w-0"><User size={14} aria-hidden="true" className="shrink-0" /><span className="truncate">{post.author_name}</span></span>
                    <span className="flex items-center gap-2 shrink-0"><Calendar size={14} aria-hidden="true" />{formatDay(post.created_at, 'MMM d, yyyy')}</span>
                  </div>
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="flex items-center gap-1 text-xs text-brand-muted"><Tag size={12} aria-hidden="true" />{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
