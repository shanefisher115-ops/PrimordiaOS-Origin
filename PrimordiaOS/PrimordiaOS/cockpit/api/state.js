import { getState } from "../../lib/state";

export default function handler(req, res) {
  res.status(200).json(getState());
}
