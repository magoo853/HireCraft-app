import { MilitaryInfo, StructuredResume } from "./types";
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
