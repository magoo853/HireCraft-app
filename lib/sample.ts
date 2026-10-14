import { MilitaryInfo, Mode, StructuredResume } from "./types";
import { structuredToText } from "./parse";

/**
 * Fictional sample veteran used by the one-tap demo. Lets anyone — a
 * transitioning service member without a file handy, or an app reviewer —
 * see Score, Rewrite, Design, and the civilian translation working in
 * seconds. Clearly fictional; loaded only when the user taps for it.
 */
export const SAMPLE_MILITARY: MilitaryInfo = {
  branch: "Army",
  mosCodes: "92Y",
  evalText:
    "SSG Reed managed a property book valued at $12.4M with zero losses across two fiscal years. " +
    "Rated #2 of 11 supply sergeants in the battalion. Led a team of 4 soldiers supporting 650 personnel. " +
    "Cut requisition processing time 30% by rebuilding the SSA turn-in process. Scored 100% on the " +
    "Command Supply Discipline Program inspection — best result in the brigade. Hand-picked to run " +
    "deployment logistics for a 90-day rotation, moving 240 pallets with zero discrepancies.",
};

export const SAMPLE_RESUME: StructuredResume = {
  name: "Marcus Reed",
  email: "marcus.reed.sample@example.com",
  phone: "(555) 014-2280",
  location: "Killeen, TX",
  linkedin: "linkedin.com/in/marcusreed-sample",
  summary:
    "Army supply sergeant with 8 years of logistics experience managing a $12.4M property book, " +
    "inventory for 650 personnel, and a team of 4. Zero-loss accountability record, a 100% score on " +
    "the brigade supply inspection, and a track record of cutting processing times. Transitioning " +
    "to civilian supply chain and warehouse operations.",
  experience: [
    {
      title: "Unit Supply Sergeant (92Y)",
      company: "U.S. Army, Fort Hood, TX",
      dates: "Jun 2020 – Present",
      bullets: [
        "Managed a property book valued at $12.4M with zero losses across two fiscal years",
        "Led a team of 4 soldiers providing supply support to 650 personnel",
        "Cut requisition processing time 30% by rebuilding the supply support activity turn-in process",
        "Scored 100% on the Command Supply Discipline Program inspection, best result in the brigade",
        "Ran deployment logistics for a 90-day rotation, moving 240 pallets with zero discrepancies",
      ],
    },
    {
      title: "Supply Specialist",
      company: "U.S. Army, Fort Lewis, WA",
      dates: "Mar 2017 – May 2020",
      bullets: [
        "Processed 1,800+ requisitions per year in GCSS-Army with a 98% on-time rate",
        "Maintained 100% accountability for $3.2M of sensitive items across quarterly inventories",
        "Trained 6 new soldiers on property accountability and warehouse procedures",
      ],
    },
    {
      title: "Warehouse Associate (part-time)",
      company: "Central Texas Distribution Center",
      dates: "Jan 2016 – Feb 2017",
      bullets: [
        "Picked and packed 400+ orders per shift while meeting accuracy targets",
        "Operated forklifts and pallet jacks in a high-volume warehouse",
      ],
    },
  ],
  education: [
    { school: "Central Texas College", degree: "A.A.S., Business Management", dates: "2023", details: "" },
    { school: "U.S. Army Quartermaster School", degree: "Unit Supply Specialist Course (92Y)", dates: "2017", details: "" },
  ],
  projects: [],
  skills: [
    "Inventory Management", "Property Accountability", "Warehouse Operations", "GCSS-Army",
    "Team Leadership", "Logistics Coordination", "Forklift Operation", "Cycle Counts",
    "Shipping & Receiving", "Microsoft Excel",
  ],
  certifications: [
    "GCSS-Army Certified Operator",
    "OSHA Forklift Operator Certification",
    "Hazardous Materials Handling (HAZMAT) Certified",
  ],
  awards: [
    "Army Commendation Medal",
    "Army Achievement Medal (2)",
    "Brigade Supply Sergeant of the Quarter",
  ],
  rawText: "",
};
SAMPLE_RESUME.rawText = structuredToText(SAMPLE_RESUME);

/**
 * Fictional sample for the "Experienced job seeker" persona (mode
 * "general"): a mid-career civilian professional, plus a fictional
 * corporate performance review that loads through the same perfReview
 * plumbing a real user's review uses. Clearly fictional; loaded only
 * when the user taps for it.
 */
export const SAMPLE_CIVILIAN_REVIEW_TEXT =
  "Performance Review — Megan Torres. " +
  "Review period: January 1, 2025 – December 31, 2025. " +
  "Department: Customer Operations. Manager: Dana Whitfield. " +
  "Overall rating: Exceeds Expectations. " +
  "Manager comments are below. Megan reduced the escalated case backlog by 37% in four months by creating a daily priority huddle for 14 specialists. " +
  "She negotiated vendor contract renewals that saved $64,000 while expanding weekend coverage for business accounts. " +
  "Megan mentored five new supervisors and built a coaching playbook that cut quality review errors by 26%. " +
  "She launched a customer feedback dashboard in Salesforce that increased survey response rates by 31% across 2,400 accounts. " +
  "Megan communicates clearly with stakeholders and consistently documents decisions so cross-functional partners can act without follow-up meetings.";

