// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract WavePortal {
    // Total number of waves ever sent
    uint256 public totalWaves;

    // Structure to hold each wave’s data
    struct Wave {
        address waver;        // Who waved
        uint256 timestamp;    // When they waved
        string message;       // What they said
    }

    // Array of all waves
    Wave[] public waves;

    // Event emitted when someone waves
    event NewWave(address indexed from, uint256 timestamp, string message);

    // Simple constructor — nothing to do yet
    constructor() {}

    /// @notice Send a wave along with a message!
    /// @param _message A short message to include with your wave
    function wave(string memory _message) public {
        totalWaves += 1;  // bump the counter

        // Store this wave
        waves.push(Wave({
            waver: msg.sender,
            timestamp: block.timestamp,
            message: _message
        }));

        // Emit an event so front-ends can listen for new waves
        emit NewWave(msg.sender, block.timestamp, _message);
    }

    /// @notice Retrieve the total number of waves so far
    function getTotalWaves() public view returns (uint256) {
        return totalWaves;
    }

    /// @notice Get the full list of all waves
    function getAllWaves() public view returns (Wave[] memory) {
        return waves;
    }
}
