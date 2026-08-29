import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({path:new URL("../../../.env",import.meta.url)});

const [{database},server] = await Promise.all([
  import("@platform/database"),
  import("../src/index"),
]);

const adminEmail = "phase18-admin@handmekey.invalid";
const memberEmail = "phase18-user@handmekey.invalid";
let originalProgram: Awaited<ReturnType<typeof server.getLoyaltyProgramConfig>> | null = null;
let memberId: string | null = null;

try {
  const [admin,member] = await Promise.all([
    database().user.findUnique({where:{email:adminEmail},select:{id:true}}),
    database().user.findUnique({where:{email:memberEmail},select:{id:true}}),
  ]);
  assert.ok(admin,"admin-smoke must create a platform administrator first");
  assert.ok(member,"admin-smoke must create a member first");
  memberId = member.id;
  originalProgram = await server.getLoyaltyProgramConfig();

  const configured = await server.updateAdminRewardsProgram(admin.id,{
    enabled:true,
    earningEnabled:true,
    redemptionEnabled:true,
    eligibleCurrency:"JOD",
    memberPointsPerJod:11,
    goldMinimumNights:4,
    goldPointsPerJod:14,
    blackMinimumNights:12,
    blackPointsPerJod:18,
    walletPointsPerJod:500,
    minimumRedemptionPoints:500,
    redemptionStepPoints:25,
  });
  assert.equal(configured.memberPointsPerJod,11);
  assert.equal(configured.walletPointsPerJod,500);

  const afterAdd = await server.adjustAdminRewardsPoints(admin.id,member.id,{mode:"ADD",points:750,reason:"Rewards admin smoke credit"});
  assert.equal(afterAdd.pointsBalance,750);
  const afterRemove = await server.adjustAdminRewardsPoints(admin.id,member.id,{mode:"REMOVE",points:125,reason:"Rewards admin smoke debit"});
  assert.equal(afterRemove.pointsBalance,625);
  const afterSet = await server.adjustAdminRewardsPoints(admin.id,member.id,{mode:"SET",points:900,reason:"Rewards admin smoke set balance"});
  assert.equal(afterSet.pointsBalance,900);
  assert.ok(afterSet.ledger.some((entry:{type:string;points:number})=>entry.type==="ADJUSTMENT"&&entry.points===275));

  const suspended = await server.updateAdminRewardsMember(admin.id,member.id,{
    status:"SUSPENDED",
    tierOverride:"BLACK",
    qualifyingNights:6,
    qualifyingStays:3,
    reason:"Rewards admin smoke membership override",
  });
  assert.equal(suspended.status,"SUSPENDED");
  assert.equal(suspended.tier,"BLACK");
  assert.equal(suspended.tierOverride,"BLACK");

  const reactivated = await server.updateAdminRewardsMember(admin.id,member.id,{
    status:"ACTIVE",
    tierOverride:null,
    qualifyingNights:6,
    qualifyingStays:3,
    reason:"Rewards admin smoke restore automatic tier",
  });
  assert.equal(reactivated.status,"ACTIVE");
  assert.equal(reactivated.tier,"GOLD");
  assert.equal(reactivated.tierOverride,null);

  const controlCenter = await server.getAdminRewardsControlCenter(admin.id,{search:memberEmail,userId:member.id});
  assert.equal(controlCenter.members.length,1);
  assert.equal(controlCenter.selectedMember?.userId,member.id);
  assert.equal(controlCenter.selectedMember?.pointsBalance,900);

  assert.ok(await database().auditLog.findFirst({where:{actorUserId:admin.id,entityId:member.id,action:"REWARDS_POINTS_ADJUSTED"}}));
  assert.ok(await database().auditLog.findFirst({where:{actorUserId:admin.id,entityId:member.id,action:"REWARDS_MEMBERSHIP_UPDATED"}}));
  assert.ok(await database().auditLog.findFirst({where:{actorUserId:admin.id,entityId:"HANDMEKEY_REWARDS",action:"REWARDS_PROGRAM_UPDATED"}}));

  console.info(JSON.stringify({event:"rewards_admin_smoke_passed"}));
} finally {
  if (originalProgram) {
    const admin = await database().user.findUnique({where:{email:adminEmail},select:{id:true}});
    if (admin) await server.updateAdminRewardsProgram(admin.id,{
      enabled:originalProgram.enabled,
      earningEnabled:originalProgram.earningEnabled,
      redemptionEnabled:originalProgram.redemptionEnabled,
      eligibleCurrency:originalProgram.eligibleCurrency,
      memberPointsPerJod:originalProgram.memberPointsPerJod,
      goldMinimumNights:originalProgram.goldMinimumNights,
      goldPointsPerJod:originalProgram.goldPointsPerJod,
      blackMinimumNights:originalProgram.blackMinimumNights,
      blackPointsPerJod:originalProgram.blackPointsPerJod,
      walletPointsPerJod:originalProgram.walletPointsPerJod,
      minimumRedemptionPoints:originalProgram.minimumRedemptionPoints,
      redemptionStepPoints:originalProgram.redemptionStepPoints,
    });
  }
  if (memberId) {
    await database().loyaltyLedgerEntry.deleteMany({where:{userId:memberId}});
    await database().loyaltyAccount.deleteMany({where:{userId:memberId}});
  }
  await database().$disconnect();
}
