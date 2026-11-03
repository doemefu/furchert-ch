// Copy for the Impressum (/imprint) and Datenschutz (/privacy) pages (#16).
// Owner decision 2026-11-02: name + e-mail only, no postal address.
// The privacy text describes what the homelab actually does; when a fact
// changes (a processor, a retention period, a cookie), change it here.
// Retention periods are owned by data-service (netmon retention defaults,
// infrastructure docs/060-network-monitoring.md §3.3) and auth-service (login
// event outbox). E-mail addresses must never appear in this text: Cloudflare
// Email Obfuscation rewrites them in the SSR HTML (#125); the page renders the
// address once, in its own leaf element.
import type { Locale } from '@/i18n/routing';

export const LEGAL_CONTACT = { name: 'Dominic Furchert', email: 'dominic@furchert.ch' } as const;

export const RETENTION = {
  /** netmon.inbound_request_groups */
  requestDays: 90,
  /** netmon.firewall_events, netmon.login_events, netmon.ip_enrichment (after last seen) */
  securityDays: 180,
  /** auth-service login event outbox */
  loginOutboxHours: 72,
} as const;

export type LegalSection = { heading: string; paragraphs: string[] };

export type LegalPageCopy = {
  label: string;
  title: string;
  sub: string;
  contactLabel: string;
  nameLabel: string;
  emailLabel: string;
  updatedLabel: string;
  updated: string;
  sections: LegalSection[];
};

const { requestDays, securityDays, loginOutboxHours } = RETENTION;

const IMPRINT: Record<Locale, LegalPageCopy> = {
  de: {
    label: 'Rechtliches',
    title: 'Impressum',
    sub: 'Angaben zum Betreiber dieser Website.',
    contactLabel: 'Verantwortlich für den Inhalt',
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
    updatedLabel: 'Stand',
    updated: 'November 2026',
    sections: [
      {
        heading: 'Haftung für Inhalte',
        paragraphs: [
          'Die Inhalte dieser Website werden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte wird jedoch keine Gewähr übernommen.',
        ],
      },
      {
        heading: 'Haftung für Links',
        paragraphs: [
          'Diese Website enthält Links zu externen Websites (z. B. GitHub, LinkedIn). Für deren Inhalte sind ausschliesslich die jeweiligen Betreiber verantwortlich.',
        ],
      },
      {
        heading: 'Urheberrecht',
        paragraphs: [
          'Texte, Bilder und Gestaltung dieser Website sind urheberrechtlich geschützt. Eine Verwendung ausserhalb der Grenzen des Urheberrechts bedarf der vorherigen Zustimmung.',
        ],
      },
    ],
  },
  en: {
    label: 'Legal',
    title: 'Imprint',
    sub: 'Information about the operator of this website.',
    contactLabel: 'Responsible for the content',
    nameLabel: 'Name',
    emailLabel: 'E-mail',
    updatedLabel: 'Last updated',
    updated: 'November 2026',
    sections: [
      {
        heading: 'Liability for content',
        paragraphs: [
          'The content of this website is created with care. However, no guarantee is given for its accuracy, completeness or timeliness.',
        ],
      },
      {
        heading: 'Liability for links',
        paragraphs: [
          'This website links to external websites (e.g. GitHub, LinkedIn). Their operators alone are responsible for their content.',
        ],
      },
      {
        heading: 'Copyright',
        paragraphs: [
          'Texts, images and design of this website are protected by copyright. Any use beyond the limits of copyright law requires prior consent.',
        ],
      },
    ],
  },
};

