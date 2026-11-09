// Copy for the Impressum (/imprint) and Datenschutz (/privacy) pages (#16).
// Owner decisions 2026-11-02/05: name + e-mail only, no postal address; mention
// only what the law requires (revDSG Art. 19, UWG Art. 3 para. 1 lit. s, FMG
// Art. 45c) and nothing the system does not demonstrably do. No retention
// periods, no hosting-location or "no tracking" promises, no backups, no
// security measures. When a recipient, data category or cookie changes, change
// it here; docs: .claude/worklogs and the PR #128 fact-check.
// Owner decisions 2026-11-07, privacy section "Kontaktformular und E-Mail":
// - Inbox AI disclosed (variant A): the owner may use Claude on a private
//   (consumer) account to handle e-mails, so the recipient is Anthropic
//   Ireland, Limited, with possible US processing and SCCs per Anthropic.
//   Contact-form mails go to iCloud only. No training statement: whether
//   Anthropic trains on the data depends on the plan (test guards it).
// - Form fields paragraph: optional phone number and call-back request, the
//   topic, the button that led to the form and the optional referral, sent
//   with the message by e-mail. Deliberately no sentence on any evaluation.
// Owner decisions 2026-11-08, usage statistics (spec 100 §10.2; WA-5 #157,
// merged only with the WA-6 go-live #158): Q1 "Keine Fristen" (no retention
// period, no location), Q2 "So lassen" (no backup statement; erasure speaks
// of the website's live data only). The erasure sentence is conditional and
// names no period (WA-5 review M7). Any change to the purpose, data
// categories, recipients or the usage-statistics section bumps
// ANALYTICS_CONSENT_VERSION (src/lib/analytics/consent.ts), so every visitor
// is asked again.
// E-mail addresses must never appear in this text (#125, #147): the page
// renders the owner's address once, in its own leaf element, through
// <ContactEmail>, which assembles it only in the browser (without JavaScript
// a neutral "E-Mail" link to /contact).
import type { Locale } from '@/i18n/routing';

export const LEGAL_CONTACT = { name: 'Dominic Furchert' } as const;

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

const IMPRINT: Record<Locale, LegalPageCopy> = {
  de: {
    label: 'Rechtliches',
    title: 'Impressum',
    sub: 'Angaben zum Anbieter dieser Website.',
    contactLabel: 'Anbieter',
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
    updatedLabel: 'Stand',
    updated: 'November 2026',
    sections: [],
  },
  en: {
    label: 'Legal',
    title: 'Imprint',
    sub: 'Information about the provider of this website.',
    contactLabel: 'Provider',
    nameLabel: 'Name',
    emailLabel: 'E-mail',
    updatedLabel: 'Last updated',
    updated: 'November 2026',
    sections: [],
  },
};

