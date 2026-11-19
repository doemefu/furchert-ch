// Closing band (redesign PR 10): one flat forest field (`--band`) per page with
// the question, a short line and two buttons: inverse «Live zeigen lassen»
// (`primary`) and the outline e-mail button. `.on-dark` keeps the focus rings
// and the outline button visible on the forest. Text is passed in by the
// (server) page; the e-mail label is passed in too, the address itself is only
// rendered in the browser (#147).
import { Btn } from './Btn';
import { ContactEmail } from './ContactEmail';

interface StripLink {
  href: string;
  label: string;
  /** Analytics click id, rendered as `data-track` (spec 100 §3.6). */
  track?: string;
}

export function CTAStrip({
  together,
  togsub,
  primary,
  emailLabel,
}: {
  together: string;
  togsub: string;
  primary: StripLink;
  emailLabel: string;
}) {
  return (
    <section className="band on-dark">
      <div className="container band-in">
        <div>
          <h2 className="band-title">{together}</h2>
          <p className="band-text">{togsub}</p>
        </div>
        <div className="band-acts">
          <Btn href={primary.href} variant="inverse" track={primary.track}>
            {primary.label}
          </Btn>
          <ContactEmail btn label={emailLabel} />
        </div>
      </div>
    </section>
  );
}
