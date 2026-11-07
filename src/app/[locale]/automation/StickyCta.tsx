'use client';

// Sticky call to action for phones on /automation (#145). Shown only at
// <= 820 px (CSS, globals.css "AUTOMATION STICKY CTA") and only once the hero
// (`[data-cta="hero"]`) has scrolled out of view; hidden again while the
// closing call to action (`[data-cta="final"]`) or the footer is in view.
// The hero wraps the tiles, so the bar never covers a tile. No transition.
// Without JavaScript the bar stays hidden. A plain link to the contact page;
// nothing is sent or stored.
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Btn } from '@/components/ui/Btn';

export function StickyCta({
  href,
  micro1,
  micro2,
  label,
}: {
  href: string;
  micro1: string;
  micro2: string;
  label: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector('[data-cta="hero"]');
    const blockers = [
      document.querySelector('[data-cta="final"]'),
      document.querySelector('footer'),
    ].filter((el): el is Element => el !== null);
    if (!hero) return;

    let heroInView = true;
    const blockersInView = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === hero) heroInView = entry.isIntersecting;
        else if (entry.isIntersecting) blockersInView.add(entry.target);
        else blockersInView.delete(entry.target);
      }
      setShow(!heroInView && blockersInView.size === 0);
    });
    observer.observe(hero);
    blockers.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sticky-cta" hidden={!show} inert={!show}>
      <p className="sticky-cta-micro">
        <span>{micro1}</span>
        <span>{micro2}</span>
      </p>
      <Btn href={href} dark>
        {label} <Icon name="arrow" size={12} />
      </Btn>
    </div>
  );
}
