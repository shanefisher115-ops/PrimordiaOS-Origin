"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlasmaButton = PlasmaButton;
const link_1 = __importDefault(require("next/link"));
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
function PlasmaButton({ href, children, onClick, type = "button", disabled }) {
    const classes = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-plasma-sweep bg-[length:220%_220%] px-6 text-sm font-semibold text-white shadow-[0_0_36px_rgba(255,56,92,.28)] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60";
    const content = (<>
      {children}
      <lucide_react_1.ArrowUpRight className="h-4 w-4" aria-hidden="true"/>
    </>);
    if (href) {
        return (<framer_motion_1.motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }} className="inline-flex">
        <link_1.default href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className={classes}>
          {content}
        </link_1.default>
      </framer_motion_1.motion.span>);
    }
    return (<framer_motion_1.motion.button whileHover={{ scale: disabled ? 1 : 1.04 }} whileTap={{ scale: disabled ? 1 : 0.98 }} type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </framer_motion_1.motion.button>);
}
