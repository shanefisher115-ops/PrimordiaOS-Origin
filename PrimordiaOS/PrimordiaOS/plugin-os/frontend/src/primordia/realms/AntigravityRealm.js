"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AntigravityRealm;
const react_1 = __importDefault(require("react"));
function AntigravityRealm() {
    return (<div className='antigravity-realm'>
      <h1>Antigravity Realm</h1>
      <canvas id='ag-canvas'></canvas>
      <div id='ag-output'></div>
    </div>);
}
