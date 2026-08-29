import assert from "node:assert/strict";
import {
  calculateLoyaltyPoints,
  loyaltyPointsPerJod,
  loyaltyTierForNights,
  loyaltyTierProgress,
  type LoyaltyRuleSet,
} from "@platform/core";

assert.equal(loyaltyTierForNights(0), "MEMBER");
assert.equal(loyaltyTierForNights(4), "MEMBER");
assert.equal(loyaltyTierForNights(5), "GOLD");
assert.equal(loyaltyTierForNights(14), "GOLD");
assert.equal(loyaltyTierForNights(15), "BLACK");
assert.equal(loyaltyTierForNights(99), "BLACK");

assert.equal(loyaltyPointsPerJod("MEMBER"), 10);
assert.equal(loyaltyPointsPerJod("GOLD"), 12);
assert.equal(loyaltyPointsPerJod("BLACK"), 15);
assert.equal(calculateLoyaltyPoints(100, "MEMBER", "JOD"), 1000);
assert.equal(calculateLoyaltyPoints(100, "GOLD", "JOD"), 1200);
assert.equal(calculateLoyaltyPoints(100, "BLACK", "JOD"), 1500);
assert.equal(calculateLoyaltyPoints(99.99, "MEMBER", "JOD"), 999);
assert.equal(calculateLoyaltyPoints(100, "BLACK", "USD"), 0);
assert.equal(calculateLoyaltyPoints(100, "BLACK", "jod"), 1500);
assert.throws(() => calculateLoyaltyPoints(-1, "MEMBER", "JOD"), RangeError);
assert.throws(() => loyaltyTierForNights(-1), RangeError);

assert.deepEqual(loyaltyTierProgress(0), {
  tier: "MEMBER",
  nextTier: "GOLD",
  currentMinimumNights: 0,
  nextMinimumNights: 5,
  nightsToNextTier: 5,
  percent: 0,
});
assert.equal(loyaltyTierProgress(4).percent, 80);
assert.equal(loyaltyTierProgress(5).nextTier, "BLACK");
assert.equal(loyaltyTierProgress(10).percent, 50);
assert.deepEqual(loyaltyTierProgress(15), {
  tier: "BLACK",
  nextTier: null,
  currentMinimumNights: 15,
  nextMinimumNights: null,
  nightsToNextTier: 0,
  percent: 100,
});

const customRules: LoyaltyRuleSet = {
  eligibleCurrency: "JOD",
  tiers: {
    MEMBER: {minimumNights: 0, pointsPerJod: 5},
    GOLD: {minimumNights: 3, pointsPerJod: 8},
    BLACK: {minimumNights: 8, pointsPerJod: 12},
  },
};
assert.equal(loyaltyTierForNights(2,customRules), "MEMBER");
assert.equal(loyaltyTierForNights(3,customRules), "GOLD");
assert.equal(loyaltyTierForNights(8,customRules), "BLACK");
assert.equal(loyaltyPointsPerJod("GOLD",customRules), 8);
assert.equal(calculateLoyaltyPoints(10,"GOLD","JOD",customRules), 80);
assert.equal(calculateLoyaltyPoints(10,"GOLD","USD",customRules), 0);
assert.deepEqual(loyaltyTierProgress(7,customRules), {
  tier:"GOLD",
  nextTier:"BLACK",
  currentMinimumNights:3,
  nextMinimumNights:8,
  nightsToNextTier:1,
  percent:80,
});

console.info(JSON.stringify({event: "loyalty_rule_smoke_passed"}));
