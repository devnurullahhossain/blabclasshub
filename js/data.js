/* B-lab class hub data. This is the only file you edit to change content.
   Colours and layout are in css/style.css, behaviour is in js/app.js. */

var SITE = {
  name: "B-lab",
  batch: "8th batch",
  program: "E-Learning & Earning",
  updated: "30 Oct 2026",
  url: "blabclasshub.vercel.app",
  /* Slim bar at the very top. Leave text empty to hide it. */
  banner: {
    text: "Portfolio page v1 is due on 2 November. Submit your link in the class group.",
    href: "#notices",
  } /* printed on the student ID cards */,
  email: "",
  /* Contact for clients. Fill what you have, leave the rest empty and its button hides itself.
     whatsapp: country code and number, digits only, e.g. '8801XXXXXXXXX' */
  contact: { whatsapp: "", messenger: "", email: "", group: "" } /* batch email, shown in the footer when filled */,
  schedule: [
    ["Days", "Saturday and Tuesday"],
    ["Time", "10:00 AM to 12:00 PM"],
    ["Format", "Live class, recording shared after"],
  ],
};

/* Next class. The countdown in the hero reads this. Keep the +06:00 so it matches Bangladesh time. */
var NEXT_CLASS = { title: "Class 14: Flexbox and Grid practice", at: "2026-10-31T10:00:00+06:00", hours: 2 };

/* The four things B-lab teaches. tools = skills shown on chips and in the ticker. c = the track's own colour. */
var TRACKS = {
  mkt: {
    c: "#4C7DF0",
    name: "Digital marketing",
    tools: ["Facebook Ads", "Google Ads"],
    blurb: "Plan, launch and measure paid campaigns. We start with a small budget and learn from every result.",
  },
  gfx: {
    c: "#E8478B",
    name: "Graphic design",
    tools: ["Photoshop", "Adobe Illustrator"],
    blurb: "Logos, social posts and thumbnails. Photoshop for photos and mockups, Illustrator for clean vector work.",
  },
  wp: {
    c: "#F0803C",
    name: "WordPress",
    tools: ["WordPress"],
    blurb: "Hosting, themes, plugins and pages. We build a real site and hand it to a client.",
  },
  web: {
    c: "#8B5CF6",
    name: "HTML and CSS",
    tools: ["HTML", "CSS"],
    blurb: "Write pages by hand, then make them look right on any phone with Flexbox and Grid.",
  },
};

var STATUS = { live: ["Live", "live"], wip: ["In progress", "wip"], todo: ["Not started", "todo"] };

/* One object per student, in roll order.
   f = photo file inside images/students (leave '' for a monogram)
   n = name, t = track key, r = headline, s = skills, p = featured project
   st = live | wip | todo, b = short bio, l = portfolio link (optional)
   k = social and marketplace links (optional). Paste full links, leave out any you do not have:
       k:{fb:'', ig:'', li:'', be:'', yt:'', gh:'', wa:'', fiverr:'', upwork:'', fl:'', pph:'', web:''}
       fb Facebook, ig Instagram, li LinkedIn, be Behance, yt YouTube, gh GitHub, wa WhatsApp number (digits),
       fiverr, upwork, fl Freelancer, pph PeoplePerHour, web personal website
   w:true = this student has won a first client (shows a star)
   NOTE: names, headlines, projects and bios are placeholders. Skills were assigned at random.
   Photos 01 to 13 are real, so replace the names for those rows first. */

var NOTICES = [
  {
    d: "2026-10-31",
    time: "10:00 AM",
    title: "Class 14: Flexbox and Grid practice",
    text: "Bring your laptop. We rebuild one real landing page together.",
    tag: "Class",
    kind: "class",
  },
  {
    d: "2026-11-02",
    time: "11:59 PM",
    title: "Portfolio page v1 due",
    text: "Submit your link in the class group. A rough draft is fine.",
    tag: "Deadline",
    kind: "due",
  },
  {
    d: "2026-11-05",
    time: "4:00 PM",
    title: "Mock client pitch day",
    text: "Three minutes each. Pitch your project as if the batch were your client.",
    tag: "Event",
    kind: "",
  },
  { d: "2026-10-27", time: "Posted", title: "New resource: Framer starter pack", text: "Added to the class library below.", tag: "Update", kind: "" },
];

