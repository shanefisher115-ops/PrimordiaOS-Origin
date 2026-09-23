import { PrimordiaSignal } from "../signal/PrimordiaSignal";

export type PrimordiaConcept = {
  id: string;
  signal: PrimordiaSignal;
  distilled: string;
  implications: string[];
};
