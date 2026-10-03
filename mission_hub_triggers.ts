import { AMO } from "../amo/amo-core";

export const XPCurves = {
  easy: (base: number) => base,
  medium: (base: number) => Math.floor(base * 1.5),
  hard: (base: number) => Math.floor(base * 2.25),
  elite: (base: number) => Math.floor(base * 3.5)
};

export const AffiliateTriggers = {
  maxbountyLead: (userId: string, state: any) => {
    AMO.fire("affiliate.maxbounty.lead", {
      userId,
      omega: state.omega,
      xp: state.xp
    });
  },

  partnerstackSignup: (userId: string, state: any) => {
    AMO.fire("affiliate.partnerstack.signup", {
      userId,
      rewardFlux: state.omega
    });
  },

  swagbucksAction: (userId: string, state: any) => {
    AMO.fire("affiliate.swagbucks.action", {
      userId,
      entropy: state.omega * 0.2
    });
  }
};
