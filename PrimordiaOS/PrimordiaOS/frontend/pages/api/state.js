import { cockpitState } from "./update";

export default function handler(req, res) {
  res.status(200).json(cockpitState);
}