export const SAMPLE_CIVILIAN_RESUME: StructuredResume = {
  name: "Megan Torres",
  email: "megan.torres.sample@example.com",
  phone: "(555) 019-3847",
  location: "Austin, TX",
  linkedin: "linkedin.com/in/megantorres-sample",
  summary:
    "Customer operations manager with 9 years of experience leading support teams, improving " +
    "processes with data analysis, and managing budgets for business accounts. Led teams of up to " +
    "14 specialists, holds a 96% account renewal record, and uses project management, problem " +
    "solving, and Microsoft Excel to cut resolution times and raise customer retention.",
  experience: [
    {
      title: "Customer Operations Manager",
      company: "Brightline Services Group, Austin, TX",
      dates: "Jan 2021 – Present",
      bullets: [
        "Led a team of 14 customer operations specialists supporting 2,400 business accounts",
        "Reduced average case resolution time 22% by redesigning the intake triage process",
        "Managed a $1.8M annual operating budget with zero overspend across three fiscal years",
        "Increased customer retention 11% by launching a quarterly account review program",
        "Trained 9 new team leads on coaching, scheduling, and quality assurance procedures",
        "Analyzed case data in Microsoft Excel and Salesforce to forecast staffing for peak seasons",
      ],
    },
    {
      title: "Senior Customer Success Specialist",
      company: "Brightline Services Group, Austin, TX",
      dates: "Jun 2018 – Dec 2020",
      bullets: [
        "Managed a portfolio of 180 business accounts with a 96% renewal rate",
        "Cut client onboarding time 18% by building a step-by-step implementation checklist",
        "Resolved 1,200+ support escalations per year with a 94% customer satisfaction score",
        "Coordinated cross-functional projects with product and billing teams for 30 enterprise clients",
      ],
    },
    {
      title: "Office Coordinator",
      company: "Cedar Park Medical Group, Cedar Park, TX",
      dates: "Jan 2016 – May 2018",
      bullets: [
        "Coordinated schedules for 22 staff members across two clinic locations",
        "Processed payroll and vendor invoices for $420,000 in annual spending with 99% accuracy",
        "Maintained patient intake records for 350+ monthly appointments with attention to detail",
      ],
    },
  ],
  education: [
    { school: "Texas State University", degree: "B.B.A., Business Administration", dates: "2015", details: "" },
  ],
  projects: [],
  skills: [
    "Team Leadership", "Customer Success", "Operations Management", "Process Improvement",
    "Budget Management", "Data Analysis", "Project Management", "Problem Solving",
    "Microsoft Excel", "Salesforce", "Scheduling", "Vendor Management",
  ],
  certifications: [
    "Certified Customer Success Manager (CCSM)",
    "Lean Six Sigma Yellow Belt",
  ],
  awards: [
    "Brightline Operations Excellence Award, 2024",
    "Customer Success Team of the Year, 2022",
  ],
  rawText: "",
};
SAMPLE_CIVILIAN_RESUME.rawText = structuredToText(SAMPLE_CIVILIAN_RESUME);

/**
 * Fictional sample for the "New to the workforce" persona (mode "new"):
 * a recent graduate whose resume is education-forward — internships,
 * part-time work, and projects — with enough quantified, verb-led
 * bullets to parse and score meaningfully. No sample review: the
 * loader sets neither a military record nor a performance review for
 * this persona. Clearly fictional; loaded only on tap.
 */