var RESOURCES = [
  {
    kind: "Cheat sheet",
    title: "Flexbox in one page",
    text: "Every container and item property with a small picture for each.",
    icon: "file",
    href: "",
  },
  {
    kind: "Recording",
    title: "Framer basics, class 9",
    text: "Frames, stacks, breakpoints and publishing, start to finish.",
    icon: "play",
    href: "",
  },
  {
    kind: "Slides",
    title: "How to find your first client",
    text: "Profile setup, first gig ideas and a message template.",
    icon: "slides",
    href: "",
  },
  {
    kind: "Reference",
    title: "W3Schools HTML tutorial",
    text: "Our self-study path for HTML basics.",
    icon: "link",
    href: "https://www.w3schools.com/html/",
  },
  { kind: "Template", title: "Framer starter pack", text: "Navbar, hero and footer blocks to copy into your projects.", icon: "template", href: "" },
  {
    kind: "Checklist",
    title: "Before you send a site to a client",
    text: "Mobile view, links, speed, contact form, favicon.",
    icon: "check",
    href: "",
  },
];

/* What clients can hire the batch for. Each card uses the track text above. */
var HIRE = {
  intro:
    "Need a logo, a landing page, a WordPress site or a small ad campaign? The batch takes small client projects at student-friendly prices, and every job is reviewed by our trainer.",
  steps: [
    ["Tell us the job", "Send what you need, your deadline and a rough budget."],
    ["We match a builder", "We pick the student whose skills and portfolio fit your job best."],
    ["Review and delivery", "You see a draft, ask for changes and get the final files."],
  ],
};

var FAQ = [
  { q: "Who is this site for?", a: "Students of the E-Learning and Earning 8th batch, and anyone who wants to see what we are building." },
  {
    q: "How do I get my photo or details on the site?",
    a: "Send your photo, bio, skills and links to your batch lead in the class group. They update the data file and the site refreshes in a minute.",
  },
  { q: "Where do I find the class recordings and slides?", a: "Open the Class library section further down. Everything from class is added there." },
  {
    q: "Can I get my own ID card to share?",
    a: "Yes. Open your profile, tap Make ID card, then download the picture or share it straight to Facebook or WhatsApp.",
  },
  { q: "What does the blinking dot mean?", a: "It marks a student whose project is live on the internet right now." },
  {
    q: "Can a client hire a student from the batch?",
    a: "Yes. Use the Hire the batch section and send the job details. We match you with the right student.",
  },
];

/* ---------- Google Sheet (optional) ----------
   Paste the published CSV link of each tab here. Leave '' to keep using the lists in this file.
   Guide: Google Sheets > File > Share > Publish to web > choose the tab > CSV > Publish > copy the link.
   Ready-made column templates are in the sheet-templates folder. */
var SHEET = {
  people:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2TMOjWtd8lIwYLP9JJcV8RLSZYAvm5YuPpWvDv-x_t1s75_z8WpCDrnA1UZijUhLAIn0MLLeNVjmc/pub?gid=2047780549&single=true&output=csv",
  notices:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2TMOjWtd8lIwYLP9JJcV8RLSZYAvm5YuPpWvDv-x_t1s75_z8WpCDrnA1UZijUhLAIn0MLLeNVjmc/pub?gid=1333319967&single=true&output=csv",
  tracker:
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2TMOjWtd8lIwYLP9JJcV8RLSZYAvm5YuPpWvDv-x_t1s75_z8WpCDrnA1UZijUhLAIn0MLLeNVjmc/pub?gid=444625727&single=true&output=csv",
  stories: "",
};

