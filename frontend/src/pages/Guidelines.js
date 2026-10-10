import PageMeta from '../components/PageMeta';
import { CONTACT_EMAIL } from '../config';

// DRAFT WORDING: Eddie and Adrian should read this and change anything that does not
// match how the community really runs. It describes what the website itself does.
export default function Guidelines() {
  return (
    <div className="min-h-[70vh] py-16 md:py-24" data-testid="guidelines-page">
      <PageMeta title="Community guidelines & privacy" description="How we keep events respectful and how we handle your information." />
      <div className="max-w-3xl mx-auto px-6 md:px-12">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-6">Community guidelines</h1>
        <p className="text-xl text-brand-muted leading-relaxed mb-12">
          Our events work because everyone feels safe. These are the ground rules.
        </p>

        <section className="mb-16" aria-labelledby="guidelines-heading">
          <h2 id="guidelines-heading" className="sr-only">Guidelines</h2>
          <ul className="space-y-8 text-lg leading-relaxed">
            <li>
              <h3 className="text-2xl font-bold mb-2">Consent comes first</h3>
              <p className="text-brand-muted">Ask before you touch, hug, or join a conversation. A "no" or silence means no. Being nude is never an invitation.</p>
            </li>
            <li>
              <h3 className="text-2xl font-bold mb-2">No photos without permission</h3>
              <p className="text-brand-muted">Don't photograph, film, or post about anyone without their clear okay. Unless the hosts say otherwise, assume photos aren't allowed. If someone asks you to delete a picture, delete it.</p>
            </li>
            <li>
              <h3 className="text-2xl font-bold mb-2">What happens here stays private</h3>
              <p className="text-brand-muted">Don't share who attended, where we met, or anyone's name outside the group. Not everyone is out about their lifestyle.</p>
            </li>
            <li>
              <h3 className="text-2xl font-bold mb-2">Respect each other</h3>
              <p className="text-brand-muted">No harassment, hate, or comments about anyone's body. Body positivity is the point.</p>
            </li>
            <li>
              <h3 className="text-2xl font-bold mb-2">Speak up</h3>
              <p className="text-brand-muted">If something feels wrong, tell a host or email us at <a className="underline text-brand-green" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We take reports seriously and may ask someone to leave.</p>
            </li>
          </ul>
        </section>

        <h2 className="text-4xl font-bold tracking-tight mb-6">Privacy</h2>
        <div className="space-y-6 text-lg text-brand-muted leading-relaxed" data-testid="privacy-notice">
          <p>We collect only what we need to run the calendar:</p>
          <ul className="list-disc pl-6 space-y-3">
            <li><strong className="text-brand-ink">Your account:</strong> your name, your email, and your password, which we store scrambled so nobody can read it.</li>
            <li><strong className="text-brand-ink">RSVPs:</strong> the name and email you enter. Only the organizers can see who has registered. Other visitors see just the headcount.</li>
            <li><strong className="text-brand-ink">Trip inquiries:</strong> your name, email, optional phone number, and message.</li>
            <li><strong className="text-brand-ink">Event submissions:</strong> the details and contact information you send us.</li>
          </ul>
          <p>Events show a general location to everyone. The exact address is shown only to people who have RSVP'd.</p>
          <p>The site uses an analytics service (PostHog) to count visits and see which pages are used.</p>
          <p>
            You can delete your account yourself from <a className="underline text-brand-green" href="/dashboard">My account</a>. To see or correct your information, email <a className="underline text-brand-green" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we'll take care of it.
          </p>
        </div>
      </div>
    </div>
  );
}