export const SAMPLE_ENTRY_RESUME: StructuredResume = {
  name: "Caleb Nguyen",
  email: "caleb.nguyen.sample@example.com",
  phone: "(555) 017-4920",
  location: "Columbus, OH",
  linkedin: "linkedin.com/in/calebnguyen-sample",
  summary:
    "Recent graduate with a B.S. in Information Systems and hands-on help desk, customer service, " +
    "and project experience. Resolved 25+ support tickets per week as an intern, built web and " +
    "Python projects using data analysis and problem solving, and brings strong communication, " +
    "time management, and attention to detail to an entry-level technology role.",
  experience: [
    {
      title: "Help Desk Intern",
      company: "University Technology Services, Columbus, OH",
      dates: "Sep 2024 – May 2025",
      bullets: [
        "Resolved 25+ support tickets per week for students and staff with a 92% first-contact resolution rate",
        "Imaged and deployed 140 laptops for incoming students during fall onboarding",
        "Documented 18 step-by-step troubleshooting guides that reduced repeat support questions",
        "Trained 6 student workers on ticket intake, password resets, and escalation procedures",
      ],
    },
    {
      title: "Retail Sales Associate (part-time)",
      company: "FreshMart Grocery, Columbus, OH",
      dates: "Jun 2022 – Aug 2024",
      bullets: [
        "Served 80+ customers per shift at checkout while maintaining 99% cash handling accuracy",
        "Trained 4 new cashiers on register procedures and customer service standards",
        "Restocked 12 product aisles per shift and cut close-out time by 15 minutes",
      ],
    },
    {
      title: "Volunteer Tech Tutor",
      company: "Columbus Public Library, Columbus, OH",
      dates: "Jan 2023 – May 2024",
      bullets: [
        "Taught 30+ community members basic computer, email, and online safety skills in weekly sessions",
        "Created a 10-page illustrated setup guide for first-time smartphone users",
      ],
    },
  ],
  education: [
    { school: "Ohio State University", degree: "B.S., Information Systems", dates: "2025", details: "Dean's List, three semesters" },
  ],
  projects: [
    {
      name: "Personal Budget Tracker",
      description: "Built a Python budget tracker that imports bank CSV files and charts monthly spending by category",
      tech: "Python, Microsoft Excel",
      bullets: ["Built a Python budget tracker that imports bank CSV files and charts monthly spending by category"],
    },
    {
      name: "Campus Event Finder Website",
      description: "Built a responsive website listing 120+ campus events with search and calendar filters",
      tech: "HTML, CSS, JavaScript",
      bullets: ["Built a responsive website listing 120+ campus events with search and calendar filters"],
    },
  ],
  skills: [
    "Technical Support", "Help Desk", "Customer Service", "Problem Solving",
    "Data Analysis", "Project Management", "Microsoft Excel", "Python",
    "JavaScript", "Communication", "Time Management", "Attention to Detail",
  ],
  certifications: [
    "Google IT Support Professional Certificate",
    "Microsoft Office Specialist — Excel",
  ],
  awards: [
    "Dean's List, Ohio State University (3 semesters)",
  ],
  rawText: "",
};
SAMPLE_ENTRY_RESUME.rawText = structuredToText(SAMPLE_ENTRY_RESUME);

/** One persona's sample bundle: everything the Resume-tab sample card
 *  loads, through the single shared loader. `military` / `perfReviewText`
 *  are null when the persona has no such payload — the loader simply
 *  skips that setter, exactly as the veteran loader never touches
 *  perfReview today. */
export interface PersonaSample {
  mode: Mode;
  resume: StructuredResume;
  military: MilitaryInfo | null;
  perfReviewText: string | null;
  cardText: string;
  buttonText: string;
  loadedMessage: string;
}

export const PERSONA_SAMPLES: Record<Mode, PersonaSample> = {
  veteran: {
    mode: "veteran",
    resume: SAMPLE_RESUME,
    military: SAMPLE_MILITARY,
    perfReviewText: null,
    cardText:
      "Load a fictional veteran resume (Army supply sergeant) with a sample " +
      "performance review, and see Score, Rewrite, Design, and the civilian " +
      "translation working in seconds.",
    buttonText: "🎖 Try the sample veteran resume",
    loadedMessage:
      "Sample loaded — Marcus Reed, Army 92Y. Explore every tab, then add your own resume whenever you're ready.",
  },
  general: {
    mode: "general",
    resume: SAMPLE_CIVILIAN_RESUME,
    military: null,
    perfReviewText: SAMPLE_CIVILIAN_REVIEW_TEXT,
    cardText:
      "Load a fictional experienced job seeker resume (customer operations " +
      "manager) with a sample performance review, and see Score, Rewrite, " +
      "and Design working in seconds.",
    buttonText: "💼 Try the sample experienced resume",
    loadedMessage:
      "Sample loaded — Megan Torres, Customer Operations Manager. Explore every tab, then add your own resume whenever you're ready.",
  },
  new: {
    mode: "new",
    resume: SAMPLE_ENTRY_RESUME,
    military: null,
    perfReviewText: null,
    cardText:
      "Load a fictional entry-level resume (recent graduate and help desk " +
      "intern), and see Score, Rewrite, and Design working in seconds.",
    buttonText: "🎓 Try the sample entry-level resume",
    loadedMessage:
      "Sample loaded — Caleb Nguyen, recent graduate. Explore every tab, then add your own resume whenever you're ready.",
  },
};

/** The sample for the persona Home stored in the app's `mode` field.
 *  No persona selected (null/undefined/unknown) keeps today's default:
 *  the veteran sample. */
export function sampleForMode(mode: Mode | null | undefined): PersonaSample {
  if (mode === "general") return PERSONA_SAMPLES.general;
  if (mode === "new") return PERSONA_SAMPLES.new;
  return PERSONA_SAMPLES.veteran;
}
