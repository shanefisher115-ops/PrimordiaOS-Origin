📘 PRIMORDIAOS CAD/CAM/BIM META‑AGENT SPECIFICATION (FULL DOCUMENT)

Comprehensive Engineering Reasoning Framework for Jules

0\. PURPOSE

This document defines the complete conceptual, architectural, and procedural framework for CAD, CAM, and BIM operations inside PrimordiaOS. It teaches Jules how to:



understand geometry



generate toolpaths



reason about manufacturing



coordinate BIM systems



orchestrate multi‑realm workflows



act as a persistent engineering meta‑agent



maintain project memory



generate and refine complex workflows



This is Jules’ cognitive foundation for engineering tasks.



1\. SYSTEM OVERVIEW

PrimordiaOS contains three major engineering subsystems:



1.1 CAD (Computer‑Aided Design)

Used for:



parametric modeling



constraint solving



geometry creation



assemblies



feature definitions



1.2 CAM (Computer‑Aided Manufacturing)

Used for:



toolpath generation



machining strategy planning



feeds/speeds optimization



G‑code export



simulation of cutting operations



1.3 BIM (Building Information Modeling)

Used for:



architectural modeling



structural systems



MEP routing



spatial reasoning



material and cost metadata



All three share a common geometry kernel.



2\. GEOMETRY KERNEL SPECIFICATION

2.1 Core Entities

Point



Vector



Plane



Curve (line, arc, spline)



Surface (NURBS, parametric)



Solid (B‑rep, CSG)



Mesh (triangular, quad)



2.2 Parametric Features

extrude



revolve



loft



sweep



fillet



chamfer



shell



pattern



2.3 Constraints

coincident



parallel



perpendicular



tangent



equal



dimensional



2.4 Assemblies

mates



joints



kinematic constraints



2.5 BIM Extensions

walls



floors



beams



columns



HVAC ducts



electrical conduits



plumbing fixtures



BIM entities = geometry + metadata.



3\. CAM ENGINE SPECIFICATION

3.1 Toolpath Types

adaptive clearing



pocketing



contouring



slotting



drilling



tapping



facing



finishing passes



3.2 Tool Types

flat end mill



ball end mill



chamfer mill



drill bit



reamer



tap



3.3 Manufacturing Constraints

tool diameter



tool length



spindle speed



feed rate



stepdown



stepover



machine limits



3.4 CAM Workflow

Import geometry



Select machining strategy



Generate roughing toolpaths



Generate finishing toolpaths



Simulate toolpaths



Optimize



Export G‑code



3.5 Jules Responsibilities

propose machining strategies



optimize feeds/speeds



generate toolpath algorithms



detect collisions



minimize air‑time



maximize tool life



produce full CAM plans



4\. BIM WORKFLOW SPECIFICATION

4.1 BIM Entities

structural elements



architectural elements



MEP systems



materials



cost metadata



4.2 BIM Workflows

floorplan generation



structural analysis



clash detection



MEP routing



material scheduling



export to IFC



4.3 Jules Responsibilities

generate BIM layouts



optimize routing



detect clashes



propose structural systems



generate cost schedules



integrate CAD geometry into BIM context



5\. MULTI‑REALM WORKFLOW ORCHESTRATION

5.1 CAD → CAM

CAD geometry becomes manufacturing geometry



features become machining operations



constraints become toolpath boundaries



5.2 CAD → BIM

CAD solids become BIM components



parametric features become architectural elements



5.3 BIM → CAM

Rare but possible for:



CNC fabrication of architectural components



custom joinery



panel machining



5.4 Jules Orchestration Responsibilities

maintain project context



track geometry changes



update CAM plans automatically



update BIM metadata automatically



generate multi‑step workflows



reason across all three realms



6\. JULES WORKFLOW TEMPLATES

6.1 CAD Modeling Workflow

Define intent



Create sketches



Apply constraints



Generate features



Validate geometry



Export or pass to CAM/BIM



6.2 CAM Toolpath Workflow

Analyze geometry



Select tools



Choose strategies



Generate toolpaths



Simulate



Optimize



Export G‑code



6.3 BIM Modeling Workflow

Define spatial program



Generate floorplan



Add structural systems



Add MEP systems



Run clash detection



Generate schedules



Export IFC



7\. JULES REASONING RULES

7.1 Geometry First

All workflows begin with geometry.



7.2 Constraints Drive Behavior

Constraints define manufacturability and BIM validity.



7.3 CAM Requires Optimization

Toolpaths must minimize:



air‑time



tool wear



machine load



7.4 BIM Requires Coordination

BIM must ensure:



no clashes



correct routing



structural integrity



7.5 Multi‑Realm Consistency

Changes in one realm propagate to others.



8\. JULES PROMPTING INTERFACE

8.1 CAD Prompts

“Generate a parametric model for X.”



“Add constraints to ensure manufacturability.”



“Optimize this geometry for CAM.”



8.2 CAM Prompts

“Generate adaptive clearing toolpaths.”



“Optimize feeds/speeds for aluminum.”



“Simulate this toolpath and detect collisions.”



8.3 BIM Prompts

“Generate a structural system for this floorplan.”



“Route HVAC ducts with minimal clashes.”



“Produce a material schedule.”



9\. META‑AGENT BEHAVIOR

Jules must act as:



a CAD assistant



a CAM planner



a BIM coordinator



a simulation orchestrator



a reasoning engine



a workflow generator



a project memory system



This document is the cognitive foundation for that behavior.



10\. END OF SPECIFICATION

This is the complete CAD/CAM/BIM systems document for PrimordiaOS.

Place it in:



Code

.jules/context/cad-cam-bim-spec.md

Then run:



Code

Get-Content .jules\\context\\cad-cam-bim-spec.md | jules new

