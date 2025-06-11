// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

/**
 * @title SimpleBank (RE-ENTRANCY VULNERABLE — demo only!)
 * @notice Users can deposit for any address and withdraw their entire balance.
 *         The withdraw() function sends ETH *before* updating state, enabling
 *         an attacker contract to re-enter and drain the vault.
 */
contract SimpleBank {
    mapping (address => uint256) private credit;

    /* Accept deposits on behalf of any address */
    function deposit(address _to) external payable {
        require(msg.value > 0, "Nothing to deposit");
        credit[_to] += msg.value;
    }

    /* Vulnerable withdraw: Interaction-before-state-update */
    function withdraw(address _to) external {
        uint256 acctBalance = credit[msg.sender];
        require(acctBalance > 0, "Zero balance");

        // 1. external call (fallback/receive of attacker executes here)
        (bool ok, ) = _to.call{value: acctBalance}("");
        require(ok, "Transfer failed");

        // 2. state update AFTER external call (bug)
        credit[msg.sender] -= acctBalance;
    }

    /* Helper */
    function checkBalance(address _acct) external view returns (uint256) {
        return credit[_acct];
    }
}