const PRIVACY: Record<Locale, LegalPageCopy> = {
  de: {
    label: 'Rechtliches',
    title: 'Datenschutz',
    sub: 'Welche Personendaten beim Besuch dieser Website bearbeitet werden, wozu und von wem.',
    contactLabel: 'Verantwortlich',
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
    updatedLabel: 'Stand',
    updated: 'November 2026',
    sections: [
      {
        heading: 'Geltungsbereich',
        paragraphs: [
          'Diese Erklärung gilt für die Website furchert.ch (inkl. www.furchert.ch) und für die Anmeldung über auth.furchert.ch. Sie richtet sich nach dem Schweizer Datenschutzgesetz (DSG). Weitere Subdomains sind private Dienste und nicht Gegenstand dieser Erklärung.',
        ],
      },
      {
        heading: 'Betrieb und Hosting',
        paragraphs: [
          'Die Website läuft auf eigenen Servern des Verantwortlichen in der Schweiz. Es werden keine Tracking- oder Analyse-Tools im Browser, keine Werbung und keine Social-Media-Plugins eingesetzt; Schriften werden von dieser Website selbst ausgeliefert.',
          'Die Auslieferung erfolgt über Cloudflare (Cloudflare, Inc., USA): Cloudflare betreibt das DNS, leitet alle Anfragen über sein Netzwerk an die Server weiter und filtert Angriffe. Dabei bearbeitet Cloudflare Verbindungsdaten wie IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browserangaben und Land, auch ausserhalb der Schweiz, insbesondere in den USA. Cloudflare stützt solche Übermittlungen nach eigenen Angaben auf das Swiss-U.S. Data Privacy Framework und auf Standardvertragsklauseln. Cloudflare kann für Sicherheitsprüfungen technisch notwendige Cookies setzen.',
        ],
      },
      {
        heading: 'Sicherheitsüberwachung',
        paragraphs: [
          `Zum Erkennen und Abwehren von Angriffen holt der Verantwortliche die Zugriffsstatistiken und Sicherheitsereignisse von Cloudflare stündlich ab und speichert sie in einer eigenen Datenbank in der Schweiz: IP-Adresse, Land, aufgerufener Host und Pfad (ohne Parameter), HTTP-Methode, Statuscode und Anzahl Anfragen pro Stunde, bei Sicherheitsereignissen zusätzlich Zeitpunkt, Browserangaben (User-Agent) und Netzbetreiber. Zugriffsstatistiken werden nach ${requestDays} Tagen gelöscht, Sicherheitsereignisse und Angaben zum Ruf einer IP-Adresse nach ${securityDays} Tagen.`,
          'IP-Adressen werden lokal mit öffentlichen Sperrlisten (Spamhaus, FireHOL) abgeglichen. Auffällige IP-Adressen – mit fehlgeschlagenen Anmeldungen, blockierten Anfragen oder vielen Fehlerantworten – sowie die aktivsten Adressen eines Tages werden zudem bei AbuseIPDB (Marathon Studios, Inc., USA) abgefragt. Dabei wird nur die IP-Adresse übermittelt; zurück kommt eine Bewertung, wie oft die Adresse wegen Missbrauchs gemeldet wurde.',
          'Grundlage ist das überwiegende Interesse an der Sicherheit der Website und der Dienste des Verantwortlichen.',
        ],
      },
      {
        heading: 'Kontaktformular und E-Mail',
        paragraphs: [
          'Wenn Sie das Kontaktformular verwenden, werden Name, E-Mail-Adresse und Nachricht per E-Mail an den Verantwortlichen gesendet. Das Postfach und der Versand laufen über iCloud Mail von Apple (Apple Distribution International Ltd., Irland, und Apple Inc., USA); die Daten können dabei auch in den USA bearbeitet werden. Dasselbe gilt für E-Mails, die Sie direkt senden.',
          'Die Website selbst speichert die Formulardaten nicht und protokolliert nur die Länge der Nachricht. Zum Schutz vor Missbrauch wird die IP-Adresse kurzzeitig im Arbeitsspeicher der Anwendung gehalten, nie auf Datenträger oder in Protokolle geschrieben und bei einem Neustart verworfen. Nachrichten werden gelöscht, sobald sie für die Bearbeitung der Anfrage nicht mehr benötigt werden, ausser eine gesetzliche Aufbewahrungspflicht steht dem entgegen.',
        ],
      },
      {
        heading: 'Anmeldung',
        paragraphs: [
          `Der Bereich /dashboard ist nur für den Verantwortlichen bestimmt; die Anmeldung erfolgt über den eigenen Anmeldedienst auth.furchert.ch in der Schweiz. Jeder Anmeldeversuch wird mit Zeitpunkt, Ergebnis, IP-Adresse, Browserangaben und einem nicht umkehrbaren Kennwert (HMAC) des eingegebenen Benutzernamens erfasst, bei erfolgreicher Anmeldung zusätzlich mit der Benutzerkennung. Diese Daten liegen bis zu ${loginOutboxHours} Stunden im Anmeldedienst und werden danach für ${securityDays} Tage in der Sicherheitsdatenbank gespeichert.`,
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'Die öffentlichen Seiten setzen nur das Cookie NEXT_LOCALE, das die gewählte Sprache speichert und beim Schliessen des Browsers verfällt. Bei einer Anmeldung setzen die Website und auth.furchert.ch technisch notwendige Sitzungs- und Sicherheits-Cookies. Es werden keine Cookies zu Werbe- oder Analysezwecken verwendet.',
        ],
      },
      {
        heading: 'Empfänger im Ausland',
        paragraphs: [
          'Personendaten können an folgende Empfänger im Ausland gelangen: Cloudflare (USA), Apple (Irland, USA) und AbuseIPDB (USA). Die übrigen Bearbeitungen finden auf eigenen Servern in der Schweiz statt.',
        ],
      },
      {
        heading: 'Aufbewahrung und Sicherungskopien',
        paragraphs: [
          'Daten werden nur so lange aufbewahrt, wie es für die genannten Zwecke nötig ist. Sicherungskopien der Datenbanken werden auf eigenen Geräten des Verantwortlichen aufbewahrt.',
        ],
      },
      {
        heading: 'Ihre Rechte',
        paragraphs: [
          'Sie können Auskunft über Ihre Personendaten verlangen sowie deren Berichtigung oder Löschung beantragen und einer Bearbeitung widersprechen. Wenden Sie sich dafür an die oben genannte E-Mail-Adresse. Sie haben zudem das Recht, sich beim Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB) zu beschweren.',
        ],
      },
      {
        heading: 'Änderungen',
        paragraphs: [
          'Diese Erklärung kann angepasst werden, wenn sich die Website oder die eingesetzten Dienste ändern. Es gilt die hier veröffentlichte Fassung.',
        ],
      },
    ],
  },
  en: {
    label: 'Legal',
    title: 'Privacy',
    sub: 'Which personal data is processed when you visit this website, why, and by whom.',
    contactLabel: 'Controller',
    nameLabel: 'Name',
    emailLabel: 'E-mail',
    updatedLabel: 'Last updated',
    updated: 'November 2026',
    sections: [
      {
        heading: 'Scope',
        paragraphs: [
          'This notice covers the website furchert.ch (including www.furchert.ch) and signing in via auth.furchert.ch. It follows the Swiss Federal Act on Data Protection (FADP). Other subdomains are private services and are not covered by this notice.',
        ],
      },
      {
        heading: 'Operation and hosting',
        paragraphs: [
          "The website runs on the controller's own servers in Switzerland. It uses no tracking or analytics tools in the browser, no advertising and no social media plugins; fonts are served by this website itself.",
          'The website is delivered through Cloudflare (Cloudflare, Inc., USA): Cloudflare runs the DNS, routes every request through its network to the servers and filters attacks. In doing so, Cloudflare processes connection data such as IP address, time, requested address, browser details and country, also outside Switzerland, in particular in the USA. According to Cloudflare, such transfers rely on the Swiss-U.S. Data Privacy Framework and on standard contractual clauses. Cloudflare may set technically necessary cookies for security checks.',
        ],
      },
      {
        heading: 'Security monitoring',
        paragraphs: [
          `To detect and defend against attacks, the controller fetches Cloudflare's access statistics and security events every hour and stores them in its own database in Switzerland: IP address, country, requested host and path (without parameters), HTTP method, status code and number of requests per hour; for security events also the time, browser details (user agent) and network operator. Access statistics are deleted after ${requestDays} days, security events and IP reputation data after ${securityDays} days.`,
          'IP addresses are matched locally against public blocklists (Spamhaus, FireHOL). Conspicuous IP addresses – with failed sign-ins, blocked requests or many error responses – and the most active addresses of a day are also looked up at AbuseIPDB (Marathon Studios, Inc., USA). Only the IP address is transmitted; what comes back is a score of how often the address has been reported for abuse.',
          "The basis is the overriding interest in the security of the website and the controller's services.",
        ],
      },
      {
        heading: 'Contact form and e-mail',
        paragraphs: [
          "If you use the contact form, your name, e-mail address and message are sent to the controller by e-mail. The mailbox and the sending run on Apple's iCloud Mail (Apple Distribution International Ltd., Ireland, and Apple Inc., USA); the data may also be processed in the USA. The same applies to e-mails you send directly.",
          "The website itself does not store the form data and only logs the length of the message. To prevent abuse, the IP address is held briefly in the application's memory, never written to disk or logs, and discarded on restart. Messages are deleted once they are no longer needed to handle the request, unless a legal retention obligation applies.",
        ],
      },
      {
        heading: 'Sign-in',
        paragraphs: [
          `The /dashboard area is intended for the controller only; signing in uses the controller's own sign-in service auth.furchert.ch in Switzerland. Every sign-in attempt is recorded with time, outcome, IP address, browser details and a non-reversible value (HMAC) of the username entered, plus the user ID if the sign-in succeeds. This data stays in the sign-in service for up to ${loginOutboxHours} hours and is then kept in the security database for ${securityDays} days.`,
        ],
      },
      {
        heading: 'Cookies',
        paragraphs: [
          'The public pages only set the NEXT_LOCALE cookie, which stores the chosen language and expires when the browser is closed. When signing in, the website and auth.furchert.ch set technically necessary session and security cookies. No cookies are used for advertising or analytics.',
        ],
      },
      {
        heading: 'Recipients abroad',
        paragraphs: [
          'Personal data may reach the following recipients abroad: Cloudflare (USA), Apple (Ireland, USA) and AbuseIPDB (USA). All other processing takes place on the controller\'s own servers in Switzerland.',
        ],
      },
      {
        heading: 'Retention and backups',
        paragraphs: [
          "Data is kept only as long as needed for the purposes above. Backups of the databases are kept on the controller's own devices.",
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'You can request information about your personal data, ask for it to be corrected or deleted, and object to its processing. To do so, contact the e-mail address above. You also have the right to lodge a complaint with the Federal Data Protection and Information Commissioner (FDPIC).',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'This notice may be updated when the website or the services it uses change. The version published here applies.',
        ],
      },
    ],
  },
};

export const LEGAL_PAGES: Record<'imprint' | 'privacy', Record<Locale, LegalPageCopy>> = {
  imprint: IMPRINT,
  privacy: PRIVACY,
};
