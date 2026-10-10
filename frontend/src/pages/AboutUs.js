import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import PageMeta from '../components/PageMeta';
import { CONTACT_EMAIL } from '../config';

export default function AboutUs() {
  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="about-us-page">
      <PageMeta title="About us" description="Meet Eddie and Adrian, The Shenanigators: a wholesome couple creating a safe space for people of color to enjoy naturism." />
      <div className="max-w-5xl mx-auto px-6 md:px-12">
        <div className="mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6" data-testid="about-title">About us</h1>
          <p className="text-xl text-brand-muted leading-relaxed">Meet the Shenanigators</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <div className="border border-black/10 overflow-hidden bg-white/50 lg:sticky lg:top-28">
              <img
                src="/images/about-founders.jpg"
                alt="Eddie and Adrian, The Shenanigators"
                data-testid="about-founders-photo"
                className="w-full h-auto object-cover object-top"
                style={{ maxHeight: '600px' }}
              />
              <div className="p-8 bg-brand-green text-brand-cream">
                <h2 className="text-2xl font-bold mb-4 tracking-tight">Eddie &amp; Adrian</h2>
                <p className="text-sm uppercase tracking-widest">The Ambassador &amp; StormAndThunda</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-8">
            <div className="border border-black/10 p-8 bg-white/50">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
                Meet the Shenanigators:<br />
                Eddie (The Ambassador) and Adrian (StormAndThunda)
              </h2>
              <div className="space-y-6 text-lg text-brand-muted leading-relaxed">
                <p>
                  Ladies and gentlemen, saints and aints, and everyone in between. We are a wholesome couple that loves to travel and provide a safe space for people of color to explore and enjoy the naturist and nudism lifestyle. We focus on body positivity, mental wellness and overall mental and physical health.
                </p>
                <p>
                  Each year, we curate a shenanigans events and travel calendar for all our friends and the nosy people in the back pew to come out and have a funky good time. If you have an event you would like to add to the calendar, please let us know.
                </p>
              </div>
            </div>

            <div className="border border-black/10 p-8 bg-brand-sand">
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Our mission</h2>
              <ul className="space-y-3 text-lg text-brand-ink">
                {[
                  'Create safe spaces for people of color in naturist communities',
                  'Promote body positivity and self-acceptance',
                  'Support mental and physical wellness through community',
                  'Curate unforgettable travel and event experiences',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-brand-green font-bold" aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-black/10 p-8 bg-white/50">
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Have an event to add?</h2>
              <p className="text-lg text-brand-muted leading-relaxed mb-6">
                Tell us about it and we'll review it for the calendar. Prefer email? Write to us any time.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/submit-event" data-testid="submit-event-link" className="btn-accent">Submit an event</Link>
                <a href={`mailto:${CONTACT_EMAIL}`} data-testid="contact-email" className="btn-outline">
                  <Mail size={18} aria-hidden="true" /> Email us
                </a>
              </div>
              <p className="mt-6 text-sm text-brand-muted">
                New here? Read our <Link to="/guidelines" className="underline text-brand-green">community guidelines and privacy notice</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