const PRIVACY: Record<Locale, LegalPageCopy> = {
  de: {
    label: 'Rechtliches',
    title: 'Datenschutz',
    sub: 'Welche Personendaten beim Besuch dieser Website bearbeitet werden.',
    contactLabel: 'Verantwortlich',
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
    updatedLabel: 'Stand',
    updated: 'November 2026',
    sections: [
      {
        heading: 'Besuch der Website',
        paragraphs: [
          'Die Website wird über Cloudflare, Inc. (USA) ausgeliefert. Cloudflare bearbeitet dabei insbesondere IP-Adresse, Zeitpunkt, aufgerufene Adresse, Browserangaben und Land, um die Website auszuliefern und Angriffe abzuwehren. Nach Angaben von Cloudflare stützen sich Übermittlungen aus der Schweiz in die USA auf das Swiss-U.S. Data Privacy Framework und, falls dieses entfällt, auf Standardvertragsklauseln.',
        ],
      },
      {
        heading: 'Sicherheitsüberwachung',
        paragraphs: [
          'Zum Erkennen und Abwehren von Angriffen speichert der Verantwortliche aus den Zugriffsstatistiken und Sicherheitsereignissen von Cloudflare folgende Angaben: IP-Adresse, Land, aufgerufene Adresse (Host und Pfad) und HTTP-Methode, bei Zugriffsstatistiken zudem Statuscode, Stunde und Anzahl der Anfragen, bei Sicherheitsereignissen zudem den genauen Zeitpunkt, die Anfragekennung von Cloudflare (Ray ID), die Browserangabe (User-Agent), den Netzbetreiber und Angaben zur ausgelösten Schutzregel. Zu jeder IP-Adresse speichert der Verantwortliche zudem, wann sie zuerst und zuletzt auftrat, und Treffer auf öffentlichen Sperrlisten.',
          'Einzelne IP-Adressen werden zur Beurteilung ihres Missbrauchsrisikos an AbuseIPDB LLC (USA) übermittelt; der Verantwortliche speichert deren Bewertung (Missbrauchswert und Anzahl Meldungen). Übermittelt wird dabei nur die IP-Adresse.',
          'Die Anzahl Anfragen pro Seite aus den Zugriffsstatistiken von Cloudflare dient zusammengefasst und ohne IP-Adressen zudem als Vergleichswert für die Nutzungsstatistik.',
        ],
      },
      {
        heading: 'Nutzungsstatistik (nur mit Einwilligung)',
        paragraphs: [
          'Wenn Sie im Hinweis zur Nutzungsstatistik «Erlauben» wählen, speichert Ihr Browser das Cookie fa_vid mit einer zufälligen Kennung für 12 Monate. Die Website erfasst dann, welche Seiten Sie aufrufen, wie lange und wie weit Sie darauf lesen und welche Abschnitte Sie erreichen, welche Schaltflächen, Links, FAQ-Einträge und Sprachwechsel Sie anklicken (bei Links auf andere Websites nur deren Domainname, bei E-Mail- und Telefonlinks nur die Art des Links) und ob Sie das Kontaktformular erfolgreich abgesendet haben, ohne dessen Inhalt. Dazu kommen der Domainname der Website, von der Sie gekommen sind, Kampagnenangaben im Link (Quelle, Medium und Kampagne), das Land, die Geräteart, die Browser- und Betriebssystemfamilie, eine grobe Bildschirmbreite und die Sprache der Seite.',
          'Diese Angaben wertet nur der Verantwortliche selbst aus, zusammengefasst pro Tag, ohne externe Analyse- oder Werbedienste. Grundlage ist Ihre Einwilligung. Sendet Ihr Browser das Signal Global Privacy Control oder Do Not Track, gilt das als Ablehnung.',
          'Sie können Ihre Einwilligung jederzeit über «Datenschutz-Einstellungen» am Seitenende widerrufen. Bei einem Widerruf wird die Kennung gelöscht und die Löschung der damit erfassten Einzelereignisse aus den aktuellen Daten der Website veranlasst; ist sie vorübergehend nicht möglich, wird sie nachgeholt.',
        ],
      },
      {
        heading: 'Kontaktformular und E-Mail',
        paragraphs: [
          'Wenn Sie das Kontaktformular verwenden, werden Name, E-Mail-Adresse und Nachricht zur Beantwortung Ihrer Anfrage per E-Mail an den Verantwortlichen gesendet. Das Postfach und der Versand laufen über iCloud Mail von Apple (Apple Distribution International Ltd., Irland; die Daten können auch bei Apple Inc., USA, bearbeitet werden). Gemäss Apples Angaben stützen sich Übermittlungen aus der Schweiz auf Standardvertragsklauseln. Dasselbe gilt für E-Mails, die Sie direkt senden.',
          'Freiwillig können Sie eine Telefonnummer angeben und einen Rückruf wünschen; für einen Rückruf genügt die Telefonnummer. Zusätzlich wird übermittelt, worum es geht (zum Beispiel Live-Demo), über welche Schaltfläche der Website Sie zum Formular gekommen sind (zum Beispiel ‹automation-hero›) und, falls Sie es angeben, wie Sie auf das Angebot aufmerksam geworden sind. Diese Angaben erhält der Verantwortliche mit Ihrer Nachricht per E-Mail.',
          'Zur Bearbeitung von E-Mails kann der Verantwortliche den KI-Assistenten Claude einsetzen. Dabei können Daten aus E-Mails (z. B. Absender, Betreff und Text) an Anthropic übermittelt werden (Anthropic Ireland, Limited, Irland; die Daten können auch in den USA bearbeitet werden). Gemäss Anthropics Angaben stützen sich Übermittlungen in Länder ohne angemessenes Datenschutzniveau auf Standardvertragsklauseln.',
          'Zum Schutz vor Missbrauch wird beim Absenden zusätzlich Ihre IP-Adresse im Arbeitsspeicher der Website verarbeitet.',
        ],
      },
      {
        heading: 'Anmeldung',
        paragraphs: [
          'Bei Anmeldeversuchen mit Benutzername und Passwort über auth.furchert.ch werden zur Erkennung von Angriffen Zeitpunkt, Ergebnis, IP-Adresse, Browserangabe und eine pseudonymisierte Form des eingegebenen Benutzernamens (HMAC-Hashwert) erfasst, bei erfolgreicher Anmeldung zusätzlich der Benutzername. IP-Adressen von Anmeldeversuchen können wie oben beschrieben an AbuseIPDB übermittelt werden.',
        ],
      },
      {
        heading: 'Cookies und lokaler Speicher',
        paragraphs: [
          'Die Website kann das Cookie NEXT_LOCALE setzen, das die gewählte Sprache speichert. Für die Anmeldefunktion der Website setzt sie bei jedem Besuch die technisch notwendigen Cookies __Host-authjs.csrf-token und __Secure-authjs.callback-url, die beim Schliessen des Browsers gelöscht werden; bei einer Anmeldung setzen die Website und auth.furchert.ch weitere technisch notwendige Cookies. Cloudflare kann für Sicherheitsprüfungen technisch notwendige Cookies setzen.',
          'Nur mit Ihrer Einwilligung zur Nutzungsstatistik setzt die Website das Cookie fa_vid (12 Monate). Konnte die Löschung nach einem Widerruf noch nicht abgeschlossen werden, hält das Cookie fa_forget die betroffenen Kennungen fest, bis die Löschung gelungen ist. Ihre Wahl zur Nutzungsstatistik speichert Ihr Browser im lokalen Speicher als fa_consent (12 Monate, auch bei einer Ablehnung) und solange ein Widerruf verarbeitet wird, zusätzlich den Vermerk fa_forget_pending.',
          'Sie können Cookies und den lokalen Speicher in den Einstellungen Ihres Browsers löschen oder ablehnen.',
        ],
      },
      {
        heading: 'Ihre Rechte',
        paragraphs: [
          'Es gelten die gesetzlichen Rechte nach dem Datenschutzgesetz, insbesondere auf Auskunft, Berichtigung und Löschung. Anfragen richten Sie an die oben genannte E-Mail-Adresse.',
          'Eine Einwilligung zur Nutzungsstatistik können Sie jederzeit über «Datenschutz-Einstellungen» am Seitenende widerrufen.',
        ],
      },
    ],
  },
  en: {
    label: 'Legal',
    title: 'Privacy',
    sub: 'Which personal data is processed when you visit this website.',
    contactLabel: 'Controller',
    nameLabel: 'Name',
    emailLabel: 'E-mail',
    updatedLabel: 'Last updated',
    updated: 'November 2026',
    sections: [
      {
        heading: 'Visiting the website',
        paragraphs: [
          'The website is delivered through Cloudflare, Inc. (USA). In doing so, Cloudflare processes in particular the IP address, time, requested address, browser details and country, in order to deliver the website and defend against attacks. According to Cloudflare, transfers from Switzerland to the USA rely on the Swiss-U.S. Data Privacy Framework and, should that lapse, on standard contractual clauses.',
        ],
      },
      {
        heading: 'Security monitoring',
        paragraphs: [
          "To detect and defend against attacks, the controller stores the following details taken from Cloudflare's access statistics and security events: IP address, country, requested address (host and path) and HTTP method; for access statistics also the status code, the hour and the number of requests; for security events also the exact time, Cloudflare's request ID (Ray ID), browser details (user agent), network operator and details of the protection rule that was triggered. For each IP address the controller also stores when it was first and last seen and any matches on public blocklists.",
          'Selected IP addresses are sent to AbuseIPDB LLC (USA) to assess their abuse risk, and the controller stores the result (abuse score and number of reports). Only the IP address is sent.',
          "The number of requests per page from Cloudflare's access statistics, aggregated and without IP addresses, also serves as a reference figure for the usage statistics.",
        ],
      },
      {
        heading: 'Usage statistics (only with consent)',
        paragraphs: [
          'If you choose “Allow” in the usage-statistics notice, your browser stores the cookie fa_vid with a random ID for 12 months. The website then records which pages you visit, how long and how far you read them and which sections you reach, which buttons, links, FAQ entries and language switches you click (for links to other websites only their domain name, for e-mail and phone links only the type of link) and whether you successfully submitted the contact form, never its content. In addition it records the domain name of the website you came from, campaign details in the link (source, medium and campaign), the country, the device type, the browser and operating system family, a rough screen width and the language of the page.',
          'These details are analysed by the controller only, aggregated per day, with no external analytics or advertising services. The legal basis is your consent. If your browser sends the Global Privacy Control or Do Not Track signal, this counts as a refusal.',
          'You can withdraw your consent at any time via “Privacy settings” at the bottom of the page. On withdrawal, the ID is deleted and the erasure of the individual events recorded with it from the website\'s live data is initiated; if it is temporarily not possible, it is carried out later.',
        ],
      },
      {
        heading: 'Contact form and e-mail',
        paragraphs: [
          "If you use the contact form, your name, e-mail address and message are sent to the controller by e-mail so that your enquiry can be answered. Both the mailbox and the sending are provided by Apple's iCloud Mail (Apple Distribution International Ltd., Ireland; the data may also be processed by Apple Inc., USA). According to Apple, transfers from Switzerland rely on standard contractual clauses. The same applies to e-mails you send directly.",
          'You may give a phone number and ask for a call back; for a call back the phone number is enough. In addition, the form sends what your enquiry is about (for example a live demo), which button on the website brought you to the form (for example “automation-hero”) and, if you choose to say, how you heard about the offer. The controller receives these details with your message by e-mail.',
          'The controller may use the AI assistant Claude to handle e-mails. In doing so, data from e-mails (e.g. sender, subject and text) may be sent to Anthropic (Anthropic Ireland, Limited, Ireland; the data may also be processed in the USA). According to Anthropic, transfers to countries without an adequate level of data protection rely on standard contractual clauses.',
          "To protect against abuse, your IP address is also processed in the website's memory when you submit the form.",
        ],
      },
      {
        heading: 'Sign-in',
        paragraphs: [
          'For sign-in attempts with username and password via auth.furchert.ch, the time, outcome, IP address, browser details and a pseudonymised form of the username entered (HMAC hash) are recorded to detect attacks, plus the username if the sign-in succeeds. IP addresses of sign-in attempts may be sent to AbuseIPDB as described above.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        paragraphs: [
          'The website may set the NEXT_LOCALE cookie, which stores the chosen language. For the sign-in function of the website, it sets the technically necessary cookies __Host-authjs.csrf-token and __Secure-authjs.callback-url on every visit; they are deleted when you close the browser. When signing in, the website and auth.furchert.ch set further technically necessary cookies. Cloudflare may set technically necessary cookies for security checks.',
          'Only with your consent to the usage statistics does the website set the cookie fa_vid (12 months). If the erasure after a withdrawal could not yet be completed, the cookie fa_forget keeps the IDs concerned until the erasure has succeeded. Your choice on the usage statistics is stored in your browser\'s local storage as fa_consent (12 months, also when you decline) and, while a withdrawal is being processed, the marker fa_forget_pending as well.',
          'You can delete or refuse cookies and local storage in your browser settings.',
        ],
      },
      {
        heading: 'Your rights',
        paragraphs: [
          'The statutory rights under the data protection act apply, in particular to access, correction and deletion. Send requests to the e-mail address above.',
          'You can withdraw a consent to the usage statistics at any time via “Privacy settings” at the bottom of the page.',
        ],
      },
    ],
  },
};

export const LEGAL_PAGES: Record<'imprint' | 'privacy', Record<Locale, LegalPageCopy>> = {
  imprint: IMPRINT,
  privacy: PRIVACY,
};
