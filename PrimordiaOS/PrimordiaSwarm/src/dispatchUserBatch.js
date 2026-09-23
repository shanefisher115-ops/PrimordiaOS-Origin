"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emailDispatcher_1 = require("./emailDispatcher");
const leads = [
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Gwynne",
        lastName: "Shotwell",
        recipientEmail: "starship.tooling@spacex.com",
        company: "SpaceX — Starbase & Propulsion",
        role: "Director of Starship Tooling & Propulsion CAM",
        subject: "Cutting scrap yield loss on SpaceX — Starbase & Propulsion's SX500 Superalloy jobs",
        body: `Hi Gwynne,\n\nSaw the precision alloy work SpaceX — Starbase & Propulsion is doing with SX500 Superalloy and 15kW Trumpf TruLaser Cell 7040 3D laser. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample SX500 Superalloy nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Lars",
        lastName: "Moravy",
        recipientEmail: "giga.structures@tesla.com",
        company: "Tesla Gigafactory — CyberFab & Die",
        role: "Staff Manufacturing Engineer - Giga Casting & Laser Blanking",
        subject: "Preventing head crashes on Tesla Gigafactory — CyberFab & Die's 20kW laser",
        body: `Hi Lars,\n\nSaw that you're running 20kW Bystronic ByStar Fiber Laser over at Tesla Gigafactory — CyberFab & Die. Tip-up slugs on slat beds cause catastrophic head crashes at 100+ m/min, destroying $12k-$25k laser heads and stopping production for days.\n\nPrimordia models your slat-bed geometry in 3D and verifies the collision envelope across all rapid-motion vectors with >12.5mm clearance, then automatically inserts micro-tabs and nano-joints so cut parts physically cannot tip into the head's trajectory.\n\nWould it be useful if I sent you a 2-minute clip showing how this works on a typical Ultra-Hard 30X Cold-Rolled Stainless nesting job?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Tim",
        lastName: "Ellis",
        recipientEmail: "toolpaths@relativityspace.com",
        company: "Relativity Space — Stargate Additive",
        role: "Head of Additive Toolpaths & Subtractive CAM",
        subject: "Cutting scrap yield loss on Relativity Space — Stargate Additive's Inconel 625 jobs",
        body: `Hi Tim,\n\nSaw the precision alloy work Relativity Space — Stargate Additive is doing with Inconel 625 and Stargate 4th Gen DED Arc Cell. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Inconel 625 nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Brett",
        lastName: "Alexander",
        recipientEmail: "be4.machining@blueorigin.com",
        company: "Blue Origin — BE-4 Engine Propulsion",
        role: "Principal CAM & Toolpath Development Engineer",
        subject: "Cutting scrap yield loss on Blue Origin — BE-4 Engine Propulsion's Haynes 282 jobs",
        body: `Hi Brett,\n\nSaw the precision alloy work Blue Origin — BE-4 Engine Propulsion is doing with Haynes 282 and Matsuura MAM72-100H 5-Axis. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Haynes 282 nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Palmer",
        lastName: "Luckey",
        recipientEmail: "hardware.tooling@anduril.com",
        company: "Anduril Industries — Advanced Defense Hardware",
        role: "Director of Rapid Prototyping & CNC",
        subject: "Unifying CAM post-processing and copiloting CNC/weld at Anduril Industries — Advanced Defense Hardware",
        body: `Hi Palmer,\n\nNoticed that Anduril Industries — Advanced Defense Hardware handles both precision machining and fabrication with Mazak Integrex e-670H 5-Axis. Shops juggle 4-6 legacy tools and expensive post-processors; when senior machinists retire, juniors struggle to program safely.\n\nPrimordia replaces disjointed legacy CAM seats with a zero-install cloud suite and in-app metallurgy/heat copilots—allowing junior programmers to generate reliable 5-axis and robotic toolpaths without getting tripped up by machine-specific quirks.\n\nWould you be open to a 15-minute demo where we put one of your complex parts through the Primordia workflow end-to-end?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Dan",
        lastName: "Riccio",
        recipientEmail: "proto.tooling@apple.com",
        company: "Apple — Special Projects & Prototyping Fab",
        role: "Senior Manufacturing Design Engineer - Advanced Materials & Tooling",
        subject: "Cutting scrap yield loss on Apple — Special Projects & Prototyping Fab's Grade 5 Titanium (Ti-6Al-4V) jobs",
        body: `Hi Dan,\n\nSaw the precision alloy work Apple — Special Projects & Prototyping Fab is doing with Grade 5 Titanium (Ti-6Al-4V) and Fanuc Robodrill High-Speed VMC. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Grade 5 Titanium (Ti-6Al-4V) nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Peter",
        lastName: "Beck",
        recipientEmail: "structures@rocketlabusa.com",
        company: "Rocket Lab — Propulsion & Metal Structures",
        role: "Lead Launch Vehicle Manufacturing Engineer",
        subject: "Cutting scrap yield loss on Rocket Lab — Propulsion & Metal Structures's Carbon Composite Tooling Invar 36 jobs",
        body: `Hi Peter,\n\nSaw the precision alloy work Rocket Lab — Propulsion & Metal Structures is doing with Carbon Composite Tooling Invar 36 and DMG Mori Lasertec 65 3D Hybrid. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Carbon Composite Tooling Invar 36 nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "JoeBen",
        lastName: "Bevirt",
        recipientEmail: "powertrain.mfg@jobyaviation.com",
        company: "Joby Aviation — eVTOL Airframe & Powertrain",
        role: "Lead Powertrain CAM & Tooling Specialist",
        subject: "Cutting scrap yield loss on Joby Aviation — eVTOL Airframe & Powertrain's Aerospace Titanium Ti-6Al-4V jobs",
        body: `Hi JoeBen,\n\nSaw the precision alloy work Joby Aviation — eVTOL Airframe & Powertrain is doing with Aerospace Titanium Ti-6Al-4V and Hermle C32 5-Axis. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Aerospace Titanium Ti-6Al-4V nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "John",
        lastName: "Vance",
        recipientEmail: "jvance@atlaslaserfab.com",
        company: "Atlas Laser Fab",
        role: "Lead Laser Programmer",
        subject: "Preventing head crashes on Atlas Laser Fab's Trumpf laser",
        body: `Hi John,\n\nSaw that you're running Trumpf TruLaser 5030 fiber laser over at Atlas Laser Fab. Tip-up slugs on slat beds cause catastrophic head crashes at 100+ m/min, destroying $12k-$25k laser heads and stopping production for days.\n\nPrimordia models your slat-bed geometry in 3D and verifies the collision envelope across all rapid-motion vectors with >12.5mm clearance, then automatically inserts micro-tabs and nano-joints so cut parts physically cannot tip into the head's trajectory.\n\nWould it be useful if I sent you a 2-minute clip showing how this works on a typical mild steel nesting job?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Elena",
        lastName: "Rostova",
        recipientEmail: "e.rostova@aeromedalloys.com",
        company: "AeroMed Alloys",
        role: "VP of Manufacturing Engineering",
        subject: "Cutting scrap yield loss on AeroMed Alloys's Ti-6Al-4V Grade 5 jobs",
        body: `Hi Elena,\n\nSaw the precision alloy work AeroMed Alloys is doing with Ti-6Al-4V Grade 5 and 15kW Fiber laser. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Ti-6Al-4V Grade 5 nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Dave",
        lastName: "Miller",
        recipientEmail: "dave@slatguardsheet.com",
        company: "SlatGuard Sheetmetal",
        role: "Shop Owner & CAM Lead",
        subject: "Preventing head crashes on SlatGuard Sheetmetal's Amada laser",
        body: `Hi Dave,\n\nSaw that you're running Amada Ensis 6kW Fiber Laser over at SlatGuard Sheetmetal. Tip-up slugs on slat beds cause catastrophic head crashes at 100+ m/min, destroying $12k-$25k laser heads and stopping production for days.\n\nPrimordia models your slat-bed geometry in 3D and verifies the collision envelope across all rapid-motion vectors with >12.5mm clearance, then automatically inserts micro-tabs and nano-joints so cut parts physically cannot tip into the head's trajectory.\n\nWould it be useful if I sent you a 2-minute clip showing how this works on a typical 1018 cold roll nesting job?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Marcus",
        lastName: "Chen",
        recipientEmail: "mchen@apexprecisionfab.com",
        company: "Apex Precision Dynamics",
        role: "Director of Operations",
        subject: "Unifying CAM post-processing and copiloting CNC/weld at Apex Precision Dynamics",
        body: `Hi Marcus,\n\nNoticed that Apex Precision Dynamics handles both precision machining and fabrication with Mazak Integrex 5-axis. Shops juggle 4-6 legacy tools and expensive post-processors; when senior machinists retire, juniors struggle to program safely.\n\nPrimordia replaces disjointed legacy CAM seats with a zero-install cloud suite and in-app metallurgy/heat copilots—allowing junior programmers to generate reliable 5-axis and robotic toolpaths without getting tripped up by machine-specific quirks.\n\nWould you be open to a 15-minute demo where we put one of your complex parts through the Primordia workflow end-to-end?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Brett",
        lastName: "Miller",
        recipientEmail: "bmiller@greatlakeslaserfab.com",
        company: "Great Lakes Laser Fab",
        role: "Lead Laser & Nesting Programmer",
        subject: "Preventing head crashes on Great Lakes Laser Fab's Trumpf laser",
        body: `Hi Brett,\n\nSaw that you're running Trumpf TruLaser 3030 6kW over at Great Lakes Laser Fab. Tip-up slugs on slat beds cause catastrophic head crashes at 100+ m/min, destroying $12k-$25k laser heads and stopping production for days.\n\nPrimordia models your slat-bed geometry in 3D and verifies the collision envelope across all rapid-motion vectors with >12.5mm clearance, then automatically inserts micro-tabs and nano-joints so cut parts physically cannot tip into the head's trajectory.\n\nWould it be useful if I sent you a 2-minute clip showing how this works on a typical mild steel nesting job?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Rick",
        lastName: "Kowalski",
        recipientEmail: "rkowalski@motorcitysheetmetal.com",
        company: "MotorCity Precision Sheetmetal",
        role: "Plant Operations Manager",
        subject: "Preventing head crashes on MotorCity Precision Sheetmetal's Amada laser",
        body: `Hi Rick,\n\nSaw that you're running Amada Ensis 9kW Fiber Laser over at MotorCity Precision Sheetmetal. Tip-up slugs on slat beds cause catastrophic head crashes at 100+ m/min, destroying $12k-$25k laser heads and stopping production for days.\n\nPrimordia models your slat-bed geometry in 3D and verifies the collision envelope across all rapid-motion vectors with >12.5mm clearance, then automatically inserts micro-tabs and nano-joints so cut parts physically cannot tip into the head's trajectory.\n\nWould it be useful if I sent you a 2-minute clip showing how this works on a typical galvanneal nesting job?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    },
    {
        fromName: "Shane",
        fromEmail: "contact@primordialorigin.com",
        firstName: "Katherine",
        lastName: "Vance",
        recipientEmail: "kvance@midwestaerotooling.com",
        company: "Midwest Aerospace Tooling",
        role: "Director of Aerospace Manufacturing",
        subject: "Cutting scrap yield loss on Midwest Aerospace Tooling's Ti-6Al-4V Grade 5 jobs",
        body: `Hi Katherine,\n\nSaw the precision alloy work Midwest Aerospace Tooling is doing with Ti-6Al-4V Grade 5 and Hermle C42 5-Axis VMC. Titanium, 316L, and Inconel sheets cost hundreds of dollars; manual nesting wastes 15-30% and thermal distortion scraps parts.\n\nPrimordia's MaxRects nesting with active kerf compensation consistently delivers >90% sheet utilization on superalloys, while our Thermal TSP sequencing algorithms distribute the heat signature across the plate to prevent warping and HAZ defects without hand-tuning G-code.\n\nWould you be open to a quick 10-minute walkthrough running a sample Ti-6Al-4V Grade 5 nest on your exact machine kinematics?\n\nBest,\nShane\nPrimordia Systems\ncontact@primordialorigin.com`
    }
];
async function runBatch() {
    console.log("======================================================================");
    console.log("  🚀 PRIMORDIASWARM LIVE BATCH EMAIL DISPATCHER");
    console.log("======================================================================");
    console.log(`  Sender:    Shane <contact@primordialorigin.com>`);
    console.log(`  Campaigns: ${leads.length} Leads (Touch 1 Initial Hook)`);
    console.log("======================================================================\n");
    const results = [];
    for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        console.log(`[${i + 1}/${leads.length}] Dispatching to: ${lead.recipientEmail} (${lead.company})...`);
        const res = await (0, emailDispatcher_1.sendEmail)({
            to: lead.recipientEmail,
            subject: lead.subject,
            body: lead.body,
            fromName: lead.fromName,
            fromEmail: lead.fromEmail
        });
        results.push({ lead, res });
        if (res.success) {
            console.log(`  ✓ SENT! Message-ID: ${res.messageId}`);
        }
        else {
            console.log(`  ✗ FAILED: ${res.error}`);
        }
        // Deliverability delay between sends
        if (i < leads.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }
    console.log("\n======================================================================");
    console.log("  ✓ BATCH DISPATCH COMPLETED");
    console.log("======================================================================");
    const successCount = results.filter(r => r.res.success).length;
    console.log(`  Total Sent: ${successCount} / ${leads.length}`);
    console.log("======================================================================");
}
runBatch().catch(console.error);