/* ---------- Class tracker ----------
   classes = every class held. att for each student is one letter per class: P present, A absent.
   work = homework and tasks. sub is one digit per task: 1 handed in, 0 not yet.
   rows are in roll order (same order as PEOPLE). These numbers are sample numbers, replace them
   with real ones here or in the tracker tab of your sheet. */
var TRACKER = {
  classes: [
    { t: "Class 4", d: "2026-09-26" },
    { t: "Class 5", d: "2026-09-29" },
    { t: "Class 6", d: "2026-10-03" },
    { t: "Class 7", d: "2026-10-06" },
    { t: "Class 8", d: "2026-10-10" },
    { t: "Class 9", d: "2026-10-13" },
    { t: "Class 10", d: "2026-10-17" },
    { t: "Class 11", d: "2026-10-20" },
    { t: "Class 12", d: "2026-10-24" },
    { t: "Class 13", d: "2026-10-27" },
  ],
  work: [
    { t: "Intro profile page", due: "2026-10-06" },
    { t: "Flexbox menu", due: "2026-10-13" },
    { t: "Brand colour sheet", due: "2026-10-20" },
    { t: "Portfolio page v1", due: "2026-11-02" },
    { t: "Mock client pitch", due: "2026-11-05" },
  ],
  rows: [
    { att: "PPPPPPPPPP", sub: "01100" },
    { att: "PAPPPPAPAP", sub: "10010" },
    { att: "PAPPPAPAPP", sub: "11100" },
    { att: "PAPAPPAPPP", sub: "01100" },
    { att: "APPPAPPPPP", sub: "10110" },
    { att: "PPAPPPPPAP", sub: "01000" },
    { att: "PPPPPPPAPP", sub: "11110" },
    { att: "PPPAPAPPAP", sub: "11110" },
    { att: "PPPPPPPPPP", sub: "11100" },
    { att: "PPPPPPPAPP", sub: "10001" },
    { att: "PPPPPPPPPP", sub: "00100" },
    { att: "APPPPPPPPP", sub: "11000" },
    { att: "APPAPPPAPP", sub: "01111" },
    { att: "PPPPPPAPAP", sub: "01100" },
    { att: "PPPPPAPPPP", sub: "10100" },
    { att: "PPPPPPPPPP", sub: "11001" },
    { att: "PPPPPPPPAP", sub: "11001" },
    { att: "PPPPPPPPPP", sub: "10100" },
    { att: "PAPPPPPAPA", sub: "11100" },
    { att: "PPPPPAPPPP", sub: "11101" },
    { att: "PPAPAPPPPP", sub: "11100" },
    { att: "PPPPPPPPPP", sub: "11110" },
    { att: "PPPPPPPPPP", sub: "10000" },
    { att: "PPPAAPPPPP", sub: "11101" },
    { att: "PPPAPPPPAP", sub: "01101" },
  ],
};

/* ---------- Success stories ----------
   s = position of the student in PEOPLE (0 is the first row, 1 the second)
   The three stories below are SAMPLE text so you can see the layout. They show a small "Sample story" tag.
   Replace them with what your real clients said, and delete  sample: true  from each one to hide the tag.
   Only real client feedback should be shown as a story. */
var STORIES = [
  {
    s: 0,
    client: "a local recipe page",
    quote: "He set up the whole site, explained every step in simple words and finished two days early.",
    result: "Site live in 5 days",
    stars: 5,
    sample: true,
  },
  {
    s: 1,
    client: "a small home business",
    quote: "The logo and business card felt like us from the first draft. We only changed one colour.",
    result: "3 designs, 1 round of changes",
    stars: 5,
    sample: true,
  },
  {
    s: 4,
    client: "a home tutor",
    quote: "My Facebook ad brought real messages from parents in the first week, and the numbers were easy to follow.",
    result: "18 enquiries in 7 days",
    stars: 5,
    sample: true,
  },
];
