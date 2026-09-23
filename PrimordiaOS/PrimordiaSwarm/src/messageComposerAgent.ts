import { Email, Persona, Prospect, TouchPoint, CampaignPackage, PersonaResult } from "./types";

export const DEFAULT_SENDER_EMAIL = "contact@primordialorigin.com";
export const DEFAULT_SENDER_NAME = "Shane";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getSalutation(prospect: Prospect): string {
  if (prospect.firstName && prospect.firstName.trim().length > 0) {
    return `Hi ${prospect.firstName},`;
  }
  const roleName = prospect.role ? prospect.role.split(" ")[0] : "";
  if (roleName && !["Lead", "Senior", "Junior", "Principal", "VP", "Director", "Head"].includes(roleName)) {
    return `Hi ${roleName},`;
  }
  return "Hi there,";
}

function getSignoff(): string {
  return `Best,
${DEFAULT_SENDER_NAME}
Primordia Systems
${DEFAULT_SENDER_EMAIL}`;
}

function calculateEstimatedRoi(persona: Persona, prospect: Prospect): string {
  if (persona.id === "P1") {
    const laserCount = (prospect.machines || []).filter(m => m.toLowerCase().includes("laser")).length || 1;
    const estSavings = laserCount * 18000 + 12000;
    return `Estimated Annual Savings: ~$${estSavings.toLocaleString()} in prevented head collision rebuilds and night-shift beam uptime.`;
  }
  if (persona.id === "P2") {
    const empFactor = prospect.companySize ? Math.max(1, Math.round(prospect.companySize / 40)) : 2;
    const estSavings = empFactor * 4500 * 12;
    return `Estimated Annual Savings: ~$${estSavings.toLocaleString()} in reclaimed aerospace superalloy yield (>91% sheet utilization) and zero HAZ scrap.`;
  }
  return "Estimated Productivity Gain: 65% faster multi-machine CAM turnarounds, eliminating 3+ siloed post-processor seats.";
}

export function composeEmail(persona: Persona, prospect: Prospect): Email {
  const salutation = getSalutation(prospect);
  const signoff = getSignoff();
  const primaryMachine = prospect.machines[0] || "your cutting and CNC equipment";
  const primaryMaterial = prospect.materials[0] || "high-spec materials";

  if (persona.id === "P1") {
    return {
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      subject: `Preventing head crashes on ${prospect.company}'s ${primaryMachine.split(" ")[0]} laser`,
      body: `${salutation}

Saw that you're running ${primaryMachine} over at ${prospect.company}. ${persona.problems[0].summary}

Primordia models your slat-bed geometry in 3D and verifies the collision envelope across all rapid-motion vectors with >12.5mm clearance, then automatically inserts micro-tabs and nano-joints so cut parts physically cannot tip into the head's trajectory.

Would it be useful if I sent you a 2-minute clip showing how this works on a typical ${primaryMaterial} nesting job?

${signoff}`
    };
  }

  if (persona.id === "P2") {
    return {
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      subject: `Cutting scrap yield loss on ${prospect.company}'s ${primaryMaterial} jobs`,
      body: `${salutation}

Saw the precision alloy work ${prospect.company} is doing with ${primaryMaterial} and ${primaryMachine}. ${persona.problems[0].summary}

Primordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.

Would you be open to a quick 10-minute walkthrough running a sample ${primaryMaterial} nest on your exact machine kinematics?

${signoff}`
    };
  }

  return {
    fromEmail: DEFAULT_SENDER_EMAIL,
    fromName: DEFAULT_SENDER_NAME,
    subject: `Unifying CAM post-processing and copiloting CNC/weld at ${prospect.company}`,
    body: `${salutation}

Noticed that ${prospect.company} handles both precision machining and fabrication with ${primaryMachine}. ${persona.problems[0].summary}

Primordia replaces disjointed legacy CAM seats with a zero-install cloud suite and in-app metallurgy/heat copilots—allowing junior programmers to generate reliable 5-axis and robotic toolpaths without getting tripped up by machine-specific quirks.

Would you be open to a 15-minute demo where we put one of your complex parts through the Primordia workflow end-to-end?

${signoff}`
  };
}

