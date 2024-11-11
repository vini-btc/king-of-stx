import { principalCV, trueCV, uintCV } from "@stacks/transactions";
import fs from "fs";
import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const admin = accounts.get("deployer")!;
const player = accounts.get("wallet_1")!;
const player2 = accounts.get("wallet_2")!;
const bootstrapContribution = 5;

const contract = fs.readFileSync("contracts/game.clar", "utf-8");

describe("Game", () => {
  it(`Transfers ${bootstrapContribution} STX on deploy`, () => {
    const { events } = simnet.deployContract(
      "king-of-stx",
      contract,
      { clarityVersion: 3 },
      admin
    );
    const [deployEvent, ..._] = events;
    expect(deployEvent.event).toBe("stx_transfer_event");
    expect(deployEvent.data.amount).toBe(
      (bootstrapContribution * 1_000_000).toString()
    );
  });

  describe("become-king", () => {
    it("Sets the current king", () => {
      const { result } = simnet.callPublicFn("game", "become-king", [], player);
      expect(result).toBeOk(trueCV());
      const currentKing = simnet.getDataVar("game", "king");
      expect(currentKing).toBeSome(principalCV(player));
    });

    it("Sets the last set block height", () => {
      const { result } = simnet.callPublicFn("game", "become-king", [], player);
      expect(result).toBeOk(trueCV());
      const currentKingBlockHeight = simnet.getDataVar("game", "king-height");
      expect(currentKingBlockHeight).toBeSome(uintCV(simnet.blockHeight));
    });

    it(`Increases the prize pool by 0.45 STX and sends the protocol 0.05 STX when setting a new king and prize pool is bellow 10 STX`, () => {
      const [prizePool, expectedPrizePool, expectedProtocolFee] = [
        10, 0.45, 0.05,
      ];
      simnet.transferSTX(
        (prizePool - bootstrapContribution) * 1_000_000,
        `${admin}.game`,
        admin
      );
      const { events } = simnet.callPublicFn("game", "become-king", [], player);
      const [prizePoolContribution, feeContribution] = events;
      expect(prizePoolContribution.event).toBe("stx_transfer_event");
      expect(prizePoolContribution.data.amount).toBe(
        (expectedPrizePool * 1_000_000).toString()
      );

      expect(feeContribution.event).toBe("stx_transfer_event");
      expect(feeContribution.data.amount).toBe(
        (expectedProtocolFee * 1_000_000).toString()
      );
    });

    it(`Increases the prize pool by 0.9 STX and sends the protocol 0.1 STX when setting a new king and prize pool is bellow 100 STX`, () => {
      const [prizePool, expectedPrizePool, expectedProtocolFee] = [
        100, 0.9, 0.1,
      ];
      simnet.transferSTX(
        (prizePool - bootstrapContribution) * 1_000_000,
        `${admin}.game`,
        admin
      );
      const { events } = simnet.callPublicFn("game", "become-king", [], player);
      const [prizePoolContribution, feeContribution] = events;
      expect(prizePoolContribution.event).toBe("stx_transfer_event");
      expect(prizePoolContribution.data.amount).toBe(
        (expectedPrizePool * 1_000_000).toString()
      );

      expect(feeContribution.event).toBe("stx_transfer_event");
      expect(feeContribution.data.amount).toBe(
        (expectedProtocolFee * 1_000_000).toString()
      );
    });

    it(`Increases the prize pool by 1.35 STX and sends the protocol 0.15 STX when setting a new king and prize pool is bellow 1000 STX`, () => {
      const [prizePool, expectedPrizePool, expectedProtocolFee] = [
        1000, 1.35, 0.15,
      ];
      simnet.transferSTX(
        (prizePool - bootstrapContribution) * 1_000_000,
        `${admin}.game`,
        admin
      );
      const { events } = simnet.callPublicFn("game", "become-king", [], player);
      const [prizePoolContribution, feeContribution] = events;
      expect(prizePoolContribution.event).toBe("stx_transfer_event");
      expect(prizePoolContribution.data.amount).toBe(
        (expectedPrizePool * 1_000_000).toString()
      );

      expect(feeContribution.event).toBe("stx_transfer_event");
      expect(feeContribution.data.amount).toBe(
        (expectedProtocolFee * 1_000_000).toString()
      );
    });
  });

  describe("get-prize", () => {
    it("should not allow the caller to get the prize if the current prize pool is below or equal 10 STX and the king was not set more than 100 blocks ago", () => {
      simnet.callPublicFn("game", "become-king", [], player);
      simnet.mineEmptyBlocks(100 - 2);
      // get-prie will be called at block height 99, so the limit to not allow the caller to get the prize
      const { result } = simnet.callPublicFn("game", "get-prize", [], player);
      expect(result).toBeErr(uintCV(403));
    });

    it("should allow the caller to get the prize if the current prize pool is below or equal 10 STX and the king was more than 100 blocks ago", () => {
      simnet.callPublicFn("game", "become-king", [], player);
      simnet.mineEmptyBlocks(100 - 1);
      // get-prie will be called at block height 99, so the limit to not allow the caller to get the prize
      const { result, events } = simnet.callPublicFn(
        "game",
        "get-prize",
        [],
        player
      );
      expect(result).toBeOk(trueCV());
      expect(events).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "amount": "5450000",
              "memo": "",
              "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
              "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.game",
            },
            "event": "stx_transfer_event",
          },
        ]
      `);
    });

    it("should not allow the caller to get the prize if the current prize pool is below or equal 100 STX and the king was not set more than 10 blocks ago", () => {
      const [prizePool, minBlockHeight] = [100, 10];
      simnet.transferSTX(
        (prizePool - bootstrapContribution - 1) * 1_000_000,
        `${admin}.game`,
        admin
      );
      simnet.callPublicFn("game", "become-king", [], player);
      simnet.mineEmptyBlocks(minBlockHeight - 2);
      // get-prize will be called at block height minBlockHeight - 1, so the limit to not allow the caller to get the prize
      const { result } = simnet.callPublicFn("game", "get-prize", [], player);
      expect(result).toBeErr(uintCV(403));
    });

    it("should allow the caller to get the prize if the current prize pool is below or equal 100 STX and the king was set more than 10 blocks ago", () => {
      const [prizePool, minBlockHeight] = [100, 10];
      simnet.transferSTX(
        (prizePool - bootstrapContribution) * 1_000_000,
        `${admin}.game`,
        admin
      );
      simnet.callPublicFn("game", "become-king", [], player);
      simnet.mineEmptyBlocks(minBlockHeight);
      // get-prize will be called at block height minBlockHeight - 1, so the limit to not allow the caller to get the prize
      const { result, events } = simnet.callPublicFn(
        "game",
        "get-prize",
        [],
        player
      );
      expect(result).toBeOk(trueCV());
      expect(events).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "amount": "100900000",
              "memo": "",
              "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
              "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.game",
            },
            "event": "stx_transfer_event",
          },
        ]
      `);
    });

    it("should allow the caller to get the prize if the current prize pool is below or equal 1000 STX in the next block", () => {
      simnet.transferSTX(
        (1000 - bootstrapContribution) * 1_000_000,
        `${admin}.game`,
        admin
      );
      simnet.callPublicFn("game", "become-king", [], player);
      // get-prize will be called at block height minBlockHeight - 1, so the limit to not allow the caller to get the prize
      const { result, events } = simnet.callPublicFn(
        "game",
        "get-prize",
        [],
        player
      );
      expect(result).toBeOk(trueCV());
      expect(events).toMatchInlineSnapshot(`
        [
          {
            "data": {
              "amount": "1001350000",
              "memo": "",
              "recipient": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
              "sender": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.game",
            },
            "event": "stx_transfer_event",
          },
        ]
      `);
    });

    it(`should not allow the caller to get the prize if the caller is not the king`, () => {
      simnet.callPublicFn("game", "become-king", [], player);
      simnet.mineEmptyBlocks(10);
      // get-prie will be called at block height minBlockHeight - 1, so the limit to not allow the caller to get the prize
      const { result } = simnet.callPublicFn("game", "get-prize", [], player2);
      expect(result).toBeErr(uintCV(401));
    });

    it("should set the king to none after the prize is claimed", () => {
      simnet.callPublicFn("game", "become-king", [], player);
      simnet.mineEmptyBlocks(1000);
      simnet.callPublicFn("game", "get-prize", [], player);

      const currentKing = simnet.getDataVar("game", "king");
      expect(currentKing).toBeNone();
    });
  });
});

describe("get-king", () => {
  it("Returns the last king", () => {
    let currentKing;
    simnet.callPublicFn("game", "become-king", [], player);
    currentKing = simnet.callReadOnlyFn("game", "get-king", [], admin);
    expect(currentKing.result).toBeSome(principalCV(player));

    simnet.callPublicFn("game", "become-king", [], player2);
    currentKing = simnet.callReadOnlyFn("game", "get-king", [], admin);
    expect(currentKing.result).toBeSome(principalCV(player2));
  });
});

describe("get-king-height", () => {
  it("returns the block height when the last king was set", () => {
    let currentKingHeight;
    simnet.callPublicFn("game", "become-king", [], player);
    currentKingHeight = simnet.callReadOnlyFn(
      "game",
      "get-king-height",
      [],
      admin
    );
    expect(currentKingHeight.result).toBeSome(uintCV(simnet.blockHeight - 2));

    simnet.callPublicFn("game", "become-king", [], player2);
    currentKingHeight = simnet.callReadOnlyFn(
      "game",
      "get-king-height",
      [],
      admin
    );
    expect(currentKingHeight.result).toBeSome(uintCV(simnet.blockHeight - 2));
  });
});
