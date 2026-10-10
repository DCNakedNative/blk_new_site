import { useEffect } from 'react';
import { SITE_NAME } from '../config';

const DEFAULT_TITLE = `${SITE_NAME} | Events, Trips & Stories`;

// Sets the browser-tab title and the search/share description for the current page.
// Every page should render one so tabs and search results never say "Emergent".
export default function PageMeta({ title, description }) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;

    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    const previous = tag.getAttribute('content');
    if (description) tag.setAttribute('content', description);

    return () => {
      if (description && previous !== null) tag.setAttribute('content', previous);
    };
  }, [title, description]);

  return null;
}
