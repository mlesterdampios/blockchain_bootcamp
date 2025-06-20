// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

interface IContractThatContainsHiddenMessage {
    function getHiddenMessage() external view returns (string memory);
}

abstract contract Ownable {
    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) external {
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}

contract SecunaCTF is Ownable {
    ////////////////////////////////////////////////////////////////////////////////////
    // Blockchain Tracing / Insecure Storage
    ////////////////////////////////////////////////////////////////////////////////////
    IContractThatContainsHiddenMessage private immutable target;
    bool private hiddenMessageGuessed = false;

    constructor() {
        target = IContractThatContainsHiddenMessage(0xC24358E2d11B6A67eF73792054814f15C157c747);
    }

    function guessHiddenMessage(string calldata _guess) external onlyOwner{
        require(
            keccak256(bytes(target.getHiddenMessage())) ==
                keccak256(bytes(_guess)),
            "Wrong hidden message"
        );

        hiddenMessageGuessed = true;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Insecure Randomness
    ////////////////////////////////////////////////////////////////////////////////////

    bool private randomNumberGuessed = false;

    function guessNumber(uint256 _guess) external onlyOwner{
        require(_guess == block.number, "Wrong block number");

        randomNumberGuessed = true;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // Reentrancy and Underflow
    ////////////////////////////////////////////////////////////////////////////////////
    uint256 public EnemyHealth = 10;
    uint256 public hitsRemaining = 20;

    /*
        Player must deposit (send) **exactly** 0.0001 ether to start/restart the game.
    */
    receive() external payable onlyOwner{
        require(
            msg.value == 0.0001 ether,
            "Player must deposit 0.0001 ether to start/restart the game"
        );
        EnemyHealth = 10;
        hitsRemaining = 20;
    }

    /*
        When the player damages the enemy,
        he/she is rewarded **1 wei** (0.000000000000000001 ether).
    */
    function damageEnemy() external onlyOwner{
        require(EnemyHealth > 0, "Enemy must be alive");
        require(hitsRemaining > 0, "The player can hit the enemy 20 times only");

        // update the remaining hits count
        hitsRemaining -= 1;

        // reward the player
        (bool ok, ) = msg.sender.call{value: 1 wei}("");
        require(ok, "Transfer failed");

        // update health of the enemy
        EnemyHealth -= 1;
    }

    ////////////////////////////////////////////////////////////////////////////////////
    // WINNING CRITERIA
    ////////////////////////////////////////////////////////////////////////////////////
    /*
        Check the win condition for Blockchain Tracing
    */
    function checkIfBlockchainTracingDone() external view returns (bool) {
        return hiddenMessageGuessed;
    }

    /*
        Check the win condition for Insecure Randomness
    */
    function checkIfInsecureRandomnessDone() external view returns (bool) {
        return randomNumberGuessed;
    }

    /*
        Check the win condition for Reentrancy and Underflow
    */
    function checkIfReentrancyAndUnderflowDone() external view returns (bool) {
        return (EnemyHealth > 10);
    }
}
