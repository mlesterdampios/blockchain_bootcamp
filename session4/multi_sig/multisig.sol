// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title MultiConsentVault
 * @notice Ether vault where every whitelisted address has a personal “consent switch”.
 *         All switches must be ON for a withdrawal to succeed; one OFF disables withdrawals for everyone.
 *
 *         1. The deployer supplies the whitelist once, in the constructor.
 *         2. Each whitelisted account can toggle its own consent with `setConsent(bool)`.
 *         3. Anyone on the whitelist can withdraw any (or all) Ether *only* when every consent == true.
 *         4. Anyone may deposit Ether using `deposit()` or by sending Ether directly to the contract.
 */
contract MultiConsentVault {
    // ─────────────────────────────────────  State  ──────────────────────────────────────
    mapping(address => bool) public isWhitelisted;   // constant membership test
    mapping(address => bool) public consent;         // per-member consent switch (true = allow)
    address[] private _members;                      // enumerable list for iteration

    // ───────────────────────────────────── Events ───────────────────────────────────────
    event ConsentChanged(address indexed member, bool allowed);
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    // ──────────────────────────────────── Modifiers ─────────────────────────────────────
    modifier onlyMember() {
        require(isWhitelisted[msg.sender], "Not a whitelisted address");
        _;
    }

    // ─────────────────────────────────── Constructor ────────────────────────────────────
    /**
     * @param members An array of unique, non-zero addresses to whitelist.
     *                Every address starts with consent == true.
     */
    constructor(address[] memory members) payable {
        require(members.length > 0, "Empty whitelist");

        for (uint256 i; i < members.length; ++i) {
            address a = members[i];
            require(a != address(0), "Zero address");
            require(!isWhitelisted[a], "Duplicate address");

            isWhitelisted[a] = true;
            consent[a] = true;
            _members.push(a);
        }
    }

    // ──────────────────────────────────  User actions  ──────────────────────────────────
    /**
     * @notice Toggle (or explicitly set) your own consent flag.
     * @param allow `true` to allow withdrawals; `false` to veto withdrawals.
     */
    function setConsent(bool allow) external onlyMember {
        consent[msg.sender] = allow;
        emit ConsentChanged(msg.sender, allow);
    }

    /**
     * @notice Withdraw `amount` wei to *your* address.
     *         Fails if any member’s consent flag is false.
     */
    function withdraw(uint256 amount) external onlyMember {
        require(_allConsent(), "At least one member vetoed withdrawals");
        require(address(this).balance >= amount, "Insufficient vault balance");

        // Effect before interaction -- avoids re-entrancy problems.
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawal(msg.sender, amount);
    }

    /**
     * @notice Convenience function for depositing Ether.
     */
    function deposit() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // Fallback / receive so plain ETH transfers succeed.
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // ───────────────────────────────────  Views  ────────────────────────────────────────
    /**
     * @return allOK  True only when every whitelisted address has consent == true.
     *                O(n) over the member list; cheap for small n.
     */
    function allConsent() external view returns (bool allOK) {
        return _allConsent();
    }

    // ────────────────────────────────── Internal  ───────────────────────────────────────
    function _allConsent() internal view returns (bool) {
        for (uint256 i; i < _members.length; ++i) {
            if (!consent[_members[i]]) return false;
        }
        return true;
    }
}