export function composeCampaign(persona: Persona, prospect: Prospect, classification: PersonaResult): CampaignPackage {
  const salutation = getSalutation(prospect);
  const signoff = getSignoff();
  const primaryMachine = prospect.machines[0] || "your machinery";
  const primaryMaterial = prospect.materials[0] || "raw stock";
  const roi = calculateEstimatedRoi(persona, prospect);
  const slug = slugify(prospect.company);
  const baseUrl = process.env.BASE_URL || "https://primordialorigin.com";
  const demoUrl = `${baseUrl}/demo/${slug}`;

  const initialEmail = composeEmail(persona, prospect);

  const touches: TouchPoint[] = [
    {
      step: 1,
      dayOffset: 0,
      touchName: "Initial Value Hook & Direct Kinematics Solution",
      channel: "Email",
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      subject: initialEmail.subject,
      body: initialEmail.body,
      callToAction: "2-minute video clip or 10-minute workflow review"
    },
    {
      step: 2,
      dayOffset: 3,
      touchName: "Technical Simulation Teardown & Toolpath Walkthrough",
      channel: "Email",
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      subject: `Re: ${initialEmail.subject}`,
      body: `${salutation}

Following up briefly on our tooling discussion.

We modeled ${primaryMachine} in our kinematics engine—you can test the rapid collision envelope and thermal gradient simulation live here:
🔗 ${demoUrl}

Key highlights from the run:
• 0.00mm collision probability with automated slug tilt-angle prediction
• Real-time heat dissipation map across ${primaryMaterial} plates
• Instant G-code output formatted for your native controller

Would you have 10 minutes this Thursday or Friday to test this on one of your active DXF/STEP files?

${signoff}`,
      callToAction: "10-minute file test run"
    },
    {
      step: 3,
      dayOffset: 7,
      touchName: "Peer Benchmark & Economic Impact Breakdown",
      channel: "Email",
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      subject: `ROI breakdown for ${prospect.company}: ${persona.label.split(" - ")[0]}`,
      body: `${salutation}

Most fabrication teams we speak with running ${primaryMachine} are balancing two core operational priorities: reducing scrap/downtime and empowering junior programmers faster.

For a shop of ${prospect.companySize || "your"} scale:
• ${roi}
• Zero manual micro-tab tweaking in secondary CAM software
• Direct cloud synchronization from CAD models to machine-ready code

We put together an interactive ROI & Scrap Yield model calibrated for ${prospect.company}:
🔗 ${demoUrl}

If you'd like to benchmark your current sheet utilization or collision rates against industry averages, I'd be happy to share our fabrication benchmark model.

${signoff}`,
      callToAction: "Industry benchmark review"
    },
    {
      step: 4,
      dayOffset: 12,
      touchName: "Value Resource & Respectful Close",
      channel: "Email",
      fromEmail: DEFAULT_SENDER_EMAIL,
      fromName: DEFAULT_SENDER_NAME,
      subject: `CAM Optimization Checklist for ${prospect.company}`,
      body: `${salutation}

I know how busy shop floors get, so I'll step back after this note.

I've attached our 2026 CAM Optimization & Slat Safety Checklist for teams running ${primaryMachine}. It covers lead-in/lead-out geometry tricks and thermal dispersion rules you can implement regardless of software.

If you ever want to see how Primordia automates this end-to-end, you know where to find me.

Wishing you and the ${prospect.company} team high uptime and clean cuts.

${signoff}`,
      callToAction: "Download free checklist"
    }
  ];

  return {
    prospect,
    persona,
    classification,
    fromEmail: DEFAULT_SENDER_EMAIL,
    fromName: DEFAULT_SENDER_NAME,
    roiCalculation: roi,
    touches,
    generatedAt: new Date().toISOString()
  };
}
